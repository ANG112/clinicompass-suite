import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, Users, Package, Plus } from "lucide-react";

const patients = [
  { name: "María García", treatment: "Lumbalgia crónica", sessions: "4/10", pack: "Bono 10 sesiones", nextAppt: "08/04/2026", professional: "Dr. Pérez", status: "en_tratamiento" },
  { name: "Laura Sánchez", treatment: "Rehabilitación rodilla", sessions: "7/12", pack: "Bono 12 sesiones", nextAppt: "09/04/2026", professional: "Dr. Pérez", status: "en_tratamiento" },
  { name: "Elena Navarro", treatment: "Cervicalgia", sessions: "2/8", pack: "Bono 8 sesiones", nextAppt: "07/04/2026", professional: "Dr. Pérez", status: "en_tratamiento" },
  { name: "Andrés Molina", treatment: "Post-operatorio hombro", sessions: "10/10", pack: "Bono 10 sesiones", nextAppt: "-", professional: "Dra. Gómez", status: "completado" },
  { name: "Roberto Fernández", treatment: "Esguince tobillo", sessions: "1/6", pack: "Bono 6 sesiones", nextAppt: "10/04/2026", professional: "Dr. Serra", status: "en_tratamiento" },
];

const statusCfg: Record<string, { label: string; variant: "success" | "info" | "muted" }> = {
  en_tratamiento: { label: "En tratamiento", variant: "success" },
  completado: { label: "Completado", variant: "info" },
  pausado: { label: "Pausado", variant: "muted" },
};

export default function PhysioPage() {
  return (
    <AppLayout>
      <PageHeader title="Fisioterapia" description="Seguimiento de pacientes y sesiones">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo tratamiento</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pacientes en tratamiento" value={12} icon={Users} iconColor="text-primary" />
        <StatCard title="Sesiones esta semana" value={34} icon={Activity} iconColor="text-accent" />
        <StatCard title="Bonos activos" value={18} icon={Package} iconColor="text-warning" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Paciente</TableHead>
              <TableHead className="font-semibold">Tratamiento</TableHead>
              <TableHead className="font-semibold">Sesiones</TableHead>
              <TableHead className="font-semibold">Pack</TableHead>
              <TableHead className="font-semibold">Próxima cita</TableHead>
              <TableHead className="font-semibold">Profesional</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p, i) => {
              const st = statusCfg[p.status];
              const [used, total] = p.sessions.split("/").map(Number);
              return (
                <TableRow key={i} className="table-row-hover">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.treatment}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(used / total) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium">{p.sessions}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.pack}</TableCell>
                  <TableCell className="text-sm">{p.nextAppt}</TableCell>
                  <TableCell className="text-sm">{p.professional}</TableCell>
                  <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
