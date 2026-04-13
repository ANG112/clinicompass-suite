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

    const { content, entity_type, entity_id, source, transcription, audio_file_path } = await req.json();
    if (!content || !entity_type || !entity_id) {
      throw new Error("Missing content, entity_type, or entity_id");
    }

    // Save session note
    const noteInsert: Record<string, any> = {
      content,
      source: source || "manual",
      created_by: staffProfile?.id || null,
      transcription: transcription || null,
      audio_file_path: audio_file_path || null,
    };
    if (entity_type === "patient") noteInsert.patient_id = entity_id;
    else noteInsert.contact_id = entity_id;

    const { error: noteErr } = await supabaseAdmin
      .from("patient_session_notes")
      .insert(noteInsert);
    if (noteErr) throw new Error(`Error saving session note: ${noteErr.message}`);

    // Fetch current synopsis
    const idCol = entity_type === "patient" ? "patient_id" : "contact_id";
    const { data: existingSynopsis } = await supabaseAdmin
      .from("patient_synopsis")
      .select("*")
      .eq(idCol, entity_id)
      .maybeSingle();

    // Fetch recent session notes for context (last 10)
    const { data: recentNotes } = await supabaseAdmin
      .from("patient_session_notes")
      .select("content, created_at, source")
      .eq(idCol, entity_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const notesContext = (recentNotes || [])
      .reverse()
      .map((n: any) => `[${new Date(n.created_at).toLocaleDateString("es-ES")}] ${n.content}`)
      .join("\n");

    // Generate updated synopsis via AI
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
            content: `Eres un asistente clínico. Genera una sinopsis breve (5-10 líneas máximo) del estado del paciente basándote en el historial de sesiones. La sinopsis debe:
- Ser muy concisa y útil para consulta rápida
- Priorizar información reciente y clínicamente relevante
- Omitir detalles antiguos poco relevantes
- No crecer indefinidamente; mantener brevedad
- Estar en español
- No incluir encabezados ni formato markdown`,
          },
          {
            role: "user",
            content: `Sinopsis actual:\n${existingSynopsis?.content || "(ninguna)"}\n\nHistorial de sesiones recientes:\n${notesContext}\n\nNueva sesión añadida:\n${content}\n\nGenera la sinopsis actualizada:`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI synopsis error:", await aiResponse.text());
      // Session saved but synopsis not updated - acceptable graceful degradation
      return new Response(JSON.stringify({ success: true, synopsis_updated: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const newSynopsis = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (newSynopsis) {
      if (existingSynopsis) {
        await supabaseAdmin
          .from("patient_synopsis")
          .update({ content: newSynopsis, updated_by: staffProfile?.id || null })
          .eq("id", existingSynopsis.id);
      } else {
        const synInsert: Record<string, any> = {
          content: newSynopsis,
          updated_by: staffProfile?.id || null,
        };
        if (entity_type === "patient") synInsert.patient_id = entity_id;
        else synInsert.contact_id = entity_id;
        await supabaseAdmin.from("patient_synopsis").insert(synInsert);
      }
    }

    return new Response(JSON.stringify({ success: true, synopsis_updated: true, synopsis: newSynopsis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("process-session-note error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
