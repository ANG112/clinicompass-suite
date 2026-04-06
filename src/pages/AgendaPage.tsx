import { useState, useMemo } from "react";
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
import { Plus, ChevronLeft, ChevronRight, Loader2, Clock, X } from "lucide-react";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useStaffProfiles, useServices } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useCenters } from "@/hooks/useCenters";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { toast } from "sonner";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, addMonths, subWeeks, subMonths, subDays, isToday } from "date-fns";
import { es } from "date-fns/locale";

const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 to 20:00

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "muted" }> = {
  confirmada: { label: "Confirmada", variant: "success" },
  pendiente: { label: "Pendiente", variant: "warning" },
  realizada: { label: "Realizada", variant: "info" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  no_presentado: { label: "No presentado", variant: "muted" },
  reprogramada: { label: "Reprogramada", variant: "warning" },
};

const serviceColors: Record<string, string> = {
  fisioterapia: "border-l-primary bg-primary/5",
  nutricion: "border-l-accent bg-accent/5",
  psicotecnicos: "border-l-warning bg-warning/5",
};

export default function AgendaPage() {
  const [view, setView] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [prefillDate, setPrefillDate] = useState<string>("");
  const { selectedCenterId } = useCenterFilter();

  // Date ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFrom = view === "day" ? format(currentDate, "yyyy-MM-dd") + "T00:00:00"
    : view === "week" ? format(weekStart, "yyyy-MM-dd") + "T00:00:00"
    : format(monthStart, "yyyy-MM-dd") + "T00:00:00";
  const dateTo = view === "day" ? format(currentDate, "yyyy-MM-dd") + "T23:59:59"
    : view === "week" ? format(weekEnd, "yyyy-MM-dd") + "T23:59:59"
    : format(monthEnd, "yyyy-MM-dd") + "T23:59:59";

  const { data: appointments, isLoading } = useAppointments({
    center_id: selectedCenterId,
    professional_id: professionalFilter,
    date_from: dateFrom,
    date_to: dateTo,
  });
  const { data: staff } = useStaffProfiles();
  const { data: services } = useServices();
  const { data: patients } = usePatients();
  const { data: centers } = useCenters();
  const createApt = useCreateAppointment();
  const updateApt = useUpdateAppointment();

  const navigate = (dir: number) => {
    if (view === "day") setCurrentDate(d => addDays(d, dir));
    else if (view === "week") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  // Form state
  const [form, setForm] = useState({
    patient_id: "", service_id: "", professional_id: "", center_id: "",
    date: "", start_time: "", duration: "30", notes: "",
  });

  const resetForm = () => setForm({ patient_id: "", service_id: "", professional_id: "", center_id: "", date: "", start_time: "", duration: "30", notes: "" });

  const openNewSlot = (date: Date, hour?: number) => {
    resetForm();
    setForm(f => ({
      ...f,
      date: format(date, "yyyy-MM-dd"),
      start_time: hour !== undefined ? `${hour.toString().padStart(2, "0")}:00` : "",
      center_id: selectedCenterId !== "all" ? selectedCenterId : "",
    }));
    setNewOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const startDt = `${form.date}T${form.start_time}:00`;
    const endDt = new Date(new Date(startDt).getTime() + parseInt(form.duration) * 60000).toISOString();
    try {
      await createApt.mutateAsync({
        patient_id: form.patient_id,
        service_id: form.service_id || null,
        professional_id: form.professional_id || null,
        center_id: form.center_id,
        start_time: startDt,
        end_time: endDt,
        notes: form.notes || null,
      });
      toast.success("Cita creada");
      setNewOpen(false);
      resetForm();
    } catch (err: any) { toast.error(err.message); }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await updateApt.mutateAsync({ id, status: status as any });
      toast.success("Estado actualizado");
      setEditOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  // Week days for grid
  const weekDays = view === "day"
    ? [currentDate]
    : Array.from({ length: view === "week" ? 7 : 0 }, (_, i) => addDays(weekStart, i));

  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getAptForSlot = (day: Date, hour: number) => {
    return (appointments || []).filter((a: any) => {
      const d = new Date(a.start_time);
      return isSameDay(d, day) && d.getHours() === hour;
    });
  };

  const getAptForDay = (day: Date) => (appointments || []).filter((a: any) => isSameDay(new Date(a.start_time), day));

  const headerLabel = view === "day"
    ? format(currentDate, "EEEE d MMMM yyyy", { locale: es })
    : view === "week"
    ? `${format(weekStart, "d MMM", { locale: es })} — ${format(weekEnd, "d MMM yyyy", { locale: es })}`
    : format(currentDate, "MMMM yyyy", { locale: es });

  return (
    <AppLayout>
      <PageHeader title="Agenda" description="Calendario de citas y disponibilidad">
        <Button size="sm" className="gap-2" onClick={() => { resetForm(); setForm(f => ({ ...f, date: format(new Date(), "yyyy-MM-dd"), center_id: selectedCenterId !== "all" ? selectedCenterId : "" })); setNewOpen(true); }}>
          <Plus className="h-4 w-4" /> Nueva cita
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Profesional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los profesionales</SelectItem>
              {staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground px-2 capitalize">{headerLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : view === "month" ? (
        /* Month view */
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground bg-muted/30">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map(day => {
              const dayApts = getAptForDay(day);
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={day.toISOString()}
                  className={`border-b border-r p-1.5 min-h-[90px] cursor-pointer hover:bg-muted/30 transition-colors ${!isCurrentMonth ? "opacity-40" : ""} ${isToday(day) ? "bg-primary/5" : ""}`}
                  onClick={() => openNewSlot(day)}
                >
                  <p className={`text-xs font-medium mb-1 ${isToday(day) ? "text-primary font-bold" : "text-foreground"}`}>{format(day, "d")}</p>
                  <div className="space-y-0.5">
                    {dayApts.slice(0, 3).map((a: any) => (
                      <div
                        key={a.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate border-l-2 ${serviceColors[a.service?.business_line] || "border-l-muted bg-muted/50"}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedApt(a); setEditOpen(true); }}
                      >
                        {format(new Date(a.start_time), "HH:mm")} {a.patient?.first_name}
                      </div>
                    ))}
                    {dayApts.length > 3 && <p className="text-[10px] text-muted-foreground">+{dayApts.length - 3} más</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Day/Week view */
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className={`grid border-b`} style={{ gridTemplateColumns: `70px repeat(${weekDays.length}, 1fr)` }}>
            <div className="p-2 border-r bg-muted/30" />
            {weekDays.map(d => (
              <div key={d.toISOString()} className={`p-3 text-center border-r last:border-r-0 ${isToday(d) ? "bg-primary/5" : "bg-muted/30"}`}>
                <p className="text-xs text-muted-foreground">{format(d, "EEE", { locale: es })}</p>
                <p className={`text-sm font-semibold ${isToday(d) ? "text-primary" : "text-foreground"}`}>{format(d, "d MMM", { locale: es })}</p>
              </div>
            ))}
          </div>
          <div className="max-h-[600px] overflow-auto">
            {hours.map(hour => (
              <div key={hour} className="border-b last:border-b-0 min-h-[56px]" style={{ display: "grid", gridTemplateColumns: `70px repeat(${weekDays.length}, 1fr)` }}>
                <div className="p-2 border-r flex items-start justify-end pr-3">
                  <span className="text-xs text-muted-foreground font-mono">{hour.toString().padStart(2, "0")}:00</span>
                </div>
                {weekDays.map(day => {
                  const slotApts = getAptForSlot(day, hour);
                  return (
                    <div
                      key={day.toISOString()}
                      className="border-r last:border-r-0 p-0.5 cursor-pointer hover:bg-muted/20 transition-colors"
                      onClick={() => openNewSlot(day, hour)}
                    >
                      {slotApts.map((apt: any) => {
                        const st = statusConfig[apt.status] || statusConfig.pendiente;
                        return (
                          <div
                            key={apt.id}
                            className={`rounded-md border-l-[3px] p-1.5 mb-0.5 cursor-pointer hover:shadow-sm transition-shadow ${serviceColors[apt.service?.business_line] || "border-l-muted bg-muted/50"}`}
                            onClick={(e) => { e.stopPropagation(); setSelectedApt(apt); setEditOpen(true); }}
                          >
                            <p className="text-xs font-medium text-foreground truncate">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{apt.service?.name || "-"}</span>
                              <StatusBadge variant={st.variant} dot={false}><span className="text-[9px]">{st.label}</span></StatusBadge>
                            </div>
                            {apt.professional && <p className="text-[10px] text-muted-foreground mt-0.5">{apt.professional.first_name} {apt.professional.last_name}</p>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {Object.entries(serviceColors).map(([line, cls]) => (
          <div key={line} className="flex items-center gap-1.5">
            <div className={`h-3 w-1 rounded-full border-l-[3px] ${cls}`} />
            <span className="text-xs text-muted-foreground capitalize">{line === "nutricion" ? "Nutrición" : line === "psicotecnicos" ? "Psicotécnicos" : "Fisioterapia"}</span>
          </div>
        ))}
      </div>

      {/* New appointment dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Nueva cita</DialogTitle>
            <DialogDescription>Programa una cita asociada a paciente, servicio y profesional</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Paciente *</Label>
                <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar paciente" /></SelectTrigger>
                  <SelectContent>
                    {patients?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Servicio</Label>
                <Select value={form.service_id} onValueChange={(v) => {
                  const svc = services?.find((s: any) => s.id === v);
                  setForm({ ...form, service_id: v, duration: svc ? String(svc.duration_minutes) : form.duration });
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {services?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes}min)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profesional</Label>
                <Select value={form.professional_id} onValueChange={(v) => setForm({ ...form, professional_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Centro *</Label>
                <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duración (min)</Label>
                <Input type="number" className="h-9" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha *</Label>
                <Input type="date" required className="h-9" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora *</Label>
                <Input type="time" required className="h-9" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea className="min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createApt.isPending}>
                {createApt.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Crear cita
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit/view appointment dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Detalle de cita</DialogTitle>
            <DialogDescription>Gestiona el estado y detalles de la cita</DialogDescription>
          </DialogHeader>
          {selectedApt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Paciente</span><p className="font-medium">{selectedApt.patient?.first_name} {selectedApt.patient?.last_name}</p></div>
                <div><span className="text-xs text-muted-foreground">Servicio</span><p>{selectedApt.service?.name || "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Profesional</span><p>{selectedApt.professional ? `${selectedApt.professional.first_name} ${selectedApt.professional.last_name}` : "-"}</p></div>
                <div><span className="text-xs text-muted-foreground">Centro</span><p>{selectedApt.center?.name || "-"}</p></div>
                <div>
                  <span className="text-xs text-muted-foreground">Fecha y hora</span>
                  <p className="font-mono">{format(new Date(selectedApt.start_time), "dd/MM/yyyy HH:mm")} — {format(new Date(selectedApt.end_time), "HH:mm")}</p>
                </div>
                <div><span className="text-xs text-muted-foreground">Estado actual</span><p><StatusBadge variant={statusConfig[selectedApt.status]?.variant || "muted"}>{statusConfig[selectedApt.status]?.label || selectedApt.status}</StatusBadge></p></div>
              </div>
              {selectedApt.notes && (
                <div><span className="text-xs text-muted-foreground">Notas</span><p className="text-sm mt-0.5">{selectedApt.notes}</p></div>
              )}
              <div>
                <p className="text-xs font-semibold mb-2">Cambiar estado</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={selectedApt.status === key ? "default" : "outline"}
                      className="text-xs h-7"
                      onClick={() => changeStatus(selectedApt.id, key)}
                    >
                      {cfg.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
