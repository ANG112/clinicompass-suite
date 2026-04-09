import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { patient_id, contact_id, audio_base64, audio_file_name } = await req.json();
    const entityId = patient_id || contact_id;
    const entityField = patient_id ? "patient_id" : "contact_id";
    if (!entityId) throw new Error("patient_id or contact_id is required");
    if (!audio_base64) throw new Error("audio_base64 is required");

    const { data: staffProfile } = await supabase
      .from("staff_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    const createdBy = staffProfile?.id || null;

    // 1. Upload audio
    const audioBytes = Uint8Array.from(atob(audio_base64), (c) => c.charCodeAt(0));
    const filePath = `${entityId}/${Date.now()}_${audio_file_name || "audio.webm"}`;

    const { error: uploadErr } = await supabase.storage
      .from("patient-audios")
      .upload(filePath, audioBytes, { contentType: "audio/webm", upsert: false });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    // 2. Transcribe audio
    const transcriptionResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: "Eres un transcriptor médico profesional. Transcribe el audio del usuario de forma precisa. Solo devuelve la transcripción, sin comentarios adicionales. Si el audio está en español, transcribe en español.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe este audio de forma precisa:" },
              {
                type: "input_audio",
                input_audio: { data: audio_base64, format: "wav" },
              },
            ],
          },
        ],
      }),
    });

    let transcription = "";
    if (transcriptionResp.ok) {
      const transcriptionData = await transcriptionResp.json();
      transcription = transcriptionData.choices?.[0]?.message?.content || "";
    }

    if (!transcription) {
      transcription = "[Transcripción pendiente - el audio ha sido guardado]";
    }

    // 3. Get or create note record
    let { data: patientNote } = await supabase
      .from("patient_notes")
      .select("*")
      .eq(entityField, entityId)
      .maybeSingle();

    if (!patientNote) {
      const insertData: any = { content: "", updated_by: createdBy };
      if (patient_id) insertData.patient_id = patient_id;
      if (contact_id) insertData.contact_id = contact_id;

      const { data: newNote, error: createErr } = await supabase
        .from("patient_notes")
        .insert(insertData)
        .select()
        .single();
      if (createErr) throw new Error(`Create note failed: ${createErr.message}`);
      patientNote = newNote;
    }

    const currentContent = patientNote.content || "";

    // 4. Merge with AI
    const mergeResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Eres un asistente médico profesional que gestiona notas clínicas de pacientes.

Tu tarea es fusionar la información existente con la nueva transcripción, produciendo una nota estructurada, limpia y profesional.

REGLAS:
- Mantén SIEMPRE este formato con los siguientes apartados (usa exactamente estos títulos con ##):
  ## Motivo o contexto actual
  ## Estado o evolución
  ## Tratamiento o medicación
  ## Observaciones relevantes
  ## Próximos pasos o seguimiento

- Si un apartado no tiene información, déjalo vacío con un guión: -
- Integra la nueva información en el apartado que corresponda
- Si la nueva información contradice o actualiza algo existente, actualiza ese dato
- Elimina redundancias y lenguaje coloquial
- Mantén un tono clínico y profesional
- Preserva TODA la información importante previa
- NO añadas información inventada
- Devuelve SOLO el contenido estructurado`,
          },
          {
            role: "user",
            content: `CONTENIDO ACTUAL DE LAS NOTAS:
${currentContent || "(Sin notas previas)"}

NUEVA TRANSCRIPCIÓN A INTEGRAR:
${transcription}

Genera la versión actualizada de las notas:`,
          },
        ],
      }),
    });

    let mergedContent = currentContent;
    if (mergeResp.ok) {
      const mergeData = await mergeResp.json();
      mergedContent = mergeData.choices?.[0]?.message?.content || currentContent;
    }

    // 5. Version management
    const { data: maxVersion } = await supabase
      .from("patient_note_versions")
      .select("version_number")
      .eq("patient_note_id", patientNote.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxVersion?.version_number || 0) + 1;

    if (currentContent) {
      await supabase.from("patient_note_versions").insert({
        patient_note_id: patientNote.id,
        version_number: nextVersion - 1,
        content: currentContent,
        created_by: createdBy,
      });
    }

    const { data: newVersion } = await supabase
      .from("patient_note_versions")
      .insert({
        patient_note_id: patientNote.id,
        version_number: nextVersion,
        content: mergedContent,
        created_by: createdBy,
      })
      .select()
      .single();

    // 6. Update current content
    await supabase
      .from("patient_notes")
      .update({ content: mergedContent, updated_by: createdBy })
      .eq("id", patientNote.id);

    // 7. Save audio metadata
    await supabase.from("patient_note_audios").insert({
      patient_note_id: patientNote.id,
      note_version_id: newVersion?.id || null,
      file_path: filePath,
      file_name: audio_file_name || "audio.webm",
      transcription,
      created_by: createdBy,
    });

    return new Response(
      JSON.stringify({
        success: true,
        content: mergedContent,
        transcription,
        version: nextVersion,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("process-patient-note error:", e);
    const status = (e as Error).message === "Unauthorized" ? 401 : 500;
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
