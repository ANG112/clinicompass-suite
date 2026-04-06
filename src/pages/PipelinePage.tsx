import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GripVertical, Phone, Mail, MessageSquare } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  service: string;
  source: string;
  value: string;
  date: string;
  center: string;
}

const pipelineStages: Record<string, { label: string; variant: "muted" | "info" | "warning" | "primary" | "success" }> = {
  nuevo: { label: "Nuevo", variant: "info" },
  contactado: { label: "Contactado", variant: "primary" },
  cualificado: { label: "Cualificado", variant: "warning" },
  propuesta: { label: "Propuesta enviada", variant: "primary" },
  ganado: { label: "Ganado", variant: "success" },
};

const mockLeads: Record<string, Lead[]> = {
  nuevo: [
    { id: "1", name: "Roberto Fernández", service: "Fisioterapia", source: "Web", value: "€450", date: "Hoy", center: "Madrid Norte" },
    { id: "2", name: "Isabel Moreno", service: "Nutrición", source: "Teléfono", value: "€200", date: "Ayer", center: "Barcelona" },
    { id: "3", name: "Empresa LogiTrans", service: "Psicotécnicos", source: "Comercial", value: "€3.200", date: "Hace 2d", center: "Valencia" },
  ],
  contactado: [
    { id: "4", name: "Teresa Vidal", service: "Fisioterapia", source: "Referido", value: "€600", date: "Hace 1d", center: "Madrid Sur" },
    { id: "5", name: "Miguel Ángel Roca", service: "Nutrición", source: "Instagram", value: "€350", date: "Hace 3d", center: "Madrid Norte" },
  ],
  cualificado: [
    { id: "6", name: "Transportes Ruiz S.L.", service: "Psicotécnicos", source: "Comercial", value: "€5.600", date: "Hace 2d", center: "Valencia" },
    { id: "7", name: "Laura Jiménez", service: "Fisioterapia", source: "Web", value: "€800", date: "Hace 4d", center: "Barcelona" },
  ],
  propuesta: [
    { id: "8", name: "Autocares García", service: "Psicotécnicos", source: "Comercial", value: "€8.400", date: "Hace 3d", center: "Madrid Norte" },
  ],
  ganado: [
    { id: "9", name: "Patricia Navarro", service: "Nutrición", source: "Web", value: "€250", date: "Hoy", center: "Madrid Sur" },
    { id: "10", name: "Andrés Molina", service: "Fisioterapia", source: "Referido", value: "€1.200", date: "Ayer", center: "Madrid Norte" },
  ],
};

const serviceColors: Record<string, string> = {
  Fisioterapia: "bg-primary/10 text-primary",
  Nutrición: "bg-accent/10 text-accent",
  Psicotécnicos: "bg-warning/10 text-warning",
};

export default function PipelinePage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const filteredLeads = Object.fromEntries(
    Object.entries(mockLeads).map(([stage, leads]) => [
      stage,
      leads.filter((l) => {
        const matchesSearch = l.name.toLowerCase().includes(search.toLowerCase());
        const matchesTab = activeTab === "all" || l.service.toLowerCase().includes(activeTab);
        return matchesSearch && matchesTab;
      }),
    ])
  );

  return (
    <AppLayout>
      <PageHeader title="Pipeline Comercial" description="Gestión de oportunidades por línea de negocio">
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo lead
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="fisioterapia">Fisioterapia</TabsTrigger>
            <TabsTrigger value="nutrición">Nutrición</TabsTrigger>
            <TabsTrigger value="psicotécnicos">Psicotécnicos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          placeholder="Buscar lead..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(pipelineStages).map(([key, stage]) => {
          const leads = filteredLeads[key] || [];
          return (
            <div key={key} className="kanban-column flex-shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <StatusBadge variant={stage.variant} dot={true}>
                    {stage.label}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground font-medium">
                    {leads.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {leads.map((lead) => (
                  <div key={lead.id} className="kanban-card group">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {lead.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${serviceColors[lead.service]}`}>
                            {lead.service}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {lead.source} · {lead.center}
                          </span>
                          <span className="text-xs font-semibold text-foreground">
                            {lead.value}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1 rounded hover:bg-muted transition-colors">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button className="p-1 rounded hover:bg-muted transition-colors">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button className="p-1 rounded hover:bg-muted transition-colors">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {lead.date}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
