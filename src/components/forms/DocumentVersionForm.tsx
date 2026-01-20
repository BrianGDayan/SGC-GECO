import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Loader2, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface DocumentVersionFormProps {
  parentDoc: any; // Viene de la Vista
  onSuccess: () => void;
}

const DocumentVersionForm = ({ parentDoc, onSuccess }: DocumentVersionFormProps) => {
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const nextRevision = (parentDoc?.revision || 0) + 1;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!userData) throw new Error("No autenticado");
      if (!selectedFile) throw new Error("Archivo requerido para nueva versión");

      // 1. Subir nuevo archivo
      const path = `${crypto.randomUUID()}.${selectedFile.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, selectedFile);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      // 2. Marcar versiones anteriores como obsoletas
      await supabase
        .from("document_versions" as any)
        .update({ status: "obsoleto" })
        .eq("document_id", parentDoc.doc_id) // Usamos el ID del maestro (document_id)
        .neq("status", "obsoleto");

      // 3. Insertar nueva versión
      const { error: verErr } = await supabase.from("document_versions" as any).insert({
        document_id: parentDoc.doc_id, // Vinculado al maestro existente
        revision: nextRevision,
        file_url: publicUrl,
        status: "vigente",
        description: description || `Actualización a Rev ${nextRevision}`,
        uploaded_by: userData.id
      });
      
      if (verErr) throw verErr;

      // 4. Actualizar file_name global en el maestro si cambió (Opcional, según tu requerimiento)
      await supabase.from("documents" as any).update({ file_name: selectedFile.name }).eq("id", parentDoc.doc_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success(`Versión ${nextRevision} generada`);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message)
  });

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(e.type === "dragenter" || e.type === "dragover"); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); if(e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]); };

  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <FileUp className="h-5 w-5 text-primary mt-1" />
        <div>
            <h4 className="font-semibold text-sm text-primary">Generando Revisión {nextRevision}</h4>
            <p className="text-xs text-muted-foreground">El documento actual pasará a estado <strong>Obsoleto</strong>.</p>
        </div>
      </div>

      <div className="space-y-2"><Label>Código</Label><Input value={parentDoc.code} disabled className="bg-muted" /></div>
      <div className="space-y-2"><Label>Motivo del cambio</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describa los cambios realizados..." /></div>
      
      <div className="space-y-2">
        <Label>Nuevo Archivo</Label>
        <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
        <div onClick={() => fileInputRef.current?.click()} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${isDragging ? 'border-primary bg-primary/10' : selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="mt-2 text-sm">{selectedFile ? selectedFile.name : "Haz clic o arrastra la nueva versión acá"}</p>
        </div>
      </div>

      <Button className="w-full bg-primary" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !selectedFile}>
        {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Subiendo...</> : "Actualizar Documento"}
      </Button>
    </div>
  );
};

export default DocumentVersionForm;