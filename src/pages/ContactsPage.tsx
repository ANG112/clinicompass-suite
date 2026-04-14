import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Search, Loader2, Users, Eye, Mic } from "lucide-react";
import { useContacts, useContactCategories, useCreateContact } from "@/hooks/useContacts";
import { useCenters } from "@/hooks/useCenters";
import { useCenterFilter } from "@/components/layout/CenterSelector";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { PatientNotesSection } from "@/components/patient/PatientNotesSection";
import { SessionNotesSection } from "@/components/patient/SessionNotesSection";
import { VoiceEditSection } from "@/components/patient/VoiceEditSection";
const categoryVariant: Record<string, "info" | "success" | "primary"> = {
  lead: "info",
  cliente: "success",
  cliente_recurrente: "primary",
};

export default function ContactsPage({ filterCategory }: { filterCategory?: string }) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState(filterCategory || "all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [audioContactId, setAudioContactId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { selectedCenterId } = useCenterFilter();

  const { data: contacts, isLoading } = useContacts({
    category: catFilter,
    center_id: selectedCenterId,
    search: search.length >= 2 ? search : undefined,
  });
  const { data: categories } = useContactCategories();
  const { data: centers } = useCenters();
  const createContact = useCreateContact();

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "", company_name: "",
    nif: "", source: "", center_id: "", notes: "", category_name: filterCategory || "lead",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories?.find((c: any) => c.name === form.category_name);
    if (!cat) { toast.error("Selecciona una categoría"); return; }
    try {
      await createContact.mutateAsync({
        first_name: form.first_name,
        last_name: form.last_name || null,
        email: form.email || null,
        phone: form.phone || null,
        company_name: form.company_name || null,
        nif: form.nif || null,
        source: form.source || null,
        center_id: form.center_id || null,
        notes: form.notes || null,
        category_id: cat.id,
      });
      toast.success("Contacto creado correctamente");
      setDialogOpen(false);
      setForm({ first_name: "", last_name: "", email: "", phone: "", company_name: "", nif: "", source: "", center_id: "", notes: "", category_name: filterCategory || "lead" });
    } catch (err: any) {
      toast.error(err.message || "Error al crear contacto");
    }
  };

  const pageTitle = filterCategory === "lead" ? "Leads" : filterCategory === "cliente" ? "Clientes" : "Contactos";
  const pageDesc = `${contacts?.length || 0} ${pageTitle.toLowerCase()} en el sistema`;

  return (
    <AppLayout>
      <PageHeader title={pageTitle} description={pageDesc}>
        <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo contacto
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre, NIF, email o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        {!filterCategory && (
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {categories?.map((c: any) => (
                <SelectItem key={c.id} value={c.name}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : contacts?.length === 0 ? (
          <div className="text-center p-12 text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">No hay {pageTitle.toLowerCase()}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Contacto</TableHead>
                <TableHead className="font-semibold">Categoría</TableHead>
                <TableHead className="font-semibold">Teléfono</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Centro</TableHead>
                <TableHead className="font-semibold">Origen</TableHead>
                <TableHead className="font-semibold">Fecha</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts?.map((c: any) => {
                const initials = `${c.first_name?.[0] || ""}${(c.last_name || c.company_name || "")?.[0] || ""}`.toUpperCase();
                const catName = c.category?.name || "lead";
                return (
                  <TableRow key={c.id} className="table-row-hover cursor-pointer" onClick={() => navigate(`/contactos/${c.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{initials}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.first_name} {c.last_name}</p>
                          {c.company_name && <p className="text-xs text-muted-foreground">{c.company_name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={categoryVariant[catName] || "muted"}>{c.category?.label || catName}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-sm">{c.phone || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.email || "-"}</TableCell>
                    <TableCell className="text-sm">{c.center?.name || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.source || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          className="h-9 w-9 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/15 flex items-center justify-center transition-colors"
                          title="Grabar nota de voz"
                          onClick={(e) => { e.stopPropagation(); setAudioContactId(c.id); }}
                        >
                          <Mic className="h-4.5 w-4.5 text-primary" />
                        </button>
                        <button
                          className="h-9 w-9 rounded-full border border-border bg-muted/30 hover:bg-muted flex items-center justify-center transition-colors"
                          onClick={(e) => { e.stopPropagation(); navigate(`/contactos/${c.id}`); }}
                        >
                          <Eye className="h-4.5 w-4.5 text-muted-foreground" />
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

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Nuevo contacto</DialogTitle>
            <DialogDescription>Crea un nuevo contacto en el sistema</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre *</Label>
                <Input required className="h-9" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Apellido</Label>
                <Input className="h-9" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input type="email" className="h-9" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-9" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">NIF/DNI</Label>
                <Input className="h-9" value={form.nif} onChange={(e) => setForm({ ...form, nif: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Empresa</Label>
                <Input className="h-9" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>
              {!filterCategory && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Categoría *</Label>
                  <Select value={form.category_name} onValueChange={(v) => setForm({ ...form, category_name: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c: any) => (
                        <SelectItem key={c.id} value={c.name}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">Origen</Label>
                <Input className="h-9" placeholder="Web, teléfono, referido..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Centro</Label>
                <Select value={form.center_id} onValueChange={(v) => setForm({ ...form, center_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar centro" /></SelectTrigger>
                  <SelectContent>
                    {centers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Notas</Label>
                <Textarea className="min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createContact.isPending}>
                {createContact.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Crear contacto
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audio recording dialog */}
      <Dialog open={!!audioContactId} onOpenChange={(open) => { if (!open) setAudioContactId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Nota de voz</DialogTitle>
            <DialogDescription>Graba una nota de voz o añade una sesión para este contacto</DialogDescription>
          </DialogHeader>
          {audioContactId && (
            <div className="space-y-4">
              <PatientNotesSection contactId={audioContactId} />
              <SessionNotesSection entityType="contact" entityId={audioContactId} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
