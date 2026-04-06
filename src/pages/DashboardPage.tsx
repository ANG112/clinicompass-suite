import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  UserPlus,
  Users,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  Receipt,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const monthlyData = [
  { month: "Ene", fisio: 45, nutri: 28, psico: 35 },
  { month: "Feb", fisio: 52, nutri: 32, psico: 30 },
  { month: "Mar", fisio: 48, nutri: 35, psico: 42 },
  { month: "Abr", fisio: 61, nutri: 40, psico: 38 },
  { month: "May", fisio: 55, nutri: 38, psico: 45 },
  { month: "Jun", fisio: 67, nutri: 42, psico: 40 },
];

const pieData = [
  { name: "Fisioterapia", value: 45, color: "hsl(211, 70%, 45%)" },
  { name: "Nutrición", value: 28, color: "hsl(175, 55%, 40%)" },
  { name: "Psicotécnicos", value: 27, color: "hsl(38, 92%, 50%)" },
];

const conversionData = [
  { week: "S1", rate: 32 },
  { week: "S2", rate: 38 },
  { week: "S3", rate: 35 },
  { week: "S4", rate: 42 },
  { week: "S5", rate: 40 },
  { week: "S6", rate: 45 },
];

const todayAppointments = [
  { time: "09:00", patient: "María García", service: "Fisioterapia", center: "Madrid Norte", status: "confirmada" as const },
  { time: "09:30", patient: "Carlos López", service: "Psicotécnico", center: "Madrid Sur", status: "pendiente" as const },
  { time: "10:00", patient: "Ana Martínez", service: "Nutrición", center: "Madrid Norte", status: "confirmada" as const },
  { time: "10:30", patient: "Pedro Ruiz", service: "Fisioterapia", center: "Barcelona", status: "confirmada" as const },
  { time: "11:00", patient: "Laura Sánchez", service: "Psicotécnico", center: "Valencia", status: "pendiente" as const },
  { time: "11:30", patient: "Diego Torres", service: "Fisioterapia", center: "Madrid Norte", status: "confirmada" as const },
];

const recentLeads = [
  { name: "Roberto Fernández", service: "Fisioterapia", source: "Web", time: "Hace 2h" },
  { name: "Isabel Moreno", service: "Nutrición", source: "Teléfono", time: "Hace 3h" },
  { name: "Empresa ACME S.L.", service: "Psicotécnicos", source: "Comercial", time: "Hace 5h" },
  { name: "Teresa Vidal", service: "Fisioterapia", source: "Referido", time: "Ayer" },
];

const statusMap: Record<string, "success" | "warning" | "info"> = {
  confirmada: "success",
  pendiente: "warning",
  realizada: "info",
};

export default function DashboardPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description="Resumen general de actividad y métricas"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-in">
        <StatCard
          title="Leads nuevos"
          value={24}
          change="+12% vs mes anterior"
          changeType="positive"
          icon={UserPlus}
          iconColor="text-primary"
        />
        <StatCard
          title="Pacientes activos"
          value={342}
          change="+5% vs mes anterior"
          changeType="positive"
          icon={Users}
          iconColor="text-accent"
        />
        <StatCard
          title="Citas hoy"
          value={18}
          change="3 pendientes de confirmar"
          changeType="neutral"
          icon={CalendarDays}
          iconColor="text-warning"
        />
        <StatCard
          title="Facturación prevista"
          value="€12.450"
          change="+8% vs mes anterior"
          changeType="positive"
          icon={Receipt}
          iconColor="text-success"
        />
      </div>

      {/* Second row KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Conversión"
          value="42%"
          change="+3pp vs mes anterior"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-primary"
        />
        <StatCard
          title="No shows"
          value={7}
          change="-2 vs semana anterior"
          changeType="positive"
          icon={AlertCircle}
          iconColor="text-warning"
        />
        <StatCard
          title="Bonos activos"
          value={56}
          change="12 próximos a vencer"
          changeType="neutral"
          icon={Activity}
          iconColor="text-accent"
        />
        <StatCard
          title="Sesiones realizadas"
          value={128}
          change="Esta semana"
          changeType="neutral"
          icon={ArrowUpRight}
          iconColor="text-success"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Bar Chart */}
        <div className="stat-card lg:col-span-2">
          <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
            Citas por línea de negocio
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="fisio" name="Fisioterapia" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="nutri" name="Nutrición" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="psico" name="Psicotécnicos" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="stat-card">
          <h3 className="text-sm font-semibold font-heading text-foreground mb-4">
            Distribución por servicio
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-semibold text-foreground">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Today's Appointments */}
        <div className="stat-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold font-heading text-foreground">
              Citas de hoy
            </h3>
            <span className="text-xs text-muted-foreground">{todayAppointments.length} citas</span>
          </div>
          <div className="space-y-2">
            {todayAppointments.map((apt, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-2.5 rounded-lg table-row-hover"
              >
                <span className="text-sm font-mono font-medium text-primary w-12">
                  {apt.time}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {apt.patient}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {apt.service} · {apt.center}
                  </p>
                </div>
                <StatusBadge variant={statusMap[apt.status]}>
                  {apt.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads + Conversion Chart */}
        <div className="space-y-4">
          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-3">
              Tasa de conversión
            </h3>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={conversionData}>
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => [`${v}%`, "Conversión"]}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="stat-card">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-3">
              Últimos leads
            </h3>
            <div className="space-y-2.5">
              {recentLeads.map((lead, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {lead.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground">{lead.service} · {lead.source}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{lead.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
