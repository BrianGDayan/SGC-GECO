import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
}

const AuditForm = ({ onSuccess }: AuditFormProps) => {
  const queryClient = useQueryClient();
  // Eliminamos useAuth para evitar conflictos de ID (UUID vs Integer)
  
  const [selectedScope, setSelectedScope] = useState<string[]>([]);
  const [auditForm, setAuditForm] = useState({ 
    title: "", scheduled_date: "", auditor: "", type: "interna", scope: "", progress: "0" 
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes" as any).select("id, name");
      return (data || []) as any[];
    }
  });

  const saveAudit = useMutation({
    mutationFn: async () => {
      // 1. Validaciones
      if (!auditForm.title) throw new Error("El título de la auditoría es obligatorio.");

      const progressNum = parseInt(auditForm.progress) || 0;
      
      // 2. Crear Payload LIMPIO (Sin created_by/owner_id)
      const payload = { 
        ...auditForm, 
        // Enviamos el scope como array de texto (nombres) para la columna 'scope' de la tabla 'audits'
        scope: selectedScope, 
        progress: progressNum,
        status: progressNum === 100 ? "completada" : progressNum > 0 ? "en curso" : "programada",
        // Eliminado created_by para evitar error "invalid input syntax for type integer"
      };
      
      // 3. Insertar Auditoría Principal
      const { data: audit, error: auditError } = await (supabase
        .from("audits" as any)
        .insert([payload])
        .select()
        .single() as any);
      
      if (auditError) throw auditError;

      // 4. Insertar Relaciones (Tabla Intermedia: audit_processes)
      const processIds = processes
        .filter(p => selectedScope.includes(p.name))
        .map(p => p.id);
      
      if (processIds.length > 0) {
        const relations = processIds.map(pId => ({ 
          audit_id: audit.id, 
          process_id: pId 
        }));
        
        const { error: relError } = await supabase
          .from("audit_processes" as any)
          .insert(relations);
          
        if (relError) throw relError;
      }
    },
    onSuccess: () => {
      // Refrescar lista y notificar
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      toast.success("Auditoría programada correctamente");
      // SOLO cerramos la modal si todo salió bien
      onSuccess();
    },
    onError: (error: any) => {
      // Mantenemos la modal abierta para que no pierdas los datos
      toast.error("Error al programar auditoría: " + error.message);
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
          <Label>Fecha</Label>
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
        <Label>Progreso Inicial (%)</Label>
        <Input 
          type="number" 
          value={auditForm.progress} 
          onChange={(e) => setAuditForm({...auditForm, progress: e.target.value})} 
          min={0}
          max={100}
        />
      </div>
      
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button onClick={() => saveAudit.mutate()} disabled={saveAudit.isPending}>
          {saveAudit.isPending ? "Guardando..." : "Confirmar"}
        </Button>
      </div>
    </div>
  );
};

export default AuditForm;