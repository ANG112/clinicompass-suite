// process-voice-unified: clasifica una transcripción de voz y la envía al destino correcto.
// Reglas estrictas:
//   - Si la voz menciona explícitamente "sesión N" / "nueva sesión" / "en la sesión X":
//        → va a sesiones (crear o añadir a una existente)
//   - Si la voz menciona campos básicos de la ficha (centro, dirección, teléfono,
//     profesional asignado, etc.) → modifica la ficha
//   - Si no menciona ni "sesión" ni un campo concreto pero da contenido clínico →
//     se añade al campo de notas (campo `notes`) del contacto/paciente,
//     NO se crea sesión automáticamente.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;

async function regenerateSessionSummary(admin: any, sessionId: string): Promise<string> {
  const { data: entries } = await admin
    .from("patient_session_entries")
    .select("content, created_at, source")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const entriesText = (entries || [])
    .map((e: any, i: number) => `[Aportación ${i + 1} · ${new Date(e.created_at).toLocaleString("es-ES")} · ${e.source}]\n${e.content}`)
    .join("\n\n");
  if (!entriesText) return "";

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Eres un asistente clínico. Genera un resumen profesional, claro, en español, sin markdown, máx 8-10 líneas, integrando todas las aportaciones de la sesión sin duplicidades. Reformula, no copies literal." },
        { role: "user", content: `Aportaciones de la sesión:\n\n${entriesText}\n\nResumen actualizado de la sesión:` },
      ],
    }),
  });
  if (!r.ok) return "";
  const d = await r.json();
  return (d.choices?.[0]?.message?.content || "").trim();
}

async function regenerateGlobalSynopsis(admin: any, idCol: string, entityId: string, staffId: string | null) {
  const { data: sessions } = await admin
    .from("patient_sessions")
    .select("session_number, session_date, summary")
    .eq(idCol, entityId)
    .order("session_number", { ascending: true });

  const sessionsText = (sessions || [])
    .filter((s: any) => s.summary)
    .map((s: any) => `Sesión ${s.session_number} (${new Date(s.session_date).toLocaleDateString("es-ES")}):\n${s.summary}`)
    .join("\n\n");

  const { data: existing } = await admin
    .from("patient_synopsis")
    .select("id")
    .eq(idCol, entityId)
    .maybeSingle();

  if (!sessionsText) {
    if (existing) await admin.from("patient_synopsis").update({ content: "", updated_by: staffId }).eq("id", existing.id);
    return;
  }

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `Eres un asistente clínico. Genera una SINOPSIS GLOBAL del estado del paciente basándote SOLO en los resúmenes de sesión proporcionados.

Objetivo: una ficha resumen útil para que cualquier profesional entienda el caso de un vistazo, conservando contexto clínico relevante sin convertirse en un texto largo.

Reglas:
- Español, sin markdown, sin viñetas, en párrafos breves.
- Extensión orientativa: 12 a 18 líneas. NO ultracorta, NO larguísima.
- Estructura sugerida (omite secciones sin contenido):
  1. Motivo principal y diagnóstico/sospecha actual.
  2. Evolución global a lo largo de las sesiones (mejoras, retrocesos, estabilidad).
  3. Tratamiento/plan en curso y adherencia.
  4. Incidencias o eventos relevantes (efectos adversos, derivaciones, pruebas).
  5. Recomendaciones activas y próximos pasos.
  6. Observaciones clínicas u operativas importantes (alergias, contexto personal relevante, contraindicaciones).
- Prioriza información reciente, pero NO descartes datos antiguos clínicamente relevantes (alergias, antecedentes, diagnósticos previos).
- Integra y sintetiza, no copies literal una sesión.
- No inventes datos que no aparezcan en las sesiones.`,
        },
        { role: "user", content: `Resúmenes de sesión del paciente:\n\n${sessionsText}\n\nGenera la sinopsis global actualizada:` },
      ],
    }),
  });
  if (!r.ok) return;
  const d = await r.json();
  const synopsis = (d.choices?.[0]?.message?.content || "").trim();
  if (!synopsis) return;
  if (existing) await admin.from("patient_synopsis").update({ content: synopsis, updated_by: staffId }).eq("id", existing.id);
  else await admin.from("patient_synopsis").insert({ content: synopsis, updated_by: staffId, [idCol]: entityId });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, supabaseKey);
    const { data: claims, error: authErr } = await (supabaseAuth.auth as any).getClaims(token);
    if (authErr || !claims) throw new Error("Unauthorized");
    const userId = claims.claims?.sub;
    if (!userId) throw new Error("Unauthorized: no sub");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: staffProfile } = await admin
      .from("staff_profiles")
      .select("id, first_name, last_name")
      .eq("user_id", userId)
      .maybeSingle();
    const staffId = staffProfile?.id || null;

    const { transcription, entity_type, entity_id, audio_file_path } = await req.json();
    if (!transcription || !entity_type || !entity_id) throw new Error("Missing transcription/entity_type/entity_id");

    const table = entity_type === "patient" ? "patients" : "contacts";
    const idCol = entity_type === "patient" ? "patient_id" : "contact_id";

    // Fetch current record + active centers + staff catalog + existing sessions
    const [{ data: currentRecord, error: fErr }, { data: centers }, { data: allStaff }, { data: existingSessions }] = await Promise.all([
      admin.from(table).select("*, center:centers(id, name, city)").eq("id", entity_id).single(),
      admin.from("centers").select("id, name, city").is("deleted_at", null).eq("active", true),
      admin.from("staff_profiles").select("id, first_name, last_name").eq("active", true),
      admin.from("patient_sessions").select("id, session_number, session_date").eq(idCol, entity_id).order("session_number", { ascending: true }),
    ]);
    if (fErr) throw new Error(`Record not found: ${fErr.message}`);

    const centerCatalog = (centers || []).map((c: any) => `  • ${c.name}${c.city ? ` (${c.city})` : ""} → id: ${c.id}`).join("\n");
    const staffCatalog = (allStaff || []).map((s: any) => `  • ${s.first_name} ${s.last_name} → id: ${s.id}`).join("\n");
    const sessionsCatalog = (existingSessions || []).map((s: any) => `  • Sesión ${s.session_number} (${new Date(s.session_date).toLocaleDateString("es-ES")}) → id: ${s.id}`).join("\n") || "  (sin sesiones todavía)";

    const editableFields: Record<string, string> = {
      first_name: "Nombre",
      last_name: "Apellido(s)",
      nif: "NIF/DNI",
      birth_date: "Fecha de nacimiento (YYYY-MM-DD)",
      sex: "Sexo (hombre/mujer)",
      phone: "Teléfono",
      email: "Email",
      address: "Dirección postal (calle, número, piso) — NO usar para centro clínico",
      city: "Ciudad",
      postal_code: "Código postal",
      notes: "Notas internas / información clínica acumulada",
      source: "Canal de captación",
      company_name: "Empresa",
      assigned_professional_id: "Profesional asignado del paciente (UUID de staff)",
      center_id: "Centro clínico asignado (UUID del centro)",
      fiscal_name: "Nombre fiscal",
      fiscal_nif: "NIF fiscal",
      fiscal_address: "Dirección fiscal",
      fiscal_email: "Email fiscal",
      fiscal_phone: "Teléfono fiscal",
    };

    const currentValues = Object.entries(editableFields).map(([key, label]) => {
      if (key === "center_id") {
        const cur = currentRecord.center ? `${currentRecord.center.name}${currentRecord.center.city ? ` (${currentRecord.center.city})` : ""}` : "(vacío)";
        return `- ${label} (${key}): ${cur}`;
      }
      return `- ${label} (${key}): ${currentRecord[key] ?? "(vacío)"}`;
    }).join("\n");

    // ============= LLM CLASSIFICATION + EXTRACTION =============
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un asistente de un CRM clínico. Recibes una transcripción de voz dictada por un profesional sanitario sobre la ficha de un paciente/contacto.

Debes decidir y devolver, mediante la función "process_voice", una de estas tres rutas (o combinación de ellas):

1) FIELD_CHANGES — modifica campos de la FICHA BÁSICA (datos fijos del paciente).
2) SESSION_ACTION — operación sobre una SESIÓN clínica concreta. SOLO si el usuario menciona EXPLÍCITAMENTE "sesión", "sesión nueva", "nueva sesión", "sesión X", "en la sesión X", "crea una sesión", "añade en la sesión X". Si no aparece la palabra "sesión" o equivalente claro, NUNCA uses session_action.
3) NOTES_APPEND — el usuario da contenido clínico/operativo libre PERO no menciona ninguna sesión y no menciona campos concretos. En ese caso, añade el contenido al campo "notes" del paciente/contacto, anteponiendo la fecha actual en formato [DD/MM/YYYY HH:mm] y manteniendo el contenido anterior intacto.

================================================
REGLAS CRÍTICAS — CENTRO vs DIRECCIÓN
================================================
• "centro" / "sede" / "clínica" → SIEMPRE field_changes con field="center_id" usando UUID del catálogo. NUNCA "address".
• "dirección" / "domicilio" / "calle" / "vive en" → SIEMPRE field_changes con field="address". NUNCA "center_id".
Si dudas, NO incluyas el cambio.

================================================
CATÁLOGO DE CENTROS DISPONIBLES (UUIDs exactos)
================================================
${centerCatalog || "  (sin centros)"}

================================================
CATÁLOGO DE STAFF (UUIDs para assigned_professional_id y para session.professional_id)
================================================
${staffCatalog || "  (sin staff)"}

================================================
SESIONES EXISTENTES DEL PACIENTE
================================================
${sessionsCatalog}

================================================
REGLAS DE SESSION_ACTION
================================================
Tipos:
- "create_session": el usuario dice "crea una nueva sesión", "nueva sesión de hoy", etc. Devuelve session_date (ISO si lo dice), professional_id (UUID si menciona doctor), y content (el contenido inicial dictado, ya redactado, NO la transcripción literal).
- "append_to_session": el usuario dice "añade en la sesión 4 que…", "en la sesión 2 el doctor dijo…". Devuelve session_id (busca por session_number en el catálogo) y content.
- Si el usuario menciona un profesional al crear/añadir, intenta hacer match contra el catálogo de staff y devuelve professional_id.

================================================
REGLA NOTES_APPEND
================================================
Solo si NO hay session_action y NO hay field_changes y SÍ hay contenido clínico libre.
- Genera "notes_append" con el texto a añadir (limpio, profesional, sin "el usuario dijo…").

================================================
FICHA ACTUAL
================================================
${currentValues}`,
          },
          {
            role: "user",
            content: `Transcripción del audio: "${transcription}"\n\nClasifica y devuelve la acción correspondiente.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "process_voice",
            description: "Clasifica y extrae acciones de la voz.",
            parameters: {
              type: "object",
              properties: {
                field_changes: {
                  type: "array",
                  description: "Cambios a aplicar en la ficha básica.",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      new_value: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["field", "new_value", "reason"],
                  },
                },
                session_action: {
                  type: "object",
                  nullable: true,
                  description: "Operación de sesión si el usuario lo mencionó explícitamente.",
                  properties: {
                    type: { type: "string", enum: ["create_session", "append_to_session"] },
                    session_id: { type: "string", nullable: true },
                    session_date: { type: "string", nullable: true },
                    professional_id: { type: "string", nullable: true },
                    content: { type: "string" },
                  },
                  required: ["type", "content"],
                },
                notes_append: {
                  type: "string",
                  nullable: true,
                  description: "Texto a añadir al campo notes si no hay sesión ni campo concreto.",
                },
                interpretation: { type: "string" },
              },
              required: ["field_changes", "session_action", "notes_append", "interpretation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "process_voice" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI error:", aiResponse.status, t);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Límite de peticiones excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Error al procesar con IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("La IA no pudo interpretar la instrucción");
    const parsed = JSON.parse(toolCall.function.arguments);
    let { field_changes = [], session_action, notes_append, interpretation } = parsed;

    // ============= GUARDS post-LLM =============
    const transNorm = normalize(transcription);
    const mentionsCenter = /(\bcentro\b|\bsede\b|\bclinica\b|\bcl[ií]nica\b)/.test(transNorm);
    const mentionsAddress = /(\bdirecc[ií]on\b|\bdomicilio\b|\bcalle\b|\bavenida\b|\bavda\b|\bvive en\b|\bplaza\b)/.test(transNorm);
    const mentionsSession = /(\bsesi[oó]n\b|\bsesiones\b)/.test(transNorm);
    const centerIds = new Set((centers || []).map((c: any) => c.id));

    field_changes = (field_changes || []).filter((c: any) => {
      if (c.field === "address" && mentionsCenter && !mentionsAddress) return false;
      if (c.field === "center_id" && mentionsAddress && !mentionsCenter) return false;
      if (c.field === "center_id" && !centerIds.has(c.new_value)) return false;
      return true;
    });

    // Hard guard: si la IA propuso session_action pero el usuario NO mencionó "sesión" → descarta
    if (session_action && !mentionsSession) {
      // Si hay contenido, lo redirigimos a notes_append
      if (!notes_append && session_action.content) notes_append = session_action.content;
      session_action = null;
    }

    const results: any = {
      field_changes_applied: [] as any[],
      session_action_result: null as any,
      notes_appended: false,
      interpretation: interpretation || "",
    };

    // ============= APPLY FIELD CHANGES =============
    if (field_changes.length > 0) {
      const updateObj: Record<string, any> = {};
      const fieldsChanged: any[] = [];
      for (const change of field_changes) {
        if (!(change.field in editableFields)) continue;
        const oldValue = currentRecord[change.field];
        updateObj[change.field] = change.new_value === "" ? null : change.new_value;

        let displayOld: any = oldValue ?? null;
        let displayNew: any = change.new_value;
        if (change.field === "center_id") {
          displayOld = currentRecord.center?.name ?? null;
          const tgt = (centers || []).find((c: any) => c.id === change.new_value);
          displayNew = tgt ? tgt.name : change.new_value;
        }
        if (change.field === "assigned_professional_id") {
          const tgt = (allStaff || []).find((s: any) => s.id === change.new_value);
          displayNew = tgt ? `${tgt.first_name} ${tgt.last_name}` : change.new_value;
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
        const { error: updErr } = await admin.from(table).update(updateObj).eq("id", entity_id);
        if (updErr) console.error("Update error:", updErr);
        await admin.from("patient_voice_edits").insert({
          [idCol]: entity_id,
          created_by: staffId,
          transcription,
          interpreted_instruction: interpretation,
          fields_changed: fieldsChanged,
          audio_file_path: audio_file_path || null,
        });
        results.field_changes_applied = fieldsChanged;
      }
    }

    // ============= SESSION ACTION =============
    if (session_action) {
      if (session_action.type === "create_session") {
        const { data: session, error: cErr } = await admin
          .from("patient_sessions")
          .insert({
            [idCol]: entity_id,
            session_date: session_action.session_date || new Date().toISOString(),
            professional_id: session_action.professional_id || staffId,
            created_by: staffId,
            updated_by: staffId,
            status: "activa",
            summary: "",
          })
          .select()
          .single();
        if (cErr) throw new Error(`Error creando sesión: ${cErr.message}`);

        await admin.from("patient_session_entries").insert({
          session_id: session.id,
          source: "voice",
          content: session_action.content,
          transcription,
          audio_file_path: audio_file_path || null,
          created_by: staffId,
        });

        const summary = await regenerateSessionSummary(admin, session.id);
        await admin.from("patient_sessions").update({ summary, updated_by: staffId }).eq("id", session.id);
        await regenerateGlobalSynopsis(admin, idCol, entity_id, staffId);
        results.session_action_result = { type: "created", session_id: session.id, session_number: session.session_number };
      } else if (session_action.type === "append_to_session" && session_action.session_id) {
        // Verify session belongs
        const { data: sExists } = await admin
          .from("patient_sessions")
          .select("id, session_number")
          .eq("id", session_action.session_id)
          .eq(idCol, entity_id)
          .maybeSingle();
        if (!sExists) {
          results.session_action_result = { type: "error", message: "Sesión no encontrada" };
        } else {
          await admin.from("patient_session_entries").insert({
            session_id: sExists.id,
            source: "voice",
            content: session_action.content,
            transcription,
            audio_file_path: audio_file_path || null,
            created_by: staffId,
          });
          if (session_action.professional_id) {
            await admin.from("patient_sessions")
              .update({ professional_id: session_action.professional_id, updated_by: staffId })
              .eq("id", sExists.id);
          }
          const summary = await regenerateSessionSummary(admin, sExists.id);
          await admin.from("patient_sessions").update({ summary, updated_by: staffId }).eq("id", sExists.id);
          await regenerateGlobalSynopsis(admin, idCol, entity_id, staffId);
          results.session_action_result = { type: "appended", session_id: sExists.id, session_number: sExists.session_number };
        }
      }
    }

    // ============= NOTES APPEND =============
    if (notes_append && !session_action) {
      const stamp = new Date().toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const previous = (currentRecord.notes || "").trim();
      const newNotes = previous ? `${previous}\n\n[${stamp}] ${notes_append.trim()}` : `[${stamp}] ${notes_append.trim()}`;
      await admin.from(table).update({ notes: newNotes }).eq("id", entity_id);
      results.notes_appended = true;
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
