import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Payment methods
export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("active", true)
        .order("position");
      if (error) throw error;
      return data;
    },
  });
}

// Invoice series
export function useInvoiceSeries(centerId?: string) {
  return useQuery({
    queryKey: ["invoice-series", centerId],
    queryFn: async () => {
      let q = supabase.from("invoice_series").select("*, center:centers(name)").order("prefix");
      if (centerId && centerId !== "all") q = q.eq("center_id", centerId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoiceSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { center_id: string; prefix: string; doc_type: string }) => {
      const { data, error } = await supabase.from("invoice_series").insert(s as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoice-series"] }),
  });
}

// Quotes
export function useQuotes(filters?: { center_id?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["quotes", filters],
    queryFn: async () => {
      let q = supabase.from("quotes")
        .select("*, contact:contacts(first_name, last_name, company_name), center:centers(name)")
        .order("created_at", { ascending: false });
      if (filters?.center_id && filters.center_id !== "all") q = q.eq("center_id", filters.center_id);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status as any);
      if (filters?.search) {
        q = q.or(`quote_number.ilike.%${filters.search}%,fiscal_name.ilike.%${filters.search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useQuote(id?: string) {
  return useQuery({
    queryKey: ["quote", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes")
        .select("*, contact:contacts(first_name, last_name, company_name, fiscal_name, fiscal_nif, fiscal_address, fiscal_email, fiscal_phone), center:centers(name)")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useQuoteItems(quoteId?: string) {
  return useQuery({
    queryKey: ["quote-items", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase.from("quote_items")
        .select("*").eq("quote_id", quoteId!).order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quote: Record<string, any>) => {
      const { data, error } = await supabase.from("quotes").insert(quote as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase.from("quotes").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote", d.id] });
    },
  });
}

export function useSaveQuoteItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ quoteId, items }: { quoteId: string; items: any[] }) => {
      // Delete existing then insert new
      await supabase.from("quote_items").delete().eq("quote_id", quoteId);
      if (items.length > 0) {
        const { error } = await supabase.from("quote_items").insert(
          items.map((it, i) => ({ ...it, quote_id: quoteId, position: i })) as any
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["quote-items", v.quoteId] }),
  });
}

// Invoices
export function useInvoices(filters?: { center_id?: string; status?: string; invoice_type?: string; search?: string }) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      let q = supabase.from("invoices")
        .select("*, contact:contacts(first_name, last_name, company_name), center:centers(name), series:invoice_series(prefix)")
        .order("created_at", { ascending: false });
      if (filters?.center_id && filters.center_id !== "all") q = q.eq("center_id", filters.center_id);
      if (filters?.status && filters.status !== "all") q = q.eq("status", filters.status as any);
      if (filters?.invoice_type && filters.invoice_type !== "all") q = q.eq("invoice_type", filters.invoice_type as any);
      if (filters?.search) {
        q = q.or(`invoice_number.ilike.%${filters.search}%,fiscal_name.ilike.%${filters.search}%`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoice(id?: string) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices")
        .select("*, contact:contacts(first_name, last_name, company_name, fiscal_name, fiscal_nif, fiscal_address, fiscal_email, fiscal_phone), center:centers(name), series:invoice_series(prefix)")
        .eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoiceItems(invoiceId?: string) {
  return useQuery({
    queryKey: ["invoice-items", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoice_items")
        .select("*").eq("invoice_id", invoiceId!).order("position");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: Record<string, any>) => {
      const { data, error } = await supabase.from("invoices").insert(invoice as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [k: string]: any }) => {
      const { data, error } = await supabase.from("invoices").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", d.id] });
    },
  });
}

export function useSaveInvoiceItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, items }: { invoiceId: string; items: any[] }) => {
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
      if (items.length > 0) {
        const { error } = await supabase.from("invoice_items").insert(
          items.map((it, i) => ({ ...it, invoice_id: invoiceId, position: i })) as any
        );
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["invoice-items", v.invoiceId] }),
  });
}

// Convert quote to invoice
export function useConvertQuoteToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (quoteId: string) => {
      // Fetch quote + items
      const { data: quote, error: qe } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
      if (qe) throw qe;
      const { data: items, error: ie } = await supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("position");
      if (ie) throw ie;

      if (quote.total <= 0) throw new Error("No se puede facturar un presupuesto de 0 €");

      // Get or pick series
      const { data: series } = await supabase.from("invoice_series")
        .select("*").eq("center_id", quote.center_id).eq("doc_type", "factura").eq("active", true).limit(1).single();

      let seriesId = series?.id;
      let invoiceNumber = "";
      if (series) {
        const newNum = (series.current_number || 0) + 1;
        invoiceNumber = `${series.prefix}-${String(newNum).padStart(4, "0")}`;
        await supabase.from("invoice_series").update({ current_number: newNum } as any).eq("id", series.id);
        seriesId = series.id;
      }

      // Create invoice
      const { data: inv, error: invE } = await supabase.from("invoices").insert({
        contact_id: quote.contact_id,
        center_id: quote.center_id,
        business_id: quote.business_id,
        quote_id: quoteId,
        series_id: seriesId || null,
        invoice_number: invoiceNumber || null,
        invoice_type: "factura",
        status: "borrador",
        subtotal: quote.subtotal,
        tax_amount: quote.tax_amount,
        total: quote.total,
        fiscal_name: quote.fiscal_name,
        fiscal_nif: quote.fiscal_nif,
        fiscal_address: quote.fiscal_address,
        fiscal_email: quote.fiscal_email,
        fiscal_phone: quote.fiscal_phone,
      } as any).select().single();
      if (invE) throw invE;

      // Copy items
      if (items && items.length > 0) {
        const { error: iiE } = await supabase.from("invoice_items").insert(
          items.map((it: any, i: number) => ({
            invoice_id: inv.id,
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            tax_rate: it.tax_rate,
            subtotal: it.subtotal,
            tax_amount: it.tax_amount,
            total: it.total,
            service_id: it.service_id,
            position: i,
          })) as any
        );
        if (iiE) throw iiE;
      }

      // Update quote status
      await supabase.from("quotes").update({ status: "aceptado" } as any).eq("id", quoteId);

      return inv;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice-series"] });
    },
  });
}

// Payments
export function usePayments(invoiceId?: string) {
  return useQuery({
    queryKey: ["payments", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      const { data, error } = await supabase.from("payments")
        .select("*, method:payment_methods(name)")
        .eq("invoice_id", invoiceId!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payment: Record<string, any>) => {
      const { data, error } = await supabase.from("payments").insert(payment as any).select().single();
      if (error) throw error;

      // Update invoice paid_amount and status
      const { data: allPayments } = await supabase.from("payments").select("amount").eq("invoice_id", payment.invoice_id);
      const totalPaid = (allPayments || []).reduce((s: number, p: any) => s + Number(p.amount), 0);

      const { data: invoice } = await supabase.from("invoices").select("total").eq("id", payment.invoice_id).single();
      const total = Number(invoice?.total || 0);
      let newStatus: string;
      if (totalPaid >= total) newStatus = "cobrada";
      else if (totalPaid > 0) newStatus = "parcialmente_cobrada";
      else newStatus = "emitida";

      await supabase.from("invoices").update({ paid_amount: totalPaid, status: newStatus } as any).eq("id", payment.invoice_id);

      return data;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["payments", v.invoice_id] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
    },
  });
}
