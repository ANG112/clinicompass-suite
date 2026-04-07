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
import { Settings, Users, Tag, Shield, Receipt, Plus } from "lucide-react";
import { useInvoiceSeries, useCreateInvoiceSeries } from "@/hooks/useBilling";
import { useCenters } from "@/hooks/useCenters";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: series, isLoading: seriesLoading } = useInvoiceSeries();
  const { data: centers } = useCenters();
  const createSeries = useCreateInvoiceSeries();
  const [openSeries, setOpenSeries] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ center_id: "", prefix: "", doc_type: "factura" });

  const handleCreateSeries = async () => {
    if (!seriesForm.center_id || !seriesForm.prefix) { toast.error("Completa centro y prefijo"); return; }
    try {
      await createSeries.mutateAsync(seriesForm);
      toast.success("Serie creada");
      setOpenSeries(false);
      setSeriesForm({ center_id: "", prefix: "", doc_type: "factura" });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <AppLayout>
      <PageHeader title="Configuración" description="Ajustes generales del sistema" />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-1"><Settings className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="services" className="gap-1"><Tag className="h-3.5 w-3.5" /> Servicios</TabsTrigger>
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
          <div className="stat-card max-w-2xl">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Roles del sistema</h3>
            <div className="space-y-2">
              {["Gerencia", "Administración", "Recepción", "Comercial", "Fisioterapeuta", "Nutricionista", "Personal psicotécnicos"].map((role) => (
                <div key={role} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{role}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs">Configurar permisos</Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services">
          <div className="stat-card max-w-2xl">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Servicios y líneas de negocio</h3>
            <div className="space-y-2">
              {[
                { name: "Fisioterapia", color: "bg-primary/10 text-primary" },
                { name: "Nutrición", color: "bg-accent/10 text-accent" },
                { name: "Psicotécnicos", color: "bg-warning/10 text-warning" },
              ].map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>{s.name}</span>
                  <Button variant="ghost" size="sm" className="text-xs">Editar</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2">+ Añadir servicio</Button>
            </div>
          </div>
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
          <div className="stat-card max-w-2xl">
            <h3 className="text-sm font-semibold font-heading text-foreground mb-4">Equipo</h3>
            <p className="text-sm text-muted-foreground">La gestión de usuarios y profesionales estará disponible próximamente con la integración completa de autenticación.</p>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
