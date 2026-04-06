import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`);

const weekDays = [
  { name: "Lun", date: "06 Abr", full: "2026-04-06" },
  { name: "Mar", date: "07 Abr", full: "2026-04-07" },
  { name: "Mié", date: "08 Abr", full: "2026-04-08" },
  { name: "Jue", date: "09 Abr", full: "2026-04-09" },
  { name: "Vie", date: "10 Abr", full: "2026-04-10" },
];

interface AppointmentSlot {
  time: string;
  day: string;
  patient: string;
  service: string;
  status: "confirmada" | "pendiente" | "realizada" | "cancelada";
  duration: number;
}

const appointments: AppointmentSlot[] = [
  { time: "09:00", day: "2026-04-06", patient: "María García", service: "Fisioterapia", status: "confirmada", duration: 1 },
  { time: "09:00", day: "2026-04-06", patient: "Carlos López", service: "Nutrición", status: "pendiente", duration: 1 },
  { time: "10:00", day: "2026-04-06", patient: "Ana Martínez", service: "Fisioterapia", status: "confirmada", duration: 1 },
  { time: "11:00", day: "2026-04-06", patient: "Pedro Ruiz", service: "Psicotécnico", status: "confirmada", duration: 2 },
  { time: "09:00", day: "2026-04-07", patient: "Laura Sánchez", service: "Fisioterapia", status: "confirmada", duration: 1 },
  { time: "10:00", day: "2026-04-07", patient: "Diego Torres", service: "Nutrición", status: "pendiente", duration: 1 },
  { time: "12:00", day: "2026-04-07", patient: "Elena Navarro", service: "Fisioterapia", status: "confirmada", duration: 1 },
  { time: "09:00", day: "2026-04-08", patient: "Javier Moreno", service: "Psicotécnico", status: "confirmada", duration: 2 },
  { time: "11:00", day: "2026-04-08", patient: "Patricia Vega", service: "Fisioterapia", status: "pendiente", duration: 1 },
  { time: "10:00", day: "2026-04-09", patient: "Roberto Fernández", service: "Nutrición", status: "confirmada", duration: 1 },
  { time: "14:00", day: "2026-04-09", patient: "Isabel Moreno", service: "Fisioterapia", status: "confirmada", duration: 1 },
  { time: "09:00", day: "2026-04-10", patient: "Miguel Roca", service: "Fisioterapia", status: "confirmada", duration: 1 },
  { time: "11:00", day: "2026-04-10", patient: "Teresa Vidal", service: "Psicotécnico", status: "pendiente", duration: 2 },
];

const serviceColors: Record<string, string> = {
  Fisioterapia: "border-l-primary bg-primary/5",
  Nutrición: "border-l-accent bg-accent/5",
  Psicotécnico: "border-l-warning bg-warning/5",
};

const statusVariant: Record<string, "success" | "warning" | "info" | "destructive"> = {
  confirmada: "success",
  pendiente: "warning",
  realizada: "info",
  cancelada: "destructive",
};

export default function AgendaPage() {
  const [view, setView] = useState("week");
  const [professional, setProfessional] = useState("all");

  return (
    <AppLayout>
      <PageHeader title="Agenda" description="Calendario de citas y disponibilidad">
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva cita
        </Button>
      </PageHeader>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="day">Día</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mes</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={professional} onValueChange={setProfessional}>
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="Profesional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los profesionales</SelectItem>
              <SelectItem value="perez">Dr. Pérez</SelectItem>
              <SelectItem value="gomez">Dra. Gómez</SelectItem>
              <SelectItem value="serra">Dr. Serra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground px-2">6 - 10 Abril, 2026</span>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2">Hoy</Button>
        </div>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-[70px_repeat(5,1fr)] border-b">
          <div className="p-2 border-r bg-muted/30" />
          {weekDays.map((d) => (
            <div key={d.full} className="p-3 text-center border-r last:border-r-0 bg-muted/30">
              <p className="text-xs text-muted-foreground">{d.name}</p>
              <p className="text-sm font-semibold text-foreground">{d.date}</p>
            </div>
          ))}
        </div>

        {/* Time Slots */}
        <div className="max-h-[600px] overflow-auto">
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-[70px_repeat(5,1fr)] border-b last:border-b-0 min-h-[60px]">
              <div className="p-2 border-r flex items-start justify-end pr-3">
                <span className="text-xs text-muted-foreground font-mono">{hour}</span>
              </div>
              {weekDays.map((day) => {
                const dayAppts = appointments.filter((a) => a.day === day.full && a.time === hour);
                return (
                  <div key={day.full} className="border-r last:border-r-0 p-1 relative">
                    {dayAppts.map((apt, i) => (
                      <div
                        key={i}
                        className={`rounded-md border-l-[3px] p-2 mb-1 cursor-pointer hover:shadow-sm transition-shadow ${serviceColors[apt.service]}`}
                      >
                        <p className="text-xs font-medium text-foreground truncate">{apt.patient}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{apt.service}</span>
                          <StatusBadge variant={statusVariant[apt.status]} dot={false}>
                            <span className="text-[9px]">{apt.status}</span>
                          </StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {Object.entries(serviceColors).map(([service, cls]) => (
          <div key={service} className="flex items-center gap-1.5">
            <div className={`h-3 w-1 rounded-full border-l-[3px] ${cls}`} />
            <span className="text-xs text-muted-foreground">{service}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
