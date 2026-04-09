import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, MessageSquare, Edit, Plus, Loader2, Upload, Tag, User, Stethoscope } from "lucide-react";
import { PatientNotesSection } from "@/components/patient/PatientNotesSection";
import { useNavigate, useParams } from "react-router-dom";
import { usePatient, usePatientAppointments, usePatientDocuments, usePatientInteractions, usePatientPacks, useUpdatePatient } from "@/hooks/usePatients";
import { useCreateInteraction } from "@/hooks/useInteractions";
import { useCreateAppointment, useStaffProfiles, useServices } from "@/hooks/useAppointments";
import { useCenters } from "@/hooks/useCenters";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

export default function PatientDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile } = useAuth();
  const { data: patient, isLoading } = usePatient(id);
  const { data: appointments } = usePatientAppointments(id);
  const { data: documents } = usePatientDocuments(id);
  const { data: interactions } = usePatientInteractions(id);
  const { data: packs } = usePatientPacks(id);
  const { data: staff } = useStaffProfiles();
  const { data: services } = useServices();
  const { data: centers } = useCenters();

  const updatePatient = useUpdatePatient();
  const createInteraction = useCreateInteraction();
  const createApt = useCreateAppointment();

  const [editOpen, setEditOpen] = useState(false);
  const [intOpen, setIntOpen] = useState(false);
  const [aptOpen, setAptOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");

  // Edit form
  const [editForm, setEditForm] = useState<any>({});

  // Interaction form
  const [intForm, setIntForm] = useState({ type: "nota" as string, notes: "" });

  // Appointment form
  const [aptForm, setAptForm] = useState({
    service_id: "", professional_id: "", center_id: "",
    date: format(new Date(), "yyyy-MM-dd"), start_time: "", duration: "30", notes: "",
  });

  if (isLoading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppLayout>;
  }

  if (!patient) {
    return <AppLayout><div className="text-center p-12 text-muted-foreground">Paciente no encontrado</div></AppLayout>;
  }

  const initials = `${patient.first_name?.[0] || ""}${patient.last_name?.[0] || ""}`.toUpperCase();
  const profName = (patient as any).professional ? `${(patient as any).professional.first_name} ${(patient as any).professional.last_name}` : "-";
  const activePack = packs?.find((p: any) => p.status === "activo");

  const openEdit = () => {
    setEditForm({
      first_name: patient.first_name, last_name: patient.last_name,
      nif: patient.nif || "", phone: patient.phone || "", email: patient.email || "",
      birth_date: patient.birth_date || "", sex: patient.sex || "",
      address: patient.address || "", city: patient.city || "", postal_code: patient.postal_code || "",
      center_id: patient.center_id || "", assigned_professional_id: patient.assigned_professional_id || "",
      status: patient.status, notes: patient.notes || "",
      fiscal_name: patient.fiscal_name || "", fiscal_nif: patient.fiscal_nif || "",
      fiscal_address: patient.fiscal_address || "", fiscal_email: patient.fiscal_email || "",
      fiscal_phone: patient.fiscal_phone || "",
    });
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePatient.mutateAsync({
        id: patient.id,
        ...editForm,
        birth_date: editForm.birth_date || null,
        center_id: editForm.center_id || null,
        assigned_professional_id: editForm.assigned_professional_id || null,
        sex: editForm.sex || null,
      });
      toast.success("Paciente actualizado");
      setEditOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const addTag = async () => {
    if (!tagInput.trim()) return;
    const newTags = [...(patient.tags || []), tagInput.trim()];
    try {
      await updatePatient.mutateAsync({ id: patient.id, tags: newTags });
      setTagInput("");
      toast.success("Etiqueta añadida");
    } catch (err: any) { toast.error(err.message); }
  };

  const removeTag = async (tag: string) => {
    const newTags = (patient.tags || []).filter(t => t !== tag);
    await updatePatient.mutateAsync({ id: patient.id, tags: newTags });
  };

  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInteraction.mutateAsync({
        patient_id: patient.id,
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
    const centerId = aptForm.center_id || patient.center_id;
    if (!centerId) { toast.error("Selecciona un centro"); return; }
    if (!aptForm.date || !aptForm.start_time) { toast.error("Selecciona fecha y hora"); return; }
    const startDt = new Date(`${aptForm.date}T${aptForm.start_time}:00`).toISOString();
    const endDt = new Date(new Date(startDt).getTime() + parseInt(aptForm.duration) * 60000).toISOString();
    try {
      await createApt.mutateAsync({
        patient_id: patient.id,
        service_id: aptForm.service_id || null,
        professional_id: aptForm.professional_id || null,
        center_id: centerId,
        start_time: startDt,
        end_time: endDt,
        notes: aptForm.notes || null,
      });
      toast.success("Cita creada correctamente");
      setAptOpen(false);
      setAptForm({ service_id: "", professional_id: "", center_id: "", date: format(new Date(), "yyyy-MM-dd"), start_time: "", duration: "30", notes: "" });
    } catch (err: any) { toast.error(err.message || "Error al crear la cita"); }
  };

  return (
    <AppLayout>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pacientes")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a pacientes
        </Button>
      </div>

      {/* Header card */}
      <div className="stat-card mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary font-heading">{initials}</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-heading text-foreground">{patient.first_name} {patient.last_name}</h1>
                <StatusBadge variant={patient.status === "activo" ? "success" : patient.status === "alta_pendiente" ? "warning" : "muted"}>
                  {patient.status}
                </StatusBadge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                {patient.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>}
                {patient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>}
                {(patient as any).center?.name && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {(patient as any).center.name}</span>}
              </div>
              {/* Tags */}
              <div className="flex gap-1.5 mt-2 flex-wrap items-center">
                {patient.tags?.map(t => (
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="notes"><Stethoscope className="h-3.5 w-3.5 mr-1" />Notas</TabsTrigger>
          <TabsTrigger value="appointments">Citas ({appointments?.length || 0})</TabsTrigger>
          <TabsTrigger value="interactions">Interacciones ({interactions?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="fiscal">Datos fiscales</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="stat-card lg:col-span-2">
              <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Datos personales</h3>
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["NIF/DNI", patient.nif],
                  ["Fecha nacimiento", patient.birth_date ? format(new Date(patient.birth_date), "dd/MM/yyyy") : "-"],
                  ["Sexo", patient.sex || "-"],
                  ["Teléfono", patient.phone || "-"],
                  ["Email", patient.email || "-"],
                  ["Dirección", [patient.address, patient.city, patient.postal_code].filter(Boolean).join(", ") || "-"],
                  ["Centro", (patient as any).center?.name || "-"],
                  ["Profesional", profName],
                  ["Canal captación", patient.source || "-"],
                  ["Origen lead", patient.source_lead_id ? "Convertido desde lead" : "Alta directa"],
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
                  <p className="text-xs text-muted-foreground mb-2">{activePack.name}</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${(activePack.used_sessions / activePack.total_sessions) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{activePack.used_sessions}/{activePack.total_sessions}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {activePack.total_sessions - activePack.used_sessions} sesiones restantes
                    {activePack.expiry_date && ` · Vence ${format(new Date(activePack.expiry_date), "dd/MM/yyyy")}`}
                  </p>
                </div>
              )}
              <div className="stat-card">
                <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Observaciones</h3>
                <Textarea
                  className="text-xs min-h-[80px]"
                  defaultValue={patient.notes || ""}
                  placeholder="Añadir observaciones internas..."
                  onBlur={(e) => updatePatient.mutateAsync({ id: patient.id, notes: e.target.value || null })}
                />
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Documentos y consentimientos</h3>
            </div>
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
                ["Nombre/Razón social", patient.fiscal_name],
                ["NIF fiscal", patient.fiscal_nif],
                ["Dirección fiscal", patient.fiscal_address],
                ["Email fiscal", patient.fiscal_email],
                ["Teléfono fiscal", patient.fiscal_phone],
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

      {/* Edit patient dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Editar paciente</DialogTitle>
            <DialogDescription>Actualiza la información del paciente</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input required className="h-9" value={editForm.first_name || ""} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Apellidos *</Label>
                <Input required className="h-9" value={editForm.last_name || ""} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
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
                <Label className="text-xs">Estado</Label>
                <Select value={editForm.status || ""} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                    <SelectItem value="alta_pendiente">Alta pendiente</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
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
              <Button type="submit" size="sm" disabled={updatePatient.isPending}>
                {updatePatient.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
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
            <DialogTitle className="font-heading">Nueva cita para {patient.first_name}</DialogTitle>
            <DialogDescription>Programa una cita para este paciente</DialogDescription>
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
                <Select value={aptForm.center_id || patient.center_id || ""} onValueChange={(v) => setAptForm({ ...aptForm, center_id: v })}>
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
