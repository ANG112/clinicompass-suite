import {
  LayoutDashboard,
  Users,
  UserPlus,
  CalendarDays,
  Building2,
  FileText,
  TrendingUp,
  Megaphone,
  Receipt,
  Activity,
  Apple,
  Brain,
  Settings,
  ChevronDown,
  LogOut,
  Briefcase,
  Contact,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Stethoscope } from "lucide-react";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Contactos", url: "/contactos", icon: Contact },
  { title: "Leads", url: "/leads", icon: UserPlus },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Negocios", url: "/negocios", icon: Briefcase },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Centros", url: "/centros", icon: Building2 },
];

const clinicalNav = [
  { title: "Fisioterapia", url: "/fisioterapia", icon: Activity },
  { title: "Nutrición", url: "/nutricion", icon: Apple },
  { title: "Psicotécnicos", url: "/psicotecnicos", icon: Brain },
];

const managementNav = [
  { title: "Campañas", url: "/campanas", icon: Megaphone },
  { title: "Presupuestos", url: "/presupuestos", icon: FileText },
  { title: "Facturación", url: "/facturacion", icon: Receipt },
  { title: "Documentos", url: "/documentos", icon: FileText },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

function NavGroup({ label, items, defaultOpen = true }: { label: string; items: typeof mainNav; defaultOpen?: boolean }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer text-sidebar-muted uppercase text-[10px] tracking-widest font-semibold flex items-center justify-between hover:text-sidebar-foreground transition-colors">
            {!collapsed && label}
            {!collapsed && <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url} tooltip={item.title}>
                    <NavLink to={item.url} end={item.url === "/"} className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, roles, signOut } = useAuth();

  const initials = profile
    ? `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase()
    : "??";
  const displayName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Usuario";
  const displayRole = roles.length > 0 ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : "Sin rol";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <Stethoscope className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-sm font-bold text-sidebar-accent-foreground font-heading tracking-tight">SaludCRM</h1>
              <p className="text-[10px] text-sidebar-muted">Gestión sanitaria</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <NavGroup label="Principal" items={mainNav} />
        <NavGroup label="Servicios disponibles" items={clinicalNav} />
        <NavGroup label="Gestión" items={managementNav} />
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-semibold text-sidebar-accent-foreground">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-sidebar-muted truncate">{displayRole}</p>
            </div>
            <button onClick={signOut} className="p-1 rounded hover:bg-sidebar-accent transition-colors" title="Cerrar sesión">
              <LogOut className="h-3.5 w-3.5 text-sidebar-muted" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
