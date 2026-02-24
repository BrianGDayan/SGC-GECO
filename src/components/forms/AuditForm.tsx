import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface AuditFormProps {
  onSuccess: () => void;
  initialData?: any | null;
}

const AuditForm = ({ onSuccess, initialData }: AuditFormProps) => {
  const queryClient = useQueryClient();
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  
  const [auditForm, setAuditForm] = useState({ 
    title: "", scheduled_date: "", auditor: "", type: "interna", scope: "", progress: "0" 
  });

  useEffect(() => {
    if (initialData) {
      setAuditForm({
        title: initialData.title || initialData.name || "",
        scheduled_date: initialData.scheduled_date || initialData.date || "",
        auditor: initialData.auditor || "",
        type: initialData.type || "interna",
        scope: "", 
        progress: (initialData.progress || 0).toString()
      });
      
      let scopeArr: string[] = [];
      if (Array.isArray(initialData.scope)) {
        scopeArr = initialData.scope;
      } else if (typeof initialData.scope === 'string') {
        const clean = initialData.scope.replace(/^\{|\}$/g, '');
        if (clean.trim()) scopeArr = clean.split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
      }
      setSelectedScope(scopeArr);
    }
  }, [initialData]);

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes" as any).select("id, name");
      return (data || []) as any[];
    }
  });

  const saveAudit = useMutation({
    mutationFn: async () => {
      if (!auditForm.title) throw new Error("El título de la auditoría es obligatorio.");

      const progressNum = parseInt(auditForm.progress) || 0;
      
      // Estado automático
      const status = progressNum === 100 ? "completada" : (progressNum > 0 ? "en curso" : "programada");

      const payload = { 
        title: auditForm.title,
        scheduled_date: auditForm.scheduled_date,
        auditor: auditForm.auditor,
        type: auditForm.type,
        scope: selectedScope, 
        progress: progressNum,
        status: status,
        // updated_at: new Date().toISOString()  <-- ELIMINADA PARA EVITAR EL ERROR
      };
      
      let auditId = initialData?.id;

      if (initialData) {
        // --- MODO ACTUALIZACIÓN ---
        const { error } = await supabase
          .from("audits" as any)
          .update(payload)
          .eq("id", initialData.id);
        
        if (error) throw error;
      } else {
        // --- MODO CREACIÓN ---
        const { data: newAudit, error } = await supabase
          .from("audits" as any)
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        // Casteo seguro para obtener el ID
        auditId = (newAudit as any).id;
      }

      // Gestionar relaciones audit_processes
      if (auditId) {
        if (initialData) {
            await supabase.from("audit_processes" as any).delete().eq("audit_id", auditId);
        }

        const processIds = processes
          .filter(p => selectedScope.includes(p.name))
          .map(p => p.id);
        
        if (processIds.length > 0) {
          const relations = processIds.map(pId => ({ audit_id: auditId, process_id: pId }));
          const { error: relError } = await supabase.from("audit_processes" as any).insert(relations);
          if (relError) console.warn("Error vinculando procesos:", relError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      toast.success(initialData ? "Auditoría modificada correctamente" : "Auditoría programada correctamente");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    }
  });

  return (
    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label>Título <span className="text-destructive">*</span></Label>
        <Input 
          value={auditForm.title} 
          onChange={(e) => setAuditForm({...auditForm, title: e.target.value})} 
          placeholder="Ej: Auditoría Interna Q1"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha Programada</Label>
          <Input 
            type="date" 
            value={auditForm.scheduled_date} 
            onChange={(e) => setAuditForm({...auditForm, scheduled_date: e.target.value})} 
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={auditForm.type} onValueChange={(v) => setAuditForm({...auditForm, type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interna">Interna</SelectItem>
              <SelectItem value="externa">Externa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Alcance (Seleccionar Procesos)</Label>
        <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md min-h-[42px] bg-muted/10">
          {selectedScope.length === 0 && <span className="text-xs text-muted-foreground italic p-1">Ningún proceso seleccionado</span>}
          {selectedScope.map(s => (
            <Badge key={s} variant="secondary" className="text-[10px] gap-1 px-2 py-0.5">
              {s}
              <button 
                onClick={() => setSelectedScope(selectedScope.filter(item => item !== s))}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Select onValueChange={(val) => !selectedScope.includes(val) && setSelectedScope([...selectedScope, val])}>
          <SelectTrigger><SelectValue placeholder="Agregar proceso..." /></SelectTrigger>
          <SelectContent>
            {processes.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Auditor</Label>
        <Input 
          value={auditForm.auditor} 
          onChange={(e) => setAuditForm({...auditForm, auditor: e.target.value})} 
          placeholder="Nombre del auditor"
        />
      </div>
      <div className="space-y-2">
        <Label>Progreso Actual (%)</Label>
        <div className="flex gap-4 items-center">
            <Input 
            type="number" 
            value={auditForm.progress} 
            onChange={(e) => setAuditForm({...auditForm, progress: e.target.value})} 
            min={0}
            max={100}
            className="w-24"
            />
            <span className="text-xs text-muted-foreground">
                Al llegar a 100%, la auditoría se marcará como <strong>Completada</strong>.
            </span>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button onClick={() => saveAudit.mutate()} disabled={saveAudit.isPending}>
          {saveAudit.isPending ? "Guardando..." : (initialData ? "Guardar Cambios" : "Programar")}
        </Button>
      </div>
    </div>
  );
};

export default AuditForm;