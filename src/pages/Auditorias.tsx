import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, Clock, Calendar, User, FileText, Plus, ChevronRight, 
  ArrowLeft, ShieldCheck, Info, Loader2, AlertTriangle
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const statusStyles = {
  completada: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: CheckCircle },
  "en curso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", icon: Clock },
  programada: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", icon: Calendar },
};

const Auditorias = () => {
  const queryClient = useQueryClient();
  const { isEditor, user } = useAuth();
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);

  // Estados de formularios con campos completos
  const [auditForm, setAuditForm] = useState({ 
    title: "", 
    scheduled_date: "", 
    auditor: "", 
    type: "interna", 
    scope: "", 
    progress: "0" 
  });
  
  const [findingForm, setFindingForm] = useState({ 
    type: "menor", 
    description: "", 
    process: "", 
    status: "abierto" 
  });

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audits" as any).select("*").order("scheduled_date", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["findings", selectedAudit?.id],
    queryFn: async () => {
      if (!selectedAudit) return [];
      const { data, error } = await supabase.from("audit_findings" as any).select("*").eq("audit_id", selectedAudit.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAudit
  });

  const saveAudit = useMutation({
    mutationFn: async () => {
      const progressNum = parseInt(auditForm.progress) || 0;
      const payload = { 
        ...auditForm, 
        scope: auditForm.scope.split(",").map(s => s.trim()), 
        progress: progressNum,
        status: progressNum === 100 ? "completada" : progressNum > 0 ? "en curso" : "programada",
        created_by: user?.id // Vinculación para integridad relacional
      };
      
      const { error } = await supabase.from("audits" as any).insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      setIsAuditModalOpen(false);
      setAuditForm({ title: "", scheduled_date: "", auditor: "", type: "interna", scope: "", progress: "0" });
      toast.success("Auditoría programada correctamente");
    },
    onError: (error: any) => {
      toast.error("Error al programar: " + error.message);
    }
  });
  
  const saveFinding = useMutation({
    mutationFn: async () => {
      await supabase.from("audit_findings" as any).insert([{ ...findingForm, audit_id: selectedAudit.id }]);
      const countKey = findingForm.type === 'mayor' ? 'findings_major' : findingForm.type === 'menor' ? 'findings_minor' : 'findings_observations';
      await (supabase.rpc as any)('increment_audit_finding', { audit_id: selectedAudit.id, field_name: countKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["findings", selectedAudit?.id] });
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      setIsFindingModalOpen(false);
      setFindingForm({ type: "menor", description: "", process: "", status: "abierto" });
      toast.success("Hallazgo registrado");
    }
  });

  if (selectedAudit) {
    return (
      <MainLayout title={selectedAudit.title} subtitle={`Detalle de auditoría ${selectedAudit.type}`}>
        <Button variant="ghost" onClick={() => setSelectedAudit(null)} className="mb-6 gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver al listado
        </Button>

        {/* Audit Header Info */}
        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label className="text-xs uppercase text-muted-foreground">Información General</Label>
              <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" /><span className="text-sm">{selectedAudit.scheduled_date}</span></div>
              <div className="flex items-center gap-3"><User className="h-5 w-5 text-primary" /><span className="text-sm">{selectedAudit.auditor}</span></div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs uppercase text-muted-foreground">Alcance</Label>
              <div className="flex flex-wrap gap-2">
                {selectedAudit.scope?.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-xs uppercase text-muted-foreground">Progreso de Auditoría</Label>
              <div className="flex items-center gap-4">
                <Progress value={selectedAudit.progress} className="h-2 flex-1" />
                <span className="text-sm font-bold">{selectedAudit.progress}%</span>
              </div>
              <Badge className={cn("mt-2 uppercase", statusStyles[selectedAudit.status as keyof typeof statusStyles]?.bg, statusStyles[selectedAudit.status as keyof typeof statusStyles]?.text)}>
                {selectedAudit.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" /> Hallazgos registrados
          </h2>
          {isEditor && (
            <Button onClick={() => setIsFindingModalOpen(true)} className="gap-2 bg-primary">
              <Plus className="h-4 w-4" /> Agregar Hallazgo
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {findings.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:border-primary/30 transition-all">
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-full", f.type === 'mayor' ? "bg-destructive/10 text-destructive" : f.type === 'menor' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}>
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm uppercase">{f.type}</span>
                    <span className="text-xs text-muted-foreground">• {f.process}</span>
                  </div>
                  <p className="text-sm text-foreground">{f.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="uppercase">{f.status}</Badge>
            </div>
          ))}
        </div>

        <Dialog open={isFindingModalOpen} onOpenChange={setIsFindingModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Hallazgo</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de Hallazgo</Label>
                <Select value={findingForm.type} onValueChange={(v) => setFindingForm({...findingForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mayor">No Conformidad Mayor</SelectItem>
                    <SelectItem value="menor">No Conformidad Menor</SelectItem>
                    <SelectItem value="observación">Observación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Proceso Afectado</Label><Input value={findingForm.process} onChange={(e) => setFindingForm({...findingForm, process: e.target.value})} /></div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea value={findingForm.description} onChange={(e) => setFindingForm({...findingForm, description: e.target.value})} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFindingModalOpen(false)}>Cancelar</Button>
              <Button onClick={() => saveFinding.mutate()} className="bg-primary">Guardar Hallazgo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Auditorías" subtitle="Planificación y seguimiento de auditorías">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Auditorías", val: audits.length, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
          { label: "Completadas", val: audits.filter((a:any) => a.status === 'completada').length, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
          { label: "En Curso", val: audits.filter((a:any) => a.status === 'en curso').length, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Programadas", val: audits.filter((a:any) => a.status === 'programada').length, icon: Calendar, color: "text-muted-foreground", bg: "bg-muted" }
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={cn("rounded-lg p-2", stat.bg)}><stat.icon className={cn("h-5 w-5", stat.color)} /></div>
              <div><p className="text-2xl font-bold">{stat.val}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex justify-end">
        {isEditor && <Button onClick={() => setIsAuditModalOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Programar Auditoría</Button>}
      </div>

      <div className="space-y-4">
        {audits.map((audit: any) => (
          <div key={audit.id} onClick={() => setSelectedAudit(audit)} className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/30 cursor-pointer transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className={cn("rounded-lg p-3", statusStyles[audit.status as keyof typeof statusStyles]?.bg)}>
                  <FileText className={cn("h-6 w-6", statusStyles[audit.status as keyof typeof statusStyles]?.text)} />
                </div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{audit.title}</h3>
                  <p className="text-sm text-muted-foreground uppercase">{audit.type} • {audit.auditor} • {audit.scheduled_date}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="flex gap-4 text-sm mr-4">
                    <div className="text-center"><p className="font-semibold">{audit.findings_major}</p><p className="text-xs text-muted-foreground">Mayor</p></div>
                    <div className="text-center"><p className="font-semibold">{audit.findings_minor}</p><p className="text-xs text-muted-foreground">Menor</p></div>
                 </div>
                 <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Programar - REVERTIDO A VERSIÓN COMPLETA */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Programar Auditoría</DialogTitle>
            <DialogDescription>Ingrese los detalles para la nueva auditoría del sistema.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Título</Label><Input value={auditForm.title} onChange={(e) => setAuditForm({...auditForm, title: e.target.value})} placeholder="Ej: Auditoría Interna Q1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={auditForm.scheduled_date} onChange={(e) => setAuditForm({...auditForm, scheduled_date: e.target.value})} /></div>
              <div className="space-y-2"><Label>Tipo</Label>
                <Select value={auditForm.type} onValueChange={(v) => setAuditForm({...auditForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interna">Interna</SelectItem>
                    <SelectItem value="externa">Externa</SelectItem>
                    <SelectItem value="revisión">Revisión</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Auditor</Label><Input value={auditForm.auditor} onChange={(e) => setAuditForm({...auditForm, auditor: e.target.value})} placeholder="Nombre del auditor o entidad" /></div>
            <div className="space-y-2"><Label>Alcance (separado por comas)</Label><Input value={auditForm.scope} onChange={(e) => setAuditForm({...auditForm, scope: e.target.value})} placeholder="Ej: Producción, Calidad, RRHH" /></div>
            <div className="space-y-2"><Label>Progreso Inicial (%)</Label><Input type="number" value={auditForm.progress} onChange={(e) => setAuditForm({...auditForm, progress: e.target.value})} placeholder="0" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuditModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveAudit.mutate()}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Auditorias;