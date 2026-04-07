import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBusinessTypes() {
  return useQuery({
    queryKey: ["business-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_types")
        .select("*")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useBusinessPipelineStages(businessTypeId?: string) {
  return useQuery({
    queryKey: ["business-pipeline-stages", businessTypeId],
    enabled: !!businessTypeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_pipeline_stages")
        .select("*")
        .eq("business_type_id", businessTypeId!)
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useBusinesses(filters?: {
  business_type_id?: string;
  center_id?: string;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["businesses", filters],
    queryFn: async () => {
      let query = supabase
        .from("businesses")
        .select("*, contact:contacts(id, first_name, last_name, email, phone, company_name), center:centers(name), business_type:business_types(id, name, business_line), stage:business_pipeline_stages(id, name, position), assigned:staff_profiles(first_name, last_name)")
        .order("created_at", { ascending: false });

      if (filters?.business_type_id && filters.business_type_id !== "all") {
        query = query.eq("business_type_id", filters.business_type_id);
      }
      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }
      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useContactBusinesses(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-businesses", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("*, business_type:business_types(name, business_line), stage:business_pipeline_stages(name), center:centers(name), assigned:staff_profiles(first_name, last_name)")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (business: Record<string, any>) => {
      // Auto-assign first stage if not provided
      if (!business.stage_id && business.business_type_id) {
        const { data: firstStage } = await supabase
          .from("business_pipeline_stages")
          .select("id")
          .eq("business_type_id", business.business_type_id)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstStage) business.stage_id = firstStage.id;
      }
      const { data, error } = await supabase.from("businesses").insert(business).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses"] });
      qc.invalidateQueries({ queryKey: ["contact-businesses"] });
    },
  });
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      const { data, error } = await supabase.from("businesses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["businesses"] });
      qc.invalidateQueries({ queryKey: ["contact-businesses"] });
    },
  });
}

export function useBusinessStageHistory(businessId: string | undefined) {
  return useQuery({
    queryKey: ["business-stage-history", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_stage_history")
        .select("*, from_stage:business_pipeline_stages!business_stage_history_from_stage_id_fkey(name), to_stage:business_pipeline_stages!business_stage_history_to_stage_id_fkey(name)")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateStageChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Record<string, any>) => {
      const { data, error } = await supabase.from("business_stage_history").insert(entry).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business-stage-history"] });
    },
  });
}
