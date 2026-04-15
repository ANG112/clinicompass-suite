import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSpecialties() {
  return useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("*")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useAllSpecialties() {
  return useQuery({
    queryKey: ["all-specialties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("specialties")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (specialty: { name: string; slug: string; icon_name: string }) => {
      // Get max position
      const { data: existing } = await supabase
        .from("specialties")
        .select("position")
        .order("position", { ascending: false })
        .limit(1);
      const nextPos = (existing?.[0]?.position ?? -1) + 1;
      const { data, error } = await supabase
        .from("specialties")
        .insert({ ...specialty, position: nextPos } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialties"] });
      qc.invalidateQueries({ queryKey: ["all-specialties"] });
    },
  });
}

export function useUpdateSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from("specialties")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialties"] });
      qc.invalidateQueries({ queryKey: ["all-specialties"] });
    },
  });
}

export function useDeleteSpecialty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("specialties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["specialties"] });
      qc.invalidateQueries({ queryKey: ["all-specialties"] });
    },
  });
}
