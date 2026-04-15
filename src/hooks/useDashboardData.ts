import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, startOfWeek, endOfWeek, subWeeks, format } from "date-fns";

export function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();
      const prevMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
      const prevMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();
      const todayStart = startOfDay(now).toISOString();
      const todayEnd = endOfDay(now).toISOString();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
      const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();
      const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString();

      // Parallel queries
      const [
        leadsThisMonth, leadsPrevMonth,
        patientsActive, patientsPrevMonth,
        appointmentsToday,
        invoicesThisMonth, invoicesPrevMonth,
        leadsConverted, leadsTotal,
        appointmentsNoShow, appointmentsNoShowPrev,
        packsActive,
        appointmentsWeek,
        allAppointmentsThisMonth,
        recentLeads,
      ] = await Promise.all([
        // Leads this month
        supabase.from("leads").select("id", { count: "exact", head: true })
          .gte("created_at", monthStart).lte("created_at", monthEnd).is("deleted_at", null),
        // Leads prev month
        supabase.from("leads").select("id", { count: "exact", head: true })
          .gte("created_at", prevMonthStart).lte("created_at", prevMonthEnd).is("deleted_at", null),
        // Active patients
        supabase.from("patients").select("id", { count: "exact", head: true })
          .eq("status", "activo").is("deleted_at", null),
        // Patients prev month (created before prev month end that are active)
        supabase.from("patients").select("id", { count: "exact", head: true })
          .eq("status", "activo").is("deleted_at", null).lte("created_at", prevMonthEnd),
        // Appointments today
        supabase.from("appointments").select("id, start_time, status, patient:patients(first_name, last_name), service:services(name, business_line), center:centers(name)")
          .gte("start_time", todayStart).lte("start_time", todayEnd)
          .order("start_time"),
        // Invoices this month
        supabase.from("invoices").select("total")
          .gte("issue_date", format(startOfMonth(now), "yyyy-MM-dd"))
          .lte("issue_date", format(endOfMonth(now), "yyyy-MM-dd"))
          .neq("status", "anulada"),
        // Invoices prev month
        supabase.from("invoices").select("total")
          .gte("issue_date", format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd"))
          .lte("issue_date", format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd"))
          .neq("status", "anulada"),
        // Leads converted this month
        supabase.from("leads").select("id", { count: "exact", head: true })
          .eq("converted", true).gte("updated_at", monthStart).lte("updated_at", monthEnd),
        // Total leads this month for conversion
        supabase.from("leads").select("id", { count: "exact", head: true })
          .gte("created_at", monthStart).lte("created_at", monthEnd).is("deleted_at", null),
        // No shows this week
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("status", "no_presentado").gte("start_time", weekStart).lte("start_time", weekEnd),
        // No shows prev week
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("status", "no_presentado").gte("start_time", prevWeekStart).lte("start_time", prevWeekEnd),
        // Active packs
        supabase.from("treatment_packs").select("id, expiry_date", { count: "exact" })
          .eq("status", "activo"),
        // Appointments this week (realized)
        supabase.from("appointments").select("id", { count: "exact", head: true })
          .eq("status", "realizada").gte("start_time", weekStart).lte("start_time", weekEnd),
        // All appointments this month for charts (with service info)
        supabase.from("appointments").select("start_time, service:services(business_line)")
          .gte("start_time", monthStart).lte("start_time", monthEnd),
        // Recent leads
        supabase.from("leads").select("first_name, last_name, business_line, source, created_at")
          .is("deleted_at", null).order("created_at", { ascending: false }).limit(4),
      ]);

      // Calculate KPIs
      const leadsNew = leadsThisMonth.count ?? 0;
      const leadsPrev = leadsPrevMonth.count ?? 0;
      const leadsChange = leadsPrev > 0 ? Math.round(((leadsNew - leadsPrev) / leadsPrev) * 100) : 0;

      const activePatients = patientsActive.count ?? 0;
      const prevPatients = patientsPrevMonth.count ?? 0;
      const patientsChange = prevPatients > 0 ? Math.round(((activePatients - prevPatients) / prevPatients) * 100) : 0;

      const todayAppts = appointmentsToday.data ?? [];
      const pendingToday = todayAppts.filter(a => a.status === "pendiente").length;

      const invoiceTotal = (invoicesThisMonth.data ?? []).reduce((s, i) => s + Number(i.total), 0);
      const invoicePrev = (invoicesPrevMonth.data ?? []).reduce((s, i) => s + Number(i.total), 0);
      const invoiceChange = invoicePrev > 0 ? Math.round(((invoiceTotal - invoicePrev) / invoicePrev) * 100) : 0;

      const convertedCount = leadsConverted.count ?? 0;
      const totalLeadsForConv = leadsTotal.count ?? 0;
      const conversionRate = totalLeadsForConv > 0 ? Math.round((convertedCount / totalLeadsForConv) * 100) : 0;

      const noShows = appointmentsNoShow.count ?? 0;
      const noShowsPrev = appointmentsNoShowPrev.count ?? 0;

      const activePacks = packsActive.data ?? [];
      const packsExpiringSoon = activePacks.filter(p => {
        if (!p.expiry_date) return false;
        const exp = new Date(p.expiry_date);
        const in30days = new Date();
        in30days.setDate(in30days.getDate() + 30);
        return exp <= in30days;
      }).length;

      const sessionsWeek = appointmentsWeek.count ?? 0;

      // Chart data: appointments by business line per month (last 6 months)
      // We'll use the current month appointments for the pie chart
      const allAppts = allAppointmentsThisMonth.data ?? [];
      const byLine: Record<string, number> = { fisioterapia: 0, nutricion: 0, psicotecnicos: 0 };
      allAppts.forEach(a => {
        const bl = (a.service as any)?.business_line;
        if (bl && byLine[bl] !== undefined) byLine[bl]++;
      });
      const totalAppts = Object.values(byLine).reduce((s, v) => s + v, 0);
      const pieData = [
        { name: "Fisioterapia", value: totalAppts > 0 ? Math.round((byLine.fisioterapia / totalAppts) * 100) : 0, color: "hsl(211, 70%, 45%)" },
        { name: "Nutrición", value: totalAppts > 0 ? Math.round((byLine.nutricion / totalAppts) * 100) : 0, color: "hsl(175, 55%, 40%)" },
        { name: "Psicotécnicos", value: totalAppts > 0 ? Math.round((byLine.psicotecnicos / totalAppts) * 100) : 0, color: "hsl(38, 92%, 50%)" },
      ];

      const leads = recentLeads.data ?? [];
      const blLabels: Record<string, string> = { fisioterapia: "Fisioterapia", nutricion: "Nutrición", psicotecnicos: "Psicotécnicos" };

      return {
        leadsNew, leadsChange,
        activePatients, patientsChange,
        todayAppts, pendingToday,
        invoiceTotal, invoiceChange,
        conversionRate,
        noShows, noShowsDiff: noShowsPrev - noShows,
        activePacks: activePacks.length, packsExpiringSoon,
        sessionsWeek,
        pieData,
        recentLeads: leads.map(l => ({
          name: `${l.first_name} ${l.last_name ?? ""}`.trim(),
          service: blLabels[l.business_line] ?? l.business_line,
          source: l.source ?? "—",
          time: l.created_at,
        })),
      };
    },
    refetchInterval: 60000, // refresh every minute
  });
}
