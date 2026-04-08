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
import { Plus, Loader2, Calendar, User } from "lucide-react";
import { useBusinessTypes, useBusinessPipelineStages, useBusinesses, useCreateBusiness, useUpdateBusiness, useCreateStageChange } from "@/hooks/useBusinesses";
import { useContacts } from "@/hooks/useContacts";
import { useCenters } from "@/hooks/useCenters";
import { useStaffProfiles } from "@/hooks/useAppointments";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const stageVariants: Record<number, "info" | "primary" | "warning" | "success" | "muted"> = {
  0: "info", 1: "primary", 2: "warning", 3: "primary", 4: "success", 5: "muted",
};

export default function BusinessesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: businessTypes } = useBusinessTypes();
  const [activeTypeId, setActiveTypeId] = useState<string>("");
  const [newOpen, setNewOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { selectedCenterId } = useCenterFilter();
  const { profile } = useAuth();

  const selectedTypeId = activeTypeId || businessTypes?.[0]?.id || "";
  const { data: stages } = useBusinessPipelineStages(selectedTypeId);
  const { data: businesses, isLoading } = useBusinesses({
    business_type_id: selectedTypeId,
    center_id: selectedCenterId,
  });
  const { data: contacts } = useContacts();
  const { data: centers } = useCenters();
  const { data: staff } = useStaffProfiles();

  const createBusiness = useCreateBusiness();
  const updateBusiness = useUpdateBusiness();
  const createStageChange = useCreateStageChange();

  const selectedBusiness = businesses?.find((b: any) => b.id === detailId);
  const preselectedContactId = searchParams.get("contact") || "";

  const [form, setForm] = useState({
    name: "", contact_id: preselectedContactId, center_id: "", estimated_amount: "",
    expected_close_date: "", notes: "", assigned_to: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_id) { toast.error("Selecciona un contacto"); return; }
    try {
      await createBusiness.mutateAsync({
        name: form.name || `Negocio ${format(new Date(), "dd/MM/yyyy")}`,
        contact_id: form.contact_id,
        business_type_id: selectedTypeId,
        center_id: form.center_id || null,
        estimated_amount: form.estimated_amount ? parseFloat(form.estimated_amount) : (businessTypes?.find((t: any) => t.id === selectedTypeId) as any)?.default_price || 0,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes || null,
        assigned_to: form.assigned_to || null,
      });
      toast.success("Negocio creado");
      setNewOpen(false);
      setForm({ name: "", contact_id: "", center_id: "", estimated_amount: "", expected_close_date: "", notes: "", assigned_to: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const moveToStage = async (businessId: string, newStageId: string, fromStageId?: string) => {
    try {
      await updateBusiness.mutateAsync({ id: businessId, stage_id: newStageId });
      await createStageChange.mutateAsync({
        business_id: businessId,
        from_stage_id: fromStageId || null,
        to_stage_id: newStageId,
        changed_by: profile?.id || null,
      });
      toast.success("Negocio movido");
    } catch (err: any) { toast.error(err.message); }
  };

  const onDragEnd = async (result: DropResult) => {
    const { draggableId, destination, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const biz = businesses?.find((b: any) => b.id === draggableId);
    if (!biz) return;
    await moveToStage(draggableId, destination.droppableId, biz.stage_id);
  };

  const businessesByStage = (stages || []).reduce((acc: Record<string, any[]>, stage: any) => {
    acc[stage.id] = (businesses || []).filter((b: any) => b.stage_id === stage.id);
    return acc;
  }, {});

  return (
    <AppLayout>
      <PageHeader title="Negocios" description="Pipeline comercial por tipo de negocio">
        <Button size="sm" className="gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo negocio
        </Button>
      </PageHeader>

      <div className="mb-5">
        <Tabs value={selectedTypeId} onValueChange={setActiveTypeId}>
          <TabsList className="flex-wrap h-auto gap-1">
            {businessTypes?.map((bt: any) => (
              <TabsTrigger key={bt.id} value={bt.id} className="text-xs">
                {bt.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages?.map((stage: any) => {
              const stageBusinesses = businessesByStage[stage.id] || [];
              const variant = stageVariants[stage.position] || "muted";
              return (
                <Droppable key={stage.id} droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`kanban-column flex-shrink-0 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5 ring-2 ring-primary/20 rounded-xl" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge variant={variant} dot>{stage.name}</StatusBadge>
                          <span className="text-xs text-muted-foreground font-medium">{stageBusinesses.length}</span>
                        </div>
                      </div>
                      <div className="space-y-2 min-h-[100px]">
                        {stageBusinesses.map((biz: any, index: number) => (
                          <Draggable key={biz.id} draggableId={biz.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                className={`kanban-card group cursor-grab ${dragSnapshot.isDragging ? "shadow-lg ring-2 ring-primary/30 rotate-1" : ""}`}
                                onClick={() => { if (!dragSnapshot.isDragging) setDetailId(biz.id); }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{biz.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    <User className="inline h-3 w-3 mr-1" />
                                    {biz.contact?.first_name} {biz.contact?.last_name}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-muted-foreground">{biz.center?.name || "Sin centro"}</span>
                                    <span className="text-xs font-semibold text-foreground">
                                      {biz.estimated_amount > 0 ? `€${biz.estimated_amount}` : "Gratis"}
                                    </span>
                                  </div>
                                  {biz.next_action && (
                                    <div className="mt-2 text-[10px] text-warning flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {biz.next_action}
                                      {biz.next_action_date && <span className="text-muted-foreground"> · {format(new Date(biz.next_action_date), "dd/MM")}</span>}
                                    </div>
                                  )}
                                  {biz.assigned?.first_name && (
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                      Resp: {biz.assigned.first_name} {biz.assigned.last_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Business detail dialog */}
      <Dialog open={!!detailId} onOpenChange={(o) => { if (!o) setDetailId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{selectedBusiness?.name}</DialogTitle>
            <DialogDescription>{(selectedBusiness as any)?.business_type?.name}</DialogDescription>
          </DialogHeader>
          {selectedBusiness && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Contacto</span>
                  <p className="cursor-pointer text-primary hover:underline" onClick={() => navigate(`/contactos/${(selectedBusiness as any).contact?.id}`)}>
                    {(selectedBusiness as any).contact?.first_name} {(selectedBusiness as any).contact?.last_name}
                  </p>
                </div>
                <div><span className="text-xs text-muted-foreground">Centro</span><p>{(selectedBusiness as any).center?.name || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Importe</span><p className="font-semibold">{selectedBusiness.estimated_amount > 0 ? `€${selectedBusiness.estimated_amount}` : "Gratis"}</p></div>
                <div><span className="text-xs text-muted-foreground">Estado</span><p>{selectedBusiness.status}</p></div>
                <div><span className="text-xs text-muted-foreground">Fecha prevista cierre</span><p>{selectedBusiness.expected_close_date ? format(new Date(selectedBusiness.expected_close_date), "dd/MM/yyyy") : "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Responsable</span><p>{(selectedBusiness as any).assigned ? `${(selectedBusiness as any).assigned.first_name} ${(selectedBusiness as any).assigned.last_name}` : "-"}</p></div>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Mover a etapa</p>
                <div className="flex flex-wrap gap-1.5">
                  {stages?.map((s: any) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={selectedBusiness.stage_id === s.id ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => moveToStage(selectedBusiness.id, s.id, selectedBusiness.stage_id)}
                    >
                      {s.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Próxima acción</Label>
                  <Input className="h-8 text-xs" defaultValue={selectedBusiness.next_action || ""} onBlur={(e) => updateBusiness.mutateAsync({ id: selectedBusiness.id, next_action: e.target.value || null })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fecha próxima acción</Label>
                  <Input type="date" className="h-8 text-xs" defaultValue={selectedBusiness.next_action_date ? String(selectedBusiness.next_action_date).split("T")[0] : ""} onChange={(e) => updateBusiness.mutateAsync({ id: selectedBusiness.id, next_action_date: e.target.value || null })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notas</Label>
                <Textarea className="text-xs min-h-[60px]" defaultValue={selectedBusiness.notes || ""} onBlur={(e) => updateBusiness.mutateAsync({ id: selectedBusiness.id, notes: e.target.value || null })} />
              </div>

              <div className="flex gap-2">
                {selectedBusiness.status === "abierto" && (
                  <>
                    <Button size="sm" variant="default" className="text-xs" onClick={() => updateBusiness.mutateAsync({ id: selectedBusiness.id, status: "ganado", closed_at: new Date().toISOString() })}>✅ Marcar como ganado</Button>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => updateBusiness.mutateAsync({ id: selectedBusiness.id, status: "perdido", closed_at: new Date().toISOString() })}>❌ Marcar como perdido</Button>
                  </>
                )}
                {selectedBusiness.status !== "abierto" && (
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => updateBusiness.mutateAsync({ id: selectedBusiness.id, status: "abierto", closed_at: null })}>🔄 Reabrir</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New business dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Nuevo negocio</DialogTitle>
            <DialogDescription>Crea una nueva oportunidad comercial — {businessTypes?.find((t: any) => t.id === selectedTypeId)?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Nombre del negocio</Label>
                <Input className="h-9" placeholder="Ej: Bono fisio 10 sesiones" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Contacto *</Label>
                <Select value={form.contact_id} onValueChange={(v) => setForm({ ...form, contact_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar contacto" /></SelectTrigger>
                  <SelectContent>
                    {contacts?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label className="text-xs">Importe estimado (€)</Label>
                <Input type="number" step="0.01" className="h-9" value={form.estimated_amount} onChange={(e) => setForm({ ...form, estimated_amount: e.target.value })} placeholder={String((businessTypes?.find((t: any) => t.id === selectedTypeId) as any)?.default_price || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Responsable</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha prevista cierre</Label>
                <Input type="date" className="h-9" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea className="min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createBusiness.isPending}>
                {createBusiness.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Crear negocio
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
