import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useContactCategories() {
  return useQuery({
    queryKey: ["contact-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_categories")
        .select("*")
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useContacts(filters?: {
  category?: string;
  center_id?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["contacts", filters],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*, category:contact_categories(id, name, label), center:centers(name), professional:staff_profiles!contacts_assigned_professional_id_fkey(first_name, last_name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters?.category && filters.category !== "all") {
        // Get category id first or filter by join
        const { data: cat } = await supabase
          .from("contact_categories")
          .select("id")
          .eq("name", filters.category)
          .maybeSingle();
        if (cat) {
          query = query.eq("category_id", cat.id);
        }
      }
      if (filters?.center_id && filters.center_id !== "all") {
        query = query.eq("center_id", filters.center_id);
      }
      if (filters?.search) {
        query = query.or(
          `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,nif.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contact", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, category:contact_categories(id, name, label), center:centers(name), professional:staff_profiles!contacts_assigned_professional_id_fkey(first_name, last_name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: Record<string, any>) => {
      const { data, error } = await supabase.from("contacts").insert(contact).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string;[key: string]: any }) => {
      const { data, error } = await supabase.from("contacts").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", data.id] });
    },
  });
}

export function useContactInteractions(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-interactions", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interactions")
        .select("*")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useContactAppointments(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-appointments", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*, service:services(name, business_line), professional:staff_profiles(first_name, last_name), center:centers(name)")
        .eq("contact_id", contactId!)
        .order("start_time", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useContactDocuments(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-documents", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*, document_type:document_types(name, category)")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useContactPacks(contactId: string | undefined) {
  return useQuery({
    queryKey: ["contact-packs", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_packs")
        .select("*, service:services(name)")
        .eq("contact_id", contactId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
