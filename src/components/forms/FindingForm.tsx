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
import { Loader2, AlertCircle } from "lucide-react";

interface FindingFormProps {
  onSuccess: () => void;
}

const FindingForm = ({ onSuccess }: FindingFormProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    process_id: "",
    audit_id: "null",
    circumstance: "relevamiento_interno",
    type: "observacion",
    detection_date: new Date().toISOString().split('T')[0],
    description: "",
    root_cause_analysis: "",
    immediate_action_desc: "",
    immediate_action_resp: "",
    immediate_action_date: "",
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes" as any).select("id, name");
      return data || [];
    }
  });

  const { data: audits = [] } = useQuery({
    queryKey: ["audits-list"],
    queryFn: async () => {
      const { data } = await supabase.from("audits" as any).select("id, title, type").order('scheduled_date', { ascending: false });
      return data || [];
    }
  });

  const filteredAudits = audits.filter((a: any) => {
    if (form.circumstance === 'auditoria_externa') return a.type === 'externa';
    if (form.circumstance === 'auditoria_interna') return a.type === 'interna';
    return false;
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No autenticado");

      // 1. Insertar el Hallazgo
      const { data: finding, error: fError } = await supabase
        .from("findings" as any)
        .insert([{
          process: parseInt(form.process_id), 
          audit_id: form.audit_id === "null" ? null : parseInt(form.audit_id),
          circumstance: form.circumstance,
          type: form.type,
          detection_date: form.detection_date,
          description: form.description,
          root_cause_analysis: form.type === "no_conformidad" ? form.root_cause_analysis : null,
          detected_by: user.id,
          status: "abierto"
        }])
        .select()
        .single();

      if (fError) throw fError;

      // 2. ACTUALIZAR CONTADORES EN LA AUDITORÍA
      // Esto es crucial porque eliminamos el cálculo pesado en el frontend
      if (form.audit_id && form.audit_id !== "null") {
        const auditId = parseInt(form.audit_id);
        
        let columnToUpdate = "";
        if (form.type === "no_conformidad") columnToUpdate = "findings_nc";
        else if (form.type === "oportunidad_mejora") columnToUpdate = "findings_om";
        else if (form.type === "observacion") columnToUpdate = "findings_observations";

        if (columnToUpdate) {
            // Obtener valor actual
            const { data: auditData } = await supabase
                .from("audits" as any)
                .select(columnToUpdate)
                .eq("id", auditId)
                .single();
            
            const currentCount = auditData ? auditData[columnToUpdate] : 0;
            
            // Incrementar
            await supabase
                .from("audits" as any)
                .update({ [columnToUpdate]: currentCount + 1 })
                .eq("id", auditId);
        }
      }

      // 3. Acción Inmediata
      if (form.immediate_action_desc) {
        const { error: aError } = await supabase
          .from("finding_actions" as any)
          .insert([{
            finding_id: (finding as any).id,
            action_type: "inmediata",
            description: form.immediate_action_desc,
            responsibles: form.immediate_action_resp,
            target_date: form.immediate_action_date,
            status: "pendiente"
          }]);
        if (aError) throw aError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      toast.success("Hallazgo registrado correctamente");
      onSuccess();
    },
    onError: (error: any) => toast.error("Error: " + error.message)
  });

  const isNC = form.type === "no_conformidad";
  const isAudit = form.circumstance !== "relevamiento_interno";

  return (
    <div className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Circunstancia</Label>
          <Select value={form.circumstance} onValueChange={(v) => setForm({...form, circumstance: v, audit_id: "null"})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="relevamiento_interno">Relevamiento Interno</SelectItem>
              <SelectItem value="auditoria_interna">Auditoría Interna</SelectItem>
              <SelectItem value="auditoria_externa">Auditoría Externa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Tipo de Hallazgo</Label>
          <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no_conformidad">No Conformidad</SelectItem>
              <SelectItem value="observacion">Observación</SelectItem>
              <SelectItem value="oportunidad_mejora">Oportunidad de Mejora</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Proceso Afectado</Label>
          <Select value={form.process_id} onValueChange={(v) => setForm({...form, process_id: v})}>
            <SelectTrigger><SelectValue placeholder="Seleccionar proceso" /></SelectTrigger>
            <SelectContent>
              {processes.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        
        {isAudit && (
          <div className="space-y-2">
            <Label>Vincular Auditoría</Label>
            <Select value={form.audit_id} onValueChange={(v) => setForm({...form, audit_id: v})}>
              <SelectTrigger><SelectValue placeholder="Seleccionar auditoría" /></SelectTrigger>
              <SelectContent>
                {filteredAudits.length === 0 ? (
                  <SelectItem value="null" disabled>No hay auditorías disponibles</SelectItem>
                ) : (
                  filteredAudits.map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.title}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Descripción del Hallazgo</Label>
        <Textarea 
          placeholder="Describa la evidencia detectada..." 
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
        />
      </div>

      {isNC && (
        <div className="space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm uppercase">
            <AlertCircle className="h-4 w-4" /> Análisis de Causa Raíz
          </div>
          <Textarea 
            placeholder="¿Por qué sucedió?"
            value={form.root_cause_analysis}
            onChange={(e) => setForm({...form, root_cause_analysis: e.target.value})}
            className="bg-white"
          />
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Label className="text-primary font-semibold uppercase text-xs">Acción Inmediata</Label>
        <Textarea 
          placeholder="¿Qué se hizo para mitigar?"
          value={form.immediate_action_desc}
          onChange={(e) => setForm({...form, immediate_action_desc: e.target.value})}
          className="bg-white"
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Responsable</Label>
            <Input 
              value={form.immediate_action_resp}
              onChange={(e) => setForm({...form, immediate_action_resp: e.target.value})}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input 
              type="date" 
              value={form.immediate_action_date}
              onChange={(e) => setForm({...form, immediate_action_date: e.target.value})}
              className="bg-white"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button 
          className="bg-primary hover:bg-primary-dark" 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.process_id || !form.description || (isAudit && form.audit_id === "null")}
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registrar Hallazgo"}
        </Button>
      </div>
    </div>
  );
};

export default FindingForm;