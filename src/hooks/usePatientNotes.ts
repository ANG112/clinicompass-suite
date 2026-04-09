import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NoteEntity {
  patientId?: string;
  contactId?: string;
}

export function usePatientNote(entity: NoteEntity) {
  const { patientId, contactId } = entity;
  const id = patientId || contactId;
  const field = patientId ? "patient_id" : "contact_id";

  return useQuery({
    queryKey: ["patient-note", field, id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patient_notes")
        .select("*")
        .eq(field, id!)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; patient_id: string | null; contact_id: string | null; content: string; updated_by: string | null; updated_at: string } | null;
    },
  });
}

export function usePatientNoteVersions(noteId: string | undefined) {
  return useQuery({
    queryKey: ["patient-note-versions", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patient_note_versions")
        .select("*")
        .eq("patient_note_id", noteId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{ id: string; patient_note_id: string; version_number: number; content: string; created_by: string | null; created_at: string }>;
    },
  });
}

export function usePatientNoteAudios(noteId: string | undefined) {
  return useQuery({
    queryKey: ["patient-note-audios", noteId],
    enabled: !!noteId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patient_note_audios")
        .select("*")
        .eq("patient_note_id", noteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Array<{
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
    mutationFn: async ({ patientId, contactId, audioBase64, fileName }: { patientId?: string; contactId?: string; audioBase64: string; fileName: string }) => {
      const { data, error } = await supabase.functions.invoke("process-patient-note", {
        body: { patient_id: patientId || null, contact_id: contactId || null, audio_base64: audioBase64, audio_file_name: fileName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; content: string; transcription: string; version: number };
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["patient-note"] });
      qc.invalidateQueries({ queryKey: ["patient-note-versions"] });
      qc.invalidateQueries({ queryKey: ["patient-note-audios"] });
    },
  });
}
