import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Phone, Mail, MessageSquare } from "lucide-react";

const leads = [
  { id: "1", name: "Roberto Fernández", company: "-", phone: "611111111", email: "roberto@email.com", service: "Fisioterapia", source: "Web", stage: "Nuevo", center: "Madrid Norte", date: "06/04/2026", value: "€450" },
  { id: "2", name: "Isabel Moreno", company: "-", phone: "622222222", email: "isabel@email.com", service: "Nutrición", source: "Teléfono", stage: "Contactado", center: "Barcelona", date: "05/04/2026", value: "€200" },
  { id: "3", name: "LogiTrans S.L.", company: "LogiTrans S.L.", phone: "633333333", email: "admin@logitrans.es", service: "Psicotécnicos", source: "Comercial", stage: "Cualificado", center: "Valencia", date: "04/04/2026", value: "€3.200" },
  { id: "4", name: "Teresa Vidal", company: "-", phone: "644444444", email: "teresa@email.com", service: "Fisioterapia", source: "Referido", stage: "Propuesta", center: "Madrid Sur", date: "03/04/2026", value: "€600" },
  { id: "5", name: "Miguel Roca", company: "-", phone: "655555555", email: "miguel@email.com", service: "Nutrición", source: "Instagram", stage: "Nuevo", center: "Madrid Norte", date: "06/04/2026", value: "€350" },
  { id: "6", name: "Autocares García", company: "Autocares García S.A.", phone: "666666666", email: "info@autocaresgarcia.es", service: "Psicotécnicos", source: "Comercial", stage: "Propuesta", center: "Madrid Norte", date: "02/04/2026", value: "€8.400" },
  { id: "7", name: "Patricia Navarro", company: "-", phone: "677777777", email: "patricia@email.com", service: "Nutrición", source: "Web", stage: "Ganado", center: "Madrid Sur", date: "06/04/2026", value: "€250" },
];

const stageConfig: Record<string, { variant: "info" | "primary" | "warning" | "success" | "muted" }> = {
  Nuevo: { variant: "info" },
  Contactado: { variant: "primary" },
  Cualificado: { variant: "warning" },
  Propuesta: { variant: "primary" },
  Ganado: { variant: "success" },
  Perdido: { variant: "muted" },
};

const serviceConfig: Record<string, string> = {
  Fisioterapia: "bg-primary/10 text-primary",
  Nutrición: "bg-accent/10 text-accent",
  Psicotécnicos: "bg-warning/10 text-warning",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const filtered = leads.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchesService = serviceFilter === "all" || l.service === serviceFilter;
    const matchesStage = stageFilter === "all" || l.stage === stageFilter;
    return matchesSearch && matchesService && matchesStage;
  });

  return (
    <AppLayout>
      <PageHeader title="Leads" description={`${leads.length} leads en el sistema`}>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo lead
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar lead..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Servicio" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los servicios</SelectItem>
            <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
            <SelectItem value="Nutrición">Nutrición</SelectItem>
            <SelectItem value="Psicotécnicos">Psicotécnicos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Etapa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="Nuevo">Nuevo</SelectItem>
            <SelectItem value="Contactado">Contactado</SelectItem>
            <SelectItem value="Cualificado">Cualificado</SelectItem>
            <SelectItem value="Propuesta">Propuesta</SelectItem>
            <SelectItem value="Ganado">Ganado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Lead</TableHead>
              <TableHead className="font-semibold">Servicio</TableHead>
              <TableHead className="font-semibold">Origen</TableHead>
              <TableHead className="font-semibold">Etapa</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Valor</TableHead>
              <TableHead className="font-semibold">Fecha</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((l) => (
              <TableRow key={l.id} className="table-row-hover">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {l.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${serviceConfig[l.service]}`}>{l.service}</span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.source}</TableCell>
                <TableCell>
                  <StatusBadge variant={stageConfig[l.stage]?.variant || "muted"}>{l.stage}</StatusBadge>
                </TableCell>
                <TableCell className="text-sm">{l.center}</TableCell>
                <TableCell className="text-sm font-semibold">{l.value}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.date}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><Mail className="h-3.5 w-3.5 text-muted-foreground" /></button>
                    <button className="p-1.5 rounded-md hover:bg-muted transition-colors"><MessageSquare className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
