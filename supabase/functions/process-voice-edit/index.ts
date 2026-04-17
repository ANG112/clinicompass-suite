import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Auth check
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    // Get staff profile
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: staffProfile } = await supabaseAdmin
      .from("staff_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const { transcription, entity_type, entity_id, audio_file_path } = await req.json();
    if (!transcription || !entity_type || !entity_id) {
      throw new Error("Missing transcription, entity_type, or entity_id");
    }

    const table = entity_type === "patient" ? "patients" : "contacts";

    // Fetch current record
    const { data: currentRecord, error: fetchErr } = await supabaseAdmin
      .from(table)
      .select("*")
      .eq("id", entity_id)
      .single();
    if (fetchErr) throw new Error(`Record not found: ${fetchErr.message}`);

    // Build field map for LLM
    const editableFields: Record<string, string> = {
      first_name: "Nombre",
      last_name: "Apellido(s)",
      nif: "NIF/DNI",
      birth_date: "Fecha de nacimiento (formato YYYY-MM-DD)",
      sex: "Sexo (hombre/mujer)",
      phone: "Teléfono",
      email: "Email",
      address: "Dirección postal (calle/número) — NUNCA confundir con centro",
      city: "Ciudad",
      postal_code: "Código postal",
      notes: "Observaciones/notas",
      source: "Canal de captación",
      fiscal_name: "Nombre fiscal",
      fiscal_nif: "NIF fiscal",
      fiscal_address: "Dirección fiscal",
      fiscal_email: "Email fiscal",
      fiscal_phone: "Teléfono fiscal",
    };

    const currentValues = Object.entries(editableFields).map(
      ([key, label]) => `- ${label} (${key}): ${currentRecord[key] ?? "(vacío)"}`
    ).join("\n");

    const normalize = (s: string) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const transNorm = normalize(transcription);
    const mentionsCenter = /(\bcentro\b|\bsede\b|\bclinica\b|\bcl[ií]nica\b)/.test(transNorm);
    const mentionsAddress = /(\bdirecc[ií]on\b|\bdomicilio\b|\bcalle\b|\bavenida\b|\bavda\b|\bvive en\b|\bplaza\b)/.test(transNorm);

    // Call LLM with tool calling
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
            content: `Eres un asistente de CRM sanitario. El usuario dicta instrucciones en español para modificar la ficha de un paciente/contacto. Debes interpretar la instrucción y devolver los campos que deben modificarse usando la función update_fields.

Reglas:
- Solo modifica campos que el usuario mencione explícitamente o implícitamente.
- Para fechas, usa formato YYYY-MM-DD.
- Para sexo, usa "hombre" o "mujer".
- Si el usuario dice "segundo apellido", modifica last_name añadiendo o cambiando la segunda palabra.
- Resuelve ambigüedades razonables por ti mismo.
- Si no puedes determinar un cambio con seguridad, no lo incluyas.`,
          },
          {
            role: "user",
            content: `Ficha actual del paciente:\n${currentValues}\n\nInstrucción del usuario: "${transcription}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "update_fields",
              description: "Actualiza los campos de la ficha del paciente/contacto según la instrucción del usuario.",
              parameters: {
                type: "object",
                properties: {
                  changes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", description: "Nombre del campo a modificar" },
                        new_value: { type: "string", description: "Nuevo valor para el campo" },
                        reason: { type: "string", description: "Explicación breve del cambio" },
                      },
                      required: ["field", "new_value", "reason"],
                    },
                  },
                  interpretation: { type: "string", description: "Resumen de lo que se interpretó de la instrucción" },
                },
                required: ["changes", "interpretation"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "update_fields" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("Error al procesar la instrucción con IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("La IA no pudo interpretar la instrucción");

    const parsed = JSON.parse(toolCall.function.arguments);
    const { changes, interpretation } = parsed;

    if (!changes || changes.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        changes: [],
        interpretation: interpretation || "No se detectaron cambios",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build update object and fields_changed log
    const updateObj: Record<string, any> = {};
    const fieldsChanged: any[] = [];

    for (const change of changes) {
      if (!(change.field in editableFields)) continue;
      // Guard: never let "address" be modified when the user only said "centro"
      if (change.field === "address" && mentionsCenter && !mentionsAddress) {
        console.warn("Guard: discarded address change — user mentioned 'centro' not 'dirección'", change);
        continue;
      }
      const oldValue = currentRecord[change.field];
      updateObj[change.field] = change.new_value === "" ? null : change.new_value;
      fieldsChanged.push({
        field: change.field,
        label: editableFields[change.field].split(" — ")[0],
        old_value: oldValue ?? null,
        new_value: change.new_value,
        reason: change.reason,
      });
    }

    if (Object.keys(updateObj).length === 0) {
      return new Response(JSON.stringify({
        success: true,
        changes: [],
        interpretation,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Apply changes
    const { error: updateErr } = await supabaseAdmin
      .from(table)
      .update(updateObj)
      .eq("id", entity_id);
    if (updateErr) throw new Error(`Error actualizando: ${updateErr.message}`);

    // Save traceability
    await supabaseAdmin.from("patient_voice_edits").insert({
      [entity_type === "patient" ? "patient_id" : "contact_id"]: entity_id,
      created_by: staffProfile?.id || null,
      transcription,
      interpreted_instruction: interpretation,
      fields_changed: fieldsChanged,
      audio_file_path: audio_file_path || null,
    });

    return new Response(JSON.stringify({
      success: true,
      changes: fieldsChanged,
      interpretation,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("process-voice-edit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
