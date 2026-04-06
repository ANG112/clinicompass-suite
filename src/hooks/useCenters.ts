import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Center = Database["public"]["Tables"]["centers"]["Row"];
type CenterInsert = Database["public"]["Tables"]["centers"]["Insert"];

export function useCenters() {
  return useQuery({
    queryKey: ["centers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centers")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data as Center[];
    },
  });
}

export function useCreateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (center: CenterInsert) => {
      const { data, error } = await supabase.from("centers").insert(center).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["centers"] }),
  });
}

export function useUpdateCenter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Center> & { id: string }) => {
      const { data, error } = await supabase.from("centers").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["centers"] }),
  });
}
