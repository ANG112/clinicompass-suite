import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Users, TrendingUp, Plus } from "lucide-react";

const campaigns = [
  { name: "Promo primavera fisio", service: "Fisioterapia", status: "activa", target: 120, contacted: 85, converted: 12, center: "Todos", startDate: "01/03/2026" },
  { name: "Psicotécnicos empresas Q2", service: "Psicotécnicos", status: "activa", target: 45, contacted: 30, converted: 8, center: "Madrid Norte", startDate: "15/03/2026" },
  { name: "Nutrición deportiva", service: "Nutrición", status: "planificada", target: 80, contacted: 0, converted: 0, center: "Barcelona", startDate: "15/04/2026" },
  { name: "Revisión anual conductores", service: "Psicotécnicos", status: "finalizada", target: 200, contacted: 195, converted: 42, center: "Valencia", startDate: "01/01/2026" },
];

const statusCfg: Record<string, { label: string; variant: "success" | "info" | "muted" }> = {
  activa: { label: "Activa", variant: "success" },
  planificada: { label: "Planificada", variant: "info" },
  finalizada: { label: "Finalizada", variant: "muted" },
};

export default function CampaignsPage() {
  return (
    <AppLayout>
      <PageHeader title="Campañas" description="Campañas comerciales y seguimiento">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nueva campaña</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Campañas activas" value={2} icon={Megaphone} iconColor="text-primary" />
        <StatCard title="Contactos alcanzados" value={310} icon={Users} iconColor="text-accent" />
        <StatCard title="Conversiones totales" value={62} icon={TrendingUp} iconColor="text-success" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Campaña</TableHead>
              <TableHead className="font-semibold">Servicio</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Inicio</TableHead>
              <TableHead className="font-semibold text-center">Objetivo</TableHead>
              <TableHead className="font-semibold text-center">Contactados</TableHead>
              <TableHead className="font-semibold text-center">Convertidos</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c, i) => {
              const st = statusCfg[c.status];
              return (
                <TableRow key={i} className="table-row-hover">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm">{c.service}</TableCell>
                  <TableCell className="text-sm">{c.center}</TableCell>
                  <TableCell className="text-sm">{c.startDate}</TableCell>
                  <TableCell className="text-center text-sm font-semibold">{c.target}</TableCell>
                  <TableCell className="text-center text-sm">{c.contacted}</TableCell>
                  <TableCell className="text-center text-sm font-semibold">{c.converted}</TableCell>
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
