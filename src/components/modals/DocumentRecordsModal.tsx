import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload, FileText, Download, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  document: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function DocumentRecordsModal({ document, isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  const documentId = document?.id || document?.doc_id;

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["document_records", documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from("document_records" as any)
        .select("*")
        .eq("document_id", documentId)
        .order("uploaded_at", { ascending: false });
        
      if (error) throw error;
      return data;
    },
    enabled: !!documentId && isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error("Falta archivo o usuario");
      if (!documentId) throw new Error("No se pudo identificar el documento padre");
      
      const fileExt = file.name.split(".").pop();
      const filePath = `records/${document.code}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from("documents").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("documents").getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("document_records" as any).insert({
        document_id: documentId,
        file_name: file.name,
        file_url: publicUrl.publicUrl,
        uploaded_by: user.id,
        description: description || file.name,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_records"] });
      toast.success("Registro subido correctamente");
      setFile(null);
      setDescription("");
    },
    onError: (e: any) => toast.error("Error: " + e.message),
    onSettled: () => setUploading(false)
  });

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("document_records" as any).delete().eq("id", id);
    if (error) {
        toast.error("Error al eliminar");
        return;
    }
    queryClient.invalidateQueries({ queryKey: ["document_records"] });
    toast.success("Registro eliminado");
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    uploadMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Registros: {document?.code}</DialogTitle>
          <DialogDescription>
            Suba aquí los formularios completados (evidencias) asociados a esta plantilla.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Formulario de Subida */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-3 text-sm font-medium">Nuevo Registro Completado</h4>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Input 
                  type="text" 
                  placeholder="Descripción (ej: Evaluación Enero 2024)" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background"
                />
                <Input 
                  type="file" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)} 
                  className="bg-background cursor-pointer"
                />
              </div>
              <Button onClick={handleUpload} disabled={uploading || !file}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Lista de Registros */}
          <div className="rounded-md border">
            <div className="bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground grid grid-cols-12">
              <span className="col-span-6">Descripción / Archivo</span>
              <span className="col-span-3">Fecha</span>
              <span className="col-span-3 text-right">Acciones</span>
            </div>
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" /></div>
              ) : records.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No hay registros cargados aún.</div>
              ) : (
                records.map((rec: any) => (
                  <div key={rec.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm hover:bg-muted/10 transition-colors">
                    <div className="col-span-6 flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="font-medium truncate">{rec.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{rec.file_name}</p>
                      </div>
                    </div>
                    <div className="col-span-3 text-xs text-muted-foreground">
                      {new Date(rec.uploaded_at).toLocaleDateString()}
                    </div>
                    <div className="col-span-3 flex justify-end gap-1">
                      
                      {/* BOTÓN VER: Sin 'text-muted-foreground' */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-secondary hover:text-white transition-colors" 
                        asChild 
                        title="Ver Documento"
                      >
                        <a href={rec.file_url} target="_blank" rel="noreferrer"><Eye className="h-3.5 w-3.5" /></a>
                      </Button>

                      {/* BOTÓN DESCARGAR: Sin 'text-muted-foreground' */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-secondary hover:text-white transition-colors" 
                        asChild
                        title="Descargar"
                      >
                        <a href={rec.file_url} target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5" /></a>
                      </Button>

                      {/* BOTÓN ELIMINAR: Rojo por semántica */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-destructive hover:bg-destructive hover:text-white transition-colors" 
                        onClick={() => handleDelete(rec.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}