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
      .select("*")
      .eq("id", entity_id)
      .single();
    if (fetchErr) throw new Error(`Record not found: ${fetchErr.message}`);

    const editableFields: Record<string, string> = {
      first_name: "Nombre",
      last_name: "Apellido(s)",
      nif: "NIF/DNI",
      birth_date: "Fecha de nacimiento (formato YYYY-MM-DD)",
      sex: "Sexo (hombre/mujer)",
      phone: "Teléfono",
      email: "Email",
      address: "Dirección",
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
    };

    const currentValues = Object.entries(editableFields)
      .map(([key, label]) => `- ${label} (${key}): ${currentRecord[key] ?? "(vacío)"}`)
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

1. INSTRUCCIONES PARA MODIFICAR LA FICHA del paciente/contacto (cambiar teléfono, email, dirección, nombre, etc.)
2. NOTAS DE SESIÓN CLÍNICA (descripción de lo ocurrido en una sesión, visita, tratamiento, etc.)

Debes analizar la transcripción completa y usar la función "process_voice" para devolver:
- "field_changes": array de cambios de campos de la ficha (puede estar vacío si no hay cambios de datos)
- "session_note": texto estructurado de la sesión clínica (null si no hay información de sesión)
- "interpretation": resumen breve de lo que interpretaste

Reglas para field_changes:
- Solo modifica campos mencionados explícita o implícitamente.
- Para fechas, usa formato YYYY-MM-DD.
- Para sexo, usa "hombre" o "mujer".
- Si dice "segundo apellido", modifica last_name añadiendo/cambiando la segunda palabra.
- Resuelve ambigüedades razonables.

Reglas para session_note:
- Extrae información sobre sesiones, visitas, tratamientos, evolución del paciente.
- Si menciona un doctor/profesional, inclúyelo.
- Estructura el texto de forma clara y profesional.
- Si no hay información de sesión, devuelve null.

IMPORTANTE: Un mismo audio puede contener AMBAS cosas. Por ejemplo:
"Cambia el email del paciente a nuevo@email.com y añade que hoy tuvo sesión con el doctor Pedro donde se trabajó movilidad lumbar"
→ field_changes: [{field: "email", new_value: "nuevo@email.com", reason: "..."}]
→ session_note: "Sesión con Dr. Pedro. Se trabajó movilidad lumbar."`,
          },
          {
            role: "user",
            content: `Ficha actual del paciente/contacto:\n${currentValues}\n\nTranscripción del audio: "${transcription}"`,
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
                    description: "Cambios a aplicar en los campos de la ficha. Vacío si no hay cambios de datos.",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string", description: "Nombre del campo a modificar" },
                        new_value: { type: "string", description: "Nuevo valor" },
                        reason: { type: "string", description: "Explicación breve" },
                      },
                      required: ["field", "new_value", "reason"],
                    },
                  },
                  session_note: {
                    type: "string",
                    nullable: true,
                    description: "Contenido estructurado de la nota de sesión. null si no hay información de sesión.",
                  },
                  interpretation: {
                    type: "string",
                    description: "Resumen de lo que se interpretó del audio.",
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
        return new Response(JSON.stringify({ error: "Límite de peticiones excedido. Inténtalo de nuevo en unos segundos." }), {
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
    const { field_changes = [], session_note, interpretation } = parsed;

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
        fieldsChanged.push({
          field: change.field,
          label: editableFields[change.field],
          old_value: oldValue ?? null,
          new_value: change.new_value,
          reason: change.reason,
        });
      }

      if (Object.keys(updateObj).length > 0) {
        const { error: updateErr } = await supabaseAdmin
          .from(table)
          .update(updateObj)
          .eq("id", entity_id);
        if (updateErr) console.error("Update error:", updateErr);

        // Save voice edit traceability
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

        // Update synopsis
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
