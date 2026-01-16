import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: editingIndicator?.name || "",
    process: editingIndicator?.process || "",
    objective: editingIndicator?.objective || "",
    target_value: editingIndicator?.target_value?.toString() || "",
    current_value: editingIndicator?.current_value?.toString() || "0",
    unit: editingIndicator?.unit || "%",
    input_1: editingIndicator?.input_1 || "",
    input_2: editingIndicator?.input_2 || "",
    frequency: editingIndicator?.frequency || "Trimestral",
    responsible: editingIndicator?.responsible || "",
    calculation_info: editingIndicator?.calculation_info || "",
    formula: editingIndicator?.formula || ""
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await (supabase.from("processes" as any).select("id, name") as any);
      return (data || []) as any[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { 
        ...form, 
        target_value: parseFloat(form.target_value) || 0,
        current_value: parseFloat(form.current_value) || 0,
        last_update: new Date().toISOString().split('T')[0],
        created_by: user?.id 
      };

      if (editingIndicator) {
        const { error } = await supabase.from("indicators" as any).update(payload).eq("id", editingIndicator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("indicators" as any).insert([{ 
          ...payload, 
          period_start_date: new Date().toISOString().split('T')[0] 
        }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      toast.success("Operación exitosa");
      onSuccess();
    },
    onError: (error: any) => toast.error("Error al guardar: " + error.message)
  });

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2"><Label>Nombre del Indicador</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Ej: Tasa de Reclamaciones" /></div>
      <div className="space-y-2">
        <Label>Proceso</Label>
        <Select value={form.process} onValueChange={(v) => setForm({...form, process: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar proceso" /></SelectTrigger>
          <SelectContent>{processes.map((p: any) => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-2"><Label>Responsable</Label><Input value={form.responsible} onChange={(e) => setForm({...form, responsible: e.target.value})} placeholder="Cargo o nombre" /></div>
      <div className="space-y-2"><Label>Objetivo</Label><Textarea value={form.objective} onChange={(e) => setForm({...form, objective: e.target.value})} placeholder="Descripción del objetivo" /></div>
      <div className="space-y-2"><Label>Información para el Cálculo</Label><Textarea rows={2} value={form.calculation_info} onChange={(e) => setForm({...form, calculation_info: e.target.value})} placeholder="Detalle de datos necesarios" /></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2"><Label>Meta</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({...form, target_value: e.target.value})} placeholder="90" /></div>
        <div className="space-y-2"><Label>Unidad</Label><Input value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} placeholder="%" /></div>
        <div className="space-y-2"><Label>Frecuencia</Label>
          <Select value={form.frequency} onValueChange={(v) => setForm({...form, frequency: v})}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent><SelectItem value="Trimestral">Trimestral</SelectItem><SelectItem value="Semestral">Semestral</SelectItem><SelectItem value="Anual">Anual</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Entrada 1 (A)</Label><Input value={form.input_1} onChange={(e) => setForm({...form, input_1: e.target.value})} /></div>
        <div className="space-y-2"><Label>Entrada 2 (B)</Label><Input value={form.input_2} onChange={(e) => setForm({...form, input_2: e.target.value})} /></div>
      </div>
      <div className="space-y-2"><Label>Fórmula de Cálculo</Label><Input value={form.formula} onChange={(e) => setForm({...form, formula: e.target.value})} placeholder="Ej: (A/B)*100" /></div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Confirmar</Button>
      </div>
    </div>
  );
};

export default IndicatorForm;