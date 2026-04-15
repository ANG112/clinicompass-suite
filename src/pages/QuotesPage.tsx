import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuotes, useCreateQuote, useUpdateQuote, useDeleteQuote, useSaveQuoteItems, useConvertQuoteToInvoice } from "@/hooks/useBilling";
import { useContacts } from "@/hooks/useContacts";
import { useCenters } from "@/hooks/useCenters";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Search, FileText, ArrowRight, Trash2 } from "lucide-react";

const statusCfg: Record<string, { label: string; variant: "muted" | "success" | "warning" | "destructive" }> = {
  borrador: { label: "Borrador", variant: "muted" },
  entregado: { label: "Entregado", variant: "warning" },
  aceptado: { label: "Aceptado", variant: "success" },
  rechazado: { label: "Rechazado", variant: "destructive" },
};

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

function calcLine(l: LineItem) {
  const subtotal = l.quantity * l.unit_price;
  const tax_amount = subtotal * l.tax_rate / 100;
  return { ...l, subtotal, tax_amount, total: subtotal + tax_amount };
}

export default function QuotesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: quotes, isLoading } = useQuotes({ search, status: statusFilter });
  const { data: contacts } = useContacts();
  const { data: centers } = useCenters();
  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();
  const deleteQuote = useDeleteQuote();
  const saveItems = useSaveQuoteItems();
  const convertToInvoice = useConvertQuoteToInvoice();

  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ contact_id: "", center_id: "", notes: "", status: "borrador" as string });
  const [lines, setLines] = useState<LineItem[]>([{ description: "", quantity: 1, unit_price: 0, tax_rate: 21 }]);

  const addLine = () => setLines([...lines, { description: "", quantity: 1, unit_price: 0, tax_rate: 21 }]);
  const removeLine = (i: number) => setLines(lines.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, value: any) => {
    const updated = [...lines];
    (updated[i] as any)[field] = value;
    setLines(updated);
  };

  const computed = lines.map(calcLine);
  const subtotal = computed.reduce((s, l) => s + l.subtotal, 0);
  const taxAmount = computed.reduce((s, l) => s + l.tax_amount, 0);
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    if (!form.contact_id || !form.center_id) { toast.error("Selecciona contacto y centro"); return; }
    if (lines.some(l => !l.description.trim())) { toast.error("Completa todos los conceptos"); return; }
    if (lines.some(l => l.quantity * l.unit_price === 0)) { toast.error("No se permiten líneas con importe 0 €"); return; }

    const contact = contacts?.find((c: any) => c.id === form.contact_id);

    try {
      const q = await createQuote.mutateAsync({
        contact_id: form.contact_id,
        center_id: form.center_id,
        notes: form.notes || null,
        status: form.status,
        subtotal,
        tax_amount: taxAmount,
        total,
        fiscal_name: contact?.fiscal_name || `${contact?.first_name || ""} ${contact?.last_name || ""}`.trim(),
        fiscal_nif: contact?.fiscal_nif || contact?.nif || null,
        fiscal_address: contact?.fiscal_address || contact?.address || null,
        fiscal_email: contact?.fiscal_email || contact?.email || null,
        fiscal_phone: contact?.fiscal_phone || contact?.phone || null,
      });
      await saveItems.mutateAsync({
        quoteId: q.id,
        items: computed.map(l => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: l.tax_rate,
          subtotal: l.subtotal,
          tax_amount: l.tax_amount,
          total: l.total,
        })),
      });
      toast.success("Presupuesto creado");
      setOpen(false);
      setForm({ contact_id: "", center_id: "", notes: "", status: "borrador" });
      setLines([{ description: "", quantity: 1, unit_price: 0, tax_rate: 21 }]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleConvert = async (id: string) => {
    try {
      await convertToInvoice.mutateAsync(id);
      toast.success("Factura creada desde presupuesto");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteQuote.mutateAsync(deleteTarget.id);
      toast.success("Presupuesto eliminado");
    } catch (e: any) { toast.error(e.message); }
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader title="Presupuestos" description="Gestión de presupuestos y propuestas comerciales" />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="aceptado">Aceptado</SelectItem>
            <SelectItem value="rechazado">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nuevo presupuesto</Button>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Nº</TableHead>
              <TableHead className="font-semibold">Contacto</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold text-right">Total</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : !quotes?.length ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Sin presupuestos</TableCell></TableRow>
            ) : quotes.map((q: any) => {
              const st = statusCfg[q.status] || statusCfg.borrador;
              const contactName = q.contact ? `${q.contact.first_name} ${q.contact.last_name || ""}`.trim() : "-";
              return (
                <TableRow key={q.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium text-sm">{q.quote_number || "-"}</TableCell>
                  <TableCell className="text-sm">{contactName}</TableCell>
                  <TableCell className="text-sm">{q.center?.name || "-"}</TableCell>
                  <TableCell className="text-sm">{format(new Date(q.issue_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">€{Number(q.total).toFixed(2)}</TableCell>
                  <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {q.status !== "aceptado" && q.status !== "rechazado" && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateQuote.mutateAsync({ id: q.id, status: "entregado" }).then(() => toast.success("Marcado como entregado"))}>
                          <FileText className="h-3.5 w-3.5 mr-1" />Entregar
                        </Button>
                      )}
                      {(q.status === "borrador" || q.status === "entregado") && Number(q.total) > 0 && (
                        <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => handleConvert(q.id)}>
                          <ArrowRight className="h-3.5 w-3.5 mr-1" />Facturar
                        </Button>
                      )}
                      <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" onClick={() => setDeleteTarget(q)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Create quote dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo presupuesto</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Contacto *</Label>
              <Select value={form.contact_id} onValueChange={v => setForm({ ...form, contact_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {contacts?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Centro *</Label>
              <Select value={form.center_id} onValueChange={v => setForm({ ...form, center_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {centers?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createQuote.isPending}>Guardar presupuesto</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará permanentemente el presupuesto <strong>{deleteTarget?.quote_number || "sin número"}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}