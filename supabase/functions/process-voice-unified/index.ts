import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
      .select("id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const { transcription, entity_type, entity_id, audio_file_path } = await req.json();
    if (!transcription || !entity_type || !entity_id) {
      throw new Error("Missing transcription, entity_type, or entity_id");
    }

    const table = entity_type === "patient" ? "patients" : "contacts";
    const idCol = entity_type === "patient" ? "patient_id" : "contact_id";

    // Fetch current record for field editing context
    const { data: currentRecord, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select("*, center:centers(id, name, city)")
      .eq("id", entity_id)
      .single();
    if (fetchErr) throw new Error(`Record not found: ${fetchErr.message}`);

    // Fetch active centers catalog for LLM disambiguation
    const { data: centers } = await supabaseAdmin
      .from("centers")
      .select("id, name, city")
      .is("deleted_at", null)
      .eq("active", true);

    const centerCatalog = (centers || []).map((c: any) =>
      `  • ${c.name}${c.city ? ` (${c.city})` : ""} → id: ${c.id}`
    ).join("\n");

    const editableFields: Record<string, string> = {
      first_name: "Nombre",
      last_name: "Apellido(s)",
      nif: "NIF/DNI",
      birth_date: "Fecha de nacimiento (formato YYYY-MM-DD)",
      sex: "Sexo (hombre/mujer)",
      phone: "Teléfono",
      email: "Email",
      address: "Dirección postal (calle, número, piso) — NO usar para centro clínico",
      city: "Ciudad",
      postal_code: "Código postal",
      notes: "Observaciones/notas",
      source: "Canal de captación",
      company_name: "Empresa",
      fiscal_name: "Nombre fiscal",
      fiscal_nif: "NIF fiscal",
      fiscal_address: "Dirección fiscal",
      fiscal_email: "Email fiscal",
      fiscal_phone: "Teléfono fiscal",
      center_id: "Centro clínico asignado (UUID del centro de la lista) — usar SOLO cuando el usuario diga 'centro', 'sede' o 'clínica'",
    };

    const currentValues = Object.entries(editableFields)
      .map(([key, label]) => {
        if (key === "center_id") {
          const cur = currentRecord.center ? `${currentRecord.center.name}${currentRecord.center.city ? ` (${currentRecord.center.city})` : ""}` : "(vacío)";
          return `- ${label} (${key}): ${cur}`;
        }
        return `- ${label} (${key}): ${currentRecord[key] ?? "(vacío)"}`;
      })
      .join("\n");

    // Single LLM call that classifies AND extracts structured actions
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
            content: `Eres un asistente de CRM sanitario. Un profesional dicta un audio que puede contener CUALQUIER combinación de:

1. INSTRUCCIONES PARA MODIFICAR LA FICHA del paciente/contacto
2. NOTAS DE SESIÓN CLÍNICA

Debes analizar la transcripción y usar la función "process_voice".

================================================
REGLAS CRÍTICAS DE DESAMBIGUACIÓN — CENTRO vs DIRECCIÓN
================================================
Estos dos campos son SEMÁNTICAMENTE DIFERENTES y NUNCA deben confundirse:

• "centro" / "sede" / "clínica" / "centro clínico" / "centro asignado"
  → MODIFICA SIEMPRE el campo "center_id" (NO "address")
  → El new_value DEBE ser el UUID exacto de uno de los centros del catálogo de abajo
  → Si el centro mencionado no aparece en el catálogo, NO incluyas el cambio
  → Ejemplos:
     - "cambia el centro a Alcalá" → field="center_id", new_value="<uuid de Alcalá>"
     - "asígnalo al centro de Torrejón" → field="center_id"
     - "muévelo a la clínica de Getafe" → field="center_id"

• "dirección" / "domicilio" / "calle" / "vive en" / "dirección postal"
  → MODIFICA SIEMPRE el campo "address" (NO "center_id")
  → Ejemplos:
     - "cambia la dirección a Calle Mayor 12" → field="address"
     - "vive en Avenida de la Paz 5" → field="address"
     - "su domicilio nuevo es..." → field="address"

NUNCA modifiques "address" cuando el usuario diga "centro".
NUNCA modifiques "center_id" cuando el usuario diga "dirección".
Si tienes la mínima duda sobre cuál es el campo correcto, NO incluyas el cambio.

CATÁLOGO DE CENTROS DISPONIBLES (usa estos UUIDs exactos):
${centerCatalog || "  (sin centros configurados)"}

================================================
RESTO DE REGLAS
================================================
- Solo modifica campos mencionados explícita o implícitamente.
- Para fechas, usa formato YYYY-MM-DD.
- Para sexo, usa "hombre" o "mujer".
- Si dice "segundo apellido", modifica last_name añadiendo/cambiando la segunda palabra.
- Sé CONSERVADOR: ante ambigüedad, NO incluyas el cambio.

Reglas para session_note:
- Extrae información sobre sesiones, visitas, tratamientos, evolución del paciente.
- Si menciona un doctor/profesional, inclúyelo.
- Si no hay información de sesión, devuelve null.`,
          },
          {
            role: "user",
            content: `Ficha actual:\n${currentValues}\n\nTranscripción del audio: "${transcription}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "process_voice",
              description: "Procesa la instrucción de voz clasificando y extrayendo cambios de ficha y/o notas de sesión.",
              parameters: {
                type: "object",
                properties: {
                  field_changes: {
                    type: "array",
                    description: "Cambios a aplicar en los campos. Vacío si no hay cambios de datos.",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", description: "Nombre del campo a modificar (ej. 'address', 'center_id', 'phone')" },
                        new_value: { type: "string", description: "Nuevo valor. Para center_id debe ser el UUID exacto del catálogo." },
                        reason: { type: "string", description: "Explicación breve, indicando claramente la palabra clave del audio que justifica el cambio (ej. 'el usuario dijo centro', 'el usuario dijo dirección')." },
                      },
                      required: ["field", "new_value", "reason"],
                    },
                  },
                  session_note: {
                    type: "string",
                    nullable: true,
                    description: "Contenido de la nota de sesión. null si no hay.",
                  },
                  interpretation: {
                    type: "string",
                    description: "Resumen de lo interpretado.",
                  },
                },
                required: ["field_changes", "session_note", "interpretation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "process_voice" } },
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
    let { field_changes = [], session_note, interpretation } = parsed;

    // ===== POST-VALIDATION GUARD: avoid silly "centro" -> address mistakes =====
    const transNorm = normalize(transcription);
    const mentionsCenter = /(\bcentro\b|\bsede\b|\bclinica\b|\bcl[ií]nica\b)/.test(transNorm);
    const mentionsAddress = /(\bdirecc[ií]on\b|\bdomicilio\b|\bcalle\b|\bavenida\b|\bavda\b|\bvive en\b|\bplaza\b)/.test(transNorm);
    const centerIds = new Set((centers || []).map((c: any) => c.id));

    field_changes = (field_changes || []).filter((c: any) => {
      // If model wrote "address" but user only mentioned "centro" → discard
      if (c.field === "address" && mentionsCenter && !mentionsAddress) {
        console.warn("Guard: discarded address change — user mentioned 'centro' not 'dirección'", c);
        return false;
      }
      // If model wrote "center_id" but user only mentioned "dirección" → discard
      if (c.field === "center_id" && mentionsAddress && !mentionsCenter) {
        console.warn("Guard: discarded center_id change — user mentioned 'dirección' not 'centro'", c);
        return false;
      }
      // center_id must be a known UUID
      if (c.field === "center_id" && !centerIds.has(c.new_value)) {
        console.warn("Guard: discarded center_id with unknown UUID", c);
        return false;
      }
      return true;
    });

    const results: {
      field_changes_applied: any[];
      session_note_created: boolean;
      session_content: string | null;
      synopsis_updated: boolean;
      interpretation: string;
    } = {
      field_changes_applied: [],
      session_note_created: false,
      session_content: session_note || null,
      synopsis_updated: false,
      interpretation: interpretation || "",
    };

    // --- PART 1: Apply field changes ---
    if (field_changes.length > 0) {
      const updateObj: Record<string, any> = {};
      const fieldsChanged: any[] = [];

      for (const change of field_changes) {
        if (!(change.field in editableFields)) continue;
        const oldValue = currentRecord[change.field];
        updateObj[change.field] = change.new_value === "" ? null : change.new_value;

        // Build human-friendly label for center_id
        let displayOld = oldValue ?? null;
        let displayNew = change.new_value;
        if (change.field === "center_id") {
          displayOld = currentRecord.center?.name ?? null;
          const tgt = (centers || []).find((c: any) => c.id === change.new_value);
          displayNew = tgt ? tgt.name : change.new_value;
        }

        fieldsChanged.push({
          field: change.field,
          label: editableFields[change.field].split(" — ")[0].split(" (")[0],
          old_value: displayOld,
          new_value: displayNew,
          reason: change.reason,
        });
      }

      if (Object.keys(updateObj).length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from(table)
          .update(updateObj)
          .eq("id", entity_id);
        if (updateErr) console.error("Update error:", updateErr);

        await supabaseAdmin.from("patient_voice_edits").insert({
          [idCol]: entity_id,
          created_by: staffProfile?.id || null,
          transcription,
          interpreted_instruction: interpretation,
          fields_changed: fieldsChanged,
          audio_file_path: audio_file_path || null,
        });

        results.field_changes_applied = fieldsChanged;
      }
    }

    // --- PART 2: Create session note ---
    if (session_note) {
      const noteInsert: Record<string, any> = {
        content: session_note,
        source: "voice",
        created_by: staffProfile?.id || null,
        transcription,
        audio_file_path: audio_file_path || null,
        [idCol]: entity_id,
      };

      const { error: noteErr } = await supabaseAdmin
        .from("patient_session_notes")
        .insert(noteInsert);

      if (noteErr) {
        console.error("Session note insert error:", noteErr);
      } else {
        results.session_note_created = true;

        try {
          const { data: existingSynopsis } = await supabaseAdmin
            .from("patient_synopsis")
            .select("*")
            .eq(idCol, entity_id)
            .maybeSingle();

          const { data: recentNotes } = await supabaseAdmin
            .from("patient_session_notes")
            .select("content, created_at")
            .eq(idCol, entity_id)
            .order("created_at", { ascending: false })
            .limit(10);

          const notesContext = (recentNotes || [])
            .reverse()
            .map((n: any) => `[${new Date(n.created_at).toLocaleDateString("es-ES")}] ${n.content}`)
            .join("\n");

          const synResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  content: `Genera una sinopsis breve (5-10 líneas máximo) del estado del paciente. Concisa, útil, en español, sin markdown.`,
                },
                {
                  role: "user",
                  content: `Sinopsis actual:\n${existingSynopsis?.content || "(ninguna)"}\n\nHistorial reciente:\n${notesContext}\n\nGenera la sinopsis actualizada:`,
                },
              ],
            }),
          });

          if (synResponse.ok) {
            const synData = await synResponse.json();
            const newSynopsis = synData.choices?.[0]?.message?.content?.trim();
            if (newSynopsis) {
              if (existingSynopsis) {
                await supabaseAdmin
                  .from("patient_synopsis")
                  .update({ content: newSynopsis, updated_by: staffProfile?.id || null })
                  .eq("id", existingSynopsis.id);
              } else {
                await supabaseAdmin.from("patient_synopsis").insert({
                  content: newSynopsis,
                  updated_by: staffProfile?.id || null,
                  [idCol]: entity_id,
                });
              }
              results.synopsis_updated = true;
            }
          }
        } catch (synErr) {
          console.error("Synopsis update error:", synErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("process-voice-unified error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
