import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Edit,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const patient = {
  name: "María García López",
  nif: "12345678A",
  birthDate: "15/06/1985",
  sex: "Mujer",
  phone: "612345678",
  email: "maria@email.com",
  address: "Calle Mayor 15, 2ºB, Madrid 28013",
  center: "Madrid Norte",
  professional: "Dr. Pérez",
  service: "Fisioterapia",
  status: "activo",
  source: "Web",
  tags: ["Lumbalgia", "Crónico", "VIP"],
  notes: "Paciente derivada por traumatología. Tratamiento de lumbalgia crónica con bono de 10 sesiones.",
};

const appointments = [
  { date: "05/04/2026", time: "10:00", service: "Fisioterapia", professional: "Dr. Pérez", status: "confirmada" },
  { date: "02/04/2026", time: "10:00", service: "Fisioterapia", professional: "Dr. Pérez", status: "realizada" },
  { date: "30/03/2026", time: "10:00", service: "Fisioterapia", professional: "Dr. Pérez", status: "realizada" },
  { date: "27/03/2026", time: "10:00", service: "Fisioterapia", professional: "Dr. Pérez", status: "realizada" },
  { date: "24/03/2026", time: "10:00", service: "Fisioterapia", professional: "Dr. Pérez", status: "no_presentado" },
];

const interactions = [
  { date: "04/04/2026", type: "Llamada", note: "Confirmación cita del viernes. Paciente confirma asistencia.", user: "Recepción" },
  { date: "01/04/2026", type: "Nota clínica", note: "Mejoría notable en rango de movimiento. Se continúa protocolo.", user: "Dr. Pérez" },
  { date: "28/03/2026", type: "WhatsApp", note: "Recordatorio de cita enviado automáticamente.", user: "Sistema" },
  { date: "25/03/2026", type: "Email", note: "Envío de consentimiento informado para firma digital.", user: "Administración" },
];

const documents = [
  { name: "Consentimiento RGPD", type: "Legal", status: "validado" },
  { name: "Consentimiento informado", type: "Clínico", status: "subido" },
  { name: "Informe traumatología", type: "Clínico", status: "subido" },
  { name: "Informe de alta", type: "Clínico", status: "pendiente" },
];

const docStatus: Record<string, { label: string; variant: "success" | "info" | "warning" | "muted" }> = {
  validado: { label: "Validado", variant: "success" },
  subido: { label: "Subido", variant: "info" },
  pendiente: { label: "Pendiente", variant: "warning" },
  no_subido: { label: "No subido", variant: "muted" },
};

const aptStatus: Record<string, { label: string; variant: "success" | "info" | "warning" | "destructive" }> = {
  confirmada: { label: "Confirmada", variant: "success" },
  realizada: { label: "Realizada", variant: "info" },
  pendiente: { label: "Pendiente", variant: "warning" },
  no_presentado: { label: "No presentado", variant: "destructive" },
};

const packInfo = {
  name: "Bono 10 sesiones Fisioterapia",
  total: 10,
  used: 4,
  remaining: 6,
  expiry: "15/06/2026",
};

export default function PatientDetailPage() {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/pacientes")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a pacientes
        </Button>
      </div>

      {/* Header Card */}
      <div className="stat-card mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary font-heading">
              MG
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold font-heading text-foreground">{patient.name}</h1>
                <StatusBadge variant="success">Activo</StatusBadge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {patient.phone}</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {patient.email}</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {patient.center}</span>
              </div>
              <div className="flex gap-1.5 mt-2">
                {patient.tags.map(t => (
                  <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1"><Edit className="h-3.5 w-3.5" /> Editar</Button>
            <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Nueva cita</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="appointments">Citas</TabsTrigger>
          <TabsTrigger value="interactions">Interacciones</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Personal Data */}
            <div className="stat-card lg:col-span-2">
              <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Datos personales</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["NIF/DNI", patient.nif],
                  ["Fecha nacimiento", patient.birthDate],
                  ["Sexo", patient.sex],
                  ["Teléfono", patient.phone],
                  ["Email", patient.email],
                  ["Dirección", patient.address],
                  ["Centro", patient.center],
                  ["Profesional", patient.professional],
                  ["Servicio principal", patient.service],
                  ["Canal captación", patient.source],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pack / Bono */}
            <div className="space-y-4">
              <div className="stat-card">
                <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Bono activo</h3>
                <p className="text-xs text-muted-foreground mb-2">{packInfo.name}</p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(packInfo.used / packInfo.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{packInfo.used}/{packInfo.total}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {packInfo.remaining} sesiones restantes · Vence {packInfo.expiry}
                </p>
              </div>

              <div className="stat-card">
                <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Observaciones</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{patient.notes}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appointments">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Historial de citas</h3>
              <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Nueva cita</Button>
            </div>
            <div className="space-y-2">
              {appointments.map((a, i) => {
                const st = aptStatus[a.status];
                return (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg table-row-hover">
                    <div className="flex items-center gap-2 w-32">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{a.date}</span>
                    </div>
                    <span className="text-sm font-mono text-primary w-14">{a.time}</span>
                    <span className="text-sm flex-1">{a.service}</span>
                    <span className="text-sm text-muted-foreground">{a.professional}</span>
                    <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interactions">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Historial de interacciones</h3>
              <Button size="sm" variant="outline" className="gap-1"><Plus className="h-3.5 w-3.5" /> Añadir</Button>
            </div>
            <div className="space-y-3">
              {interactions.map((int, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg table-row-hover">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">{int.type}</span>
                      <span className="text-[10px] text-muted-foreground">· {int.user}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{int.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{int.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Documentos</h3>
              <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Subir documento</Button>
            </div>
            <div className="space-y-2">
              {documents.map((d, i) => {
                const st = docStatus[d.status];
                return (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg table-row-hover">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.type}</p>
                    </div>
                    <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="billing">
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Datos de facturación</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {[
                ["NIF", patient.nif],
                ["Nombre fiscal", patient.name],
                ["Dirección fiscal", patient.address],
                ["Email facturación", patient.email],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
            </div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Actos facturables</h4>
            <div className="space-y-2">
              {[
                { desc: "Sesión fisioterapia 02/04", amount: "€45", status: "cobrado" },
                { desc: "Sesión fisioterapia 30/03", amount: "€45", status: "cobrado" },
                { desc: "Sesión fisioterapia 27/03", amount: "€45", status: "cobrado" },
                { desc: "Bono 10 sesiones (restante)", amount: "€270", status: "pendiente" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg table-row-hover">
                  <span className="text-sm text-foreground">{item.desc}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">{item.amount}</span>
                    <StatusBadge variant={item.status === "cobrado" ? "success" : "warning"}>
                      {item.status === "cobrado" ? "Cobrado" : "Pendiente"}
                    </StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
