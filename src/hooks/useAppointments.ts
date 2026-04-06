import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];

export function useAppointments(filters?: { center_id?: string; professional_id?: string; date_from?: string; date_to?: string }) {
  return useQuery({
    queryKey: ["appointments", filters],
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, patient:patients(first_name, last_name), service:services(name, business_line), professional:staff_profiles(first_name, last_name), center:centers(name)")
        .order("start_time", { ascending: true });

      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }
      if (filters?.professional_id && filters.professional_id !== "all") {
        query = query.eq("professional_id", filters.professional_id);
      }
      if (filters?.date_from) {
        query = query.gte("start_time", filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte("start_time", filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (apt: AppointmentInsert) => {
      const { data, error } = await supabase.from("appointments").insert(apt).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["appointments"] }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase.from("appointments").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["patient-appointments"] });
    },
  });
}

export function useStaffProfiles() {
  return useQuery({
    queryKey: ["staff-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_profiles")
        .select("*, center:centers(name)")
        .eq("active", true)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
