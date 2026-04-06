import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Users, CalendarDays, MapPin, Phone, Edit, Plus } from "lucide-react";

const centers = [
  {
    id: "1",
    name: "Centro Madrid Norte",
    address: "C/ Gran Vía 45, 28013 Madrid",
    phone: "911234567",
    email: "madridnorte@saludcrm.es",
    status: "activo",
    professionals: 8,
    patients: 142,
    todayAppts: 12,
    services: ["Fisioterapia", "Nutrición", "Psicotécnicos"],
  },
  {
    id: "2",
    name: "Centro Madrid Sur",
    address: "Av. de la Albufera 78, 28038 Madrid",
    phone: "912345678",
    email: "madridsur@saludcrm.es",
    status: "activo",
    professionals: 5,
    patients: 89,
    todayAppts: 6,
    services: ["Fisioterapia", "Nutrición"],
  },
  {
    id: "3",
    name: "Centro Barcelona",
    address: "Passeig de Gràcia 120, 08008 Barcelona",
    phone: "931234567",
    email: "barcelona@saludcrm.es",
    status: "activo",
    professionals: 6,
    patients: 76,
    todayAppts: 8,
    services: ["Fisioterapia", "Nutrición", "Psicotécnicos"],
  },
  {
    id: "4",
    name: "Centro Valencia",
    address: "C/ Colón 32, 46004 Valencia",
    phone: "961234567",
    email: "valencia@saludcrm.es",
    status: "activo",
    professionals: 4,
    patients: 35,
    todayAppts: 4,
    services: ["Psicotécnicos"],
  },
];

export default function CentersPage() {
  return (
    <AppLayout>
      <PageHeader title="Centros" description="Gestión de centros y ubicaciones">
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo centro
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Centros activos" value={4} icon={Building2} iconColor="text-primary" />
        <StatCard title="Total profesionales" value={23} icon={Users} iconColor="text-accent" />
        <StatCard title="Pacientes totales" value={342} icon={Users} iconColor="text-success" />
        <StatCard title="Citas hoy (total)" value={30} icon={CalendarDays} iconColor="text-warning" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold">Centro</TableHead>
              <TableHead className="font-semibold">Dirección</TableHead>
              <TableHead className="font-semibold">Contacto</TableHead>
              <TableHead className="font-semibold">Servicios</TableHead>
              <TableHead className="font-semibold text-center">Profesionales</TableHead>
              <TableHead className="font-semibold text-center">Pacientes</TableHead>
              <TableHead className="font-semibold text-center">Citas hoy</TableHead>
              <TableHead className="font-semibold">Estado</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {centers.map((c) => (
              <TableRow key={c.id} className="table-row-hover">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{c.address}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.phone}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {c.services.map((s) => (
                      <span key={s} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm font-semibold">{c.professionals}</TableCell>
                <TableCell className="text-center text-sm font-semibold">{c.patients}</TableCell>
                <TableCell className="text-center text-sm font-semibold">{c.todayAppts}</TableCell>
                <TableCell>
                  <StatusBadge variant="success">Activo</StatusBadge>
                </TableCell>
                <TableCell>
                  <button className="p-1.5 rounded-md hover:bg-muted transition-colors">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppLayout>
  );
}
