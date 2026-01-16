import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Upload, Search, Download, Eye, Edit, Trash2, FolderOpen, Loader2, AlertTriangle, Filter 
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import DocumentForm from "@/components/forms/DocumentForm"; // IMPORTANTE: Importar el componente

const categories = [
  { id: "manual", name: "Manual", prefix: "MA" },
  { id: "procedimiento_general", name: "Procedimiento General", prefix: "PG" },
  { id: "procedimiento_operativo", name: "Procedimiento Operativo", prefix: "PO" },
  { id: "registro", name: "Registro", prefix: "RE" },
  { id: "documento", name: "Documento", prefix: "DC" },
  { id: "documento_externo", name: "Documento Externo", prefix: "DE" },
  { id: "instructivo", name: "Instructivo", prefix: "IN" },
];

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  "en revision": "bg-warning/10 text-warning border-warning/20",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20",
  "no aprobado": "bg-destructive/10 text-destructive border-destructive/20",
};

const Documentos = () => {
  const queryClient = useQueryClient();

  // Estados de Filtros
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);

  // Query de Documentos
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents" as any)
        .select(`*, users(full_name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((doc: any) => ({
        ...doc,
        updatedBy: doc.users?.full_name || "Sistema",
        updatedAt: new Date(doc.updated_at).toLocaleDateString()
      }));
    },
  });

  // Lógica de Filtrado
  const filteredDocs = documents.filter((doc: any) => {
    const matchesCat = !selectedCategory || doc.category === selectedCategory;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      (doc.title && doc.title.toLowerCase().includes(searchLower)) || 
      (doc.code && doc.code.toLowerCase().includes(searchLower));

    return matchesCat && matchesStatus && matchesSearch;
  });

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
    } catch (e) { window.open(url, "_blank"); }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await supabase.from("documents" as any).delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast.success("Documento eliminado"); setIsDeleteOpen(false); }
  });

  const openModal = (doc: any = null) => {
    setEditingDoc(doc);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
  };

  if (isLoading) return <MainLayout title="Documentos"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout title="Documentos" subtitle="Gestión documental del Sistema de Calidad">
      <div className="flex gap-6">
        <aside className="w-64 shrink-0">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Categorías</h3>
            <div className="space-y-1">
              <button onClick={() => setSelectedCategory(null)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${!selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                <div className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /><span>Todos</span></div>
                <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${selectedCategory === cat.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span>{cat.name}</span></div>
                  <Badge variant="secondary" className="text-xs">{documents.filter((d: any) => d.category === cat.id).length}</Badge>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nombre o código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-72 pl-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-52"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.keys(statusStyles).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openModal()} className="gap-2 bg-primary hover:bg-primary-dark"><Upload className="h-4 w-4" /> Subir Documento</Button>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rev.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actualizado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc: any) => (
                  <tr key={doc.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-primary">{doc.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div>
                        <span className="font-medium text-sm text-foreground">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{categories.find(c => c.id === doc.category)?.name || doc.category}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{doc.revision}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-foreground">{doc.updatedAt}</p>
                      <p className="text-muted-foreground text-[12px]">{doc.updatedBy}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`${statusStyles[doc.status as keyof typeof statusStyles]} text-[10px] uppercase`}>{doc.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.file_url, doc.file_name)}><Download className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openModal(doc)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingDoc(doc); setIsDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Subir/Editar usando el COMPONENTE REUTILIZABLE */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Editar Documento" : "Subir Nuevo Documento"}</DialogTitle>
            <DialogDescription>Complete la información técnica del registro documental.</DialogDescription>
          </DialogHeader>
          <DocumentForm editingDoc={editingDoc} onSuccess={closeModal} />
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar (se mantiene igual) */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-6 w-6" /></div>
            <DialogTitle className="text-center">¿Confirmar eliminación?</DialogTitle>
            <DialogDescription className="text-center">Esta acción eliminará permanentemente a <strong>{deletingDoc?.code}</strong>. No se puede revertir.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingDoc.id)}>Eliminar Documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Documentos;