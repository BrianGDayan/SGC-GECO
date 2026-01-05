import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Upload, Search, Download, Eye, Edit, Trash2, FolderOpen
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const categories = [
  { id: "manual", name: "Manual" },
  { id: "procedimiento_general", name: "Procedimiento General" },
  { id: "procedimiento_operativo", name: "Procedimiento Operativo" },
  { id: "registro", name: "Registro" },
  { id: "documento", name: "Documento" },
  { id: "documento_externo", name: "Documento Externo" },
  { id: "instructivo", name: "Instructivo" },
];

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  "en revision": "bg-warning/10 text-warning border-warning/20",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20",
  "no aprobado": "bg-destructive/10 text-destructive border-destructive/20",
};

const Documentos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Estados del formulario
  const [formRevision, setFormRevision] = useState<number>(0);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<string>("");
  const [formStatus, setFormStatus] = useState<string>("en revision");
  const [formDescription, setFormDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents" as any)
        .select(`*, profiles(full_name)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((doc: any) => ({
        code: doc.code,
        name: doc.title,
        description: doc.description,
        category: doc.category,
        revision: doc.revision,
        updatedAt: new Date(doc.updated_at).toLocaleDateString(),
        updatedBy: doc.profiles?.full_name || "Sistema",
        status: doc.status || "en revision",
        fileUrl: doc.file_url
      }));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !user || !formCategory) throw new Error("Faltan campos requeridos");

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("documents" as any)
        .insert({
          title: formName,
          description: formDescription,
          category: formCategory,
          revision: formRevision,
          file_url: publicUrl,
          file_name: selectedFile.name,
          uploaded_by: user.id,
          status: formStatus
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Operación exitosa");
      setIsUploadOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const resetForm = () => {
    setFormRevision(0);
    setFormName("");
    setFormCategory("");
    setFormStatus("en revision");
    setFormDescription("");
    setSelectedFile(null);
  };

  const filteredDocs = documents.filter((doc: any) => {
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MainLayout title="Documentos" subtitle="Gestión documental del Sistema de Calidad">
      <div className="flex gap-6">
        <aside className="w-64 shrink-0">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Categorías</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${!selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>Todos</span>
                </div>
                <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${selectedCategory === cat.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{cat.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {documents.filter((d: any) => d.category === cat.id).length}
                  </Badge>
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
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-9"
                />
              </div>
            </div>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Subir Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Subir Nuevo Documento</DialogTitle>
                  <DialogDescription>Complete la información del documento.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Documento</Label>
                    <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={formCategory} onValueChange={setFormCategory}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select value={formStatus} onValueChange={setFormStatus}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.keys(statusStyles).map(s => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revision">Revisión</Label>
                    <Input 
                      id="revision" 
                      type="number" 
                      step="1" 
                      value={formRevision} 
                      onChange={(e) => setFormRevision(parseInt(e.target.value) || 0)} 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Archivo</Label>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); setSelectedFile(e.dataTransfer.files[0]); }}
                      className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    >
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm">{selectedFile ? selectedFile.name : "Haz clic o arrastra un archivo aquí"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancelar</Button>
                  <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending || !selectedFile || !formCategory}>
                    Subir Documento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Categoría</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Descripción</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rev.</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actualizado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-8">Cargando...</td></tr>
                ) : filteredDocs.map((doc: any) => (
                  <tr key={doc.code} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-sm font-medium text-primary">{doc.code}</td>
                    <td className="px-4 py-3 font-medium">{doc.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {categories.find(c => c.id === doc.category)?.name || doc.category}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                      {doc.description || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{doc.revision}</td>
                    <td className="px-4 py-3 text-sm">
                      <p className="text-foreground">{doc.updatedAt}</p>
                      <p className="text-muted-foreground text-xs">{doc.updatedBy}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusStyles[doc.status as keyof typeof statusStyles] || statusStyles["en revision"]}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Documentos;