import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
// IMPORTAMOS EL HOOK DE ROLES
import { useAuth } from "@/hooks/useAuth"; 
import { 
  ArrowLeft, Calendar, User, MapPin, CheckCircle, Clock, AlertTriangle, 
  Plus, Save, ShieldCheck, FileText, History, XCircle, ChevronDown, ChevronRight
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const findingTypeStyles = {
  no_conformidad: "bg-destructive/10 text-destructive border-destructive/20",
  observacion: "bg-warning/10 text-warning border-warning/20",
  oportunidad_mejora: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const FindingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // TRAEMOS ROLES Y PERMISOS
  const { isAdmin, isAuditor, canManageProcess } = useAuth();

  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [rootCause, setRootCause] = useState("");
  
  const [efficacyData, setEfficacyData] = useState({ date: "", result: "", comments: "" });
  
  const [newAction, setNewAction] = useState({ type: "correctiva", desc: "", resp: "", date: "", newEvalDate: "" });

  const [expandedEval, setExpandedEval] = useState<number | null>(null);

  const { data: finding, isLoading } = useQuery({
    queryKey: ["finding", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("findings" as any)
        .select(`
          *,
          finding_actions (*),
          finding_evaluations (*)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;

      const findingData = data as any;

      if (findingData.process_id) {
        // CORRECCIÓN PARA PERMISOS: Traemos también manager_ids
        const { data: processData } = await supabase
          .from("processes" as any)
          .select("name, manager_ids") 
          .eq("id", findingData.process_id)
          .single();
        
        if (processData) {
          findingData.processes = processData;
        }
      }

      return findingData;
    },
  });

  useEffect(() => {
    if (finding?.efficacy_eval_date) {
      setEfficacyData(prev => ({ ...prev, date: finding.efficacy_eval_date }));
    }
  }, [finding?.efficacy_eval_date]);

  const isNC = finding?.type === "no_conformidad";
  const isOpen = finding?.status === "abierto";

  // LÓGICA DE PERMISOS:
  // 1. ¿Puede gestionar el plan de acción? (Admin o Dueño del proceso)
  const canManageActions = canManageProcess(finding?.processes?.manager_ids);
  // 2. ¿Puede evaluar la eficacia y cerrar? (Admin o Auditor)
  const canEvaluate = isAdmin || isAuditor;

  const updateRootCauseMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("findings" as any).update({ root_cause_analysis: rootCause }).eq("id", id);
    },
    onSuccess: () => toast.success("Análisis de causa actualizado")
  });

  const addActionMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("finding_actions" as any).insert([{
        finding_id: id,
        action_type: newAction.type,
        description: newAction.desc,
        responsibles: newAction.resp,
        target_date: newAction.date,
        status: "pendiente"
      }]);

      if (newAction.newEvalDate) {
        await supabase.from("findings" as any).update({ efficacy_eval_date: newAction.newEvalDate }).eq("id", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finding", id] });
      setIsActionModalOpen(false);
      setNewAction({ type: "correctiva", desc: "", resp: "", date: "", newEvalDate: "" });
      toast.success("Acción agregada y fecha de evaluación actualizada");
    }
  });

  const completeActionMutation = useMutation({
    mutationFn: async (actionId: number) => {
      await supabase.from("finding_actions" as any)
        .update({ status: "finalizado", completion_date: new Date().toISOString() })
        .eq("id", actionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finding", id] });
      toast.success("Acción marcada como completada");
    }
  });

  const evaluateFindingMutation = useMutation({
    mutationFn: async () => {
      const isEffective = efficacyData.result === "si";

      await supabase.from("finding_evaluations" as any).insert([{
        finding_id: id,
        evaluation_date: efficacyData.date,
        is_effective: isEffective,
        comments: efficacyData.comments
      }]);

      if (isEffective) {
        await supabase.from("findings" as any).update({ 
          status: "cerrado",
          efficacy_eval_date: efficacyData.date,
          is_efficacious: true
        }).eq("id", id);
      } else {
        await supabase.from("findings" as any).update({ 
          is_efficacious: false,
        }).eq("id", id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finding", id] });
      if (efficacyData.result === "si") {
        toast.success("Hallazgo cerrado exitosamente");
      } else {
        toast.warning("Evaluación registrada como NO EFICAZ. Se requiere agregar una nueva acción.");
        setEfficacyData({ date: "", result: "", comments: "" });
      }
    },
    onError: (e) => toast.error("Error: " + e.message)
  });

  if (isLoading) return <MainLayout title="Cargando..."><div className="p-8">Cargando expediente...</div></MainLayout>;
  if (!finding) return <MainLayout title="Error"><div className="p-8">Hallazgo no encontrado.</div></MainLayout>;

  const actions = finding.finding_actions || [];
  const evaluations = finding.finding_evaluations || [];
  const immediateActions = actions.filter((a: any) => a.action_type === "inmediata");
  const correctiveActions = actions.filter((a: any) => a.action_type === "correctiva");
  const allActionsClosed = actions.length > 0 && actions.every((a: any) => a.status === "finalizado");

  return (
    <MainLayout 
      title={`Expediente #${finding.id}`} 
      subtitle={`Gestión de ${finding.type?.replace(/_/g, " ")}`}
    >
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:pl-2 text-base transition-all text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-5 w-5" /> Volver
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b p-6 flex justify-between items-start">
              <div>
                <Badge className={cn("mb-2 uppercase text-xs font-bold", findingTypeStyles[finding.type as keyof typeof findingTypeStyles])}>
                  {finding.type?.replace(/_/g, " ")}
                </Badge>
                <h2 className="text-xl font-bold text-foreground">Detalle del Evento</h2>
              </div>
              <Badge className="text-sm px-3 py-1" variant={finding.status === "abierto" ? "destructive" : "default"}>
                {finding.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Proceso Origen</p>
                  <p className="font-semibold text-base text-foreground">{finding.processes?.name || "General"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Origen</p>
                  <p className="font-semibold text-base text-foreground capitalize">{finding.circumstance?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Fecha Detección</p>
                  <div className="flex items-center gap-2 font-semibold text-base text-foreground">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span>{new Date(finding.detection_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 p-5 rounded-lg border">
                <p className="text-sm text-muted-foreground font-semibold mb-2">Descripción de la Evidencia:</p>
                <p className="text-base leading-relaxed text-foreground">{finding.description}</p>
              </div>
            </div>
          </div>

          {/* ANÁLISIS DE CAUSA (Solo NC) */}
          {isNC && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b p-5 flex items-center gap-3 bg-muted/20">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h3 className="font-bold text-lg text-foreground">Análisis de Causa Raíz</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Detalle la causa que originó la no conformidad.</p>
                  {/* PROTECCIÓN: Solo el dueño del proceso puede editar el análisis */}
                  {isOpen && canManageActions ? (
                    <>
                      <Textarea 
                        placeholder="Describa el análisis de causa..." 
                        defaultValue={finding.root_cause_analysis || ""}
                        onChange={(e) => setRootCause(e.target.value)}
                        className="min-h-[120px] text-base"
                      />
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={() => updateRootCauseMutation.mutate()}>
                          <Save className="h-4 w-4 mr-2" /> Guardar Análisis
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-base italic p-4 bg-muted rounded-md">{finding.root_cause_analysis || "Sin análisis registrado."}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ACCIONES CORRECTIVAS (Solo NC) */}
          {isNC && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b p-5 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">Plan de Acción Correctiva</h3>
                </div>
                {/* PROTECCIÓN: Solo el dueño del proceso puede agregar acciones */}
                {isOpen && canManageActions && (
                  <Button variant="outline" onClick={() => { setNewAction({...newAction, type: "correctiva", newEvalDate: finding.efficacy_eval_date || ""}); setIsActionModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> Agregar Acción
                  </Button>
                )}
              </div>
              <div className="divide-y">
                {correctiveActions.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No hay acciones correctivas definidas.</p>
                ) : (
                  correctiveActions.map((action: any) => (
                    <div key={action.id} className="p-5 flex items-start justify-between hover:bg-muted/10 transition-colors">
                      <div className="space-y-2">
                        <p className="text-base font-medium text-foreground">{action.description}</p>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><User className="h-4 w-4" /> {action.responsibles}</span>
                          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> Vence: {new Date(action.target_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {action.status === "pendiente" ? (
                           // PROTECCIÓN: Solo el dueño puede marcar listo
                           isOpen && canManageActions && <Button variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => completeActionMutation.mutate(action.id)}>Marcar Listo</Button>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1.5 px-3 py-1 text-sm"><CheckCircle className="h-4 w-4" /> Completado</Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-6">
          
          {/* ACCIONES INMEDIATAS */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b p-5 flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">Acción Inmediata</h3>
              {/* PROTECCIÓN: Solo el dueño puede agregar inmediatas */}
              {isOpen && !isNC && canManageActions && (
                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { setNewAction({...newAction, type: "inmediata", newEvalDate: finding.efficacy_eval_date || ""}); setIsActionModalOpen(true); }}>
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>
            <div className="p-5 space-y-4">
              {immediateActions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center italic">Sin acciones inmediatas.</p>
              ) : (
                immediateActions.map((action: any) => (
                  <div key={action.id} className="rounded-lg border border-border/50 p-4 text-sm bg-muted/10 shadow-sm">
                    <p className="mb-3 text-sm font-medium text-foreground">{action.description}</p>
                    <div className="flex justify-between items-center mt-2 border-t border-border/50 pt-3">
                       <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1"><User className="h-3 w-3"/> {action.responsibles}</span>
                       {action.status === "pendiente" ? (
                         // PROTECCIÓN: Solo el dueño puede marcar listo
                         isOpen && canManageActions && <Button size="sm" variant="outline" className="text-primary h-8 hover:bg-primary/10" onClick={() => completeActionMutation.mutate(action.id)}><CheckCircle className="h-4 w-4 mr-2" /> Listo</Button>
                       ) : <CheckCircle className="h-5 w-5 text-success" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* HISTORIAL DE EVALUACIONES */}
          {evaluations.length > 0 && (
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b p-5 bg-muted/20">
                <h3 className="font-bold text-base text-foreground">Historial de Evaluaciones</h3>
              </div>
              <div className="divide-y divide-border">
                {[...evaluations].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((evalItem: any) => {
                  
                  const associatedAction = actions
                    .slice()
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .find((a: any) => new Date(a.created_at) < new Date(evalItem.created_at));

                  const isExpanded = expandedEval === evalItem.id;

                  return (
                    <div key={evalItem.id} className="flex flex-col">
                      <div 
                        className="p-4 hover:bg-muted/10 cursor-pointer flex flex-col gap-2 transition-colors"
                        onClick={() => setExpandedEval(isExpanded ? null : evalItem.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                            <span className="text-sm font-semibold text-foreground">{new Date(evalItem.evaluation_date).toLocaleDateString()}</span>
                          </div>
                          <Badge variant={evalItem.is_effective ? "default" : "destructive"} className={cn("text-xs px-2 py-0.5", evalItem.is_effective ? "bg-success hover:bg-success" : "")}>
                            {evalItem.is_effective ? "EFICAZ" : "NO EFICAZ"}
                          </Badge>
                        </div>
                        {evalItem.comments && <p className="text-sm italic text-muted-foreground pl-7">"{evalItem.comments}"</p>}
                      </div>
                      
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3 bg-muted/5 border-t border-border/50 animate-fade-in">
                          {associatedAction ? (
                            <div className="pl-7 space-y-1.5">
                              <p className="text-xs font-bold text-primary uppercase tracking-wider">
                                Acción Evaluada ({associatedAction.action_type})
                              </p>
                              <p className="text-sm text-foreground">{associatedAction.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground font-semibold uppercase">{associatedAction.responsibles}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="pl-7">
                              <p className="text-sm text-muted-foreground italic">No se encontró una acción previa registrada.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CIERRE Y EFICACIA */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-5 bg-primary/5 border-b border-primary/10">
              <h3 className="font-bold text-lg text-primary">Evaluación de Eficacia</h3>
            </div>
            <div className="p-6 space-y-5">
              {isOpen ? (
                <>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Fecha programada original: <strong className="text-foreground">{finding.efficacy_eval_date ? new Date(finding.efficacy_eval_date).toLocaleDateString() : 'No definida'}</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">Para evaluar eficacia, todas las acciones deben estar finalizadas.</p>
                  </div>

                  {allActionsClosed ? (
                    // PROTECCIÓN: Solo Admins o Auditores pueden cerrar un hallazgo
                    canEvaluate ? (
                        <div className="space-y-5 pt-5 border-t border-border">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Fecha de Evaluación Final</label>
                            <Input className="text-sm" type="date" value={efficacyData.date} onChange={(e) => setEfficacyData({...efficacyData, date: e.target.value})} />
                          </div>
                          
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Resultado</label>
                            <Select onValueChange={(v) => setEfficacyData({...efficacyData, result: v})}>
                              <SelectTrigger className="text-sm"><SelectValue placeholder="¿Fue eficaz?" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="si">SI - Cerrar Hallazgo</SelectItem>
                                <SelectItem value="no">NO - Requiere nueva acción</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Comentarios</label>
                            <Textarea 
                              className="h-24 text-sm" 
                              placeholder="Justificación del resultado..."
                              onChange={(e) => setEfficacyData({...efficacyData, comments: e.target.value})} 
                            />
                          </div>

                          <Button 
                            className="w-full text-base h-11" 
                            variant={efficacyData.result === "no" ? "destructive" : "default"}
                            onClick={() => evaluateFindingMutation.mutate()}
                            disabled={!efficacyData.date || !efficacyData.result}
                          >
                            {efficacyData.result === "no" ? "Registrar Fallo y Continuar" : "Cerrar Hallazgo"}
                          </Button>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex gap-3 items-center shadow-sm">
                          <ShieldCheck className="h-6 w-6 text-primary shrink-0" />
                          <p className="text-sm text-foreground leading-snug">
                            Las acciones están listas. Un Auditor o el Responsable de Calidad debe evaluar la eficacia para cerrar el hallazgo.
                          </p>
                        </div>
                    )
                  ) : (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 flex gap-3 items-center shadow-sm">
                      <Clock className="h-6 w-6 text-warning shrink-0" />
                      <p className="text-sm font-medium text-foreground leading-snug">
                        Hay acciones pendientes. Complételas para habilitar la evaluación de eficacia.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                  <h4 className="text-xl font-bold text-success">Cerrado</h4>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">Evaluado Eficazmente el {new Date(finding.efficacy_eval_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Agregar Acción {newAction.type === 'inmediata' ? 'Inmediata' : 'Correctiva'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Descripción</label>
              <Textarea className="text-sm" placeholder="Qué se va a hacer..." onChange={(e) => setNewAction({...newAction, desc: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-semibold text-foreground">Responsable</label>
                 <Input className="text-sm" placeholder="Quién..." onChange={(e) => setNewAction({...newAction, resp: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-semibold text-foreground">Fecha Límite</label>
                 <Input className="text-sm" type="date" onChange={(e) => setNewAction({...newAction, date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2 mt-4 pt-5 border-t border-border">
              <label className="text-sm font-bold text-primary">Reprogramar Fecha de Evaluación de Eficacia</label>
              <Input className="text-sm" type="date" value={newAction.newEvalDate} onChange={(e) => setNewAction({...newAction, newEvalDate: e.target.value})} />
              <p className="text-xs text-muted-foreground mt-1 font-medium">Nueva fecha para verificar si esta acción dio resultado.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addActionMutation.mutate()} disabled={addActionMutation.isPending || !newAction.desc || !newAction.newEvalDate}>
              Guardar Acción
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
};

export default FindingDetail;