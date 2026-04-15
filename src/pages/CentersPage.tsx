import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Building2, MapPin, Phone, Pencil, Plus, Loader2, Trash2 } from "lucide-react";
import { useCenters, useCreateCenter, useUpdateCenter, useDeleteCenter } from "@/hooks/useCenters";
import { toast } from "sonner";

export default function CentersPage() {
  const { data: centers, isLoading } = useCenters();
  const createCenter = useCreateCenter();
  const updateCenter = useUpdateCenter();
  const deleteCenter = useDeleteCenter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: "", address: "", city: "", postal_code: "", phone: "", email: "" });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCenter.mutateAsync(form);
      toast.success("Centro creado");
      setDialogOpen(false);
      setForm({ name: "", address: "", city: "", postal_code: "", phone: "", email: "" });
    } catch (err: any) {
      toast.error(err.message || "Error");
    }
  };

  const openEdit = (c: any) => {
    setEditingCenter(c);
    setForm({ name: c.name, address: c.address || "", city: c.city || "", postal_code: c.postal_code || "", phone: c.phone || "", email: c.email || "" });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCenter) return;
    try {
      await updateCenter.mutateAsync({ id: editingCenter.id, ...form });
      toast.success("Centro actualizado");
      setEditingCenter(null);
    } catch (err: any) { toast.error(err.message); }
  };

  const handleToggleActive = async (c: any) => {
    try {
      await updateCenter.mutateAsync({ id: c.id, active: !c.active });
      toast.success(c.active ? "Centro desactivado" : "Centro activado");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCenter.mutateAsync(deleteTarget.id);
      toast.success("Centro eliminado");
    } catch (e: any) { toast.error(e.message); }
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader title="Centros" description="Gestión de centros y ubicaciones">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Nuevo centro</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Nuevo centro</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs">Nombre *</Label>
                  <Input required className="h-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
                  <Label className="text-xs">Teléfono</Label>
                  <Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" className="h-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={createCenter.isPending}>
                  {createCenter.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  Crear centro
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Centros activos" value={centers?.filter(c => c.active).length || 0} icon={Building2} iconColor="text-primary" />
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : centers?.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No hay centros registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Centro</TableHead>
                <TableHead className="font-semibold">Dirección</TableHead>
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Estado</TableHead>
                <TableHead className="w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {centers?.map((c) => (
                <TableRow key={c.id} className="table-row-hover">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-primary" /></div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate max-w-[200px]">{[c.address, c.city, c.postal_code].filter(Boolean).join(", ") || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.phone && <div className="flex items-center gap-1 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{c.phone}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={c.active} onCheckedChange={() => handleToggleActive(c)} />
                      <StatusBadge variant={c.active ? "success" : "muted"}>{c.active ? "Activo" : "Inactivo"}</StatusBadge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-md hover:bg-muted transition-colors" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Edit center dialog */}
      <Dialog open={!!editingCenter} onOpenChange={(open) => { if (!open) setEditingCenter(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Editar centro</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Nombre *</Label>
                <Input required className="h-9" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" className="h-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingCenter(null)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={updateCenter.isPending}>
                {updateCenter.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Guardar cambios
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar centro?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el centro <strong>"{deleteTarget?.name}"</strong>. Sus datos se conservarán pero dejará de aparecer en las listas.
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