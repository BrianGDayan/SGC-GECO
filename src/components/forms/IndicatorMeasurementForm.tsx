import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface IndicatorMeasurementFormProps {
  indicators: any[];
  onSuccess: () => void;
}

const IndicatorMeasurementForm = ({ indicators, onSuccess }: IndicatorMeasurementFormProps) => {
  const queryClient = useQueryClient();
  const [uploadData, setUploadData] = useState({ indicator_id: "", v1: "", v2: "", period: "", obs: "" });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      // 1. Validaciones previas
      if (!uploadData.indicator_id) {
        throw new Error("Debe seleccionar un indicador.");
      }
      
      const ind = indicators.find((i) => i.id.toString() === uploadData.indicator_id);
      if (!ind) throw new Error("Indicador no encontrado.");

      // 2. Cálculos
      const v1 = parseFloat(uploadData.v1) || 0;
      const v2 = parseFloat(uploadData.v2) || 0;
      
      // Evitar división por cero si v2 es 0
      const newResult = v2 !== 0 ? (v1 / v2) * 100 : 0;

      const periodMap: Record<string, number> = { "Mensual": 1, "Trimestral": 3, "Semestral": 6, "Anual": 12 };
      const targetMonths = periodMap[ind.frequency] || 3;
      
      // Calculamos meses transcurridos de forma segura
      const startDate = new Date(ind.period_start_date || new Date());
      const now = new Date();
      const monthsElapsed = (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

      let newStatus = ind.status;
      let newTrend = ind.trend;
      let newLastPeriodValue = ind.last_period_value;
      let newPeriodStart = ind.period_start_date;

      // Lógica de actualización de periodo
      if (monthsElapsed >= targetMonths) {
        newStatus = newResult >= ind.target_value ? "cumple" : "no cumple";
        
        if (ind.last_period_value !== null) {
          if (newResult > ind.last_period_value) newTrend = "up";
          else if (newResult < ind.last_period_value) newTrend = "down";
          else newTrend = "stable";
        }
        
        newLastPeriodValue = newResult;
        newPeriodStart = new Date().toISOString().split('T')[0];
      }

      // 3. Insertar Historial
      const { error: historyError } = await supabase.from("indicator_history" as any).insert([{
        indicator_id: ind.id, 
        value_1: v1, 
        value_2: v2, 
        result: newResult,
        period_date: uploadData.period ? (uploadData.period + "-01") : new Date().toISOString().split('T')[0], 
        observations: uploadData.obs
      }]);

      if (historyError) throw historyError;

      // 4. Actualizar Indicador Principal
      const { error: updateError } = await supabase.from("indicators" as any).update({
        current_value: newResult, 
        status: newStatus, 
        trend: newTrend,
        last_period_value: newLastPeriodValue, 
        period_start_date: newPeriodStart,
        last_update: new Date().toISOString().split('T')[0]
      }).eq("id", ind.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      // Refrescamos datos
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      toast.success("Datos cargados correctamente");
      // AQUÍ cerramos la modal solo si todo salió bien
      onSuccess();
    },
    onError: (error: any) => {
      // Si falla, mostramos el error y MANTENEMOS la modal abierta
      toast.error("Error al cargar datos: " + error.message);
    }
  });

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2"><Label>Indicador</Label>
        <Select onValueChange={(v) => setUploadData({...uploadData, indicator_id: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar indicador" /></SelectTrigger>
          <SelectContent>
            {indicators.map((ind) => (
              <SelectItem key={ind.id} value={ind.id.toString()}>{ind.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Valor 1 (A)</Label>
          <Input 
            type="number" 
            value={uploadData.v1} 
            onChange={(e) => setUploadData({...uploadData, v1: e.target.value})} 
            placeholder="0" 
          />
        </div>
        <div className="space-y-2">
          <Label>Valor 2 (B)</Label>
          <Input 
            type="number" 
            value={uploadData.v2} 
            onChange={(e) => setUploadData({...uploadData, v2: e.target.value})} 
            placeholder="0" 
          />
        </div>
        <div className="space-y-2">
          <Label>Período</Label>
          <Input 
            type="month" 
            value={uploadData.period} 
            onChange={(e) => setUploadData({...uploadData, period: e.target.value})} 
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Input 
          value={uploadData.obs} 
          onChange={(e) => setUploadData({...uploadData, obs: e.target.value})} 
          placeholder="Comentarios opcionales" 
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        {/* Botón Cancelar cierra la modal sin guardar */}
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        
        {/* Botón Guardar ejecuta la mutación y muestra estado de carga */}
        <Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>
          {uploadMutation.isPending ? "Guardando..." : "Guardar Datos"}
        </Button>
      </div>
    </div>
  );
};

export default IndicatorMeasurementForm;