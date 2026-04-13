import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVoiceEdit(entityType: "patient" | "contact", entityId: string | undefined) {
  const qc = useQueryClient();

  const editMutation = useMutation({
    mutationFn: async (transcription: string) => {
      const { data, error } = await supabase.functions.invoke("process-voice-edit", {
        body: { transcription, entity_type: entityType, entity_id: entityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entityType === "patient" ? "patient" : "contact", entityId] });
      qc.invalidateQueries({ queryKey: ["voice-edits", entityType, entityId] });
    },
  });

  const sessionMutation = useMutation({
    mutationFn: async (params: { content: string; source: "manual" | "voice"; transcription?: string }) => {
      const { data, error } = await supabase.functions.invoke("process-session-note", {
        body: { ...params, entity_type: entityType, entity_id: entityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-notes", entityType, entityId] });
      qc.invalidateQueries({ queryKey: ["synopsis", entityType, entityId] });
    },
  });

  const voiceEditsQuery = useQuery({
    queryKey: ["voice-edits", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const col = entityType === "patient" ? "patient_id" : "contact_id";
      const { data, error } = await supabase
        .from("patient_voice_edits")
        .select("*")
        .eq(col, entityId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const sessionNotesQuery = useQuery({
    queryKey: ["session-notes", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const col = entityType === "patient" ? "patient_id" : "contact_id";
      const { data, error } = await supabase
        .from("patient_session_notes")
        .select("*")
        .eq(col, entityId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const synopsisQuery = useQuery({
    queryKey: ["synopsis", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const col = entityType === "patient" ? "patient_id" : "contact_id";
      const { data, error } = await supabase
        .from("patient_synopsis")
        .select("*")
        .eq(col, entityId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    editMutation,
    sessionMutation,
    voiceEdits: voiceEditsQuery.data,
    sessionNotes: sessionNotesQuery.data,
    synopsis: synopsisQuery.data,
    isLoadingEdits: voiceEditsQuery.isLoading,
    isLoadingNotes: sessionNotesQuery.isLoading,
    isLoadingSynopsis: synopsisQuery.isLoading,
  };
}
