import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Search, Upload, Plus } from "lucide-react";
import { useState } from "react";

const documents = [
  { name: "Consentimiento RGPD", patient: "María García", type: "Legal", center: "Madrid Norte", date: "01/03/2026", status: "validado" },
  { name: "Consentimiento informado", patient: "María García", type: "Clínico", center: "Madrid Norte", date: "01/03/2026", status: "subido" },
  { name: "Informe traumatología", patient: "María García", type: "Clínico", center: "Madrid Norte", date: "15/02/2026", status: "subido" },
  { name: "Consentimiento RGPD", patient: "Carlos López", type: "Legal", center: "Madrid Sur", date: "10/03/2026", status: "validado" },
  { name: "Certificado psicotécnico", patient: "Pedro Ruiz", type: "Certificado", center: "Valencia", date: "03/04/2026", status: "pendiente" },
  { name: "Consentimiento RGPD", patient: "Laura Sánchez", type: "Legal", center: "Madrid Norte", date: "20/02/2026", status: "no_subido" },
  { name: "Informe nutricional", patient: "Isabel Moreno", type: "Clínico", center: "Barcelona", date: "28/03/2026", status: "subido" },
];

const statusCfg: Record<string, { label: string; variant: "success" | "info" | "warning" | "muted" }> = {
  validado: { label: "Validado", variant: "success" },
  subido: { label: "Subido", variant: "info" },
  pendiente: { label: "Pendiente", variant: "warning" },
  no_subido: { label: "No subido", variant: "muted" },
};

export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = documents.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.patient.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <PageHeader title="Documentos" description="Gestión documental y consentimientos">
        <Button size="sm" className="gap-2"><Upload className="h-4 w-4" /> Subir documento</Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar documento o paciente..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="validado">Validado</SelectItem>
            <SelectItem value="subido">Subido</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="no_subido">No subido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Documento</TableHead>
              <TableHead className="font-semibold">Paciente</TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d, i) => {
              const st = statusCfg[d.status];
              return (
                <TableRow key={i} className="table-row-hover">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{d.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{d.patient}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.type}</TableCell>
                  <TableCell className="text-sm">{d.center}</TableCell>
                  <TableCell className="text-sm">{d.date}</TableCell>
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
