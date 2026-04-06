import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Brain, Users, CheckCircle, Plus } from "lucide-react";

const records = [
  { name: "Pedro Ruiz", examType: "Permiso B", permit: "Conducción B", date: "03/04/2026", expiry: "03/04/2028", result: "apto", professional: "Dra. Molina", center: "Valencia", docs: "completa" },
  { name: "Javier Moreno", examType: "Permiso C", permit: "Conducción C", date: "05/04/2026", expiry: "-", result: "pendiente", professional: "Dr. Navarro", center: "Valencia", docs: "pendiente" },
  { name: "LogiTrans - Emp. 1", examType: "Permiso ADR", permit: "Mercancías peligrosas", date: "02/04/2026", expiry: "02/04/2027", result: "apto", professional: "Dra. Molina", center: "Madrid Norte", docs: "completa" },
  { name: "LogiTrans - Emp. 2", examType: "Permiso C+E", permit: "Conducción C+E", date: "02/04/2026", expiry: "02/04/2028", result: "no_apto", professional: "Dra. Molina", center: "Madrid Norte", docs: "completa" },
  { name: "Autocares G. - Emp. 1", examType: "Permiso D", permit: "Conducción D", date: "01/04/2026", expiry: "01/04/2028", result: "apto", professional: "Dr. Navarro", center: "Madrid Norte", docs: "completa" },
];

const resultCfg: Record<string, { label: string; variant: "success" | "destructive" | "warning" }> = {
  apto: { label: "Apto", variant: "success" },
  no_apto: { label: "No apto", variant: "destructive" },
  pendiente: { label: "Pendiente", variant: "warning" },
};

export default function PsychotechPage() {
  return (
    <AppLayout>
      <PageHeader title="Psicotécnicos" description="Registro de exámenes y certificados">
        <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo examen</Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Exámenes este mes" value={28} icon={Brain} iconColor="text-warning" />
        <StatCard title="Aptos" value={24} icon={CheckCircle} iconColor="text-success" />
        <StatCard title="Empresas colaboradoras" value={8} icon={Users} iconColor="text-primary" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Paciente</TableHead>
              <TableHead className="font-semibold">Tipo examen</TableHead>
              <TableHead className="font-semibold">Permiso/trámite</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">Vencimiento</TableHead>
              <TableHead className="font-semibold">Resultado</TableHead>
              <TableHead className="font-semibold">Profesional</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Docs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r, i) => {
              const st = resultCfg[r.result];
              return (
                <TableRow key={i} className="table-row-hover">
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.examType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.permit}</TableCell>
                  <TableCell className="text-sm">{r.date}</TableCell>
                  <TableCell className="text-sm">{r.expiry}</TableCell>
                  <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                  <TableCell className="text-sm">{r.professional}</TableCell>
                  <TableCell className="text-sm">{r.center}</TableCell>
                  <TableCell>
                    <StatusBadge variant={r.docs === "completa" ? "success" : "warning"} dot={false}>
                      {r.docs === "completa" ? "✓" : "…"}
                    </StatusBadge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
