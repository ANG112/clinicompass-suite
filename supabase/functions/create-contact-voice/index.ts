import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: staffProfile } = await supabaseAdmin
      .from("staff_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { transcription } = await req.json();
    if (!transcription || typeof transcription !== "string") {
      throw new Error("Missing transcription");
    }

    // Catalogs
    const [{ data: centers }, { data: categories }] = await Promise.all([
      supabaseAdmin.from("centers").select("id, name, city").is("deleted_at", null).eq("active", true),
      supabaseAdmin.from("contact_categories").select("id, name, label").order("position"),
    ]);

    const centerCatalog = (centers || []).map((c: any) =>
      `  • ${c.name}${c.city ? ` (${c.city})` : ""} → id: ${c.id}`
    ).join("\n");
    const categoryCatalog = (categories || []).map((c: any) =>
      `  • ${c.label} → name: "${c.name}"`
    ).join("\n");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un asistente de CRM sanitario. El usuario dicta los datos para CREAR un nuevo contacto en español.

Debes extraer los campos estructurados y devolverlos llamando a la función "create_contact".

REGLAS CRÍTICAS:
- "first_name" es OBLIGATORIO. Si el usuario no lo menciona claramente, devuelve un error en "interpretation".
- Si el usuario menciona "centro" / "sede" / "clínica", usa el UUID EXACTO del catálogo de centros. Si no aparece, NO lo asignes.
- "address" es la dirección postal (calle, número). NUNCA confundir con centro clínico.
- "category_name" debe ser uno de los valores del catálogo de categorías ("lead", "cliente", "cliente_recurrente", etc.). Si no se menciona, usa "lead" por defecto.
- Para teléfono, normaliza eliminando espacios y guiones (mantén solo dígitos y +).
- Para email, deja en minúscula.
- Para fechas de nacimiento, usa formato YYYY-MM-DD.
- Para sexo, usa "hombre" o "mujer".
- Si un dato no se menciona, déjalo como null o cadena vacía.
- Sé CONSERVADOR: ante ambigüedad, mejor no rellenar el campo.

CATÁLOGO DE CENTROS (usa estos UUIDs exactos):
${centerCatalog || "  (sin centros)"}

CATÁLOGO DE CATEGORÍAS:
${categoryCatalog || "  (sin categorías)"}`,
          },
          {
            role: "user",
            content: `Transcripción: "${transcription}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_contact",
              description: "Crea un nuevo contacto a partir de los datos extraídos del audio.",
              parameters: {
                type: "object",
                properties: {
                  first_name: { type: "string", description: "Nombre (obligatorio)" },
                  last_name: { type: "string", nullable: true },
                  email: { type: "string", nullable: true },
                  phone: { type: "string", nullable: true },
                  nif: { type: "string", nullable: true },
                  birth_date: { type: "string", nullable: true, description: "YYYY-MM-DD" },
                  sex: { type: "string", nullable: true, description: "hombre|mujer" },
                  address: { type: "string", nullable: true, description: "Dirección postal — NO centro" },
                  city: { type: "string", nullable: true },
                  postal_code: { type: "string", nullable: true },
                  company_name: { type: "string", nullable: true },
                  source: { type: "string", nullable: true, description: "Canal de captación (web, teléfono, referido...)" },
                  notes: { type: "string", nullable: true },
                  center_id: { type: "string", nullable: true, description: "UUID exacto del centro del catálogo, o null" },
                  category_name: { type: "string", description: "name de la categoría (lead, cliente...)" },
                  interpretation: { type: "string", description: "Resumen de lo interpretado o motivo de error" },
                },
                required: ["first_name", "category_name", "interpretation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_contact" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de peticiones excedido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Error al procesar con IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("La IA no pudo interpretar la instrucción");

    const parsed = JSON.parse(toolCall.function.arguments);
    const { interpretation, category_name, ...fields } = parsed;

    if (!fields.first_name || fields.first_name.trim() === "") {
      return new Response(JSON.stringify({
        error: "No se detectó un nombre claro en el audio. Indica al menos el nombre del contacto.",
        interpretation,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve category
    const cat = (categories || []).find((c: any) => c.name === category_name) ||
                (categories || []).find((c: any) => c.name === "lead") ||
                (categories || [])[0];
    if (!cat) {
      return new Response(JSON.stringify({ error: "No hay categorías de contacto configuradas." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate center_id
    let center_id: string | null = fields.center_id || null;
    if (center_id) {
      const ok = (centers || []).some((c: any) => c.id === center_id);
      if (!ok) center_id = null;
    }

    // Guard: if user said "centro" but model put it in address, blank address
    const transNorm = normalize(transcription);
    const mentionsCenter = /(\bcentro\b|\bsede\b|\bclinica\b|\bcl[ií]nica\b)/.test(transNorm);
    const mentionsAddress = /(\bdirecc[ií]on\b|\bdomicilio\b|\bcalle\b|\bavenida\b|\bavda\b|\bvive en\b|\bplaza\b)/.test(transNorm);
    let address = fields.address || null;
    if (mentionsCenter && !mentionsAddress && address) {
      console.warn("Guard: discarded address from create-contact — user mentioned 'centro'");
      address = null;
    }

    // Normalize values
    const insertObj: Record<string, any> = {
      first_name: fields.first_name.trim(),
      last_name: fields.last_name?.trim() || null,
      email: fields.email ? String(fields.email).toLowerCase().trim() : null,
      phone: fields.phone ? String(fields.phone).replace(/[\s\-]/g, "") : null,
      nif: fields.nif?.trim() || null,
      birth_date: fields.birth_date || null,
      sex: fields.sex || null,
      address,
      city: fields.city?.trim() || null,
      postal_code: fields.postal_code?.trim() || null,
      company_name: fields.company_name?.trim() || null,
      source: fields.source?.trim() || "voz",
      notes: fields.notes?.trim() || null,
      center_id,
      category_id: cat.id,
    };

    const { data: created, error: insertErr } = await supabaseAdmin
      .from("contacts")
      .insert(insertObj)
      .select("*, category:contact_categories(name, label), center:centers(name)")
      .single();

    if (insertErr) {
      console.error("Insert contact error:", insertErr);
      throw new Error(`Error creando contacto: ${insertErr.message}`);
    }

    // Trace it
    await supabaseAdmin.from("patient_voice_edits").insert({
      contact_id: created.id,
      created_by: staffProfile?.id || null,
      transcription,
      interpreted_instruction: interpretation,
      fields_changed: [{
        field: "__create__",
        label: "Contacto creado por voz",
        old_value: null,
        new_value: `${created.first_name} ${created.last_name || ""}`.trim(),
        reason: interpretation,
      }],
    });

    return new Response(JSON.stringify({
      success: true,
      contact: created,
      interpretation,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("create-contact-voice error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
