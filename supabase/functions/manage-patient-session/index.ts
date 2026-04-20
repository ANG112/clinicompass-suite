// Edge function: gestiona sesiones clínicas individuales.
// Acciones soportadas: create, add_entry, update_summary, delete.
// En cada caso recalcula el resumen acumulativo de la sesión y la sinopsis global.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;

interface SessionEntry { content: string; created_at: string; source: string; }

async function aiCall(messages: any[]): Promise<string> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`AI gateway error ${r.status}: ${t}`);
  }
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
    .map((e: SessionEntry, i: number) => `[Aportación ${i + 1} · ${new Date(e.created_at).toLocaleString("es-ES")} · ${e.source}]\n${e.content}`)
    .join("\n\n");

  if (!entriesText) return "";

  const summary = await aiCall([
    {
      role: "system",
      content: `Eres un asistente clínico. Recibes el conjunto de aportaciones realizadas durante UNA SESIÓN concreta del paciente y debes generar un resumen profesional, limpio y estructurado de esa sesión.
Reglas:
- Resumen en español, claro, sin markdown, máximo 8-10 líneas.
- Integra TODA la información de las aportaciones, evitando duplicidades.
- No copies literalmente la transcripción: reformula con lenguaje clínico/operativo profesional.
- Estructura sugerida: motivo, observaciones del profesional, evolución, plan/tratamiento, próximos pasos. Omite secciones sin contenido.
- No inventes datos.`,
    },
    {
      role: "user",
      content: `Aportaciones de la sesión:\n\n${entriesText}\n\nGenera el resumen actualizado de esta sesión:`,
    },
  ]);
  return summary;
}

async function regenerateGlobalSynopsis(admin: any, idCol: "patient_id" | "contact_id", entityId: string, staffProfileId: string | null) {
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
    if (existing) {
      await admin.from("patient_synopsis").update({ content: "", updated_by: staffProfileId }).eq("id", existing.id);
    }
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
    {
      role: "user",
      content: `Resúmenes de sesión del paciente:\n\n${sessionsText}\n\nGenera la sinopsis global actualizada:`,
    },
  ]);

  if (existing) {
    await admin.from("patient_synopsis").update({ content: synopsis, updated_by: staffProfileId }).eq("id", existing.id);
  } else {
    await admin.from("patient_synopsis").insert({ content: synopsis, updated_by: staffProfileId, [idCol]: entityId });
  }
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
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    const staffId = staffProfile?.id || null;

    const body = await req.json();
    const { action, entity_type, entity_id } = body;
    if (!action || !entity_type || !entity_id) throw new Error("Missing action / entity_type / entity_id");

    const idCol = entity_type === "patient" ? "patient_id" : "contact_id";

    if (action === "create") {
      const { initial_content, source = "manual", transcription, audio_file_path, session_date, professional_id } = body;
      const insertObj: Record<string, any> = {
        [idCol]: entity_id,
        session_date: session_date || new Date().toISOString(),
        professional_id: professional_id ?? staffId,
        created_by: staffId,
        updated_by: staffId,
        summary: "",
        status: "activa",
      };
      const { data: session, error: sErr } = await admin
        .from("patient_sessions")
        .insert(insertObj)
        .select()
        .single();
      if (sErr) throw new Error(`Error creando sesión: ${sErr.message}`);

      if (initial_content && initial_content.trim()) {
        await admin.from("patient_session_entries").insert({
          session_id: session.id,
          source,
          content: initial_content.trim(),
          transcription: transcription || null,
          audio_file_path: audio_file_path || null,
          created_by: staffId,
        });
        const summary = await regenerateSessionSummary(admin, session.id);
        await admin.from("patient_sessions").update({ summary, updated_by: staffId }).eq("id", session.id);
        session.summary = summary;
        await regenerateGlobalSynopsis(admin, idCol, entity_id, staffId);
      }

      return new Response(JSON.stringify({ success: true, session }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "add_entry") {
      const { session_id, content, source = "manual", transcription, audio_file_path } = body;
      if (!session_id || !content) throw new Error("Missing session_id or content");

      const { data: existingSession, error: gErr } = await admin
        .from("patient_sessions")
        .select("id, " + idCol)
        .eq("id", session_id)
        .single();
      if (gErr || !existingSession || (existingSession as any)[idCol] !== entity_id) {
        throw new Error("Sesión no encontrada o no pertenece a esta entidad");
      }

      await admin.from("patient_session_entries").insert({
        session_id,
        source,
        content,
        transcription: transcription || null,
        audio_file_path: audio_file_path || null,
        created_by: staffId,
      });

      const summary = await regenerateSessionSummary(admin, session_id);
      await admin.from("patient_sessions").update({ summary, updated_by: staffId }).eq("id", session_id);
      await regenerateGlobalSynopsis(admin, idCol, entity_id, staffId);

      return new Response(JSON.stringify({ success: true, summary }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update_session") {
      const { session_id, summary, session_date, professional_id, status } = body;
      if (!session_id) throw new Error("Missing session_id");
      const updates: Record<string, any> = { updated_by: staffId };
      if (summary !== undefined) updates.summary = summary;
      if (session_date !== undefined) updates.session_date = session_date;
      if (professional_id !== undefined) updates.professional_id = professional_id;
      if (status !== undefined) updates.status = status;

      const { error } = await admin.from("patient_sessions").update(updates).eq("id", session_id);
      if (error) throw new Error(error.message);

      if (summary !== undefined) {
        await regenerateGlobalSynopsis(admin, idCol, entity_id, staffId);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { session_id } = body;
      if (!session_id) throw new Error("Missing session_id");
      const { error } = await admin.from("patient_sessions").delete().eq("id", session_id);
      if (error) throw new Error(error.message);
      await regenerateGlobalSynopsis(admin, idCol, entity_id, staffId);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Acción desconocida: ${action}`);
  } catch (e) {
    console.error("manage-patient-session error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
