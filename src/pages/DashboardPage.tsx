import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  UserPlus, Users, CalendarDays, TrendingUp,
  AlertCircle, Receipt, Activity, ArrowUpRight, Loader2,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";

const statusMap: Record<string, "success" | "warning" | "info"> = {
  confirmada: "success",
  pendiente: "warning",
  realizada: "info",
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData();

  if (isLoading || !data) {
    return (
      <AppLayout>
        <PageHeader title="Dashboard" description="Resumen general de actividad y métricas" />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </AppLayout>
    );
  }

  const fmtChange = (val: number, suffix = "vs mes anterior") =>
    `${val >= 0 ? "+" : ""}${val}% ${suffix}`;

  return (
    <AppLayout>
      <PageHeader title="Dashboard" description="Resumen general de actividad y métricas" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-in">
        <StatCard title="Leads nuevos" value={data.leadsNew}
          change={fmtChange(data.leadsChange)} changeType={data.leadsChange >= 0 ? "positive" : "negative"}
          icon={UserPlus} iconColor="text-primary" />
        <StatCard title="Pacientes activos" value={data.activePatients}
          change={fmtChange(data.patientsChange)} changeType={data.patientsChange >= 0 ? "positive" : "negative"}
          icon={Users} iconColor="text-accent" />
        <StatCard title="Citas hoy" value={data.todayAppts.length}
          change={`${data.pendingToday} pendientes de confirmar`} changeType="neutral"
          icon={CalendarDays} iconColor="text-warning" />
        <StatCard title="Facturación mes" value={`€${data.invoiceTotal.toLocaleString("es-ES")}`}
          change={fmtChange(data.invoiceChange)} changeType={data.invoiceChange >= 0 ? "positive" : "negative"}
          icon={Receipt} iconColor="text-success" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Conversión" value={`${data.conversionRate}%`}
          change="Leads convertidos este mes" changeType="neutral"
          icon={TrendingUp} iconColor="text-primary" />
        <StatCard title="No shows" value={data.noShows}
          change={`${data.noShowsDiff >= 0 ? "-" : "+"}${Math.abs(data.noShowsDiff)} vs semana anterior`}
          changeType={data.noShowsDiff >= 0 ? "positive" : "negative"}
          icon={AlertCircle} iconColor="text-warning" />
        <StatCard title="Bonos activos" value={data.activePacks}
          change={`${data.packsExpiringSoon} próximos a vencer`} changeType="neutral"
          icon={Activity} iconColor="text-accent" />
        <StatCard title="Sesiones realizadas" value={data.sessionsWeek}
          change="Esta semana" changeType="neutral"
          icon={ArrowUpRight} iconColor="text-success" />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Appointments */}
        <div className="stat-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-heading text-foreground">Citas de hoy</h3>
            <span className="text-xs text-muted-foreground">{data.todayAppts.length} citas</span>
          </div>
          {data.todayAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay citas hoy</p>
          ) : (
            <div className="space-y-2">
              {data.todayAppts.map((apt: any) => (
                <div key={apt.id} className="flex items-center gap-4 p-2.5 rounded-lg table-row-hover">
                  <span className="text-sm font-mono font-medium text-primary w-12">
                    {format(parseISO(apt.start_time), "HH:mm")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {apt.patient?.first_name} {apt.patient?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {apt.service?.name ?? "—"} · {apt.center?.name ?? "—"}
                    </p>
                  </div>
                  <StatusBadge variant={statusMap[apt.status] ?? "info"}>
                    {apt.status}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Pie chart */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Distribución por servicio</h3>
            {data.pieData.every((d: any) => d.value === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sin datos este mes</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={data.pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" stroke="none">
                      {data.pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {data.pieData.map((d: any) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent leads */}
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-3">Últimos leads</h3>
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin leads recientes</p>
            ) : (
              <div className="space-y-2.5">
                {data.recentLeads.map((lead: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                      {lead.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{lead.name}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.service} · {lead.source}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(parseISO(lead.time), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
