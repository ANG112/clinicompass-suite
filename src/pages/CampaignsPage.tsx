import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Users, TrendingUp, Plus, Trash2, UserPlus, Loader2, Eye } from "lucide-react";
import { useCampaigns, useCreateCampaign, useUpdateCampaign, useDeleteCampaign, useCampaignContacts, useAddCampaignContact, useUpdateCampaignContact, useRemoveCampaignContact } from "@/hooks/useCampaigns";
import { useContacts } from "@/hooks/useContacts";
import { useCenters } from "@/hooks/useCenters";
import { toast } from "sonner";
import { format } from "date-fns";

const statusCfg: Record<string, { label: string; variant: "success" | "info" | "muted" | "warning" | "destructive" }> = {
  activa: { label: "Activa", variant: "success" },
  planificada: { label: "Planificada", variant: "info" },
  finalizada: { label: "Finalizada", variant: "muted" },
  cancelada: { label: "Cancelada", variant: "destructive" },
};

const contactStatusCfg: Record<string, { label: string; variant: "muted" | "info" | "warning" | "success" | "destructive" }> = {
  pendiente: { label: "Pendiente", variant: "muted" },
  contactado: { label: "Contactado", variant: "info" },
  interesado: { label: "Interesado", variant: "warning" },
  convertido: { label: "Convertido", variant: "success" },
  descartado: { label: "Descartado", variant: "destructive" },
};

const blLabels: Record<string, string> = { fisioterapia: "Fisioterapia", nutricion: "Nutrición", psicotecnicos: "Psicotécnicos" };

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: centers } = useCenters();
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const deleteCampaign = useDeleteCampaign();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", business_line: "fisioterapia", center_id: "", status: "planificada", target_count: 0, start_date: "", end_date: "" });

  const activeCampaigns = campaigns?.filter(c => c.status === "activa").length ?? 0;

  const openNew = () => {
    setEditingId(null);
    setForm({ name: "", description: "", business_line: "fisioterapia", center_id: "", status: "planificada", target_count: 0, start_date: "", end_date: "" });
    setShowForm(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description ?? "", business_line: c.business_line, center_id: c.center_id ?? "", status: c.status, target_count: c.target_count, start_date: c.start_date ?? "", end_date: c.end_date ?? "" });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    const payload = { ...form, center_id: form.center_id || null, start_date: form.start_date || null, end_date: form.end_date || null };
    try {
      if (editingId) {
        await updateCampaign.mutateAsync({ id: editingId, ...payload } as any);
        toast.success("Campaña actualizada");
      } else {
        await createCampaign.mutateAsync(payload as any);
        toast.success("Campaña creada");
      }
      setShowForm(false);
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteCampaign.mutateAsync(id); toast.success("Campaña eliminada"); } catch { toast.error("Error al eliminar"); }
  };

  return (
    <AppLayout>
      <PageHeader title="Campañas" description="Campañas comerciales y seguimiento">
        <Button size="sm" className="gap-2" onClick={openNew}><Plus className="h-4 w-4" /> Nueva campaña</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Campañas activas" value={activeCampaigns} icon={Megaphone} iconColor="text-primary" />
        <StatCard title="Total campañas" value={campaigns?.length ?? 0} icon={Users} iconColor="text-accent" />
        <StatCard title="Líneas de negocio" value={[...new Set(campaigns?.map(c => c.business_line) ?? [])].length} icon={TrendingUp} iconColor="text-success" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : !campaigns?.length ? (
        <div className="text-center py-12 text-muted-foreground">No hay campañas. Crea la primera.</div>
      ) : (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Campaña</TableHead>
                <TableHead className="font-semibold">Línea</TableHead>
                <TableHead className="font-semibold">Centro</TableHead>
                <TableHead className="font-semibold">Inicio</TableHead>
                <TableHead className="font-semibold text-center">Objetivo</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="font-semibold text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => {
                const st = statusCfg[c.status] ?? statusCfg.planificada;
                return (
                  <TableRow key={c.id} className="table-row-hover">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm">{blLabels[c.business_line] ?? c.business_line}</TableCell>
                    <TableCell className="text-sm">{(c as any).center?.name ?? "Todos"}</TableCell>
                    <TableCell className="text-sm">{c.start_date ?? "—"}</TableCell>
                    <TableCell className="text-center text-sm font-semibold">{c.target_count}</TableCell>
                    <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailId(c.id)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>✏️</Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nueva"} campaña</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Descripción</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Línea de negocio</Label>
                <Select value={form.business_line} onValueChange={v => setForm(f => ({ ...f, business_line: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                    <SelectItem value="nutricion">Nutrición</SelectItem>
                    <SelectItem value="psicotecnicos">Psicotécnicos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Centro</Label>
                <Select value={form.center_id || "all"} onValueChange={v => setForm(f => ({ ...f, center_id: v === "all" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {centers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusCfg).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Objetivo</Label><Input type="number" value={form.target_count} onChange={e => setForm(f => ({ ...f, target_count: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Inicio</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={createCampaign.isPending || updateCampaign.isPending}>
              {(createCampaign.isPending || updateCampaign.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "Guardar cambios" : "Crear campaña"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog with contacts */}
      {detailId && <CampaignDetailDialog campaignId={detailId} campaign={campaigns?.find(c => c.id === detailId)} onClose={() => setDetailId(null)} />}
    </AppLayout>
  );
}

function CampaignDetailDialog({ campaignId, campaign, onClose }: { campaignId: string; campaign: any; onClose: () => void }) {
  const { data: contacts, isLoading } = useCampaignContacts(campaignId);
  const { data: allContacts } = useContacts();
  const addContact = useAddCampaignContact();
  const updateContact = useUpdateCampaignContact();
  const removeContact = useRemoveCampaignContact();
  const [search, setSearch] = useState("");

  const assignedIds = new Set(contacts?.map(c => c.contact_id) ?? []);
  const availableContacts = (allContacts ?? []).filter(c => !assignedIds.has(c.id) && `${c.first_name} ${c.last_name ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  const handleAdd = async (contactId: string) => {
    try { await addContact.mutateAsync({ campaign_id: campaignId, contact_id: contactId }); toast.success("Contacto añadido"); } catch { toast.error("Error"); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updates: any = { id, campaign_id: campaignId, status };
    if (status === "contactado" || status === "interesado") updates.contacted_at = new Date().toISOString();
    if (status === "convertido") updates.converted_at = new Date().toISOString();
    try { await updateContact.mutateAsync(updates); } catch { toast.error("Error"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{campaign?.name ?? "Campaña"}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {/* Add contacts */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-1 block">Añadir contacto</Label>
            <div className="flex gap-2">
              <Input placeholder="Buscar contacto..." value={search} onChange={e => setSearch(e.target.value)} className="flex-1" />
            </div>
            {search && availableContacts.length > 0 && (
              <div className="border rounded-lg mt-1 max-h-32 overflow-y-auto">
                {availableContacts.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 cursor-pointer" onClick={() => handleAdd(c.id)}>
                    <span className="text-sm">{c.first_name} {c.last_name}</span>
                    <UserPlus className="h-3.5 w-3.5 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned contacts */}
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : !contacts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No hay contactos asignados</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map(cc => {
                  const ct = (cc as any).contact;
                  const st = contactStatusCfg[cc.status] ?? contactStatusCfg.pendiente;
                  return (
                    <TableRow key={cc.id}>
                      <TableCell className="text-sm font-medium">{ct?.first_name} {ct?.last_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ct?.email ?? "—"}</TableCell>
                      <TableCell>
                        <Select value={cc.status} onValueChange={v => handleStatusChange(cc.id, v)}>
                          <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(contactStatusCfg).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => removeContact.mutate({ id: cc.id, campaign_id: campaignId })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
