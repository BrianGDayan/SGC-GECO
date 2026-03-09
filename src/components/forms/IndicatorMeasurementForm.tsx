import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

interface IndicatorMeasurementFormProps {
  indicators: any[];
  onSuccess: () => void;
}

const IndicatorMeasurementForm = ({ indicators, onSuccess }: IndicatorMeasurementFormProps) => {
  const queryClient = useQueryClient();
  
  const [uploadData, setUploadData] = useState({ indicator_id: "", v1: "", v2: "", obs: "" });
  
  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7); 
  
  const [periodUI, setPeriodUI] = useState({
    month: currentMonth,
    quarter: "Q1",
    semester: "S1",
    year: currentYear
  });

  const selectedIndicator = indicators.find((i) => i.id.toString() === uploadData.indicator_id);

  // Construimos el período formato YYYY-XX para permitir ordenamiento cronológico perfecto
  let currentPeriod = "";
  if (selectedIndicator) {
    switch (selectedIndicator.frequency) {
      case "Mensual": currentPeriod = periodUI.month; break; 
      case "Trimestral": currentPeriod = `${periodUI.year}-${periodUI.quarter}`; break;
      case "Semestral": currentPeriod = `${periodUI.year}-${periodUI.semester}`; break;
      case "Anual": currentPeriod = periodUI.year; break;
      default: currentPeriod = periodUI.month; 
    }
  }

  const existingMeasurement = selectedIndicator?.indicator_measurements?.find(
    (m: any) => m.period === currentPeriod
  );

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadData.indicator_id) throw new Error("Debe seleccionar un indicador.");
      if (!selectedIndicator) throw new Error("Indicador no encontrado.");
      if (!currentPeriod) throw new Error("Debe especificar el período.");

      // Validaciones robustas para el año
      if (selectedIndicator.frequency !== "Mensual") {
        if (periodUI.year.toString().length !== 4) throw new Error("El año debe tener exactamente 4 dígitos.");
        const yearNum = Number(periodUI.year);
        const thisYear = new Date().getFullYear();
        if (yearNum < 2000 || yearNum > thisYear + 1) {
          throw new Error(`El año debe ser un valor válido (entre 2000 y ${thisYear + 1}).`);
        }
      }

      const v1 = parseFloat(uploadData.v1) || 0;
      const v2 = parseFloat(uploadData.v2) || 0;
      const newResult = v2 !== 0 ? Number(((v1 / v2) * 100).toFixed(1)) : 0;

      const { error: historyError } = await supabase.from("indicator_measurements" as any).upsert([{
        indicator_id: selectedIndicator.id, 
        value: newResult, 
        period: currentPeriod, 
        comments: uploadData.obs
      }], { 
        onConflict: 'indicator_id, period' 
      });

      if (historyError) throw historyError;

      const { error: updateError } = await supabase.from("indicators" as any).update({
        current_value: newResult,
        last_update: new Date().toISOString()
      }).eq("id", selectedIndicator.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicators-with-history"] });
      queryClient.invalidateQueries({ queryKey: ["indicators"] }); 
      queryClient.invalidateQueries({ queryKey: ["processes"] }); 
      toast.success(existingMeasurement ? "Medición actualizada correctamente." : "Medición registrada correctamente.");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error("Error: " + error.message);
    }
  });

  const renderPeriodInput = () => {
    if (!selectedIndicator) {
      return <Input disabled placeholder="Seleccione un indicador de la lista para continuar" />;
    }

    switch (selectedIndicator.frequency) {
      case "Mensual":
        return (
          <Input 
            type="month" 
            value={periodUI.month} 
            onChange={(e) => setPeriodUI({...periodUI, month: e.target.value})} 
            className="w-full sm:w-[calc(50%-0.5rem)]"
          />
        );
      case "Trimestral":
        return (
          <div className="flex gap-3">
            <Select value={periodUI.quarter} onValueChange={(v) => setPeriodUI({...periodUI, quarter: v})}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1">Q1 (Ene - Mar)</SelectItem>
                <SelectItem value="Q2">Q2 (Abr - Jun)</SelectItem>
                <SelectItem value="Q3">Q3 (Jul - Sep)</SelectItem>
                <SelectItem value="Q4">Q4 (Oct - Dic)</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="number" 
              min="2000"
              max={new Date().getFullYear() + 1}
              value={periodUI.year} 
              onChange={(e) => setPeriodUI({...periodUI, year: e.target.value})} 
              className="w-32" 
            />
          </div>
        );
      case "Semestral":
        return (
          <div className="flex gap-3">
            <Select value={periodUI.semester} onValueChange={(v) => setPeriodUI({...periodUI, semester: v})}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="S1">Semestre 1 (Ene - Jun)</SelectItem>
                <SelectItem value="S2">Semestre 2 (Jul - Dic)</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="number" 
              min="2000"
              max={new Date().getFullYear() + 1}
              value={periodUI.year} 
              onChange={(e) => setPeriodUI({...periodUI, year: e.target.value})} 
              className="w-32" 
            />
          </div>
        );
      case "Anual":
        return (
          <Input 
            type="number" 
            min="2000"
            max={new Date().getFullYear() + 1}
            value={periodUI.year} 
            onChange={(e) => setPeriodUI({...periodUI, year: e.target.value})} 
            className="w-full sm:w-[calc(50%-0.5rem)]"
          />
        );
      default:
        return <Input disabled value="Desconocido" />;
    }
  };

  return (
    <div className="space-y-5 px-1 pt-2 pb-6">
      <div className="space-y-2">
        <Label>Indicador</Label>
        <Select onValueChange={(v) => setUploadData({...uploadData, indicator_id: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar indicador..." /></SelectTrigger>
          <SelectContent>
            {indicators.map((ind) => (
              <SelectItem key={ind.id} value={ind.id.toString()}>
                {ind.name} <span className="text-muted-foreground ml-1">({ind.frequency})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <div className="space-y-2">
        <Label>Período Evaluado</Label>
        {renderPeriodInput()}
      </div>

      <div className="space-y-2">
        <Label>Observaciones</Label>
        <Input 
          value={uploadData.obs} 
          onChange={(e) => setUploadData({...uploadData, obs: e.target.value})} 
          placeholder="Comentarios opcionales" 
        />
      </div>

      {existingMeasurement && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 flex gap-3 items-center shadow-sm animate-fade-in mt-2">
          <AlertTriangle className="h-6 w-6 text-warning shrink-0" />
          <p className="text-sm font-medium text-foreground leading-snug">
            Ya existe un registro para <strong>{currentPeriod}</strong> con un valor de <strong>{existingMeasurement.value}%</strong>. Si continúa, el dato será sobrescrito.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button 
          variant={existingMeasurement ? "secondary" : "default"}
          onClick={() => uploadMutation.mutate()} 
          disabled={uploadMutation.isPending || !selectedIndicator}
        >
          {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
          {uploadMutation.isPending ? "Guardando..." : (existingMeasurement ? "Sobrescribir Dato" : "Registrar Medición")}
        </Button>
      </div>
    </div>
  );
};

export default IndicatorMeasurementForm;