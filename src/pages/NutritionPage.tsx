import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Apple, Users, CalendarDays, Plus } from "lucide-react";

const patients = [
  { name: "Carlos López", plan: "Pérdida de peso", reviews: 3, nextReview: "10/04/2026", pack: "Bono 6 revisiones", professional: "Dra. Gómez", status: "activo" },
  { name: "Isabel Moreno", plan: "Nutrición deportiva", reviews: 1, nextReview: "12/04/2026", pack: "Sesión individual", professional: "Dra. Font", status: "activo" },
  { name: "Miguel Roca", plan: "Intolerancias", reviews: 5, nextReview: "15/04/2026", pack: "Bono 8 revisiones", professional: "Dra. Gómez", status: "activo" },
  { name: "Patricia Navarro", plan: "Nutrición general", reviews: 0, nextReview: "08/04/2026", pack: "Bono 4 revisiones", professional: "Dra. Font", status: "nuevo" },
];

const statusCfg: Record<string, { label: string; variant: "success" | "info" | "warning" }> = {
  activo: { label: "Activo", variant: "success" },
  nuevo: { label: "Nuevo", variant: "info" },
  pausado: { label: "Pausado", variant: "warning" },
};

export default function NutritionPage() {
  return (
    <AppLayout>
      <PageHeader title="Nutrición" description="Seguimiento nutricional de pacientes">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo seguimiento</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pacientes activos" value={15} icon={Users} iconColor="text-accent" />
        <StatCard title="Revisiones esta semana" value={8} icon={CalendarDays} iconColor="text-primary" />
        <StatCard title="Nuevos pacientes (mes)" value={4} icon={Apple} iconColor="text-success" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Paciente</TableHead>
              <TableHead className="font-semibold">Plan</TableHead>
              <TableHead className="font-semibold">Revisiones</TableHead>
              <TableHead className="font-semibold">Próxima revisión</TableHead>
              <TableHead className="font-semibold">Pack</TableHead>
              <TableHead className="font-semibold">Profesional</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p, i) => {
              const st = statusCfg[p.status];
              return (
                <TableRow key={i} className="table-row-hover">
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm">{p.plan}</TableCell>
                  <TableCell className="text-sm font-semibold">{p.reviews}</TableCell>
                  <TableCell className="text-sm">{p.nextReview}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.pack}</TableCell>
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
