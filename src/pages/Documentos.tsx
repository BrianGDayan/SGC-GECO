import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Upload, Search, Download, Eye, Edit, Trash2, FolderOpen, Loader2, AlertTriangle, Filter, FileUp 
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import DocumentForm from "@/components/forms/DocumentForm";
import DocumentVersionForm from "@/components/forms/DocumentVersionForm";

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
  obsoleto: "bg-muted text-muted-foreground border-border",
};

const Documentos = () => {
  const queryClient = useQueryClient();

  // Estados de Filtros
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  // CAMBIO: Estado por defecto "all"
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [versioningDoc, setVersioningDoc] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);
  
  // Query de Documentos
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents_view" as any)
        .select(`*`)
        .order("code", { ascending: true })
        .order("revision", { ascending: false });
      
      if (error) throw error;
      return data.map((doc: any) => ({
        ...doc,
        updatedBy: doc.user_name || "Sistema",
        updatedAt: new Date(doc.uploaded_at).toLocaleDateString()
      }));
    },
  });

  // Lógica de Filtrado
  const filteredDocs = documents.filter((doc: any) => {
    const matchesCat = !selectedCategory || doc.category === selectedCategory;
    // CAMBIO: Lógica simplificada para mostrar todos o filtrar por estado específico
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

  const openVersionModal = (doc: any) => {
    setVersioningDoc(doc);
    setIsVersionModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsVersionModalOpen(false);
    setEditingDoc(null);
    setVersioningDoc(null);
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
                  {/* CAMBIO: Se muestran todas las opciones del objeto statusStyles */}
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
                  {/* CAMBIO: Nuevo encabezado de Proceso */}
                  <th className="px-4 py-3 text-left text-sm font-medium">Proceso</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rev.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actualizado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc: any) => (
                  <tr key={doc.version_id} className={`transition-colors hover:bg-muted/30 ${doc.status === 'obsoleto' ? 'opacity-60 bg-muted/10' : ''}`}>
                    <td className="px-4 py-3 font-mono text-sm font-medium text-primary">{doc.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div>
                        <span className="font-medium text-sm text-foreground">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{categories.find(c => c.id === doc.category)?.name || doc.category}</td>
                    {/* CAMBIO: Nueva celda de Proceso */}
                    <td className="px-4 py-3 text-sm text-muted-foreground">{doc.process || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground font-bold">{doc.revision}</td>
                    <td className="px-4 py-3 text-xs">
                      <p className="text-foreground">{doc.updatedAt}</p>
                      <p className="text-muted-foreground text-[12px]">{doc.updatedBy}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`${statusStyles[doc.status as keyof typeof statusStyles] || statusStyles['obsoleto']} text-[10px] uppercase`}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.file_url, doc.file_name)}><Download className="h-4 w-4" /></Button>
                        
                        {doc.status !== 'obsoleto' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openVersionModal(doc)} title="Nueva Versión">
                            <FileUp className="h-4 w-4" />
                          </Button>
                        )}
                        
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Editar Metadatos" : "Subir Nuevo Documento"}</DialogTitle>
            <DialogDescription>{editingDoc ? "Modifique la información general del documento." : "Complete la información técnica del registro documental."}</DialogDescription>
          </DialogHeader>
          <DocumentForm editingDoc={editingDoc} onSuccess={closeModal} />
        </DialogContent>
      </Dialog>

      <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Generar Nueva Versión</DialogTitle>
            <DialogDescription>Cargar actualización para el documento <strong>{versioningDoc?.code}</strong>.</DialogDescription>
          </DialogHeader>
          {versioningDoc && <DocumentVersionForm parentDoc={versioningDoc} onSuccess={closeModal} />}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-6 w-6" /></div>
            <DialogTitle className="text-center">¿Confirmar eliminación?</DialogTitle>
            <DialogDescription className="text-center">Esta acción eliminará <strong>todas las versiones</strong> del documento <strong>{deletingDoc?.code}</strong>. No se puede revertir.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingDoc.doc_id)}>Eliminar Documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Documentos;