import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface DocumentFormProps {
  editingDoc?: any;
  onSuccess: () => void;
}

const DocumentForm = ({ editingDoc, onSuccess }: DocumentFormProps) => {
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [form, setForm] = useState({
    title: editingDoc?.title || "",
    category: editingDoc?.category || "",
    process: editingDoc?.process || "",
    docNumber: editingDoc?.code?.split('-')[1] || "",
    status: editingDoc?.status || "en revision",
    revision: editingDoc?.revision || 0,
    description: editingDoc?.description || "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await (supabase.from("processes" as any).select("id, name") as any);
      return (data || []) as any[];
    }
  });

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

      const catObj = categories.find(c => c.id === form.category);
      const generatedCode = `${catObj?.prefix}-${form.docNumber.padStart(3, '0')}`;

      const docData = { 
        code: generatedCode, title: form.title, category: form.category, 
        process: form.process, status: form.status, revision: form.revision, 
        description: form.description, file_url: fileUrl, file_name: fileName, 
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento guardado");
      onSuccess();
    }
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Nombre del Documento</Label>
        <Input 
          value={form.title} 
          onChange={(e) => setForm({...form, title: e.target.value})} 
          placeholder="Ej: Manual de Gestión de Calidad" 
        />
      </div>
      
      <div className="space-y-2">
        <Label>Proceso</Label>
        <Select value={form.process} onValueChange={(v) => setForm({...form, process: v})}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar proceso" />
          </SelectTrigger>
          <SelectContent>
            {processes.map((p) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2 col-span-1">
          <Label>Nº Documento</Label>
          <Input 
            type="number" 
            placeholder="001" 
            value={form.docNumber} 
            onChange={(e) => setForm({...form, docNumber: e.target.value})} 
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Categoría</Label>
          <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vigente">Vigente</SelectItem>
              <SelectItem value="en revision">En Revisión</SelectItem>
              <SelectItem value="en aprobacion">En Aprobación</SelectItem>
              <SelectItem value="no aprobado">No Aprobado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Revisión (Nº)</Label>
          <Input 
            type="number" 
            value={form.revision} 
            onChange={(e) => setForm({...form, revision: parseInt(e.target.value) || 0})} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descripción</Label>
        <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} />
      </div>

      <div className="space-y-2">
        <Label>Archivo Adjunto</Label>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
        />
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-primary/10' : selectedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="mt-2 text-sm">
            {selectedFile ? selectedFile.name : editingDoc ? editingDoc.file_name : "Haz clic o arrastra un archivo acá"}
          </p>
        </div>
      </div>

      <Button 
        className="w-full bg-primary" 
        onClick={() => saveMutation.mutate()} 
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : "Confirmar"}
      </Button>
    </div>
  );
};

export default DocumentForm;