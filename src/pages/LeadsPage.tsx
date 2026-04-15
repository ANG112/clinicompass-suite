import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Search, Phone, Mail, MessageSquare, Loader2, Users, Trash2 } from "lucide-react";
import { useLeads, useCreateLead, useDeleteLead } from "@/hooks/useLeads";
import { useCreateInteraction } from "@/hooks/useInteractions";
import { useCenters } from "@/hooks/useCenters";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const stageConfig: Record<string, { variant: "info" | "primary" | "warning" | "success" | "muted" }> = {
  nuevo: { variant: "info" },
  contactado: { variant: "primary" },
  cualificado: { variant: "warning" },
  propuesta: { variant: "primary" },
  ganado: { variant: "success" },
  perdido: { variant: "muted" },
};

const lineConfig: Record<string, string> = {
  fisioterapia: "bg-primary/10 text-primary",
  nutricion: "bg-accent/10 text-accent",
  psicotecnicos: "bg-warning/10 text-warning",
};

const lineLabels: Record<string, string> = {
  fisioterapia: "Fisioterapia",
  nutricion: "Nutrición",
  psicotecnicos: "Psicotécnicos",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [lineFilter, setLineFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [intDialogOpen, setIntDialogOpen] = useState(false);
  const [intLeadId, setIntLeadId] = useState<string | null>(null);
  const [intType, setIntType] = useState<string>("llamada");
  const [intNotes, setIntNotes] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const { selectedCenterId } = useCenterFilter();
  const { profile } = useAuth();

  const { data: leads, isLoading } = useLeads({
    business_line: lineFilter,
    status: statusFilter,
    search: search.length >= 2 ? search : undefined,
    center_id: selectedCenterId,
  });
  const { data: centers } = useCenters();
  const createLead = useCreateLead();
  const deleteLead = useDeleteLead();
  const createInteraction = useCreateInteraction();

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", company_name: "",
    business_line: "" as string, source: "", center_id: "", notes: "", estimated_value: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync({
        ...form,
        business_line: form.business_line as any,
        center_id: form.center_id || null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
        notes: form.notes || null,
      });
      toast.success("Lead creado correctamente");
      setDialogOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", company_name: "", business_line: "", source: "", center_id: "", notes: "", estimated_value: "" });
    } catch (err: any) {
      toast.error(err.message || "Error al crear lead");
    }
  };

  const openInteraction = (leadId: string, type: string) => {
    setIntLeadId(leadId);
    setIntType(type);
    setIntNotes("");
    setIntDialogOpen(true);
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intLeadId) return;
    try {
      await createInteraction.mutateAsync({
        lead_id: intLeadId,
        type: intType as any,
        notes: intNotes || null,
        created_by: profile?.id || null,
      });
      toast.success("Interacción registrada");
      setIntDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Error al registrar interacción");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      toast.success("Lead eliminado");
    } catch (e: any) { toast.error(e.message); }
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader title="Leads" description={`${leads?.length || 0} leads en el sistema`}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo lead
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Nuevo lead</DialogTitle>
              <DialogDescription>Crea un nuevo lead comercial</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input required className="h-9" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Apellido</Label>
                  <Input className="h-9" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" className="h-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Empresa</Label>
                  <Input className="h-9" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Línea de negocio *</Label>
                  <Select value={form.business_line} onValueChange={(v) => setForm({ ...form, business_line: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                      <SelectItem value="nutricion">Nutrición</SelectItem>
                      <SelectItem value="psicotecnicos">Psicotécnicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Origen</Label>
                  <Input className="h-9" placeholder="Web, teléfono, referido..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor estimado (€)</Label>
                  <Input type="number" step="0.01" className="h-9" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Centro</Label>
                  <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                    <SelectContent>
                      {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Textarea className="min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={createLead.isPending}>
                  {createLead.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Crear lead
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={lineFilter} onValueChange={setLineFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Servicio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las líneas</SelectItem>
            <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
            <SelectItem value="nutricion">Nutrición</SelectItem>
            <SelectItem value="psicotecnicos">Psicotécnicos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="nuevo">Nuevo</SelectItem>
            <SelectItem value="contactado">Contactado</SelectItem>
            <SelectItem value="cualificado">Cualificado</SelectItem>
            <SelectItem value="propuesta">Propuesta</SelectItem>
            <SelectItem value="ganado">Ganado</SelectItem>
            <SelectItem value="perdido">Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : leads?.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No hay leads</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Lead</TableHead>
                <TableHead className="font-semibold">Línea</TableHead>
                <TableHead className="font-semibold">Origen</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold">Centro</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((l: any) => {
                const initials = `${l.first_name?.[0] || ""}${(l.last_name || l.company_name || "")?.[0] || ""}`.toUpperCase();
                return (
                  <TableRow key={l.id} className="table-row-hover">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{l.first_name} {l.last_name}</p>
                          <p className="text-xs text-muted-foreground">{l.email || l.company_name || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${lineConfig[l.business_line] || ""}`}>
                        {lineLabels[l.business_line] || l.business_line}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.source || "-"}</TableCell>
                    <TableCell><StatusBadge variant={stageConfig[l.status]?.variant || "muted"}>{l.status}</StatusBadge></TableCell>
                    <TableCell className="text-sm">{l.center?.name || "-"}</TableCell>
                    <TableCell className="text-sm font-semibold">{l.estimated_value ? `€${l.estimated_value}` : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(l.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={() => openInteraction(l.id, "llamada")}>
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Registrar llamada</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={() => openInteraction(l.id, "email")}>
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Registrar email</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={() => openInteraction(l.id, "nota")}>
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Añadir nota interna</TooltipContent>
                        </Tooltip>
                        <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" onClick={() => setDeleteTarget(l)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Interaction dialog */}
      <Dialog open={intDialogOpen} onOpenChange={setIntDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {intType === "llamada" ? "📞 Registrar llamada" : intType === "email" ? "📧 Registrar email" : "📝 Añadir nota interna"}
            </DialogTitle>
            <DialogDescription>
              {intType === "llamada" ? "Registra los detalles de la llamada realizada" : intType === "email" ? "Registra el email enviado o recibido" : "Añade una nota o comentario interno sobre este lead"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddInteraction} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea
                className="min-h-[80px]"
                placeholder={intType === "llamada" ? "Resumen de la llamada..." : intType === "email" ? "Asunto y contenido del email..." : "Nota interna..."}
                value={intNotes}
                onChange={(e) => setIntNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIntDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createInteraction.isPending}>
                {createInteraction.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Registrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el lead <strong>{deleteTarget?.first_name} {deleteTarget?.last_name || ""}</strong>. Sus datos se conservarán pero dejará de aparecer en las listas.
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