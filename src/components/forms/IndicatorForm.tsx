import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface IndicatorFormProps {
  editingIndicator?: any;
  onSuccess: () => void;
}

const IndicatorForm = ({ editingIndicator, onSuccess }: IndicatorFormProps) => {
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    name: editingIndicator?.name || "",
    process_id: editingIndicator?.process_id?.toString() || "", 
    objective: editingIndicator?.objective || "",
    target_value: editingIndicator?.target_value?.toString() || "",
    unit: editingIndicator?.unit || "%",
    input_1: editingIndicator?.input_1 || "",
    input_2: editingIndicator?.input_2 || "",
    frequency: editingIndicator?.frequency || "Trimestral",
    responsible: editingIndicator?.responsible || "",
    calculation_info: editingIndicator?.calculation_info || "",
    formula: editingIndicator?.formula || ""
  });

  // Tipado estricto agregado aquí para evitar errores de TS
  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from("processes" as any).select("id, name");
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name || !form.process_id) {
        throw new Error("El nombre y el proceso son obligatorios.");
      }

      const selectedProcess = processes.find((p: any) => p.id.toString() === form.process_id);
      const processName = selectedProcess ? selectedProcess.name : "";

      const payload = { 
        name: form.name,
        process_id: parseInt(form.process_id), 
        process: processName,
        objective: form.objective,
        target_value: parseFloat(form.target_value) || 0,
        unit: form.unit,
        input_1: form.input_1,
        input_2: form.input_2,
        frequency: form.frequency,
        responsible: form.responsible,
        calculation_info: form.calculation_info,
        formula: form.formula,
        last_update: new Date().toISOString().split('T')[0]
      };

      if (editingIndicator) {
        const { error } = await supabase.from("indicators" as any).update(payload).eq("id", editingIndicator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("indicators" as any).insert([{ 
          ...payload, 
          current_value: 0 
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      queryClient.invalidateQueries({ queryKey: ["indicators-with-history"] });
      toast.success("Indicador guardado correctamente");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error("Error al guardar: " + error.message);
    }
  });

  return (
    <div className="space-y-5 px-1 pt-2 pb-8">
      <div className="space-y-2">
        <Label>Nombre del Indicador <span className="text-destructive">*</span></Label>
        <Input 
          value={form.name} 
          onChange={(e) => setForm({...form, name: e.target.value})} 
          placeholder="Ej: Tasa de Reclamaciones" 
        />
      </div>
      
      <div className="space-y-2">
        <Label>Proceso <span className="text-destructive">*</span></Label>
        <Select 
          value={form.process_id} 
          onValueChange={(v) => setForm({...form, process_id: v})}
        >
          <SelectTrigger><SelectValue placeholder="Seleccionar proceso" /></SelectTrigger>
          <SelectContent>
            {processes.map((p: any) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Responsable</Label>
        <Input value={form.responsible} onChange={(e) => setForm({...form, responsible: e.target.value})} placeholder="Cargo o nombre" />
      </div>

      <div className="space-y-2">
        <Label>Objetivo</Label>
        <Textarea value={form.objective} onChange={(e) => setForm({...form, objective: e.target.value})} placeholder="Descripción del objetivo" />
      </div>

      <div className="space-y-2">
        <Label>Información para el Cálculo</Label>
        <Textarea rows={2} value={form.calculation_info} onChange={(e) => setForm({...form, calculation_info: e.target.value})} placeholder="Detalle de datos necesarios" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Meta</Label>
          <Input type="number" value={form.target_value} onChange={(e) => setForm({...form, target_value: e.target.value})} placeholder="90" />
        </div>
        <div className="space-y-2">
          <Label>Unidad</Label>
          <Input value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} placeholder="%" />
        </div>
        <div className="space-y-2">
          <Label>Frecuencia</Label>
          <Select value={form.frequency} onValueChange={(v) => setForm({...form, frequency: v})}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Mensual">Mensual</SelectItem>
              <SelectItem value="Trimestral">Trimestral</SelectItem>
              <SelectItem value="Semestral">Semestral</SelectItem>
              <SelectItem value="Anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Entrada 1 (A)</Label><Input value={form.input_1} onChange={(e) => setForm({...form, input_1: e.target.value})} placeholder="Nombre del valor A" /></div>
        <div className="space-y-2"><Label>Entrada 2 (B)</Label><Input value={form.input_2} onChange={(e) => setForm({...form, input_2: e.target.value})} placeholder="Nombre del valor B" /></div>
      </div>

      <div className="space-y-2">
        <Label>Fórmula de Cálculo</Label>
        <Input value={form.formula} onChange={(e) => setForm({...form, formula: e.target.value})} placeholder="Ej: (A/B)*100" />
      </div>

      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Guardando..." : "Confirmar"}
        </Button>
      </div>
    </div>
  );
};

export default IndicatorForm;