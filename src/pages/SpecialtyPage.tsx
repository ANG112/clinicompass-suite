import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, Package, Loader2 } from "lucide-react";
import { useSpecialties } from "@/hooks/useSpecialties";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useCenterContext } from "@/components/layout/CenterSelector";

export default function SpecialtyPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: specialties } = useSpecialties();
  const { selectedCenter } = useCenterContext();
  const specialty = specialties?.find((s: any) => s.slug === slug);

  // Get services for this specialty (using business_line matching slug)
  const { data: services } = useQuery({
    queryKey: ["services-by-specialty", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("business_line", slug as any)
        .eq("active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const serviceIds = services?.map((s: any) => s.id) || [];

  // Get appointments for these services with patient and professional info
  const { data: appointments, isLoading } = useQuery({
    queryKey: ["specialty-appointments", slug, serviceIds, selectedCenter],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      let q = supabase
        .from("appointments")
        .select("*, contact:contacts(first_name, last_name), service:services(name), professional:staff_profiles(first_name, last_name)")
        .in("service_id", serviceIds)
        .order("start_time", { ascending: false })
        .limit(50);
      if (selectedCenter) q = q.eq("center_id", selectedCenter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: serviceIds.length > 0,
  });

  // Get treatment packs for these services
  const { data: packs } = useQuery({
    queryKey: ["specialty-packs", slug, serviceIds, selectedCenter],
    queryFn: async () => {
      if (serviceIds.length === 0) return [];
      const { data, error } = await supabase
        .from("treatment_packs")
        .select("*, contact:contacts(first_name, last_name), service:services(name)")
        .in("service_id", serviceIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: serviceIds.length > 0,
  });

  // Stats
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const appointmentsThisWeek = appointments?.filter((a: any) => {
    const d = new Date(a.start_time);
    return d >= weekStart && d < weekEnd;
  }) || [];

  const activePacks = packs?.filter((p: any) => p.status === "activo") || [];
  
  // Unique contacts with appointments
  const uniqueContactIds = new Set(appointments?.map((a: any) => a.contact_id).filter(Boolean) || []);

  const statusCfg: Record<string, { label: string; variant: "success" | "info" | "warning" | "muted" | "destructive" }> = {
    activo: { label: "Activo", variant: "success" },
    completado: { label: "Completado", variant: "info" },
    vencido: { label: "Vencido", variant: "warning" },
    cancelado: { label: "Cancelado", variant: "muted" },
  };

  const apptStatusCfg: Record<string, { label: string; variant: "success" | "info" | "warning" | "muted" | "destructive" }> = {
    pendiente: { label: "Pendiente", variant: "warning" },
    confirmada: { label: "Confirmada", variant: "info" },
    realizada: { label: "Realizada", variant: "success" },
    cancelada: { label: "Cancelada", variant: "muted" },
    no_presentado: { label: "No presentado", variant: "destructive" },
    reprogramada: { label: "Reprogramada", variant: "warning" },
  };

  if (!specialty && specialties) {
    return (
      <AppLayout>
        <PageHeader title="Especialidad no encontrada" description="La especialidad solicitada no existe" />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title={specialty?.name || "Cargando..."} description={`Seguimiento de pacientes y sesiones de ${specialty?.name || ""}`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Contactos atendidos" value={uniqueContactIds.size} icon={Users} iconColor="text-primary" />
        <StatCard title="Citas esta semana" value={appointmentsThisWeek.length} icon={CalendarDays} iconColor="text-accent" />
        <StatCard title="Bonos activos" value={activePacks.length} icon={Package} iconColor="text-warning" />
      </div>

      {/* Treatment packs */}
      {activePacks.length > 0 && (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Bonos / Packs de tratamiento</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Pack</TableHead>
                <TableHead className="font-semibold">Servicio</TableHead>
                <TableHead className="font-semibold">Sesiones</TableHead>
                <TableHead className="font-semibold">Precio</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packs?.map((p: any) => {
                const st = statusCfg[p.status] || { label: p.status, variant: "muted" as const };
                const contactName = p.contact ? `${p.contact.first_name} ${p.contact.last_name || ""}`.trim() : "—";
                return (
                  <TableRow key={p.id} className="table-row-hover">
                    <TableCell className="font-medium">{contactName}</TableCell>
                    <TableCell className="text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.service?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${p.total_sessions > 0 ? (p.used_sessions / p.total_sessions) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs font-medium">{p.used_sessions}/{p.total_sessions}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{p.price > 0 ? `€${p.price}` : "—"}</TableCell>
                    <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Recent appointments */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h3 className="text-sm font-semibold">Últimas citas</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando...
          </div>
        ) : !appointments?.length ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Sin citas registradas para esta especialidad</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Servicio</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="font-semibold">Profesional</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a: any) => {
                const st = apptStatusCfg[a.status] || { label: a.status, variant: "muted" as const };
                const contactName = a.contact ? `${a.contact.first_name} ${a.contact.last_name || ""}`.trim() : "—";
                const profName = a.professional ? `${a.professional.first_name} ${a.professional.last_name}`.trim() : "—";
                return (
                  <TableRow key={a.id} className="table-row-hover">
                    <TableCell className="font-medium">{contactName}</TableCell>
                    <TableCell className="text-sm">{a.service?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(a.start_time), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                    <TableCell className="text-sm">{profName}</TableCell>
                    <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </AppLayout>
  );
}
