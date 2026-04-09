import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Settings, Users, Tag, Shield, Receipt, Plus, Loader2, Pencil, MapPin, Trash2 } from "lucide-react";
import { useInvoiceSeries, useCreateInvoiceSeries } from "@/hooks/useBilling";
import { useAllServices, useCreateService, useUpdateService } from "@/hooks/useServicesAdmin";
import { useCenters } from "@/hooks/useCenters";
import { useAuth } from "@/hooks/useAuth";
import { useAllStaffCenterServices, useAddStaffCenterService, useRemoveStaffCenterService } from "@/hooks/useStaffCenterServices";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Constants } from "@/integrations/supabase/types";

const ALL_ROLES = Constants.public.Enums.app_role;
const ROLE_LABELS: Record<string, string> = {
  gerencia: "Gerencia",
  administracion: "Administración",
  recepcion: "Recepción",
  comercial: "Comercial",
  fisioterapeuta: "Fisioterapeuta",
  nutricionista: "Nutricionista",
  psicotecnico: "Psicotécnico",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  gerencia: "Acceso total al sistema: gestión de equipo, configuración, creación de usuarios, eliminación de datos y todas las operaciones.",
  administracion: "Gestión de centros, series de facturación, servicios, contactos, negocios, agenda y facturación.",
  recepcion: "Gestión de citas, disponibilidad, contactos y operaciones de recepción del centro.",
  comercial: "Gestión de leads, negocios, presupuestos, facturas y seguimiento comercial.",
  fisioterapeuta: "Acceso a agenda propia, citas, contactos asignados y disponibilidad de fisioterapia.",
  nutricionista: "Acceso a agenda propia, citas, contactos asignados y disponibilidad de nutrición.",
  psicotecnico: "Acceso a agenda propia, citas, contactos asignados y disponibilidad de psicotécnicos.",
};

export default function SettingsPage() {
  const { data: series, isLoading: seriesLoading } = useInvoiceSeries();
  const { data: centers } = useCenters();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const createSeries = useCreateInvoiceSeries();
  const [openSeries, setOpenSeries] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ center_id: "", prefix: "", doc_type: "factura" });

  // Services state
  const { data: allServices, isLoading: servicesLoading } = useAllServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const [openService, setOpenService] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [svcForm, setSvcForm] = useState({
    name: "", business_line: "fisioterapia", duration_minutes: "60", price: "0", active: true,
  });

  const resetSvcForm = () => setSvcForm({ name: "", business_line: "fisioterapia", duration_minutes: "60", price: "0", active: true });

  const handleSaveService = async () => {
    if (!svcForm.name) { toast.error("El nombre del servicio es obligatorio"); return; }
    try {
      const payload = {
        name: svcForm.name,
        business_line: svcForm.business_line,
        duration_minutes: parseInt(svcForm.duration_minutes) || 60,
        price: parseFloat(svcForm.price) || 0,
        active: svcForm.active,
      };
      if (editingService) {
        await updateService.mutateAsync({ id: editingService.id, ...payload });
        toast.success("Servicio actualizado");
      } else {
        await createService.mutateAsync(payload);
        toast.success("Servicio creado");
      }
      setOpenService(false);
      resetSvcForm();
      setEditingService(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const openEditService = (svc: any) => {
    setEditingService(svc);
    setSvcForm({
      name: svc.name,
      business_line: svc.business_line,
      duration_minutes: String(svc.duration_minutes),
      price: String(svc.price),
      active: svc.active,
    });
    setOpenService(true);
  };

  const toggleServiceActive = async (svc: any) => {
    try {
      await updateService.mutateAsync({ id: svc.id, active: !svc.active });
      toast.success(svc.active ? "Servicio desactivado" : "Servicio activado");
    } catch (e: any) { toast.error(e.message); }
  };

  // Team state
  const [openUser, setOpenUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [editProfile, setEditProfile] = useState({ first_name: "", last_name: "", email: "", phone: "", center_id: "", specialty: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "", password: "", first_name: "", last_name: "",
    center_id: "", specialty: "", roles: [] as string[],
  });

  // Fetch staff profiles with roles
  const { data: staffList, isLoading: staffLoading } = useQuery({
    queryKey: ["staff-with-roles"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("staff_profiles").select("*, center:centers(name)").eq("active", true).order("first_name"),
        supabase.from("user_roles").select("*"),
      ]);
      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      return profiles.map((p: any) => ({
        ...p,
        roles: roles.filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      }));
    },
  });

  // Staff center services (assignments)
  const { data: scsAll, isLoading: scsLoading } = useAllStaffCenterServices();
  const addScs = useAddStaffCenterService();
  const removeScs = useRemoveStaffCenterService();
  const [openAssign, setOpenAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ staff_profile_id: "", center_id: "", service_id: "" });

  const handleAddAssignment = async () => {
    if (!assignForm.staff_profile_id || !assignForm.center_id || !assignForm.service_id) {
      toast.error("Selecciona profesional, centro y servicio");
      return;
    }
    // Check duplicate
    const dup = scsAll?.find((a: any) =>
      a.staff_profile_id === assignForm.staff_profile_id &&
      a.center_id === assignForm.center_id &&
      a.service_id === assignForm.service_id
    );
    if (dup) { toast.error("Esta asignación ya existe"); return; }
    try {
      await addScs.mutateAsync(assignForm);
      toast.success("Asignación creada");
      setOpenAssign(false);
      setAssignForm({ staff_profile_id: "", center_id: "", service_id: "" });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRemoveAssignment = async (id: string) => {
    try {
      await removeScs.mutateAsync(id);
      toast.success("Asignación eliminada");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCreateSeries = async () => {
    if (!seriesForm.center_id || !seriesForm.prefix) { toast.error("Completa centro y prefijo"); return; }
    try {
      await createSeries.mutateAsync(seriesForm);
      toast.success("Serie creada");
      setOpenSeries(false);
      setSeriesForm({ center_id: "", prefix: "", doc_type: "factura" });
    } catch (e: any) { toast.error(e.message); }
  };

  const toggleRole = (role: string) => {
    setUserForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleCreateUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.first_name || !userForm.last_name) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (userForm.roles.length === 0) {
      toast.error("Selecciona al menos un rol");
      return;
    }
    setCreatingUser(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: {
          email: userForm.email,
          password: userForm.password,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          roles: userForm.roles,
          center_id: userForm.center_id || null,
          specialty: userForm.specialty || null,
        },
      });
      if (res.error) throw new Error(res.error.message || "Error creando usuario");
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(`Usuario ${userForm.email} creado correctamente`);
      setOpenUser(false);
      setUserForm({ email: "", password: "", first_name: "", last_name: "", center_id: "", specialty: "", roles: [] });
      queryClient.invalidateQueries({ queryKey: ["staff-with-roles"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const openEditRoles = (staff: any) => {
    setEditingStaff(staff);
    setEditRoles(staff.roles || []);
  };

  const handleSaveRoles = async () => {
    if (!editingStaff) return;
    setSavingRoles(true);
    try {
      // Get current roles to compute diff (avoid deleting all then inserting, which breaks RLS)
      const { data: currentRoles } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", editingStaff.user_id);

      const currentRoleNames = (currentRoles || []).map(r => r.role as string);
      const toDelete = (currentRoles || []).filter(r => !editRoles.includes(r.role));
      const toAdd = editRoles.filter(r => !currentRoleNames.includes(r));

      // Delete removed roles
      for (const r of toDelete) {
        const { error } = await supabase.from("user_roles").delete().eq("id", r.id);
        if (error) throw error;
      }
      // Insert new roles
      if (toAdd.length > 0) {
        const { error } = await supabase.from("user_roles").insert(
          toAdd.map(role => ({ user_id: editingStaff.user_id, role: role as any }))
        );
        if (error) throw error;
      }
      toast.success("Roles actualizados");
      queryClient.invalidateQueries({ queryKey: ["staff-with-roles"] });
      setEditingStaff(null);
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar roles");
    } finally {
      setSavingRoles(false);
    }
  };

  const isGerencia = hasRole("gerencia");

  return (
    <AppLayout>
      <PageHeader title="Configuración" description="Ajustes generales del sistema" />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general" className="gap-1"><Settings className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="services" className="gap-1"><Tag className="h-3.5 w-3.5" /> Servicios</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-1"><MapPin className="h-3.5 w-3.5" /> Asignaciones</TabsTrigger>
          <TabsTrigger value="billing" className="gap-1"><Receipt className="h-3.5 w-3.5" /> Series facturación</TabsTrigger>
          <TabsTrigger value="team" className="gap-1"><Users className="h-3.5 w-3.5" /> Equipo</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="stat-card max-w-2xl">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Datos de la empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre de la empresa</Label>
                <Input defaultValue="Grupo Salud Integral S.L." className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CIF</Label>
                <Input defaultValue="B12345678" className="h-9" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Dirección fiscal</Label>
                <Input defaultValue="C/ Principal 100, 28001 Madrid" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input defaultValue="admin@gruposalud.es" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input defaultValue="911234567" className="h-9" />
              </div>
            </div>
            <Button className="mt-4" size="sm">Guardar cambios</Button>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <div className="stat-card max-w-3xl">
            <div className="mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground mb-1">Roles y permisos del sistema</h3>
              <p className="text-xs text-muted-foreground">
                Los roles son fijos y controlan el acceso mediante políticas de seguridad en base de datos.
                Para asignar o revocar roles a usuarios, usa la pestaña <strong>Equipo</strong>.
              </p>
            </div>
            <div className="space-y-3">
              {ALL_ROLES.map((role) => {
                const members = staffList?.filter((s: any) => s.roles?.includes(role)) || [];
                return (
                  <div key={role} className="p-4 rounded-lg border bg-muted/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{ROLE_LABELS[role] || role}</span>
                      <Badge variant="outline" className="text-[10px] ml-auto">{members.length} usuario{members.length !== 1 ? "s" : ""}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{ROLE_DESCRIPTIONS[role]}</p>
                    {members.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {members.map((m: any) => (
                          <Badge key={m.id} variant="secondary" className="text-[10px]">{m.first_name} {m.last_name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="stat-card max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Servicios disponibles</h3>
              {isGerencia && (
                <Button size="sm" onClick={() => { resetSvcForm(); setEditingService(null); setOpenService(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Nuevo servicio
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Especialidad</TableHead>
                  <TableHead className="font-semibold">Duración</TableHead>
                  <TableHead className="font-semibold text-right">Precio</TableHead>
                  <TableHead className="font-semibold text-center">Activo</TableHead>
                  <TableHead className="font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servicesLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : !allServices?.length ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Sin servicios configurados</TableCell></TableRow>
                ) : allServices.map((svc: any) => (
                  <TableRow key={svc.id} className={!svc.active ? "opacity-50" : ""}>
                    <TableCell className="text-sm font-medium">{svc.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {svc.business_line === "fisioterapia" ? "Fisioterapia" : svc.business_line === "nutricion" ? "Nutrición" : "Psicotécnicos"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{svc.duration_minutes} min</TableCell>
                    <TableCell className="text-sm text-right font-mono">{svc.price > 0 ? `€${svc.price}` : "—"}</TableCell>
                    <TableCell className="text-center">
                      <Switch checked={svc.active} onCheckedChange={() => toggleServiceActive(svc)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openEditService(svc)}>
                        <Pencil className="h-3 w-3" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={openService} onOpenChange={setOpenService}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>{editingService ? "Editar servicio" : "Nuevo servicio"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input className="h-9" value={svcForm.name} onChange={e => setSvcForm({ ...svcForm, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Especialidad</Label>
                  <Select value={svcForm.business_line} onValueChange={v => setSvcForm({ ...svcForm, business_line: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                      <SelectItem value="nutricion">Nutrición</SelectItem>
                      <SelectItem value="psicotecnicos">Psicotécnicos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Duración (min)</Label>
                    <Input type="number" className="h-9" value={svcForm.duration_minutes} onChange={e => setSvcForm({ ...svcForm, duration_minutes: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Precio base (€)</Label>
                    <Input type="number" step="0.01" className="h-9" value={svcForm.price} onChange={e => setSvcForm({ ...svcForm, price: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenService(false)}>Cancelar</Button>
                <Button onClick={handleSaveService} disabled={createService.isPending || updateService.isPending}>
                  {editingService ? "Guardar cambios" : "Crear servicio"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* NEW: Assignments tab */}
        <TabsContent value="assignments">
          <div className="stat-card max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold font-heading text-foreground">Asignaciones profesional → centro → servicio</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define en qué centros y para qué servicios puede trabajar cada profesional. La agenda respetará estas restricciones.
                </p>
              </div>
              {isGerencia && (
                <Button size="sm" onClick={() => { setAssignForm({ staff_profile_id: "", center_id: "", service_id: "" }); setOpenAssign(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Nueva asignación
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Profesional</TableHead>
                  <TableHead className="font-semibold">Centro</TableHead>
                  <TableHead className="font-semibold">Servicio</TableHead>
                  <TableHead className="font-semibold">Especialidad</TableHead>
                  {isGerencia && <TableHead className="w-[60px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : !scsAll?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Sin asignaciones. Añade asignaciones para que la agenda filtre profesionales y servicios por centro.
                  </TableCell></TableRow>
                ) : scsAll.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">{a.staff?.first_name} {a.staff?.last_name}</TableCell>
                    <TableCell className="text-sm">{a.center?.name || "-"}</TableCell>
                    <TableCell className="text-sm">{a.service?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {a.service?.business_line === "fisioterapia" ? "Fisioterapia" : a.service?.business_line === "nutricion" ? "Nutrición" : "Psicotécnicos"}
                      </Badge>
                    </TableCell>
                    {isGerencia && (
                      <TableCell>
                        <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" onClick={() => handleRemoveAssignment(a.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={openAssign} onOpenChange={setOpenAssign}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nueva asignación</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Profesional *</Label>
                  <Select value={assignForm.staff_profile_id} onValueChange={v => setAssignForm({ ...assignForm, staff_profile_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {staffList?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Centro *</Label>
                  <Select value={assignForm.center_id} onValueChange={v => setAssignForm({ ...assignForm, center_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {centers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Servicio *</Label>
                  <Select value={assignForm.service_id} onValueChange={v => setAssignForm({ ...assignForm, service_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      {allServices?.filter((s: any) => s.active).map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.business_line === "fisioterapia" ? "Fisio" : s.business_line === "nutricion" ? "Nutri" : "Psico"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenAssign(false)}>Cancelar</Button>
                <Button onClick={handleAddAssignment} disabled={addScs.isPending}>
                  {addScs.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear asignación
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="billing">
          <div className="stat-card max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Series de facturación por centro</h3>
              <Button size="sm" onClick={() => setOpenSeries(true)}><Plus className="h-4 w-4 mr-1" />Nueva serie</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Centro</TableHead>
                  <TableHead className="font-semibold">Prefijo</TableHead>
                  <TableHead className="font-semibold">Tipo</TableHead>
                  <TableHead className="font-semibold text-right">Nº actual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seriesLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : !series?.length ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Sin series configuradas</TableCell></TableRow>
                ) : series.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{s.center?.name || "-"}</TableCell>
                    <TableCell className="text-sm font-mono font-medium">{s.prefix}</TableCell>
                    <TableCell className="text-sm">{s.doc_type === "simplificada" ? "Simplificada" : "Factura"}</TableCell>
                    <TableCell className="text-right text-sm">{s.current_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={openSeries} onOpenChange={setOpenSeries}>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nueva serie de facturación</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Centro *</Label>
                  <Select value={seriesForm.center_id} onValueChange={v => setSeriesForm({ ...seriesForm, center_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>{centers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Prefijo (ej: MN-2026, VS-SIMP)</Label>
                  <Input className="h-9" value={seriesForm.prefix} onChange={e => setSeriesForm({ ...seriesForm, prefix: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={seriesForm.doc_type} onValueChange={v => setSeriesForm({ ...seriesForm, doc_type: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="factura">Factura</SelectItem>
                      <SelectItem value="simplificada">Simplificada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenSeries(false)}>Cancelar</Button>
                <Button onClick={handleCreateSeries} disabled={createSeries.isPending}>Crear serie</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="team">
          <div className="stat-card max-w-4xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold font-heading text-foreground">Equipo del CRM</h3>
              {isGerencia && (
                <Button size="sm" onClick={() => setOpenUser(true)}>
                  <Plus className="h-4 w-4 mr-1" />Nuevo usuario
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Nombre</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Centro</TableHead>
                   <TableHead className="font-semibold">Roles</TableHead>
                   {isGerencia && <TableHead className="w-[60px]"></TableHead>}
                 </TableRow>
               </TableHeader>
              <TableBody>
                {staffLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Cargando...</TableCell></TableRow>
                ) : !staffList?.length ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Sin usuarios</TableCell></TableRow>
                ) : staffList.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email || "-"}</TableCell>
                    <TableCell className="text-sm">{s.center?.name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.roles?.map((r: string) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[r] || r}
                          </Badge>
                        ))}
                        {(!s.roles || s.roles.length === 0) && (
                          <span className="text-xs text-muted-foreground">Sin roles</span>
                        )}
                      </div>
                    </TableCell>
                    {isGerencia && (
                      <TableCell>
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={() => openEditRoles(s)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Dialog open={openUser} onOpenChange={setOpenUser}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Crear nuevo usuario</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre *</Label>
                    <Input className="h-9" value={userForm.first_name} onChange={e => setUserForm({ ...userForm, first_name: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Apellido *</Label>
                    <Input className="h-9" value={userForm.last_name} onChange={e => setUserForm({ ...userForm, last_name: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email *</Label>
                    <Input className="h-9" type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contraseña *</Label>
                    <Input className="h-9" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Centro</Label>
                    <Select value={userForm.center_id} onValueChange={v => setUserForm({ ...userForm, center_id: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>{centers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Especialidad</Label>
                    <Select value={userForm.specialty} onValueChange={v => setUserForm({ ...userForm, specialty: v })}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fisioterapia">Fisioterapia</SelectItem>
                        <SelectItem value="nutricion">Nutrición</SelectItem>
                        <SelectItem value="psicotecnicos">Psicotécnicos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Roles *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_ROLES.map((role) => (
                      <label key={role} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <Checkbox
                          checked={userForm.roles.includes(role)}
                          onCheckedChange={() => toggleRole(role)}
                        />
                        <span className="text-sm">{ROLE_LABELS[role] || role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setOpenUser(false)}>Cancelar</Button>
                <Button onClick={handleCreateUser} disabled={creatingUser}>
                  {creatingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Crear usuario
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit roles dialog */}
          <Dialog open={!!editingStaff} onOpenChange={(open) => { if (!open) setEditingStaff(null); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Editar roles — {editingStaff?.first_name} {editingStaff?.last_name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                      <Checkbox
                        checked={editRoles.includes(role)}
                        onCheckedChange={() => setEditRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                      />
                      <span className="text-sm">{ROLE_LABELS[role] || role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <Button variant="outline" onClick={() => setEditingStaff(null)}>Cancelar</Button>
                <Button onClick={handleSaveRoles} disabled={savingRoles}>
                  {savingRoles && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar roles
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
