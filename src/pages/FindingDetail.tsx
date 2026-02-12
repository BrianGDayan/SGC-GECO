import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft, Calendar, User, MapPin, CheckCircle, Clock, AlertTriangle, 
  Plus, Save, ShieldCheck, FileText 
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
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [rootCause, setRootCause] = useState("");
  const [efficacyData, setEfficacyData] = useState({ date: "", result: "no", comments: "" });
  
  // Estado para nueva acción
  const [newAction, setNewAction] = useState({ type: "correctiva", desc: "", resp: "", date: "" });

  // 1. OBTENER DATOS DEL HALLAZGO Y SUS ACCIONES
  const { data: finding, isLoading } = useQuery({
    queryKey: ["finding", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("findings" as any)
        .select(`
          *,
          processes (name),
          finding_actions (*)
        `)
        .eq("id", id)
        .single();
      
      if (error) throw error;
      
      // SOLUCIÓN DEL ERROR: Forzamos el tipo aquí
      return data as any;
    },
  });

  // Determinar si es No Conformidad y si está abierto
  const isNC = finding?.type === "no_conformidad";
  const isOpen = finding?.status === "abierto";

  // MUTATION: ACTUALIZAR ANÁLISIS DE CAUSA
  const updateRootCauseMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("findings" as any).update({ root_cause_analysis: rootCause }).eq("id", id);
    },
    onSuccess: () => toast.success("Análisis de causa actualizado")
  });

  // MUTATION: AGREGAR ACCIÓN
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finding", id] });
      setIsActionModalOpen(false);
      setNewAction({ type: "correctiva", desc: "", resp: "", date: "" });
      toast.success("Acción agregada");
    }
  });

  // MUTATION: COMPLETAR ACCIÓN
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

  // MUTATION: CERRAR HALLAZGO (EVALUAR EFICACIA)
  const closeFindingMutation = useMutation({
    mutationFn: async () => {
      // Si es NC y eficacia es NO, no se cierra
      if (isNC && efficacyData.result === "no") {
         throw new Error("Si no es eficaz, debe agregar nuevas acciones correctivas.");
      }
      
      await supabase.from("findings" as any).update({ 
        status: "cerrado",
        efficacy_eval_date: efficacyData.date,
        is_efficacious: isNC ? (efficacyData.result === "si") : null
      }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finding", id] });
      toast.success("Hallazgo cerrado exitosamente");
    },
    onError: (e) => toast.error(e.message)
  });

  if (isLoading) return <MainLayout title="Cargando..."><div className="p-8">Cargando expediente...</div></MainLayout>;
  
  if (!finding) return <MainLayout title="Error"><div className="p-8">Hallazgo no encontrado.</div></MainLayout>;

  // Separar acciones (Aseguramos que sea array para evitar errores si viene null)
  const actions = finding.finding_actions || [];
  const immediateActions = actions.filter((a: any) => a.action_type === "inmediata");
  const correctiveActions = actions.filter((a: any) => a.action_type === "correctiva");
  const allActionsClosed = actions.length > 0 && actions.every((a: any) => a.status === "finalizado");

  return (
    <MainLayout 
      title={`Expediente #${finding.id}`} 
      subtitle={`Gestión de ${finding.type?.replace(/_/g, " ")}`}
    >
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        
        {/* COLUMNA IZQUIERDA: DETALLES Y ANÁLISIS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TARJETA PRINCIPAL: EL HALLAZGO */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b p-6 flex justify-between items-start">
              <div>
                <Badge className={cn("mb-2 uppercase", findingTypeStyles[finding.type as keyof typeof findingTypeStyles])}>
                  {finding.type?.replace(/_/g, " ")}
                </Badge>
                <h2 className="text-xl font-bold text-foreground">Detalle del Evento</h2>
              </div>
              <Badge variant={finding.status === "abierto" ? "destructive" : "default"}>
                {finding.status?.toUpperCase()}
              </Badge>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Proceso Origen</p>
                  <p className="font-medium">{finding.processes?.name || "General"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Circunstancia</p>
                  <p className="font-medium capitalize">{finding.circumstance?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Detectado por</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>Usuario ID: {finding.detected_by?.slice(0, 8)}...</span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha Detección</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(finding.detection_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground font-semibold mb-1">Descripción de la Evidencia:</p>
                <p className="text-sm leading-relaxed">{finding.description}</p>
              </div>
            </div>
          </div>

          {/* SECCIÓN: ANÁLISIS DE CAUSA (SOLO NC) */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b p-4 flex items-center gap-2 bg-muted/20">
              <AlertTriangle className={cn("h-5 w-5", isNC ? "text-destructive" : "text-muted-foreground")} />
              <h3 className="font-semibold text-sm">Análisis de Causa Raíz</h3>
            </div>
            <div className="p-6">
              {isNC ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Utilice metodologías como 5 Porqués o Ishikawa para determinar la causa raíz.
                  </p>
                  {isOpen ? (
                    <>
                      <Textarea 
                        placeholder="Describa el análisis de causa..." 
                        defaultValue={finding.root_cause_analysis || ""}
                        onChange={(e) => setRootCause(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex justify-end">
                        <Button size="sm" variant="outline" onClick={() => updateRootCauseMutation.mutate()}>
                          <Save className="h-4 w-4 mr-2" /> Guardar Análisis
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm italic p-3 bg-muted rounded">{finding.root_cause_analysis || "Sin análisis registrado."}</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground opacity-60">
                  <ShieldCheck className="h-10 w-10 mb-2" />
                  <p className="text-sm font-medium">No Aplica</p>
                  <p className="text-xs">Observaciones y Oportunidades de Mejora no requieren Análisis de Causa.</p>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN: ACCIONES CORRECTIVAS (SOLO NC) */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b p-4 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-sm">Plan de Acción Correctiva</h3>
              </div>
              {isNC && isOpen && (
                <Button size="sm" variant="outline" onClick={() => { setNewAction({...newAction, type: "correctiva"}); setIsActionModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" /> Agregar Acción
                </Button>
              )}
            </div>
            <div className="p-0">
              {isNC ? (
                <div className="divide-y">
                  {correctiveActions.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">No hay acciones correctivas definidas.</p>
                  ) : (
                    correctiveActions.map((action: any) => (
                      <div key={action.id} className="p-4 flex items-start justify-between hover:bg-muted/10 transition-colors">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{action.description}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {action.responsibles}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Vence: {action.target_date}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {action.status === "pendiente" ? (
                             isOpen && <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10" onClick={() => completeActionMutation.mutate(action.id)}>Marcar Listo</Button>
                          ) : (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                              <CheckCircle className="h-3 w-3" /> Completado
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-60">
                  <p className="text-sm font-medium">No Aplica</p>
                  <p className="text-xs">No se requieren acciones correctivas complejas.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ESTADO Y ACCIONES INMEDIATAS */}
        <div className="space-y-6">
          
          {/* ACCIONES INMEDIATAS (CORRECCIÓN) */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b p-4 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Corrección Inmediata</h3>
              {isOpen && <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setNewAction({...newAction, type: "inmediata"}); setIsActionModalOpen(true); }}><Plus className="h-4 w-4" /></Button>}
            </div>
            <div className="p-4 space-y-4">
              {immediateActions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center italic">Sin acciones inmediatas.</p>
              ) : (
                immediateActions.map((action: any) => (
                  <div key={action.id} className="rounded border p-3 text-sm bg-muted/10">
                    <p className="mb-2">{action.description}</p>
                    <div className="flex justify-between items-center mt-2">
                       <span className="text-xs text-muted-foreground">{action.responsibles}</span>
                       {action.status === "pendiente" ? (
                         isOpen && <Button size="icon" variant="ghost" className="h-6 w-6 text-primary" onClick={() => completeActionMutation.mutate(action.id)}><CheckCircle className="h-4 w-4" /></Button>
                       ) : (
                         <CheckCircle className="h-4 w-4 text-success" />
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CIERRE Y EFICACIA */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 bg-primary/5 border-b border-primary/10">
              <h3 className="font-semibold text-sm text-primary">Cierre del Hallazgo</h3>
            </div>
            <div className="p-6 space-y-4">
              {isOpen ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Para cerrar el hallazgo, todas las acciones deben estar finalizadas.</p>
                    {isNC && <p className="text-xs text-destructive font-semibold">Requiere evaluación de eficacia.</p>}
                  </div>

                  {allActionsClosed ? (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Fecha Evaluación</label>
                        <Input type="date" onChange={(e) => setEfficacyData({...efficacyData, date: e.target.value})} />
                      </div>
                      
                      {isNC && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium">¿Fue Eficaz?</label>
                          <Select onValueChange={(v) => setEfficacyData({...efficacyData, result: v})}>
                            <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="si">SI - Cerrar Hallazgo</SelectItem>
                              <SelectItem value="no">NO - Requiere nueva acción</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button 
                        className="w-full" 
                        variant={efficacyData.result === "no" ? "outline" : "default"}
                        onClick={() => closeFindingMutation.mutate()}
                        disabled={!efficacyData.date || (isNC && !efficacyData.result)}
                      >
                        {efficacyData.result === "no" ? "Registrar Intento Fallido" : "Cerrar Hallazgo"}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded bg-warning/10 p-3 flex gap-2 items-start">
                      <Clock className="h-4 w-4 text-warning mt-0.5" />
                      <p className="text-xs text-warning-foreground">Hay acciones pendientes. Complételas para habilitar el cierre.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="mx-auto h-12 w-12 bg-success/10 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle className="h-6 w-6 text-success" />
                  </div>
                  <h4 className="font-bold text-success">Cerrado</h4>
                  {finding.is_efficacious && <p className="text-xs text-muted-foreground mt-1">Evaluado como Eficaz el {finding.efficacy_eval_date}</p>}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL PARA AGREGAR ACCIÓN */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Acción {newAction.type === 'inmediata' ? 'Inmediata' : 'Correctiva'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea placeholder="Qué se va a hacer..." onChange={(e) => setNewAction({...newAction, desc: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-sm font-medium">Responsable</label>
                 <Input placeholder="Quién..." onChange={(e) => setNewAction({...newAction, resp: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-sm font-medium">Fecha Límite</label>
                 <Input type="date" onChange={(e) => setNewAction({...newAction, date: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => addActionMutation.mutate()} disabled={addActionMutation.isPending}>Guardar Acción</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
};

export default FindingDetail;