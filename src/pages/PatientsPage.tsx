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
import { Plus, Search, Eye, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

const patients = [
  { id: "1", name: "María García López", nif: "12345678A", phone: "612345678", email: "maria@email.com", center: "Madrid Norte", professional: "Dr. Pérez", service: "Fisioterapia", status: "activo", lastVisit: "02/04/2026" },
  { id: "2", name: "Carlos López Martín", nif: "23456789B", phone: "623456789", email: "carlos@email.com", center: "Madrid Sur", professional: "Dra. Gómez", service: "Nutrición", status: "activo", lastVisit: "01/04/2026" },
  { id: "3", name: "Ana Martínez Ruiz", nif: "34567890C", phone: "634567890", email: "ana@email.com", center: "Barcelona", professional: "Dr. Serra", service: "Fisioterapia", status: "activo", lastVisit: "31/03/2026" },
  { id: "4", name: "Pedro Ruiz Sánchez", nif: "45678901D", phone: "645678901", email: "pedro@email.com", center: "Valencia", professional: "Dra. Molina", service: "Psicotécnicos", status: "inactivo", lastVisit: "15/03/2026" },
  { id: "5", name: "Laura Sánchez Torres", nif: "56789012E", phone: "656789012", email: "laura@email.com", center: "Madrid Norte", professional: "Dr. Pérez", service: "Fisioterapia", status: "activo", lastVisit: "05/04/2026" },
  { id: "6", name: "Diego Torres Vidal", nif: "67890123F", phone: "667890123", email: "diego@email.com", center: "Barcelona", professional: "Dra. Font", service: "Nutrición", status: "alta_pendiente", lastVisit: "-" },
  { id: "7", name: "Elena Navarro Gil", nif: "78901234G", phone: "678901234", email: "elena@email.com", center: "Madrid Norte", professional: "Dr. Pérez", service: "Fisioterapia", status: "activo", lastVisit: "04/04/2026" },
  { id: "8", name: "Javier Moreno Díaz", nif: "89012345H", phone: "689012345", email: "javier@email.com", center: "Valencia", professional: "Dr. Navarro", service: "Psicotécnicos", status: "activo", lastVisit: "03/04/2026" },
];

const statusConfig: Record<string, { label: string; variant: "success" | "muted" | "warning" }> = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "muted" },
  alta_pendiente: { label: "Alta pendiente", variant: "warning" },
};

const serviceConfig: Record<string, string> = {
  Fisioterapia: "bg-primary/10 text-primary",
  Nutrición: "bg-accent/10 text-accent",
  Psicotécnicos: "bg-warning/10 text-warning",
};

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const navigate = useNavigate();

  const filtered = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.nif.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search);
    const matchesService = serviceFilter === "all" || p.service === serviceFilter;
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesService && matchesStatus;
  });

  return (
    <AppLayout>
      <PageHeader title="Pacientes" description={`${patients.length} pacientes registrados`}>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo paciente
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, NIF o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Servicio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los servicios</SelectItem>
            <SelectItem value="Fisioterapia">Fisioterapia</SelectItem>
            <SelectItem value="Nutrición">Nutrición</SelectItem>
            <SelectItem value="Psicotécnicos">Psicotécnicos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
            <SelectItem value="alta_pendiente">Alta pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Paciente</TableHead>
              <TableHead className="font-semibold">NIF</TableHead>
              <TableHead className="font-semibold">Teléfono</TableHead>
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Servicio</TableHead>
              <TableHead className="font-semibold">Profesional</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="font-semibold">Última visita</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const st = statusConfig[p.status];
              return (
                <TableRow
                  key={p.id}
                  className="table-row-hover cursor-pointer"
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {p.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono">{p.nif}</TableCell>
                  <TableCell className="text-sm">{p.phone}</TableCell>
                  <TableCell className="text-sm">{p.center}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${serviceConfig[p.service]}`}>
                      {p.service}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{p.professional}</TableCell>
                  <TableCell>
                    <StatusBadge variant={st.variant}>{st.label}</StatusBadge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.lastVisit}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
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
