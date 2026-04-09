import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePatientNote(patientId: string | undefined) {
  return useQuery({
    queryKey: ["patient-note", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_notes" as any)
        .select("*")
        .eq("patient_id", patientId!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; patient_id: string; content: string; updated_by: string | null; updated_at: string } | null;
    },
  });
}

export function usePatientNoteVersions(noteId: string | undefined) {
  return useQuery({
    queryKey: ["patient-note-versions", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_note_versions" as any)
        .select("*")
        .eq("patient_note_id", noteId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; patient_note_id: string; version_number: number; content: string; created_by: string | null; created_at: string }>;
    },
  });
}

export function usePatientNoteAudios(noteId: string | undefined) {
  return useQuery({
    queryKey: ["patient-note-audios", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_note_audios" as any)
        .select("*")
        .eq("patient_note_id", noteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string; patient_note_id: string; note_version_id: string | null;
        file_path: string; file_name: string | null; duration_seconds: number | null;
        transcription: string | null; created_by: string | null; created_at: string;
      }>;
    },
  });
}

export function useProcessPatientNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ patientId, audioBase64, fileName }: { patientId: string; audioBase64: string; fileName: string }) => {
      const { data, error } = await supabase.functions.invoke("process-patient-note", {
        body: { patient_id: patientId, audio_base64: audioBase64, audio_file_name: fileName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; content: string; transcription: string; version: number };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["patient-note", vars.patientId] });
      qc.invalidateQueries({ queryKey: ["patient-note-versions"] });
      qc.invalidateQueries({ queryKey: ["patient-note-audios"] });
    },
  });
}
