import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCampaigns(filters?: { status?: string; business_line?: string; center_id?: string }) {
  return useQuery({
    queryKey: ["campaigns", filters],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("*, center:centers(name)")
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as any);
      }
      if (filters?.business_line && filters.business_line !== "all") {
        query = query.eq("business_line", filters.business_line as any);
      }
      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCampaignContacts(campaignId?: string) {
  return useQuery({
    queryKey: ["campaign-contacts", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("*, contact:contacts(first_name, last_name, email, phone)")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCampaignStats(campaignId?: string) {
  return useQuery({
    queryKey: ["campaign-stats", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select("status")
        .eq("campaign_id", campaignId!);
      if (error) throw error;
      const total = data.length;
      const contacted = data.filter(c => c.status !== "pendiente").length;
      const converted = data.filter(c => c.status === "convertido").length;
      return { total, contacted, converted };
    },
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: {
      name: string;
      description?: string;
      business_line: string;
      center_id?: string | null;
      status?: string;
      target_count?: number;
      start_date?: string | null;
      end_date?: string | null;
    }) => {
      const { data, error } = await supabase.from("campaigns").insert(campaign as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from("campaigns").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });
}

export function useAddCampaignContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ campaign_id, contact_id }: { campaign_id: string; contact_id: string }) => {
      const { data, error } = await supabase.from("campaign_contacts").insert({ campaign_id, contact_id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign-contacts", vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ["campaign-stats", vars.campaign_id] });
    },
  });
}

export function useUpdateCampaignContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, campaign_id, ...updates }: { id: string; campaign_id: string; status?: string; notes?: string; contacted_at?: string; converted_at?: string }) => {
      const { data, error } = await supabase.from("campaign_contacts").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign-contacts", vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ["campaign-stats", vars.campaign_id] });
    },
  });
}

export function useRemoveCampaignContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, campaign_id }: { id: string; campaign_id: string }) => {
      const { error } = await supabase.from("campaign_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["campaign-contacts", vars.campaign_id] });
      qc.invalidateQueries({ queryKey: ["campaign-stats", vars.campaign_id] });
    },
  });
}
