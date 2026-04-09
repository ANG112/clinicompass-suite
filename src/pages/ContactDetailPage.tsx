import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, Edit, Plus, Loader2, Tag, Briefcase, Stethoscope } from "lucide-react";
import { PatientNotesSection } from "@/components/patient/PatientNotesSection";
import { useNavigate, useParams } from "react-router-dom";
import { useContact, useContactAppointments, useContactDocuments, useContactInteractions, useContactPacks, useContactCategories, useUpdateContact } from "@/hooks/useContacts";
import { useContactBusinesses } from "@/hooks/useBusinesses";
import { useCreateInteraction } from "@/hooks/useInteractions";
import { useCreateAppointment, useStaffProfiles, useServices } from "@/hooks/useAppointments";
import { useCenters } from "@/hooks/useCenters";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";

const aptStatus: Record<string, { label: string; variant: "success" | "info" | "warning" | "destructive" | "muted" }> = {
  confirmada: { label: "Confirmada", variant: "success" },
  realizada: { label: "Realizada", variant: "info" },
  pendiente: { label: "Pendiente", variant: "warning" },
  no_presentado: { label: "No presentado", variant: "destructive" },
  cancelada: { label: "Cancelada", variant: "muted" },
  reprogramada: { label: "Reprogramada", variant: "warning" },
};

const docStatus: Record<string, { label: string; variant: "success" | "info" | "warning" | "muted" }> = {
  validado: { label: "Validado", variant: "success" },
  subido: { label: "Subido", variant: "info" },
  pendiente: { label: "Pendiente", variant: "warning" },
  no_subido: { label: "No subido", variant: "muted" },
};

const interactionIcons: Record<string, string> = {
  llamada: "📞", email: "📧", whatsapp: "💬", nota: "📝", accion_comercial: "🎯",
};

const categoryVariant: Record<string, "info" | "success" | "primary"> = {
  lead: "info", cliente: "success", cliente_recurrente: "primary",
};

export default function ContactDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth();
  const { data: contact, isLoading } = useContact(id);
  const { data: appointments } = useContactAppointments(id);
  const { data: documents } = useContactDocuments(id);
  const { data: interactions } = useContactInteractions(id);
  const { data: packs } = useContactPacks(id);
  const { data: businesses } = useContactBusinesses(id);
  const { data: categories } = useContactCategories();
  const { data: staff } = useStaffProfiles();
  const { data: services } = useServices();
  const { data: centers } = useCenters();

  const updateContact = useUpdateContact();
  const createInteraction = useCreateInteraction();
  const createApt = useCreateAppointment();

  const [editOpen, setEditOpen] = useState(false);
  const [intOpen, setIntOpen] = useState(false);
  const [aptOpen, setAptOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [editForm, setEditForm] = useState<any>({});
  const [intForm, setIntForm] = useState({ type: "nota" as string, notes: "" });
  const [aptForm, setAptForm] = useState({
    service_id: "", professional_id: "", center_id: "",
    date: format(new Date(), "yyyy-MM-dd"), start_time: "", duration: "30", notes: "",
  });

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppLayout>;
  }
  if (!contact) {
    return <AppLayout><div className="text-center p-12 text-muted-foreground">Contacto no encontrado</div></AppLayout>;
  }

  const initials = `${contact.first_name?.[0] || ""}${(contact.last_name || "")?.[0] || ""}`.toUpperCase();
  const profName = (contact as any).professional ? `${(contact as any).professional.first_name} ${(contact as any).professional.last_name}` : "-";
  const catName = (contact as any).category?.name || "lead";
  const activePack = packs?.find((p: any) => p.status === "activo");

  const openEdit = () => {
    setEditForm({
      first_name: contact.first_name, last_name: contact.last_name || "",
      nif: contact.nif || "", phone: contact.phone || "", email: contact.email || "",
      birth_date: contact.birth_date || "", sex: contact.sex || "",
      address: contact.address || "", city: contact.city || "", postal_code: contact.postal_code || "",
      center_id: contact.center_id || "", assigned_professional_id: contact.assigned_professional_id || "",
      category_id: contact.category_id, notes: contact.notes || "", company_name: contact.company_name || "",
      fiscal_name: contact.fiscal_name || "", fiscal_nif: contact.fiscal_nif || "",
      fiscal_address: contact.fiscal_address || "", fiscal_email: contact.fiscal_email || "",
      fiscal_phone: contact.fiscal_phone || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        ...editForm,
        birth_date: editForm.birth_date || null,
        center_id: editForm.center_id || null,
        assigned_professional_id: editForm.assigned_professional_id || null,
        sex: editForm.sex || null,
      });
      toast.success("Contacto actualizado");
      setEditOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const changeCategory = async (categoryId: string) => {
    try {
      await updateContact.mutateAsync({ id: contact.id, category_id: categoryId });
      toast.success("Categoría actualizada");
    } catch (err: any) { toast.error(err.message); }
  };

  const addTag = async () => {
    if (!tagInput.trim()) return;
    const newTags = [...(contact.tags || []), tagInput.trim()];
    try {
      await updateContact.mutateAsync({ id: contact.id, tags: newTags });
      setTagInput("");
      toast.success("Etiqueta añadida");
    } catch (err: any) { toast.error(err.message); }
  };

  const removeTag = async (tag: string) => {
    const newTags = (contact.tags || []).filter((t: string) => t !== tag);
    await updateContact.mutateAsync({ id: contact.id, tags: newTags });
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInteraction.mutateAsync({
        contact_id: contact.id,
        type: intForm.type as any,
        notes: intForm.notes || null,
        created_by: profile?.id || null,
      });
      toast.success("Interacción registrada");
      setIntOpen(false);
      setIntForm({ type: "nota", notes: "" });
    } catch (err: any) { toast.error(err.message); }
  };

  const handleAddApt = async (e: React.FormEvent) => {
    e.preventDefault();
    const centerId = aptForm.center_id || contact.center_id;
    if (!centerId) { toast.error("Selecciona un centro"); return; }
    if (!aptForm.date || !aptForm.start_time) { toast.error("Selecciona fecha y hora"); return; }
    const startDt = new Date(`${aptForm.date}T${aptForm.start_time}:00`).toISOString();
    const endDt = new Date(new Date(startDt).getTime() + parseInt(aptForm.duration) * 60000).toISOString();
    try {
      await createApt.mutateAsync({
        patient_id: contact.id,
        contact_id: contact.id,
        service_id: aptForm.service_id || null,
        professional_id: aptForm.professional_id || null,
        center_id: centerId,
        start_time: startDt,
        end_time: endDt,
        notes: aptForm.notes || null,
      } as any);
      toast.success("Cita creada correctamente");
      setAptOpen(false);
      setAptForm({ service_id: "", professional_id: "", center_id: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "", duration: "30", notes: "" });
    } catch (err: any) { toast.error(err.message || "Error al crear la cita"); }
  };

  return (
    <AppLayout>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
      </div>

      {/* Header card */}
      <div className="stat-card mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary font-heading">{initials}</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-heading text-foreground">{contact.first_name} {contact.last_name}</h1>
                <StatusBadge variant={categoryVariant[catName] || "muted"}>
                  {(contact as any).category?.label || catName}
                </StatusBadge>
              </div>
              {contact.company_name && <p className="text-sm text-muted-foreground">{contact.company_name}</p>}
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {contact.phone}</span>}
                {contact.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {contact.email}</span>}
                {(contact as any).center?.name && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {(contact as any).center.name}</span>}
              </div>
              {/* Category change */}
              <div className="flex gap-1.5 mt-2">
                {categories?.map((cat: any) => (
                  <Button
                    key={cat.id}
                    size="sm"
                    variant={contact.category_id === cat.id ? "default" : "outline"}
                    className="text-[10px] h-6 px-2"
                    onClick={() => changeCategory(cat.id)}
                  >
                    {cat.label}
                  </Button>
                ))}
              </div>
              {/* Tags */}
              <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                {contact.tags?.map((t: string) => (
                  <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="hover:text-destructive">×</button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    className="h-6 w-24 text-[10px] px-1.5"
                    placeholder="+ etiqueta"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  />
                </div>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1" onClick={openEdit}><Edit className="h-3.5 w-3.5" /> Editar</Button>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="notes"><Stethoscope className="h-3.5 w-3.5 mr-1" />Notas</TabsTrigger>
          <TabsTrigger value="businesses">Negocios ({businesses?.length || 0})</TabsTrigger>
          <TabsTrigger value="appointments">Citas ({appointments?.length || 0})</TabsTrigger>
          <TabsTrigger value="interactions">Interacciones ({interactions?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="fiscal">Datos fiscales</TabsTrigger>
        </TabsList>

        <TabsContent value="notes">
          <PatientNotesSection contactId={contact.id} />
        </TabsContent>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="stat-card lg:col-span-2">
              <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Datos personales</h3>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["NIF/DNI", contact.nif],
                  ["Fecha nacimiento", contact.birth_date ? format(new Date(contact.birth_date), "dd/MM/yyyy") : "-"],
                  ["Sexo", contact.sex || "-"],
                  ["Teléfono", contact.phone || "-"],
                  ["Email", contact.email || "-"],
                  ["Dirección", [contact.address, contact.city, contact.postal_code].filter(Boolean).join(", ") || "-"],
                  ["Centro", (contact as any).center?.name || "-"],
                  ["Profesional", profName],
                  ["Canal captación", contact.source || "-"],
                ] as [string, string | null][]).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {activePack && (
                <div className="stat-card">
                  <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Bono activo</h3>
                  <p className="text-xs text-muted-foreground mb-2">{(activePack as any).name}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${((activePack as any).used_sessions / (activePack as any).total_sessions) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{(activePack as any).used_sessions}/{(activePack as any).total_sessions}</span>
                  </div>
                </div>
              )}
              <div className="stat-card">
                <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Observaciones</h3>
                <Textarea
                  className="text-xs min-h-[80px]"
                  defaultValue={contact.notes || ""}
                  placeholder="Añadir observaciones internas..."
                  onBlur={(e) => updateContact.mutateAsync({ id: contact.id, notes: e.target.value || null })}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="businesses">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Negocios / Oportunidades</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => navigate(`/negocios?contact=${contact.id}`)}>
                <Plus className="h-3.5 w-3.5" /> Nuevo negocio
              </Button>
            </div>
            {businesses?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin negocios registrados</p>
            ) : (
              <div className="space-y-2">
                {businesses?.map((b: any) => (
                  <div key={b.id} className="flex items-center gap-4 p-3 rounded-lg table-row-hover cursor-pointer" onClick={() => navigate(`/negocios`)}>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{b.name}</p>
                      <p className="text-xs text-muted-foreground">{b.business_type?.name} · {b.center?.name || "Sin centro"}</p>
                    </div>
                    <span className="text-sm font-semibold">{b.estimated_amount > 0 ? `€${b.estimated_amount}` : "Gratis"}</span>
                    <StatusBadge variant={b.status === "ganado" ? "success" : b.status === "perdido" ? "muted" : "info"}>{b.stage?.name || b.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Historial de citas</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAptOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Nueva cita
              </Button>
            </div>
            {appointments?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin citas registradas</p>
            ) : (
              <div className="space-y-2">
                {appointments?.map((a: any) => {
                  const st = aptStatus[a.status] || aptStatus.pendiente;
                  return (
                    <div key={a.id} className="flex items-center gap-4 p-3 rounded-lg table-row-hover">
                      <div className="flex items-center gap-2 w-32">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{format(new Date(a.start_time), "dd/MM/yyyy")}</span>
                      </div>
                      <span className="text-sm font-mono text-primary w-14">{format(new Date(a.start_time), "HH:mm")}</span>
                      <span className="text-sm flex-1">{a.service?.name || "-"}</span>
                      <span className="text-sm text-muted-foreground">{a.professional ? `${a.professional.first_name} ${a.professional.last_name}` : "-"}</span>
                      <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="interactions">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Historial de interacciones</h3>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setIntOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Nueva interacción
              </Button>
            </div>
            {interactions?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin interacciones registradas</p>
            ) : (
              <div className="space-y-3">
                {interactions?.map((int: any) => (
                  <div key={int.id} className="flex gap-3 p-3 rounded-lg table-row-hover">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-sm">{interactionIcons[int.type] || "📌"}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground capitalize">{int.type}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{format(new Date(int.created_at), "dd/MM/yyyy HH:mm")}</span>
                      </div>
                      {int.notes && <p className="text-xs text-muted-foreground mt-1">{int.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Documentos y consentimientos</h3>
            {documents?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin documentos</p>
            ) : (
              <div className="space-y-2">
                {documents?.map((d: any) => {
                  const st = docStatus[d.status] || docStatus.pendiente;
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg table-row-hover">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{d.document_type?.name || d.file_name || "Documento"}</p>
                        <p className="text-xs text-muted-foreground">{d.document_type?.category || "general"} · {format(new Date(d.created_at), "dd/MM/yyyy")}</p>
                      </div>
                      <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="fiscal">
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Datos fiscales</h3>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Nombre/Razón social", contact.fiscal_name],
                ["NIF fiscal", contact.fiscal_nif],
                ["Dirección fiscal", contact.fiscal_address],
                ["Email fiscal", contact.fiscal_email],
                ["Teléfono fiscal", contact.fiscal_phone],
              ] as [string, string | null][]).map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{value || "-"}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar contacto</DialogTitle>
            <DialogDescription>Actualiza la información del contacto</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input required className="h-9" value={editForm.first_name || ""} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Apellidos</Label>
                <Input className="h-9" value={editForm.last_name || ""} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">NIF/DNI</Label>
                <Input className="h-9" value={editForm.nif || ""} onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha nacimiento</Label>
                <Input type="date" className="h-9" value={editForm.birth_date || ""} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sexo</Label>
                <Select value={editForm.sex || ""} onValueChange={(v) => setEditForm({ ...editForm, sex: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hombre">Hombre</SelectItem>
                    <SelectItem value="mujer">Mujer</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={editForm.category_id || ""} onValueChange={(v) => setEditForm({ ...editForm, category_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-9" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" className="h-9" value={editForm.email || ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Empresa</Label>
                <Input className="h-9" value={editForm.company_name || ""} onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Origen</Label>
                <Input className="h-9" value={editForm.source || ""} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Dirección</Label>
                <Input className="h-9" value={editForm.address || ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Input className="h-9" value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">C.P.</Label>
                <Input className="h-9" value={editForm.postal_code || ""} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Centro</Label>
                <Select value={editForm.center_id || ""} onValueChange={(v) => setEditForm({ ...editForm, center_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profesional</Label>
                <Select value={editForm.assigned_professional_id || ""} onValueChange={(v) => setEditForm({ ...editForm, assigned_professional_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 border-t pt-3 mt-2">
                <p className="text-xs font-semibold text-foreground mb-2">Datos fiscales</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre fiscal</Label>
                <Input className="h-9" value={editForm.fiscal_name || ""} onChange={(e) => setEditForm({ ...editForm, fiscal_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">NIF fiscal</Label>
                <Input className="h-9" value={editForm.fiscal_nif || ""} onChange={(e) => setEditForm({ ...editForm, fiscal_nif: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Dirección fiscal</Label>
                <Input className="h-9" value={editForm.fiscal_address || ""} onChange={(e) => setEditForm({ ...editForm, fiscal_address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email fiscal</Label>
                <Input className="h-9" value={editForm.fiscal_email || ""} onChange={(e) => setEditForm({ ...editForm, fiscal_email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono fiscal</Label>
                <Input className="h-9" value={editForm.fiscal_phone || ""} onChange={(e) => setEditForm({ ...editForm, fiscal_phone: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Observaciones</Label>
                <Textarea className="min-h-[60px]" value={editForm.notes || ""} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={updateContact.isPending}>
                {updateContact.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add interaction dialog */}
      <Dialog open={intOpen} onOpenChange={setIntOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Registrar interacción</DialogTitle>
            <DialogDescription>Registra una llamada, email, WhatsApp o nota interna</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddInteraction} className="space-y-4">
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
              <Button type="button" variant="outline" size="sm" onClick={() => setIntOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm">Registrar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add appointment dialog */}
      <Dialog open={aptOpen} onOpenChange={setAptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Nueva cita para {contact.first_name}</DialogTitle>
            <DialogDescription>Programa una cita para este contacto</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddApt} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Servicio</Label>
                <Select value={aptForm.service_id} onValueChange={(v) => {
                  const svc = services?.find((s: any) => s.id === v);
                  setAptForm({ ...aptForm, service_id: v, duration: svc ? String(svc.duration_minutes) : aptForm.duration });
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {services?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profesional</Label>
                <Select value={aptForm.professional_id} onValueChange={(v) => setAptForm({ ...aptForm, professional_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Centro *</Label>
                <Select value={aptForm.center_id || contact.center_id || ""} onValueChange={(v) => setAptForm({ ...aptForm, center_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duración (min)</Label>
                <Input type="number" className="h-9" value={aptForm.duration} onChange={(e) => setAptForm({ ...aptForm, duration: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha *</Label>
                <Input type="date" required className="h-9" value={aptForm.date} onChange={(e) => setAptForm({ ...aptForm, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora *</Label>
                <Input type="time" required className="h-9" value={aptForm.start_time} onChange={(e) => setAptForm({ ...aptForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea className="min-h-[60px]" value={aptForm.notes} onChange={(e) => setAptForm({ ...aptForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAptOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createApt.isPending}>Crear cita</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
