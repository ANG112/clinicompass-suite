import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Phone, Mail, MessageSquare, ChevronRight, User, ArrowRightLeft, Loader2, StickyNote, Calendar } from "lucide-react";
import { useLeads, usePipelineStages, useCreateLead, useUpdateLead } from "@/hooks/useLeads";
import { useCreateInteraction, useLeadInteractions } from "@/hooks/useInteractions";
import { useCenters } from "@/hooks/useCenters";
import { useStaffProfiles } from "@/hooks/useAppointments";
import { useCreatePatient } from "@/hooks/usePatients";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const stageVariants: Record<number, "info" | "primary" | "warning" | "success" | "muted"> = {
  1: "info", 2: "primary", 3: "warning", 4: "primary", 5: "success", 6: "muted",
};

const lineColors: Record<string, string> = {
  fisioterapia: "bg-primary/10 text-primary",
  nutricion: "bg-accent/10 text-accent",
  psicotecnicos: "bg-warning/10 text-warning",
};

const lineLabels: Record<string, string> = {
  fisioterapia: "Fisioterapia", nutricion: "Nutrición", psicotecnicos: "Psicotécnicos",
};

const interactionIcons: Record<string, string> = {
  llamada: "📞", email: "📧", whatsapp: "💬", nota: "📝", accion_comercial: "🎯",
};

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState("fisioterapia");
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const { selectedCenterId } = useCenterFilter();
  const { profile } = useAuth();

  const { data: stages } = usePipelineStages(activeTab);
  const { data: leads, isLoading } = useLeads({
    business_line: activeTab,
    center_id: selectedCenterId,
    search: search.length >= 2 ? search : undefined,
  });
  const { data: centers } = useCenters();
  const { data: staff } = useStaffProfiles();
  const selectedLead = leads?.find((l: any) => l.id === selectedLeadId);
  const { data: leadInteractions } = useLeadInteractions(selectedLeadId ?? undefined);

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const createInteraction = useCreateInteraction();
  const createPatient = useCreatePatient();

  // New lead form
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", company_name: "",
    source: "", center_id: "", notes: "", estimated_value: "",
  });

  // Interaction form
  const [intForm, setIntForm] = useState({ type: "llamada" as string, notes: "" });

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const firstStage = stages?.find((s: any) => s.position === 1);
    try {
      await createLead.mutateAsync({
        ...form,
        business_line: activeTab as any,
        pipeline_stage_id: firstStage?.id || null,
        center_id: form.center_id || null,
        estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : null,
      });
      toast.success("Lead creado");
      setNewLeadOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", company_name: "", source: "", center_id: "", notes: "", estimated_value: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const moveToStage = async (leadId: string, stageId: string) => {
    try {
      await updateLead.mutateAsync({ id: leadId, pipeline_stage_id: stageId });
      toast.success("Lead movido");
    } catch (err: any) { toast.error(err.message); }
  };

  const addInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) return;
    try {
      await createInteraction.mutateAsync({
        lead_id: selectedLeadId,
        type: intForm.type as any,
        notes: intForm.notes || null,
        created_by: profile?.id || null,
      });
      toast.success("Interacción registrada");
      setInteractionOpen(false);
      setIntForm({ type: "llamada", notes: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleConvert = async () => {
    if (!selectedLead) return;
    try {
      const patient = await createPatient.mutateAsync({
        first_name: selectedLead.first_name,
        last_name: selectedLead.last_name || "",
        email: selectedLead.email || null,
        phone: selectedLead.phone || null,
        center_id: selectedLead.center_id || null,
        source: selectedLead.source || null,
        source_lead_id: selectedLead.id,
      });
      await updateLead.mutateAsync({
        id: selectedLead.id,
        converted: true,
        converted_to_patient_id: patient.id,
        status: "ganado" as any,
      });
      toast.success("Lead convertido a paciente");
      setConvertOpen(false);
      setSelectedLeadId(null);
    } catch (err: any) { toast.error(err.message); }
  };

  // Group leads by stage
  const leadsByStage = (stages || []).reduce((acc: Record<string, any[]>, stage: any) => {
    acc[stage.id] = (leads || []).filter((l: any) => l.pipeline_stage_id === stage.id);
    return acc;
  }, {});
  // Leads without stage
  const unstagedLeads = (leads || []).filter((l: any) => !l.pipeline_stage_id);

  return (
    <AppLayout>
      <PageHeader title="Pipeline Comercial" description="Gestión de oportunidades por línea de negocio">
        <Button size="sm" className="gap-2" onClick={() => setNewLeadOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo lead
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="fisioterapia">Fisioterapia</TabsTrigger>
            <TabsTrigger value="nutricion">Nutrición</TabsTrigger>
            <TabsTrigger value="psicotecnicos">Psicotécnicos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs h-9" />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages?.map((stage: any) => {
            const stageLeads = leadsByStage[stage.id] || [];
            const variant = stageVariants[stage.position] || "muted";
            return (
              <div key={stage.id} className="kanban-column flex-shrink-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={variant} dot>{stage.name}</StatusBadge>
                    <span className="text-xs text-muted-foreground font-medium">{stageLeads.length}</span>
                  </div>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {stageLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      className="kanban-card group cursor-pointer"
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">{lead.first_name} {lead.last_name}</p>
                          {lead.converted && <StatusBadge variant="success" dot={false}><span className="text-[9px]">Convertido</span></StatusBadge>}
                        </div>
                        {lead.company_name && <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">{lead.source || "-"} · {lead.center?.name || "Sin centro"}</span>
                          {lead.estimated_value && <span className="text-xs font-semibold text-foreground">€{lead.estimated_value}</span>}
                        </div>
                        {lead.next_action && (
                          <div className="mt-2 text-[10px] text-warning flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {lead.next_action}
                            {lead.next_action_date && <span className="text-muted-foreground"> · {format(new Date(lead.next_action_date), "dd/MM")}</span>}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 rounded hover:bg-muted" onClick={(e) => { e.stopPropagation(); setSelectedLeadId(lead.id); setInteractionOpen(true); }}>
                            <Phone className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button className="p-1 rounded hover:bg-muted" onClick={(e) => { e.stopPropagation(); setSelectedLeadId(lead.id); setInteractionOpen(true); }}>
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button className="p-1 rounded hover:bg-muted" onClick={(e) => { e.stopPropagation(); setSelectedLeadId(lead.id); setInteractionOpen(true); }}>
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(lead.created_at), "dd/MM")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead detail panel */}
      <Dialog open={!!selectedLeadId && !interactionOpen && !convertOpen} onOpenChange={(o) => { if (!o) setSelectedLeadId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedLead?.first_name} {selectedLead?.last_name}</DialogTitle>
            <DialogDescription>{selectedLead?.company_name || lineLabels[selectedLead?.business_line || ""] || ""}</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Email</span><p>{selectedLead.email || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Teléfono</span><p>{selectedLead.phone || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Origen</span><p>{selectedLead.source || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Valor</span><p>{selectedLead.estimated_value ? `€${selectedLead.estimated_value}` : "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Centro</span><p>{(selectedLead as any).center?.name || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Estado</span><p><StatusBadge variant="info">{selectedLead.status}</StatusBadge></p></div>
              </div>

              {/* Move between stages */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Mover a etapa</p>
                <div className="flex flex-wrap gap-1.5">
                  {stages?.map((s: any) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={selectedLead.pipeline_stage_id === s.id ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => moveToStage(selectedLead.id, s.id)}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Next action */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Próxima acción</Label>
                  <Input
                    className="h-8 text-xs"
                    defaultValue={selectedLead.next_action || ""}
                    onBlur={(e) => updateLead.mutateAsync({ id: selectedLead.id, next_action: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fecha próxima acción</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    defaultValue={selectedLead.next_action_date ? selectedLead.next_action_date.split("T")[0] : ""}
                    onChange={(e) => updateLead.mutateAsync({ id: selectedLead.id, next_action_date: e.target.value || null })}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs">Notas internas</Label>
                <Textarea
                  className="text-xs min-h-[60px]"
                  defaultValue={selectedLead.notes || ""}
                  onBlur={(e) => updateLead.mutateAsync({ id: selectedLead.id, notes: e.target.value || null })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setInteractionOpen(true)}>
                  <StickyNote className="h-3.5 w-3.5" /> Añadir interacción
                </Button>
                {!selectedLead.converted && (
                  <Button size="sm" className="gap-1 text-xs" onClick={() => setConvertOpen(true)}>
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Convertir a paciente
                  </Button>
                )}
              </div>

              {/* Interactions timeline */}
              {leadInteractions && leadInteractions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Historial de interacciones</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {leadInteractions.map((int: any) => (
                      <div key={int.id} className="flex gap-2 p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{interactionIcons[int.type] || "📌"}</span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold capitalize">{int.type}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(int.created_at), "dd/MM HH:mm")}</span>
                          </div>
                          {int.notes && <p className="text-xs text-muted-foreground mt-0.5">{int.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add interaction dialog */}
      <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Registrar interacción</DialogTitle>
            <DialogDescription>Registra una llamada, email, WhatsApp o nota interna</DialogDescription>
          </DialogHeader>
          <form onSubmit={addInteraction} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={intForm.type} onValueChange={(v) => setIntForm({ ...intForm, type: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="llamada">📞 Llamada</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                  <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
                  <SelectItem value="nota">📝 Nota interna</SelectItem>
                  <SelectItem value="accion_comercial">🎯 Acción comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea className="min-h-[80px]" value={intForm.notes} onChange={(e) => setIntForm({ ...intForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setInteractionOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createInteraction.isPending}>Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Convertir lead a paciente</DialogTitle>
            <DialogDescription>Se creará un paciente con los datos del lead y se marcará como convertido, manteniendo la trazabilidad.</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Nombre:</span> {selectedLead.first_name} {selectedLead.last_name}</p>
                <p><span className="text-muted-foreground">Email:</span> {selectedLead.email || "-"}</p>
                <p><span className="text-muted-foreground">Teléfono:</span> {selectedLead.phone || "-"}</p>
                <p><span className="text-muted-foreground">Centro:</span> {(selectedLead as any).center?.name || "-"}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConvertOpen(false)}>Cancelar</Button>
                <Button size="sm" className="gap-1" onClick={handleConvert}>
                  <ArrowRightLeft className="h-3.5 w-3.5" /> Confirmar conversión
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New lead dialog */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Nuevo lead — {lineLabels[activeTab]}</DialogTitle>
            <DialogDescription>Crea un nuevo lead en el pipeline de {lineLabels[activeTab]}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4">
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
                <Label className="text-xs">Origen</Label>
                <Input className="h-9" placeholder="Web, teléfono, referido..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Centro</Label>
                <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor estimado (€)</Label>
                <Input type="number" step="0.01" className="h-9" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea className="min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewLeadOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createLead.isPending}>
                {createLead.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Crear lead
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
