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
import { Loader2, AlertCircle, Zap, ShieldAlert, CalendarCheck } from "lucide-react";

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
    corrective_action_desc: "",
    corrective_action_resp: "",
    corrective_action_date: "",
    // NUEVO CAMPO: Fecha de evaluación de eficacia
    efficacy_eval_date: "",
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes" as any).select("id, name");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
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

      // 1. Insertar el Hallazgo (Incluyendo la fecha de evaluación de eficacia)
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
          efficacy_eval_date: form.efficacy_eval_date || null, // Se asigna la fecha
          detected_by: user.id,
          status: "abierto"
        }])
        .select()
        .single();

      if (fError) throw fError;

      const findingId = (finding as any).id;

      // 2. Insertar Acción Inmediata (Siempre presente)
      if (form.immediate_action_desc) {
        const { error: aError } = await supabase
          .from("finding_actions" as any)
          .insert([{
            finding_id: findingId,
            action_type: "inmediata",
            description: form.immediate_action_desc,
            responsibles: form.immediate_action_resp,
            target_date: form.immediate_action_date,
            status: "pendiente"
          }]);
        if (aError) throw aError;
      }

      // 3. Insertar Acción Correctiva (Solo NC)
      if (form.type === "no_conformidad" && form.corrective_action_desc) {
        const { error: cError } = await supabase
          .from("finding_actions" as any)
          .insert([{
            finding_id: findingId,
            action_type: "correctiva",
            description: form.corrective_action_desc,
            responsibles: form.corrective_action_resp,
            target_date: form.corrective_action_date,
            status: "pendiente"
          }]);
        if (cError) throw cError;
      }

      // 4. Actualizar contadores en Auditoría
      if (form.audit_id && form.audit_id !== "null") {
        const auditId = parseInt(form.audit_id);
        let columnToUpdate = "";
        if (form.type === "no_conformidad") columnToUpdate = "findings_nc";
        else if (form.type === "oportunidad_mejora") columnToUpdate = "findings_om";
        else if (form.type === "observacion") columnToUpdate = "findings_observations";

        if (columnToUpdate) {
            const { data: auditData } = await supabase
                .from("audits" as any)
                .select(columnToUpdate)
                .eq("id", auditId)
                .single();
            
            const currentCount = auditData ? auditData[columnToUpdate] : 0;
            
            await supabase
                .from("audits" as any)
                .update({ [columnToUpdate]: currentCount + 1 })
                .eq("id", auditId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findings"] });
      queryClient.invalidateQueries({ queryKey: ["process-content"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
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
          <Select 
            value={form.circumstance} 
            onValueChange={(v) => setForm({...form, circumstance: v, audit_id: "null"})} 
          >
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
                  <SelectItem value="null" disabled>No hay auditorías de este tipo</SelectItem>
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

      {/* ACCIÓN INMEDIATA */}
      <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-primary font-semibold text-sm uppercase">
          <Zap className="h-4 w-4" /> Acción Inmediata
        </div>
        <Textarea 
          placeholder="¿Qué se hizo o hará para mitigar el hallazgo ahora mismo?"
          value={form.immediate_action_desc}
          onChange={(e) => setForm({...form, immediate_action_desc: e.target.value})}
          className="bg-white"
        />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Responsable Acción</Label>
            <Input 
              placeholder="Nombre o área" 
              value={form.immediate_action_resp}
              onChange={(e) => setForm({...form, immediate_action_resp: e.target.value})}
              className="bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha Compromiso</Label>
            <Input 
              type="date" 
              value={form.immediate_action_date}
              onChange={(e) => setForm({...form, immediate_action_date: e.target.value})}
              className="bg-white"
            />
          </div>
        </div>
      </div>

      {/* BLOQUE NO CONFORMIDAD */}
      {isNC && (
        <div className="space-y-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm uppercase border-b border-destructive/20 pb-2">
            <ShieldAlert className="h-4 w-4" /> Tratamiento de No Conformidad
          </div>
          
          <div className="space-y-2">
            <Label className="text-destructive font-medium">Análisis de Causa Raíz</Label>
            <Textarea 
              placeholder="¿Por qué sucedió?"
              value={form.root_cause_analysis}
              onChange={(e) => setForm({...form, root_cause_analysis: e.target.value})}
              className="bg-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-destructive font-medium">Acción Correctiva</Label>
            <Textarea 
              placeholder="Plan de acción para eliminar la causa raíz..."
              value={form.corrective_action_desc}
              onChange={(e) => setForm({...form, corrective_action_desc: e.target.value})}
              className="bg-white"
            />
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Responsable AC</Label>
                <Input 
                  placeholder="Nombre o área" 
                  value={form.corrective_action_resp}
                  onChange={(e) => setForm({...form, corrective_action_resp: e.target.value})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Compromiso AC</Label>
                <Input 
                  type="date" 
                  value={form.corrective_action_date}
                  onChange={(e) => setForm({...form, corrective_action_date: e.target.value})}
                  className="bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NUEVO BLOQUE: FECHA DE EVALUACIÓN DE EFICACIA */}
      <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm uppercase">
          <CalendarCheck className="h-4 w-4" /> Planificación de Cierre
        </div>
        <div className="space-y-2">
          <Label>Fecha programada para evaluar eficacia</Label>
          <Input 
            type="date" 
            value={form.efficacy_eval_date}
            onChange={(e) => setForm({...form, efficacy_eval_date: e.target.value})}
            className="bg-white"
          />
          <p className="text-xs text-muted-foreground">
            Fecha en la que se verificará si las acciones tomadas resolvieron el hallazgo definitivamente.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button 
          className="bg-primary hover:bg-primary-dark" 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !form.process_id || !form.description || !form.efficacy_eval_date || (isAudit && form.audit_id === "null")}
        >
          {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Registrar Hallazgo"}
        </Button>
      </div>
    </div>
  );
};

export default FindingForm;