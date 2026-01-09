import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Upload, Search, Download, Eye, Edit, Trash2, FolderOpen, Loader2, AlertTriangle 
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

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
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState<any>(null);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDocNumber, setFormDocNumber] = useState(""); // Nuevo: Nº manual
  const [formStatus, setFormStatus] = useState("en revision");
  const [formRevision, setFormRevision] = useState(0);
  const [formDescription, setFormDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents" as any).select(`*, users(full_name)`).order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((doc: any) => ({ ...doc, updatedBy: doc.users?.full_name || "Sistema", updatedAt: new Date(doc.updated_at).toLocaleDateString() }));
    },
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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userData) throw new Error("No autenticado");
      let fileUrl = editingDoc?.file_url, fileName = editingDoc?.file_name;

      if (selectedFile) {
        const path = `${crypto.randomUUID()}.${selectedFile.name.split('.').pop()}`;
        const { error: upErr } = await supabase.storage.from('documents').upload(path, selectedFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);
        fileUrl = publicUrl; fileName = selectedFile.name;
      }

      // Lógica de código manual: Prefijo + Nº ingresado
      const catObj = categories.find(c => c.id === formCategory);
      const generatedCode = `${catObj?.prefix}-${formDocNumber.padStart(3, '0')}`;

      const docData: any = { 
        code: generatedCode,
        title: formName, 
        category: formCategory, 
        status: formStatus, 
        revision: formRevision, 
        description: formDescription, 
        file_url: fileUrl, 
        file_name: fileName, 
        uploaded_by: userData.id 
      };

      if (editingDoc) {
        const { error } = await supabase.from("documents" as any).update(docData).eq("id", editingDoc.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("documents" as any).insert(docData);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast.success("Éxito"); closeModal(); }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => { await supabase.from("documents" as any).delete().eq("id", id); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast.success("Eliminado"); setIsDeleteOpen(false); }
  });

  const openModal = (doc: any = null) => {
    if (doc) {
      setEditingDoc(doc); setFormName(doc.title); setFormCategory(doc.category);
      setFormDocNumber(doc.code?.split('-')[1] || ""); // Extrae el número del código existente
      setFormStatus(doc.status); setFormRevision(doc.revision); setFormDescription(doc.description || "");
    } else { setEditingDoc(null); resetForm(); }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingDoc(null); resetForm(); };
  const resetForm = () => { setFormName(""); setFormCategory(""); setFormDocNumber(""); setFormStatus("en revision"); setFormRevision(0); setFormDescription(""); setSelectedFile(null); };

  const filteredDocs = documents.filter((doc: any) => {
    const matchesCat = !selectedCategory || doc.category === selectedCategory;
    const matchesSearch = !searchQuery || doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || doc.code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o código..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-80 pl-9" />
            </div>
            <Button onClick={() => openModal()} className="gap-2"><Upload className="h-4 w-4" /> Subir Documento</Button>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Categoría</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rev.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actualizado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc: any) => (
                  <tr key={doc.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-primary">{doc.code}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10"><FileText className="h-4 w-4 text-primary" /></div>
                        <span className="font-medium text-sm">{doc.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{categories.find(c => c.id === doc.category)?.name || doc.category}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{doc.revision}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="text-foreground">{doc.updatedAt}</p>
                      <p className="text-muted-foreground text-[10px] uppercase">{doc.updatedBy}</p>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? "Editar Documento" : "Subir Nuevo Documento"}</DialogTitle>
            <DialogDescription>Complete la información del documento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre del Documento</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1">
                <Label>Nº Documento</Label>
                <Input type="number" placeholder="001" value={formDocNumber} onChange={(e) => setFormDocNumber(e.target.value)} />
              </div>
              <div className="space-y-2 col-span-2"><Label>Categoría</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Estado</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(statusStyles).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Revisión (Nº)</Label><Input type="number" value={formRevision} onChange={(e) => setFormRevision(parseInt(e.target.value) || 0)} /></div>
            </div>

            <div className="space-y-2"><Label>Descripción</Label><Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} /></div>
            
            <div className="space-y-2">
              <Label>Archivo</Label>
              <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]); }}
                className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
              >
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-2 text-sm">{selectedFile ? selectedFile.name : editingDoc ? editingDoc.file_name : "Haz clic o arrastra un archivo aquí"}</p>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !formName || !formDocNumber || !formCategory}>Subir Documento</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-6 w-6" /></div>
            <DialogTitle className="text-center">¿Confirmar eliminación?</DialogTitle>
            <DialogDescription className="text-center">Esta acción eliminará a <strong>{deletingDoc?.code}</strong> permanentemente.</DialogDescription>
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