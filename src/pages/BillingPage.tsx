import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

const items = [
  { patient: "María García", desc: "Sesión fisioterapia", date: "02/04/2026", amount: "€45", tax: "21%", status: "cobrado", center: "Madrid Norte" },
  { patient: "María García", desc: "Sesión fisioterapia", date: "30/03/2026", amount: "€45", tax: "21%", status: "cobrado", center: "Madrid Norte" },
  { patient: "Carlos López", desc: "Revisión nutrición", date: "01/04/2026", amount: "€60", tax: "21%", status: "pendiente", center: "Madrid Sur" },
  { patient: "Pedro Ruiz", desc: "Psicotécnico permiso B", date: "03/04/2026", amount: "€35", tax: "21%", status: "cobrado", center: "Valencia" },
  { patient: "LogiTrans S.L.", desc: "Psicotécnico ADR x3", date: "02/04/2026", amount: "€210", tax: "21%", status: "pendiente", center: "Madrid Norte" },
  { patient: "Laura Sánchez", desc: "Bono 12 sesiones fisio", date: "28/03/2026", amount: "€480", tax: "21%", status: "cobrado", center: "Madrid Norte" },
  { patient: "Elena Navarro", desc: "Sesión fisioterapia", date: "04/04/2026", amount: "€45", tax: "21%", status: "pendiente", center: "Madrid Norte" },
];

const statusCfg: Record<string, { label: string; variant: "success" | "warning" }> = {
  cobrado: { label: "Cobrado", variant: "success" },
  pendiente: { label: "Pendiente", variant: "warning" },
};

export default function BillingPage() {
  const totalCobrado = items.filter(i => i.status === "cobrado").reduce((s, i) => s + parseFloat(i.amount.replace("€", "").replace(",", "")), 0);
  const totalPendiente = items.filter(i => i.status === "pendiente").reduce((s, i) => s + parseFloat(i.amount.replace("€", "").replace(",", "")), 0);

  return (
    <AppLayout>
      <PageHeader title="Facturación" description="Preparación de facturación y control de cobros" />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total facturado" value={`€${totalCobrado + totalPendiente}`} icon={Receipt} iconColor="text-primary" />
        <StatCard title="Cobrado" value={`€${totalCobrado}`} icon={CheckCircle} iconColor="text-success" />
        <StatCard title="Pendiente" value={`€${totalPendiente}`} icon={AlertCircle} iconColor="text-warning" />
        <StatCard title="Actos facturables" value={items.length} icon={TrendingUp} iconColor="text-accent" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Paciente/Empresa</TableHead>
              <TableHead className="font-semibold">Concepto</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">IVA</TableHead>
              <TableHead className="font-semibold text-right">Importe</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => {
              const st = statusCfg[item.status];
              return (
                <TableRow key={i} className="table-row-hover">
                  <TableCell className="font-medium">{item.patient}</TableCell>
                  <TableCell className="text-sm">{item.desc}</TableCell>
                  <TableCell className="text-sm">{item.date}</TableCell>
                  <TableCell className="text-sm">{item.center}</TableCell>
                  <TableCell className="text-sm">{item.tax}</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{item.amount}</TableCell>
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
