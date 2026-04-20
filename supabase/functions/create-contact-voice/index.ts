// Asistente de voz externo (fuera de la ficha): clasifica la instrucción
// dictada por el profesional y enruta a la acción correcta.
//
// Intenciones soportadas:
//   1) create_contact   — "Crea un contacto llamado..."
//   2) create_session   — "Crea una nueva sesión para [paciente] con..."
//   3) append_to_session — "Añade en la sesión 4 de [paciente] que..."
//
// Para 2/3 resuelve el paciente/contacto por nombre dictado y delega
// la creación/append en patient_sessions + patient_session_entries
// (mismo modelo que process-voice-unified), regenerando resumen y sinopsis.
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

async function aiCall(messages: any[]): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!r.ok) throw new Error(`AI gateway ${r.status}`);
  const d = await r.json();
  return (d.choices?.[0]?.message?.content || "").trim();
}

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
  return await aiCall([
    { role: "system", content: "Eres un asistente clínico. Genera un resumen profesional, claro, en español, sin markdown, máx 8-10 líneas, integrando todas las aportaciones de la sesión sin duplicidades. Reformula, no copies literal." },
    { role: "user", content: `Aportaciones de la sesión:\n\n${entriesText}\n\nResumen actualizado de la sesión:` },
  ]);
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
  const synopsis = await aiCall([
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
    { role: "user", content: `Resúmenes de sesión del paciente:\n\n${sessionsText}\n\nSinopsis global actualizada:` },
  ]);
  if (!synopsis) return;
  if (existing) await admin.from("patient_synopsis").update({ content: synopsis, updated_by: staffId }).eq("id", existing.id);
  else await admin.from("patient_synopsis").insert({ content: synopsis, updated_by: staffId, [idCol]: entityId });
}

// Resuelve un paciente o contacto por nombre dictado.
// Devuelve { entity_type, entity_id, display_name } o null si no hay match claro.
async function resolveEntityByName(admin: any, nameRaw: string): Promise<{ entity_type: "patient" | "contact"; entity_id: string; display_name: string } | null> {
  const name = normalize(nameRaw);
  if (!name) return null;
  const tokens = name.split(/\s+/).filter(t => t.length >= 3);
  if (tokens.length === 0) return null;

  const [{ data: patients }, { data: contacts }] = await Promise.all([
    admin.from("patients").select("id, first_name, last_name").is("deleted_at", null),
    admin.from("contacts").select("id, first_name, last_name").is("deleted_at", null),
  ]);

  type Cand = { entity_type: "patient" | "contact"; entity_id: string; display_name: string; score: number };
  const candidates: Cand[] = [];
  const score = (full: string) => {
    const f = normalize(full);
    let s = 0;
    for (const t of tokens) if (f.includes(t)) s += t.length;
    // exact full match bonus
    if (f === name) s += 100;
    return s;
  };
  for (const p of patients || []) {
    const full = `${p.first_name} ${p.last_name || ""}`.trim();
    const sc = score(full);
    if (sc > 0) candidates.push({ entity_type: "patient", entity_id: p.id, display_name: full, score: sc });
  }
  for (const c of contacts || []) {
    const full = `${c.first_name} ${c.last_name || ""}`.trim();
    const sc = score(full);
    if (sc > 0) candidates.push({ entity_type: "contact", entity_id: c.id, display_name: full, score: sc });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  // require a minimum confidence
  if (candidates[0].score < 4) return null;
  return candidates[0];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: authErr } = await supabaseAuth.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (authErr || !userId) throw new Error("Unauthorized");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: staffProfile } = await admin
      .from("staff_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const staffId = staffProfile?.id || null;

    const { transcription } = await req.json();
    if (!transcription || typeof transcription !== "string") {
      throw new Error("Missing transcription");
    }

    // Catálogos
    const [{ data: centers }, { data: categories }, { data: allStaff }] = await Promise.all([
      admin.from("centers").select("id, name, city").is("deleted_at", null).eq("active", true),
      admin.from("contact_categories").select("id, name, label").order("position"),
      admin.from("staff_profiles").select("id, first_name, last_name").eq("active", true),
    ]);

    const centerCatalog = (centers || []).map((c: any) => `  • ${c.name}${c.city ? ` (${c.city})` : ""} → id: ${c.id}`).join("\n");
    const categoryCatalog = (categories || []).map((c: any) => `  • ${c.label} → name: "${c.name}"`).join("\n");
    const staffCatalog = (allStaff || []).map((s: any) => `  • ${s.first_name} ${s.last_name} → id: ${s.id}`).join("\n");

    // ============= LLM: clasificación de intención =============
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un asistente de un CRM clínico. Recibes una instrucción dictada por voz por un profesional sanitario, FUERA de la ficha de un paciente. Debes clasificar y devolver una de tres intenciones llamando a la función "route_voice":

1) "create_contact" — el usuario quiere crear un contacto nuevo. Frases típicas: "crea un contacto…", "nuevo contacto llamado…", "añade un cliente…".
2) "create_session" — el usuario quiere crear una nueva sesión clínica para un paciente/contacto YA EXISTENTE. Frases típicas: "crea una nueva sesión para [nombre]…", "nueva sesión de hoy con [paciente]…", "abre una sesión a [nombre]…". REQUIERE patient_name.
3) "append_to_session" — el usuario quiere añadir una aportación a una sesión existente de un paciente/contacto. Frases típicas: "añade en la sesión 4 de [nombre] que…", "en la sesión 2 del paciente [nombre]…". REQUIERE patient_name y session_number.

REGLAS DE DECISIÓN:
- Si la instrucción menciona explícitamente "sesión" / "sesiones" Y un nombre de paciente → es create_session o append_to_session.
- Si menciona "sesión" pero también "número 4", "sesión 4", "en la sesión X" → append_to_session.
- Si menciona "nueva sesión", "abre una sesión", "crea una sesión" → create_session.
- Si NO menciona "sesión" → create_contact.
- Si la intención es ambigua, devuelve clarification_needed=true en interpretation.

PARA create_session / append_to_session:
- "patient_name": nombre tal como se dictó (lo usaremos para hacer match).
- "content": redacta limpio y profesional el contenido clínico/operativo dictado (NO transcripción literal, NO incluyas la frase "crea sesión").
- "session_date" (opcional, ISO): si dice "ayer", "hoy a las 10", etc., normaliza.
- "professional_id" (opcional): si menciona un doctor/profesional, busca en el catálogo de staff.
- "session_number" (solo append): número de sesión mencionado.

PARA create_contact:
- Extrae todos los campos del esquema (first_name OBLIGATORIO).
- "category_name": uno del catálogo, por defecto "lead".
- "center_id": UUID exacto del catálogo si dice "centro/sede/clínica X". NUNCA poner el centro en address.
- Normaliza teléfono (solo dígitos y +), email en minúscula, fecha YYYY-MM-DD, sexo "hombre"|"mujer".

REGLA CRÍTICA — CENTRO vs DIRECCIÓN:
- "centro" / "sede" / "clínica" → center_id (UUID del catálogo). NUNCA address.
- "dirección" / "domicilio" / "calle" / "vive en" → address. NUNCA center_id.

================================================
CATÁLOGO DE CENTROS
================================================
${centerCatalog || "  (sin centros)"}

================================================
CATÁLOGO DE CATEGORÍAS DE CONTACTO
================================================
${categoryCatalog || "  (sin categorías)"}

================================================
CATÁLOGO DE STAFF (para professional_id)
================================================
${staffCatalog || "  (sin staff)"}`,
          },
          { role: "user", content: `Transcripción: "${transcription}"` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "route_voice",
            description: "Clasifica la instrucción y extrae los datos correspondientes.",
            parameters: {
              type: "object",
              properties: {
                intent: { type: "string", enum: ["create_contact", "create_session", "append_to_session"] },
                interpretation: { type: "string", description: "Resumen breve de lo interpretado o motivo de error/ambigüedad." },

                // create_contact
                contact: {
                  type: "object",
                  nullable: true,
                  properties: {
                    first_name: { type: "string" },
                    last_name: { type: "string", nullable: true },
                    email: { type: "string", nullable: true },
                    phone: { type: "string", nullable: true },
                    nif: { type: "string", nullable: true },
                    birth_date: { type: "string", nullable: true },
                    sex: { type: "string", nullable: true },
                    address: { type: "string", nullable: true },
                    city: { type: "string", nullable: true },
                    postal_code: { type: "string", nullable: true },
                    company_name: { type: "string", nullable: true },
                    source: { type: "string", nullable: true },
                    notes: { type: "string", nullable: true },
                    center_id: { type: "string", nullable: true },
                    category_name: { type: "string" },
                  },
                },

                // session common
                patient_name: { type: "string", nullable: true },
                content: { type: "string", nullable: true },
                session_date: { type: "string", nullable: true },
                professional_id: { type: "string", nullable: true },
                session_number: { type: "number", nullable: true },
              },
              required: ["intent", "interpretation"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "route_voice" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Límite de peticiones excedido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Créditos de IA agotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Error al procesar con IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("La IA no pudo interpretar la instrucción");

    const parsed = JSON.parse(toolCall.function.arguments);
    const { intent, interpretation } = parsed;

    // Hard-guard: si la instrucción contiene "sesión" pero la IA dijo create_contact, fuerza la corrección.
    const transNorm = normalize(transcription);
    const mentionsSession = /(\bsesi[oó]n\b|\bsesiones\b)/.test(transNorm);
    const mentionsCreate = /(\bcrea\b|\bcrear\b|\bnueva\b|\bnuevo\b|\babre\b|\babrir\b|\banade\b|\ba[nñ]ade\b|\ba[nñ]adir\b|\banadir\b)/.test(transNorm);
    let effectiveIntent: string = intent;
    if (mentionsSession && intent === "create_contact") {
      effectiveIntent = mentionsCreate ? "create_session" : "append_to_session";
    }

    // ===================================================================
    // INTENT: create_session / append_to_session
    // ===================================================================
    if (effectiveIntent === "create_session" || effectiveIntent === "append_to_session") {
      const patientName: string | null = parsed.patient_name || null;
      const content: string | null = parsed.content || null;

      if (!patientName) {
        return new Response(JSON.stringify({
          error: "No se identificó claramente el paciente. Indica el nombre, ej: 'Crea una nueva sesión para Juan Pérez con...'",
          interpretation,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!content || !content.trim()) {
        return new Response(JSON.stringify({
          error: "No se detectó contenido para añadir a la sesión.",
          interpretation,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const resolved = await resolveEntityByName(admin, patientName);
      if (!resolved) {
        return new Response(JSON.stringify({
          error: `No se encontró ningún paciente o contacto que coincida con "${patientName}".`,
          interpretation,
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const idCol = resolved.entity_type === "patient" ? "patient_id" : "contact_id";

      if (effectiveIntent === "create_session") {
        const { data: session, error: cErr } = await admin
          .from("patient_sessions")
          .insert({
            [idCol]: resolved.entity_id,
            session_date: parsed.session_date || new Date().toISOString(),
            professional_id: parsed.professional_id || staffId,
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
          content: content.trim(),
          transcription,
          created_by: staffId,
        });

        const summary = await regenerateSessionSummary(admin, session.id);
        await admin.from("patient_sessions").update({ summary, updated_by: staffId }).eq("id", session.id);
        await regenerateGlobalSynopsis(admin, idCol, resolved.entity_id, staffId);

        return new Response(JSON.stringify({
          success: true,
          intent: "create_session",
          interpretation,
          session: { id: session.id, session_number: session.session_number },
          entity: resolved,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // append_to_session
      const sessionNumber = parsed.session_number;
      if (!sessionNumber) {
        return new Response(JSON.stringify({
          error: "Indica el número de sesión, ej: 'añade en la sesión 4 de Juan Pérez que...'",
          interpretation,
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: targetSession } = await admin
        .from("patient_sessions")
        .select("id, session_number")
        .eq(idCol, resolved.entity_id)
        .eq("session_number", sessionNumber)
        .maybeSingle();
      if (!targetSession) {
        return new Response(JSON.stringify({
          error: `${resolved.display_name} no tiene una sesión número ${sessionNumber}.`,
          interpretation,
        }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await admin.from("patient_session_entries").insert({
        session_id: targetSession.id,
        source: "voice",
        content: content.trim(),
        transcription,
        created_by: staffId,
      });
      if (parsed.professional_id) {
        await admin.from("patient_sessions")
          .update({ professional_id: parsed.professional_id, updated_by: staffId })
          .eq("id", targetSession.id);
      }
      const summary = await regenerateSessionSummary(admin, targetSession.id);
      await admin.from("patient_sessions").update({ summary, updated_by: staffId }).eq("id", targetSession.id);
      await regenerateGlobalSynopsis(admin, idCol, resolved.entity_id, staffId);

      return new Response(JSON.stringify({
        success: true,
        intent: "append_to_session",
        interpretation,
        session: { id: targetSession.id, session_number: targetSession.session_number },
        entity: resolved,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===================================================================
    // INTENT: create_contact (legacy)
    // ===================================================================
    const contact = parsed.contact || {};
    if (!contact.first_name || String(contact.first_name).trim() === "") {
      return new Response(JSON.stringify({
        error: "No se detectó un nombre claro en el audio. Indica al menos el nombre del contacto.",
        interpretation,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cat = (categories || []).find((c: any) => c.name === contact.category_name) ||
                (categories || []).find((c: any) => c.name === "lead") ||
                (categories || [])[0];
    if (!cat) {
      return new Response(JSON.stringify({ error: "No hay categorías de contacto configuradas." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let center_id: string | null = contact.center_id || null;
    if (center_id && !(centers || []).some((c: any) => c.id === center_id)) center_id = null;

    const mentionsCenter = /(\bcentro\b|\bsede\b|\bclinica\b|\bcl[ií]nica\b)/.test(transNorm);
    const mentionsAddress = /(\bdirecc[ií]on\b|\bdomicilio\b|\bcalle\b|\bavenida\b|\bavda\b|\bvive en\b|\bplaza\b)/.test(transNorm);
    let address = contact.address || null;
    if (mentionsCenter && !mentionsAddress && address) address = null;

    const insertObj: Record<string, any> = {
      first_name: String(contact.first_name).trim(),
      last_name: contact.last_name?.trim() || null,
      email: contact.email ? String(contact.email).toLowerCase().trim() : null,
      phone: contact.phone ? String(contact.phone).replace(/[\s\-]/g, "") : null,
      nif: contact.nif?.trim() || null,
      birth_date: contact.birth_date || null,
      sex: contact.sex || null,
      address,
      city: contact.city?.trim() || null,
      postal_code: contact.postal_code?.trim() || null,
      company_name: contact.company_name?.trim() || null,
      source: contact.source?.trim() || "voz",
      notes: contact.notes?.trim() || null,
      center_id,
      category_id: cat.id,
    };

    const { data: created, error: insertErr } = await admin
      .from("contacts")
      .insert(insertObj)
      .select("*, category:contact_categories(name, label), center:centers(name)")
      .single();
    if (insertErr) {
      console.error("Insert contact error:", insertErr);
      throw new Error(`Error creando contacto: ${insertErr.message}`);
    }

    await admin.from("patient_voice_edits").insert({
      contact_id: created.id,
      created_by: staffId,
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
      intent: "create_contact",
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
