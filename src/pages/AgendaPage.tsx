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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Loader2, Clock, X, CalendarPlus, Wand2, List, User, MapPin, Trash2 } from "lucide-react";
import { useAppointments, useCreateAppointment, useUpdateAppointment, useStaffProfiles, useServices } from "@/hooks/useAppointments";
import { useAvailabilitySlots, useCreateAvailabilitySlotsBatch, useBookSlot, useFreeSlot, useUpdateAvailabilitySlot, useDeleteAvailabilitySlot } from "@/hooks/useAvailability";
import { useContacts } from "@/hooks/useContacts";
import { useCenters } from "@/hooks/useCenters";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { useAllStaffCenterServices } from "@/hooks/useStaffCenterServices";
import { toast } from "sonner";
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, addMonths, subWeeks, subMonths, isToday, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const hours = Array.from({ length: 13 }, (_, i) => i + 8);

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "info" | "destructive" | "muted" }> = {
  confirmada: { label: "Confirmada", variant: "success" },
  pendiente: { label: "Pendiente", variant: "warning" },
  realizada: { label: "Realizada", variant: "info" },
  cancelada: { label: "Cancelada", variant: "destructive" },
  no_presentado: { label: "No presentado", variant: "muted" },
  reprogramada: { label: "Reprogramada", variant: "warning" },
};

const slotStatusColors: Record<string, string> = {
  disponible: "bg-success/10 border-success/30 hover:bg-success/20",
  ocupado: "bg-primary/10 border-primary/30",
  bloqueado: "bg-muted border-muted-foreground/20",
};

const lineColors: Record<string, string> = {
  fisioterapia: "border-l-primary bg-primary/5",
  nutricion: "border-l-accent bg-accent/5",
  psicotecnicos: "border-l-warning bg-warning/5",
};

export default function AgendaPage() {
  const [view, setView] = useState("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [professionalFilter, setProfessionalFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { selectedCenterId } = useCenterFilter();

  // Dialogs
  const [newSlotOpen, setNewSlotOpen] = useState(false);
  const [bookOpen, setBookOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [selectedApt, setSelectedApt] = useState<any>(null);

  // Date ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFrom = view === "day" ? format(currentDate, "yyyy-MM-dd")
    : view === "week" ? format(weekStart, "yyyy-MM-dd")
    : format(monthStart, "yyyy-MM-dd");
  const dateTo = view === "day" ? format(currentDate, "yyyy-MM-dd")
    : view === "week" ? format(weekEnd, "yyyy-MM-dd")
    : format(monthEnd, "yyyy-MM-dd");

  // Data
  const { data: slots, isLoading: slotsLoading } = useAvailabilitySlots({
    center_id: selectedCenterId,
    professional_id: professionalFilter,
    service_id: serviceFilter,
    date_from: dateFrom,
    date_to: dateTo,
  });
  const { data: appointments, isLoading: aptsLoading } = useAppointments({
    center_id: selectedCenterId,
    professional_id: professionalFilter,
    date_from: dateFrom + "T00:00:00",
    date_to: dateTo + "T23:59:59",
  });
  const { data: staff } = useStaffProfiles();
  const { data: services } = useServices();
  const { data: contacts } = useContacts();
  const { data: centers } = useCenters();
  const { data: scsAll } = useAllStaffCenterServices();

  const createSlotsBatch = useCreateAvailabilitySlotsBatch();
  const bookSlot = useBookSlot();
  const freeSlotMut = useFreeSlot();
  const updateSlot = useUpdateAvailabilitySlot();
  const deleteSlot = useDeleteAvailabilitySlot();
  const updateApt = useUpdateAppointment();

  const isLoading = slotsLoading || aptsLoading;

  // Cascade helpers using staff_center_services
  const getStaffForCenter = (centerId: string) => {
    if (!scsAll || scsAll.length === 0 || !centerId || centerId === "all") return staff || [];
    const staffIds = [...new Set(scsAll.filter((s: any) => s.center_id === centerId).map((s: any) => s.staff_profile_id))];
    if (staffIds.length === 0) return staff || [];
    return (staff || []).filter((s: any) => staffIds.includes(s.id));
  };

  const getServicesForStaffAndCenter = (centerId: string, staffId: string) => {
    if (!scsAll || !centerId || !staffId) return services || [];
    const serviceIds = scsAll
      .filter((s: any) => s.center_id === centerId && s.staff_profile_id === staffId)
      .map((s: any) => s.service_id);
    if (serviceIds.length === 0) return services || []; // No assignments = allow all (backward compat)
    return (services || []).filter((s: any) => serviceIds.includes(s.id));
  };

  const navigate = (dir: number) => {
    if (view === "day") setCurrentDate(d => addDays(d, dir));
    else if (view === "week") setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
  };

  // Slot creation form
  const [slotForm, setSlotForm] = useState({
    center_id: "", professional_id: "", service_id: "",
    date_from: "", date_to: "", start_time: "08:00", end_time: "20:00",
    slot_duration: "60",
  });

  // Booking form
  const [bookForm, setBookForm] = useState({
    contact_id: "", duration: "60", notes: "",
  });

  // Demo form
  const [demoForm, setDemoForm] = useState({
    center_id: "", professional_id: "", service_id: "",
    date_from: "", date_to: "", start_time: "09:00", end_time: "14:00",
    slot_duration: "60",
  });

  const resetSlotForm = () => setSlotForm({
    center_id: selectedCenterId !== "all" ? selectedCenterId : "",
    professional_id: "", service_id: "",
    date_from: format(currentDate, "yyyy-MM-dd"),
    date_to: format(currentDate, "yyyy-MM-dd"),
    start_time: "08:00", end_time: "20:00", slot_duration: "60",
  });

  // Generate slots from form
  const generateSlots = (f: typeof slotForm) => {
    const result: any[] = [];
    const dur = parseInt(f.slot_duration) || 60;
    let day = parseISO(f.date_from);
    const endDay = parseISO(f.date_to);
    while (day <= endDay) {
      const dow = day.getDay();
      if (dow !== 0 && dow !== 6) {
        const [sh, sm] = f.start_time.split(":").map(Number);
        const [eh, em] = f.end_time.split(":").map(Number);
        let startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        while (startMin + dur <= endMin) {
          const stH = Math.floor(startMin / 60);
          const stM = startMin % 60;
          const enH = Math.floor((startMin + dur) / 60);
          const enM = (startMin + dur) % 60;
          result.push({
            center_id: f.center_id,
            professional_id: f.professional_id,
            service_id: f.service_id || null,
            date: format(day, "yyyy-MM-dd"),
            start_time: `${String(stH).padStart(2, "0")}:${String(stM).padStart(2, "0")}`,
            end_time: `${String(enH).padStart(2, "0")}:${String(enM).padStart(2, "0")}`,
            duration_minutes: dur,
            status: "disponible",
          });
          startMin += dur;
        }
      }
      day = addDays(day, 1);
    }
    return result;
  };

  // Check overlap against existing slots
  const checkOverlap = (newSlots: any[]) => {
    if (!slots) return [];
    const overlapping: string[] = [];
    for (const ns of newSlots) {
      for (const existing of slots as any[]) {
        if (existing.professional_id === ns.professional_id && existing.date === ns.date && existing.center_id === ns.center_id) {
          if (ns.start_time < existing.end_time && ns.end_time > existing.start_time) {
            overlapping.push(`${ns.date} ${ns.start_time}-${ns.end_time}`);
            break;
          }
        }
      }
    }
    return overlapping;
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deleteSlot.mutateAsync(slotId);
      toast.success("Hueco eliminado");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotForm.center_id || !slotForm.professional_id || !slotForm.date_from || !slotForm.date_to) {
      toast.error("Completa centro, profesional y fechas");
      return;
    }

    // Validate assignment
    if (scsAll && scsAll.length > 0) {
      const hasAssignment = scsAll.some((a: any) =>
        a.staff_profile_id === slotForm.professional_id && a.center_id === slotForm.center_id
      );
      if (!hasAssignment) {
        toast.error("Este profesional no tiene asignaciones en este centro. Configúralo en Configuración → Equipo.");
        return;
      }
      if (slotForm.service_id) {
        const hasServiceAssignment = scsAll.some((a: any) =>
          a.staff_profile_id === slotForm.professional_id && a.center_id === slotForm.center_id && a.service_id === slotForm.service_id
        );
        if (!hasServiceAssignment) {
          toast.error("Este profesional no puede prestar este servicio en este centro.");
          return;
        }
      }
    }

    const newSlots = generateSlots(slotForm);
    if (newSlots.length === 0) { toast.error("No se generaron huecos con estos parámetros"); return; }
    
    const overlaps = checkOverlap(newSlots);
    if (overlaps.length > 0) {
      toast.error(`Hay ${overlaps.length} hueco(s) que solapan con disponibilidad existente. Ajusta las horas.`);
      return;
    }
    
    try {
      await createSlotsBatch.mutateAsync(newSlots);
      toast.success(`${newSlots.length} huecos creados correctamente`);
      setNewSlotOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleGenerateDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.center_id || !demoForm.professional_id || !demoForm.date_from || !demoForm.date_to) {
      toast.error("Completa los campos requeridos");
      return;
    }
    const newSlots = generateSlots(demoForm);
    if (newSlots.length === 0) { toast.error("No se generaron huecos"); return; }
    
    const overlaps = checkOverlap(newSlots);
    if (overlaps.length > 0) {
      toast.error(`Hay ${overlaps.length} hueco(s) que solapan con disponibilidad existente`);
      return;
    }
    
    try {
      await createSlotsBatch.mutateAsync(newSlots);
      toast.success(`Demo: ${newSlots.length} huecos ficticios generados`);
      setDemoOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !bookForm.contact_id) { toast.error("Selecciona un contacto"); return; }
    const dur = parseInt(bookForm.duration) || selectedSlot.duration_minutes;
    const startDt = new Date(`${selectedSlot.date}T${selectedSlot.start_time}:00`).toISOString();
    const endDt = new Date(new Date(`${selectedSlot.date}T${selectedSlot.start_time}:00`).getTime() + dur * 60000).toISOString();
    
    if (selectedSlot.professional_id && appointments) {
      const overlap = appointments.find((a: any) => 
        a.professional_id === selectedSlot.professional_id &&
        a.status !== "cancelada" &&
        new Date(a.start_time) < new Date(endDt) &&
        new Date(a.end_time) > new Date(startDt)
      );
      if (overlap) {
        toast.error(`El profesional ya tiene una cita en ese horario (${format(new Date(overlap.start_time), "HH:mm")}–${format(new Date(overlap.end_time), "HH:mm")})`);
        return;
      }
    }
    
    try {
      await bookSlot.mutateAsync({
        slotId: selectedSlot.id,
        contactId: bookForm.contact_id,
        centerId: selectedSlot.center_id,
        serviceId: selectedSlot.service_id,
        professionalId: selectedSlot.professional_id,
        startTime: startDt,
        endTime: endDt,
        notes: bookForm.notes || null,
      });
      toast.success("Cita reservada correctamente");
      setBookOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleFreeSlot = async (slotId: string, aptId: string) => {
    try {
      await updateApt.mutateAsync({ id: aptId, status: "cancelada" });
      await freeSlotMut.mutateAsync(slotId);
      toast.success("Hueco liberado");
      setDetailOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  const changeAptStatus = async (id: string, status: string) => {
    try {
      await updateApt.mutateAsync({ id, status: status as any });
      if (status === "cancelada") {
        const slot = slots?.find((s: any) => s.appointment_id === id);
        if (slot) await freeSlotMut.mutateAsync(slot.id);
      }
      toast.success("Estado actualizado");
      setDetailOpen(false);
    } catch (err: any) { toast.error(err.message); }
  };

  // Grid helpers
  const weekDays = view === "day" ? [currentDate]
    : view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : [];
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const getSlotsForCell = (day: Date, hour: number) =>
    (slots || []).filter((s: any) => s.date === format(day, "yyyy-MM-dd") && parseInt(s.start_time) === hour);

  const getAptsForCell = (day: Date, hour: number) =>
    (appointments || []).filter((a: any) => {
      const d = new Date(a.start_time);
      return isSameDay(d, day) && d.getHours() === hour;
    });

  const getSlotsForDay = (day: Date) =>
    (slots || []).filter((s: any) => s.date === format(day, "yyyy-MM-dd"));

  const headerLabel = view === "day"
    ? format(currentDate, "EEEE d MMMM yyyy", { locale: es })
    : view === "week"
    ? `${format(weekStart, "d MMM", { locale: es })} — ${format(weekEnd, "d MMM yyyy", { locale: es })}`
    : format(currentDate, "MMMM yyyy", { locale: es });

  // List view data
  const listSlots = useMemo(() => {
    if (!slots) return [];
    let filtered = [...slots];
    if (statusFilter !== "all") filtered = filtered.filter((s: any) => s.status === statusFilter);
    return filtered;
  }, [slots, statusFilter]);

  // Filtered staff/services for slot creation forms
  const slotFormStaff = getStaffForCenter(slotForm.center_id);
  const slotFormServices = getServicesForStaffAndCenter(slotForm.center_id, slotForm.professional_id);
  const demoFormStaff = getStaffForCenter(demoForm.center_id);
  const demoFormServices = getServicesForStaffAndCenter(demoForm.center_id, demoForm.professional_id);

  // Filter bar staff by center
  const filterStaff = getStaffForCenter(selectedCenterId);

  return (
    <AppLayout>
      <PageHeader title="Agenda" description="Disponibilidad y citas por profesional, centro y servicio">
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setDemoForm({ ...demoForm, center_id: selectedCenterId !== "all" ? selectedCenterId : "", date_from: format(currentDate, "yyyy-MM-dd"), date_to: format(addDays(currentDate, 4), "yyyy-MM-dd") }); setDemoOpen(true); }}>
                <Wand2 className="h-3.5 w-3.5" /> Demo
              </Button>
            </TooltipTrigger>
            <TooltipContent>Generar huecos ficticios de prueba</TooltipContent>
          </Tooltip>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { resetSlotForm(); setNewSlotOpen(true); }}>
            <CalendarPlus className="h-3.5 w-3.5" /> Crear disponibilidad
          </Button>
        </div>
      </PageHeader>

      {/* Filters bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-3.5 w-3.5 mr-1" /> Listado
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Profesional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {filterStaff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Especialidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
              <SelectItem value="nutricion">Nutrición</SelectItem>
              <SelectItem value="psicotecnicos">Psicotécnicos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Servicio" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los servicios</SelectItem>
              {(services || [])
                .filter((s: any) => specialtyFilter === "all" || s.business_line === specialtyFilter)
                .map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {view === "list" && (
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="disponible">Disponibles</SelectItem>
                <SelectItem value="ocupado">Ocupados</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground px-2 capitalize">{headerLabel}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-1" onClick={() => setCurrentDate(new Date())}>Hoy</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : view === "list" ? (
        /* List view */
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-semibold text-xs">Fecha</th>
                  <th className="text-left p-3 font-semibold text-xs">Hora</th>
                  <th className="text-left p-3 font-semibold text-xs">Profesional</th>
                  <th className="text-left p-3 font-semibold text-xs">Servicio</th>
                  <th className="text-left p-3 font-semibold text-xs">Centro</th>
                  <th className="text-left p-3 font-semibold text-xs">Estado</th>
                  <th className="text-left p-3 font-semibold text-xs">Acción</th>
                </tr>
              </thead>
              <tbody>
                {listSlots.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No hay huecos para estos filtros</td></tr>
                ) : listSlots.map((slot: any) => (
                  <tr key={slot.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono text-xs">{format(parseISO(slot.date), "dd/MM/yyyy")}</td>
                    <td className="p-3 font-mono text-xs">{slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}</td>
                    <td className="p-3">{slot.professional ? `${slot.professional.first_name} ${slot.professional.last_name}` : "-"}</td>
                    <td className="p-3">
                      {slot.service ? (
                        <Badge variant="outline" className="text-[10px]">
                          {slot.service.name}
                        </Badge>
                      ) : "-"}
                    </td>
                    <td className="p-3 text-xs">{slot.center?.name || "-"}</td>
                    <td className="p-3">
                      <StatusBadge variant={slot.status === "disponible" ? "success" : slot.status === "ocupado" ? "info" : "muted"}>
                        {slot.status === "disponible" ? "Disponible" : slot.status === "ocupado" ? "Ocupado" : "Bloqueado"}
                      </StatusBadge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {slot.status === "disponible" && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                              setSelectedSlot(slot);
                              setBookForm({ contact_id: "", duration: String(slot.duration_minutes), notes: "" });
                              setBookOpen(true);
                            }}>Reservar</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {slot.status === "ocupado" && slot.appointment_id && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                            const apt = appointments?.find((a: any) => a.id === slot.appointment_id);
                            if (apt) { setSelectedApt(apt); setSelectedSlot(slot); setDetailOpen(true); }
                          }}>Ver cita</Button>
                        )}
                        {slot.status === "bloqueado" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDeleteSlot(slot.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Day / Week grid view */
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-auto max-h-[650px]">
            <table className="w-full border-collapse" style={{ minWidth: weekDays.length * 140 + 70 }}>
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b">
                  <th className="w-[70px] min-w-[70px] p-2 border-r bg-muted/30" />
                  {weekDays.map(d => (
                    <th key={d.toISOString()} className={`p-3 text-center border-r last:border-r-0 ${isToday(d) ? "bg-primary/5" : "bg-muted/30"}`}>
                      <p className="text-xs text-muted-foreground">{format(d, "EEE", { locale: es })}</p>
                      <p className={`text-sm font-semibold ${isToday(d) ? "text-primary" : "text-foreground"}`}>{format(d, "d MMM", { locale: es })}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hours.map(hour => (
                  <tr key={hour} className="border-b last:border-b-0" style={{ height: 64 }}>
                    <td className="w-[70px] min-w-[70px] p-2 border-r align-top text-right pr-3">
                      <span className="text-xs text-muted-foreground font-mono">{String(hour).padStart(2, "0")}:00</span>
                    </td>
                    {weekDays.map(day => {
                      const cellSlots = getSlotsForCell(day, hour);
                      const cellApts = getAptsForCell(day, hour);

                      return (
                        <td key={day.toISOString()} className="border-r last:border-r-0 p-0.5 align-top">
                          <div className="space-y-0.5">
                          {cellSlots.map((slot: any) => {
                            if (slot.status === "disponible") {
                              return (
                                <div
                                  key={slot.id}
                                  className={`rounded-md border p-1.5 cursor-pointer transition-colors relative group ${slotStatusColors.disponible}`}
                                  onClick={() => {
                                    setSelectedSlot(slot);
                                    setBookForm({ contact_id: "", duration: String(slot.duration_minutes), notes: "" });
                                    setBookOpen(true);
                                  }}
                                >
                                  <button
                                    className="absolute top-0.5 right-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded bg-destructive/80 text-white"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                    title="Eliminar hueco"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-success" />
                                    <span className="text-[10px] font-medium text-success">Disponible</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}</p>
                                  {slot.professional && <p className="text-[10px] text-muted-foreground truncate">{slot.professional.first_name} {slot.professional.last_name}</p>}
                                  {slot.service && <p className="text-[9px] text-muted-foreground truncate">{slot.service.name}</p>}
                                </div>
                              );
                            }
                            if (slot.status === "ocupado") {
                              const apt = appointments?.find((a: any) => a.id === slot.appointment_id);
                              if (!apt) return null;
                              const stCfg = statusConfig[apt.status] || statusConfig.pendiente;
                              const bl = apt.service?.business_line || "";
                              return (
                                <div
                                  key={slot.id}
                                  className={`rounded-md border-l-[3px] p-1.5 cursor-pointer hover:shadow-sm transition-shadow ${lineColors[bl] || "border-l-muted bg-muted/50"}`}
                                  onClick={() => { setSelectedApt(apt); setSelectedSlot(slot); setDetailOpen(true); }}
                                >
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {apt.patient?.first_name} {apt.patient?.last_name}
                                  </p>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-muted-foreground">{apt.service?.name || "-"}</span>
                                    <StatusBadge variant={stCfg.variant} dot={false}><span className="text-[9px]">{stCfg.label}</span></StatusBadge>
                                  </div>
                                  {apt.professional && <p className="text-[10px] text-muted-foreground mt-0.5">{apt.professional.first_name}</p>}
                                </div>
                              );
                            }
                            if (slot.status === "bloqueado") {
                              return (
                                <div key={slot.id} className={`rounded-md border p-1.5 relative group ${slotStatusColors.bloqueado}`}>
                                  <button
                                    className="absolute top-0.5 right-0.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded bg-destructive/80 text-white"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id); }}
                                    title="Eliminar hueco"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                  <span className="text-[10px] text-muted-foreground">Bloqueado</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                          {cellApts.filter((a: any) => !cellSlots.some((s: any) => s.appointment_id === a.id)).map((apt: any) => {
                            const stCfg = statusConfig[apt.status] || statusConfig.pendiente;
                            const bl = apt.service?.business_line || "";
                            return (
                              <div
                                key={apt.id}
                                className={`rounded-md border-l-[3px] p-1.5 cursor-pointer hover:shadow-sm transition-shadow ${lineColors[bl] || "border-l-muted bg-muted/50"}`}
                                onClick={() => { setSelectedApt(apt); setSelectedSlot(null); setDetailOpen(true); }}
                              >
                                <p className="text-xs font-medium text-foreground truncate">{apt.patient?.first_name} {apt.patient?.last_name}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[10px] text-muted-foreground">{format(new Date(apt.start_time), "HH:mm")}</span>
                                  <StatusBadge variant={stCfg.variant} dot={false}><span className="text-[9px]">{stCfg.label}</span></StatusBadge>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-success/20 border border-success/30" />
          <span className="text-xs text-muted-foreground">Disponible</span>
        </div>
        {Object.entries(lineColors).map(([line, cls]) => (
          <div key={line} className="flex items-center gap-1.5">
            <div className={`h-3 w-1 rounded-full border-l-[3px] ${cls}`} />
            <span className="text-xs text-muted-foreground capitalize">{line === "nutricion" ? "Nutrición" : line === "psicotecnicos" ? "Psicotécnicos" : "Fisioterapia"}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-muted border border-muted-foreground/20" />
          <span className="text-xs text-muted-foreground">Bloqueado</span>
        </div>
      </div>

      {/* Create availability dialog */}
      <Dialog open={newSlotOpen} onOpenChange={setNewSlotOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Crear disponibilidad</DialogTitle>
            <DialogDescription>Genera bloques de disponibilidad para un profesional</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSlots} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Centro *</Label>
                <Select value={slotForm.center_id} onValueChange={v => setSlotForm({ ...slotForm, center_id: v, professional_id: "", service_id: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{centers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profesional *</Label>
                <Select value={slotForm.professional_id} onValueChange={v => setSlotForm({ ...slotForm, professional_id: v, service_id: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {slotFormStaff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                    {slotFormStaff.length === 0 && <SelectItem value="_empty" disabled>Sin profesionales asignados</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Servicio (especialidad)</Label>
                <Select value={slotForm.service_id || "none"} onValueChange={v => {
                  const val = v === "none" ? "" : v;
                  setSlotForm({ ...slotForm, service_id: val, slot_duration: val ? (services?.find((s: any) => s.id === val)?.duration_minutes?.toString() || slotForm.slot_duration) : slotForm.slot_duration });
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Cualquier servicio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin servicio específico</SelectItem>
                    {slotFormServices.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} — {s.business_line === "fisioterapia" ? "Fisio" : s.business_line === "nutricion" ? "Nutri" : "Psico"} ({s.duration_minutes}min)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Desde *</Label>
                <Input type="date" className="h-9" value={slotForm.date_from} onChange={e => setSlotForm({ ...slotForm, date_from: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hasta *</Label>
                <Input type="date" className="h-9" value={slotForm.date_to} onChange={e => setSlotForm({ ...slotForm, date_to: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora inicio</Label>
                <Input type="time" className="h-9" value={slotForm.start_time} onChange={e => setSlotForm({ ...slotForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora fin</Label>
                <Input type="time" className="h-9" value={slotForm.end_time} onChange={e => setSlotForm({ ...slotForm, end_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duración hueco (min)</Label>
                <Input type="number" className="h-9" value={slotForm.slot_duration} onChange={e => setSlotForm({ ...slotForm, slot_duration: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setNewSlotOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createSlotsBatch.isPending}>
                {createSlotsBatch.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Crear huecos
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Book slot dialog */}
      <Dialog open={bookOpen} onOpenChange={setBookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Reservar hueco</DialogTitle>
            <DialogDescription>
              {selectedSlot && (
                <span>
                  {format(parseISO(selectedSlot.date), "dd/MM/yyyy")} · {selectedSlot.start_time?.slice(0, 5)}–{selectedSlot.end_time?.slice(0, 5)}
                  {selectedSlot.professional && ` · ${selectedSlot.professional.first_name} ${selectedSlot.professional.last_name}`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBookSlot} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Contacto *</Label>
              <Select value={bookForm.contact_id} onValueChange={v => setBookForm({ ...bookForm, contact_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar contacto" /></SelectTrigger>
                <SelectContent>
                  {contacts?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duración real (min)</Label>
              <Input type="number" className="h-9" value={bookForm.duration} onChange={e => setBookForm({ ...bookForm, duration: e.target.value })} />
              <p className="text-[10px] text-muted-foreground">Duración por defecto del servicio: {selectedSlot?.duration_minutes} min. Puedes cambiarla.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea className="min-h-[60px]" value={bookForm.notes} onChange={e => setBookForm({ ...bookForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBookOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={bookSlot.isPending}>
                {bookSlot.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirmar reserva
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Appointment detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Detalle de cita</DialogTitle>
            <DialogDescription>Gestiona el estado y detalles de la cita</DialogDescription>
          </DialogHeader>
          {selectedApt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Paciente</span>
                  <p className="font-medium">{selectedApt.patient?.first_name} {selectedApt.patient?.last_name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Servicio</span>
                  <p>{selectedApt.service?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Profesional</span>
                  <p>{selectedApt.professional ? `${selectedApt.professional.first_name} ${selectedApt.professional.last_name}` : "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Centro</span>
                  <p>{selectedApt.center?.name || "-"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Fecha y hora</span>
                  <p className="font-mono text-xs">{format(new Date(selectedApt.start_time), "dd/MM/yyyy HH:mm")} — {format(new Date(selectedApt.end_time), "HH:mm")}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <p><StatusBadge variant={statusConfig[selectedApt.status]?.variant || "muted"}>{statusConfig[selectedApt.status]?.label || selectedApt.status}</StatusBadge></p>
                </div>
              </div>
              {selectedApt.notes && (
                <div><span className="text-xs text-muted-foreground">Notas</span><p className="text-sm mt-0.5">{selectedApt.notes}</p></div>
              )}
              <div>
                <p className="text-xs font-semibold mb-2">Cambiar estado</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusConfig).map(([key, cfg]) => (
                    <Button key={key} size="sm" variant={selectedApt.status === key ? "default" : "outline"} className="text-xs h-7"
                      onClick={() => changeAptStatus(selectedApt.id, key)}
                    >{cfg.label}</Button>
                  ))}
                </div>
              </div>
              {selectedSlot && selectedApt.status !== "cancelada" && (
                <Button variant="destructive" size="sm" className="w-full" onClick={() => handleFreeSlot(selectedSlot.id, selectedApt.id)}>
                  Cancelar y liberar hueco
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Demo dialog */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Wand2 className="h-4 w-4" /> Generar disponibilidad de prueba
            </DialogTitle>
            <DialogDescription>Crea huecos ficticios para visualizar el calendario. Solo para testing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGenerateDemo} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Centro *</Label>
                <Select value={demoForm.center_id} onValueChange={v => setDemoForm({ ...demoForm, center_id: v, professional_id: "", service_id: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{centers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Profesional *</Label>
                <Select value={demoForm.professional_id} onValueChange={v => setDemoForm({ ...demoForm, professional_id: v, service_id: "" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {demoFormStaff.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                    {demoFormStaff.length === 0 && <SelectItem value="_empty" disabled>Sin profesionales asignados</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Servicio (especialidad)</Label>
                <Select value={demoForm.service_id || "none"} onValueChange={v => {
                  const val = v === "none" ? "" : v;
                  setDemoForm({ ...demoForm, service_id: val, slot_duration: val ? (services?.find((s: any) => s.id === val)?.duration_minutes?.toString() || demoForm.slot_duration) : demoForm.slot_duration });
                }}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Cualquier servicio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin servicio específico</SelectItem>
                    {demoFormServices.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} — {s.business_line === "fisioterapia" ? "Fisio" : s.business_line === "nutricion" ? "Nutri" : "Psico"} ({s.duration_minutes}min)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Desde *</Label>
                <Input type="date" className="h-9" value={demoForm.date_from} onChange={e => setDemoForm({ ...demoForm, date_from: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hasta *</Label>
                <Input type="date" className="h-9" value={demoForm.date_to} onChange={e => setDemoForm({ ...demoForm, date_to: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora inicio</Label>
                <Input type="time" className="h-9" value={demoForm.start_time} onChange={e => setDemoForm({ ...demoForm, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora fin</Label>
                <Input type="time" className="h-9" value={demoForm.end_time} onChange={e => setDemoForm({ ...demoForm, end_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duración (min)</Label>
                <Input type="number" className="h-9" value={demoForm.slot_duration} onChange={e => setDemoForm({ ...demoForm, slot_duration: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDemoOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createSlotsBatch.isPending}>
                {createSlotsBatch.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Generar demo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
