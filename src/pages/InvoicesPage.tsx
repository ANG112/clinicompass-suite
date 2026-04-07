import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/ui/stat-card";
import { useInvoices, useCreateInvoice, useUpdateInvoice, useSaveInvoiceItems, useCreatePayment, usePayments, usePaymentMethods, useInvoiceSeries } from "@/hooks/useBilling";
import { useContacts } from "@/hooks/useContacts";
import { useCenters } from "@/hooks/useCenters";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Search, Receipt, CreditCard, CheckCircle, AlertCircle, Trash2, Banknote } from "lucide-react";

const statusCfg: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" }> = {
  borrador: { label: "Borrador", variant: "default" },
  emitida: { label: "Emitida", variant: "warning" },
  parcialmente_cobrada: { label: "Parcial", variant: "warning" },
  cobrada: { label: "Cobrada", variant: "success" },
  anulada: { label: "Anulada", variant: "error" },
};

interface LineItem { description: string; quantity: number; unit_price: number; tax_rate: number; }
function calcLine(l: LineItem) {
  const subtotal = l.quantity * l.unit_price;
  const tax_amount = subtotal * l.tax_rate / 100;
  return { ...l, subtotal, tax_amount, total: subtotal + tax_amount };
}

export default function InvoicesPage({ invoiceType = "all" }: { invoiceType?: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const typeFilter = invoiceType === "simplificada" ? "simplificada" : invoiceType === "factura" ? "factura" : "all";
  const { data: invoices, isLoading } = useInvoices({ search, status: statusFilter, invoice_type: typeFilter });
  const { data: contacts } = useContacts();
  const { data: centers } = useCenters();
  const { data: series } = useInvoiceSeries();
  const { data: paymentMethods } = usePaymentMethods();
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const saveItems = useSaveInvoiceItems();
  const createPayment = useCreatePayment();

  const [openCreate, setOpenCreate] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const [form, setForm] = useState({ contact_id: "", center_id: "", invoice_type: invoiceType === "simplificada" ? "simplificada" : "factura", series_id: "", notes: "" });
  const [lines, setLines] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: 21 }]);
  const [payForm, setPayForm] = useState({ amount: "", payment_method_id: "", payment_date: format(new Date(), "yyyy-MM-dd"), notes: "" });

  const { data: invoicePayments } = usePayments(selectedInvoiceId || undefined);

  const addLine = () => setLines([...lines, { description: "", quantity: 1, unit_price: 0, tax_rate: 21 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => { const u = [...lines]; (u[i] as any)[field] = value; setLines(u); };

  const computed = lines.map(calcLine);
  const subtotal = computed.reduce((s, l) => s + l.subtotal, 0);
  const taxAmount = computed.reduce((s, l) => s + l.tax_amount, 0);
  const total = subtotal + taxAmount;

  // Stats
  const totalFacturado = invoices?.reduce((s: number, i: any) => s + Number(i.total), 0) || 0;
  const totalCobrado = invoices?.reduce((s: number, i: any) => s + Number(i.paid_amount), 0) || 0;
  const totalPendiente = totalFacturado - totalCobrado;

  const handleCreate = async () => {
    if (!form.contact_id || !form.center_id) { toast.error("Selecciona contacto y centro"); return; }
    if (total <= 0) { toast.error("El importe debe ser mayor que 0"); return; }
    
    const contact = contacts?.find((c: any) => c.id === form.contact_id);
    
    // Get invoice number from series
    let invoiceNumber = "";
    let seriesId = form.series_id || null;
    if (seriesId) {
      const s = series?.find((sr: any) => sr.id === seriesId);
      if (s) {
        const newNum = (s.current_number || 0) + 1;
        invoiceNumber = `${s.prefix}-${String(newNum).padStart(4, "0")}`;
        await (await import("@/integrations/supabase/client")).supabase.from("invoice_series").update({ current_number: newNum } as any).eq("id", seriesId);
      }
    }

    try {
      const inv = await createInvoice.mutateAsync({
        contact_id: form.contact_id,
        center_id: form.center_id,
        series_id: seriesId,
        invoice_number: invoiceNumber || null,
        invoice_type: form.invoice_type,
        status: "borrador",
        subtotal,
        tax_amount: taxAmount,
        total,
        fiscal_name: contact?.fiscal_name || `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim(),
        fiscal_nif: contact?.fiscal_nif || contact?.nif || null,
        fiscal_address: contact?.fiscal_address || contact?.address || null,
        fiscal_email: contact?.fiscal_email || contact?.email || null,
        fiscal_phone: contact?.fiscal_phone || contact?.phone || null,
        notes: form.notes || null,
      });
      await saveItems.mutateAsync({
        invoiceId: inv.id,
        items: computed.map(l => ({
          description: l.description, quantity: l.quantity, unit_price: l.unit_price,
          tax_rate: l.tax_rate, subtotal: l.subtotal, tax_amount: l.tax_amount, total: l.total,
        })),
      });
      toast.success("Factura creada");
      setOpenCreate(false);
      setForm({ contact_id: "", center_id: "", invoice_type: invoiceType === "simplificada" ? "simplificada" : "factura", series_id: "", notes: "" });
      setLines([{ description: "", quantity: 1, unit_price: 0, tax_rate: 21 }]);
    } catch (e: any) { toast.error(e.message); }
  };

  const handlePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) { toast.error("Introduce un importe válido"); return; }
    if (!payForm.payment_method_id) { toast.error("Selecciona método de pago"); return; }
    try {
      await createPayment.mutateAsync({
        invoice_id: selectedInvoiceId,
        amount: Number(payForm.amount),
        payment_method_id: payForm.payment_method_id,
        payment_date: payForm.payment_date,
        notes: payForm.notes || null,
      });
      toast.success("Pago registrado");
      setPayForm({ amount: "", payment_method_id: "", payment_date: format(new Date(), "yyyy-MM-dd"), notes: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const title = invoiceType === "simplificada" ? "Facturas simplificadas" : invoiceType === "factura" ? "Facturas" : "Facturación";

  return (
    <AppLayout>
      <PageHeader title={title} description="Gestión de facturas, cobros y pagos" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total facturado" value={`€${totalFacturado.toFixed(2)}`} icon={Receipt} iconColor="text-primary" />
        <StatCard title="Cobrado" value={`€${totalCobrado.toFixed(2)}`} icon={CheckCircle} iconColor="text-success" />
        <StatCard title="Pendiente" value={`€${totalPendiente.toFixed(2)}`} icon={AlertCircle} iconColor="text-warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar nº o nombre fiscal..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="parcialmente_cobrada">Parcial</SelectItem>
            <SelectItem value="cobrada">Cobrada</SelectItem>
            <SelectItem value="anulada">Anulada</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setOpenCreate(true)}><Plus className="h-4 w-4 mr-1" />Nueva factura</Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Nº</TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Contacto</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold text-right">Total</TableHead>
              <TableHead className="font-semibold text-right">Cobrado</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !invoices?.length ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin facturas</TableCell></TableRow>
            ) : invoices.map((inv: any) => {
              const st = statusCfg[inv.status] || statusCfg.borrador;
              const contactName = inv.contact ? `${inv.contact.first_name} ${inv.contact.last_name || ""}`.trim() : "-";
              return (
                <TableRow key={inv.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium text-sm">{inv.invoice_number || "-"}</TableCell>
                  <TableCell className="text-xs">{inv.invoice_type === "simplificada" ? "Simplif." : "Factura"}</TableCell>
                  <TableCell className="text-sm">{contactName}</TableCell>
                  <TableCell className="text-sm">{inv.center?.name || "-"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(inv.issue_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">€{Number(inv.total).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm">€{Number(inv.paid_amount).toFixed(2)}</TableCell>
                  <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {inv.status === "borrador" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateInvoice.mutateAsync({ id: inv.id, status: "emitida" }).then(() => toast.success("Factura emitida"))}>
                          Emitir
                        </Button>
                      )}
                      {inv.status !== "cobrada" && inv.status !== "anulada" && (
                        <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => { setSelectedInvoiceId(inv.id); setOpenPayment(true); }}>
                          <Banknote className="h-3.5 w-3.5 mr-1" />Cobrar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create Invoice */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva factura</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Contacto *</Label>
              <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{contacts?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Centro *</Label>
              <Select value={form.center_id} onValueChange={v => setForm({ ...form, center_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{centers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.invoice_type} onValueChange={v => setForm({ ...form, invoice_type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="factura">Factura</SelectItem>
                  <SelectItem value="simplificada">Simplificada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Serie</Label>
              <Select value={form.series_id} onValueChange={v => setForm({ ...form, series_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {series?.filter((s: any) => !form.center_id || s.center_id === form.center_id).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.prefix} ({s.center?.name})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold">Líneas</Label>
              <Button variant="outline" size="sm" onClick={addLine} className="text-xs"><Plus className="h-3 w-3 mr-1" />Línea</Button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {i === 0 && <Label className="text-[10px]">Concepto</Label>}
                    <Input className="h-8 text-xs" value={l.description} onChange={e => updateLine(i, "description", e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-[10px]">Cantidad</Label>}
                    <Input type="number" className="h-8 text-xs" value={l.quantity} onChange={e => updateLine(i, "quantity", Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-[10px]">Precio</Label>}
                    <Input type="number" className="h-8 text-xs" value={l.unit_price} onChange={e => updateLine(i, "unit_price", Number(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <Label className="text-[10px]">IVA %</Label>}
                    <Input type="number" className="h-8 text-xs" value={l.tax_rate} onChange={e => updateLine(i, "tax_rate", Number(e.target.value))} />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button variant="ghost" size="sm" onClick={() => removeLine(i)} disabled={lines.length <= 1}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <div className="text-right space-y-1 text-sm">
              <p>Base imponible: <span className="font-semibold">€{subtotal.toFixed(2)}</span></p>
              <p>IVA: <span className="font-semibold">€{taxAmount.toFixed(2)}</span></p>
              <p className="text-base font-bold">Total: €{total.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Notas</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="h-16" />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createInvoice.isPending}>Crear factura</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Register Payment */}
      <Dialog open={openPayment} onOpenChange={setOpenPayment}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar cobro</DialogTitle></DialogHeader>

          {invoicePayments && invoicePayments.length > 0 && (
            <div className="mb-4">
              <Label className="text-xs font-semibold mb-2 block">Pagos anteriores</Label>
              <div className="space-y-1">
                {invoicePayments.map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs p-2 bg-muted/30 rounded">
                    <span>{format(new Date(p.payment_date), "dd/MM/yyyy")} — {(p.method as any)?.name || "-"}</span>
                    <span className="font-semibold">€{Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Importe *</Label>
              <Input type="number" className="h-9" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Método de pago *</Label>
              <Select value={payForm.payment_method_id} onValueChange={v => setPayForm({ ...payForm, payment_method_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {paymentMethods?.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" className="h-9" value={payForm.payment_date} onChange={e => setPayForm({ ...payForm, payment_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones</Label>
              <Textarea value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} className="h-16" />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setOpenPayment(false)}>Cancelar</Button>
            <Button onClick={handlePayment} disabled={createPayment.isPending}>Registrar pago</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
