import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Users, Building2, Tag, Shield } from "lucide-react";

export default function SettingsPage() {
  return (
    <AppLayout>
      <PageHeader title="Configuración" description="Ajustes generales del sistema" />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general" className="gap-1"><Settings className="h-3.5 w-3.5" /> General</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1"><Shield className="h-3.5 w-3.5" /> Roles</TabsTrigger>
          <TabsTrigger value="services" className="gap-1"><Tag className="h-3.5 w-3.5" /> Servicios</TabsTrigger>
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
