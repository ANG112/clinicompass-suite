import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Eye, Loader2, Users, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePatients, useCreatePatient, useDeletePatient } from "@/hooks/usePatients";
import { useCenters } from "@/hooks/useCenters";
import { useStaffProfiles } from "@/hooks/useAppointments";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "success" | "muted" | "warning" | "destructive" }> = {
  activo: { label: "Activo", variant: "success" },
  inactivo: { label: "Inactivo", variant: "muted" },
  alta_pendiente: { label: "Alta pendiente", variant: "warning" },
  baja: { label: "Baja", variant: "destructive" },
};

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const navigate = useNavigate();
  const { selectedCenterId } = useCenterFilter();

  const { data: patients, isLoading } = usePatients({
    center_id: selectedCenterId,
    status: statusFilter,
    search: search.length >= 2 ? search : undefined,
  });
  const { data: centers } = useCenters();
  const { data: staff } = useStaffProfiles();
  const createPatient = useCreatePatient();
  const deletePatient = useDeletePatient();

  const [form, setForm] = useState({
    first_name: "", last_name: "", nif: "", phone: "", email: "",
    birth_date: "", sex: "", address: "", city: "", postal_code: "",
    center_id: "", assigned_professional_id: "", notes: "",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPatient.mutateAsync({
        ...form,
        birth_date: form.birth_date || null,
        center_id: form.center_id || null,
        assigned_professional_id: form.assigned_professional_id || null,
        sex: form.sex || null,
      });
      toast.success("Paciente creado correctamente");
      setDialogOpen(false);
      setForm({ first_name: "", last_name: "", nif: "", phone: "", email: "", birth_date: "", sex: "", address: "", city: "", postal_code: "", center_id: "", assigned_professional_id: "", notes: "" });
    } catch (err: any) {
      toast.error(err.message || "Error al crear paciente");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePatient.mutateAsync(deleteTarget.id);
      toast.success("Paciente eliminado");
    } catch (e: any) { toast.error(e.message); }
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader title="Pacientes" description={`${patients?.length || 0} pacientes registrados`}>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo paciente</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Nuevo paciente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nombre *</Label>
                  <Input required className="h-9" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Apellidos *</Label>
                  <Input required className="h-9" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">NIF/DNI</Label>
                  <Input className="h-9" value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha nacimiento</Label>
                  <Input type="date" className="h-9" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sexo</Label>
                  <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hombre">Hombre</SelectItem>
                      <SelectItem value="mujer">Mujer</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teléfono</Label>
                  <Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" className="h-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Dirección</Label>
                  <Input className="h-9" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ciudad</Label>
                  <Input className="h-9" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Código postal</Label>
                  <Input className="h-9" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Centro</Label>
                  <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                    <SelectContent>
                      {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Profesional asignado</Label>
                  <Select value={form.assigned_professional_id} onValueChange={(v) => setForm({ ...form, assigned_professional_id: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {staff?.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Notas</Label>
                  <Input className="h-9" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={createPatient.isPending}>
                  {createPatient.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Crear paciente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, NIF o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="activo">Activo</SelectItem>
            <SelectItem value="inactivo">Inactivo</SelectItem>
            <SelectItem value="alta_pendiente">Alta pendiente</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : patients?.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No hay pacientes registrados</p>
            <p className="text-xs mt-1">Crea el primer paciente con el botón superior</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Paciente</TableHead>
                <TableHead className="font-semibold">NIF</TableHead>
                <TableHead className="font-semibold">Teléfono</TableHead>
                <TableHead className="font-semibold">Centro</TableHead>
                <TableHead className="font-semibold">Profesional</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients?.map((p: any) => {
                const st = statusConfig[p.status] || statusConfig.activo;
                const initials = `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}`.toUpperCase();
                const profName = p.professional ? `${p.professional.first_name} ${p.professional.last_name}` : "-";
                return (
                  <TableRow key={p.id} className="table-row-hover cursor-pointer" onClick={() => navigate(`/pacientes/${p.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground">{p.email || "-"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono">{p.nif || "-"}</TableCell>
                    <TableCell className="text-sm">{p.phone || "-"}</TableCell>
                    <TableCell className="text-sm">{p.center?.name || "-"}</TableCell>
                    <TableCell className="text-sm">{profName}</TableCell>
                    <TableCell><StatusBadge variant={st.variant}>{st.label}</StatusBadge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/pacientes/${p.id}`); }}>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará a <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>. Sus datos se conservarán pero dejará de aparecer en las listas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}