import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PatientSession = {
  id: string;
  patient_id: string | null;
  contact_id: string | null;
  session_number: number;
  session_date: string;
  professional_id: string | null;
  professional?: { id: string; first_name: string; last_name: string } | null;
  summary: string;
  status: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionEntry = {
  id: string;
  session_id: string;
  source: string;
  content: string;
  transcription: string | null;
  audio_file_path: string | null;
  created_by: string | null;
  created_at: string;
};

export function usePatientSessions(entityType: "patient" | "contact", entityId: string | undefined) {
  const col = entityType === "patient" ? "patient_id" : "contact_id";
  return useQuery({
    queryKey: ["patient-sessions", entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_sessions" as any)
        .select("*, professional:staff_profiles!patient_sessions_professional_id_fkey(id, first_name, last_name)")
        .eq(col, entityId!)
        .order("session_number", { ascending: false });
      if (error) {
        console.error("[usePatientSessions] error:", error);
        throw error;
      }
      return (data || []) as unknown as PatientSession[];
    },
  });
}

export function useSessionEntries(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session-entries", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_session_entries" as any)
        .select("*")
        .eq("session_id", sessionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as SessionEntry[];
    },
  });
}

interface ManageVars {
  action: "create" | "add_entry" | "update_session" | "delete";
  entity_type: "patient" | "contact";
  entity_id: string;
  session_id?: string;
  initial_content?: string;
  content?: string;
  source?: "manual" | "voice";
  transcription?: string;
  audio_file_path?: string | null;
  session_date?: string;
  professional_id?: string | null;
  summary?: string;
  status?: string;
}

export function useManageSession(entityType: "patient" | "contact", entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: Omit<ManageVars, "entity_type" | "entity_id">) => {
      const { data, error } = await supabase.functions.invoke("manage-patient-session", {
        body: { ...vars, entity_type: entityType, entity_id: entityId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patient-sessions", entityType, entityId] });
      qc.invalidateQueries({ queryKey: ["session-entries"] });
      qc.invalidateQueries({ queryKey: ["synopsis", entityType, entityId] });
      // Also invalidate the patient/contact in case notes_append changed it
      qc.invalidateQueries({ queryKey: [entityType, entityId] });
    },
  });
}
