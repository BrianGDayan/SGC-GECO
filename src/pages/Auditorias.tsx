import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, Clock, Calendar, User, FileText, Plus, ChevronRight, 
  ArrowLeft, Info, Loader2, AlertTriangle, Printer, X
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AuditForm from "@/components/forms/AuditForm";
// Asumiendo que reutilizamos FindingForm o tienes un AuditFindingForm específico
import FindingForm from "@/components/forms/FindingForm"; 

// Estilos originales
const statusStyles = {
  completada: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: CheckCircle },
  "en curso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", icon: Clock },
  programada: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", icon: Calendar },
};

const typeStyles = {
  interna: "bg-secondary/10 text-secondary border-secondary/20",
  externa: "bg-primary/10 text-primary border-primary/20",
  revisión: "bg-accent/10 text-accent border-accent/20",
};

const Auditorias = () => {
  const queryClient = useQueryClient();
  const { isEditor } = useAuth();
  
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);

  // === DATA FETCHING (Lógica Real) ===
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audits" as any).select("*").order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["findings", selectedAudit?.id],
    queryFn: async () => {
      if (!selectedAudit) return [];
      const { data, error } = await supabase.from("audit_findings" as any).select("*").eq("audit_id", selectedAudit.id);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!selectedAudit
  });

  // Estadísticas reales calculadas
  const stats = {
    total: audits.length,
    completadas: audits.filter((a: any) => a.status === "completada").length,
    enCurso: audits.filter((a: any) => a.status === "en curso").length,
    programadas: audits.filter((a: any) => a.status === "programada").length,
  };

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const primaryColor: [number, number, number] = [27, 95, 163]; 
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 297, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("REPORTE DE AUDITORÍA", 15, 25);
    autoTable(doc, {
      startY: 45,
      head: [['Título', 'Auditor', 'Fecha', 'Resultado']],
      body: [[selectedAudit.title, selectedAudit.auditor, selectedAudit.scheduled_date, `${selectedAudit.progress}%`]],
      headStyles: { fillColor: primaryColor }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Tipo', 'Proceso', 'Descripción', 'Acción Correctiva', 'Estado']],
      body: findings.map((f: any) => [f.type?.toUpperCase(), f.process, f.description, f.corrective_action || "Pendiente", f.status?.toUpperCase()]),
      headStyles: { fillColor: primaryColor },
      columnStyles: { 2: { cellWidth: 70 }, 3: { cellWidth: 70 } }
    });
    doc.save(`Reporte_${selectedAudit.title}.pdf`);
  };

  if (isLoading) return <MainLayout title="Auditorías"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  // === VISTA DE DETALLE ===
  if (selectedAudit) {
    const isClosed = selectedAudit.status === "completada";
    
    return (
      <MainLayout title={selectedAudit.title} subtitle={`Auditoría ${selectedAudit.type}`}>
        <div className="flex justify-between items-center mb-6 animate-fade-in">
          <Button variant="ghost" onClick={() => setSelectedAudit(null)} className="gap-2 pl-0 hover:pl-2 transition-all">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generatePDF} className="gap-2 border-primary text-primary hover:bg-primary/5"><Printer className="h-4 w-4" /> PDF</Button>
            {!isClosed && isEditor && (
              <Button 
                onClick={async () => {
                  await supabase.from("audits" as any).update({ status: "completada", progress: 100 }).eq("id", selectedAudit.id);
                  queryClient.invalidateQueries({ queryKey: ["audits"] });
                  setSelectedAudit({...selectedAudit, status: "completada", progress: 100});
                }} 
                className="gap-2 bg-secondary hover:bg-secondary-dark"
              >
                Finalizar Auditoría
              </Button>
            )}
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 animate-fade-in">
          <div className="space-y-4">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide font-semibold">Información General</Label>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/30">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">{new Date(selectedAudit.scheduled_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3 text-sm p-3 rounded-lg bg-muted/30">
                <User className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">{selectedAudit.auditor}</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide font-semibold">Alcance (Procesos)</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/30 min-h-[100px] content-start">
              {!selectedAudit.scope || selectedAudit.scope.length === 0 ? (
                <span className="text-sm text-muted-foreground italic">Sin alcance definido.</span>
              ) : (
                selectedAudit.scope?.map((s: string) => <Badge key={s} variant="secondary" className="text-xs font-normal bg-background border">{s}</Badge>)
              )}
            </div>
          </div>
          <div className="space-y-4">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide font-semibold">Estado de Avance</Label>
            <div className="p-4 rounded-lg bg-muted/30 text-center space-y-4">
              <Badge className={cn("uppercase px-3 py-1 text-xs", statusStyles[selectedAudit.status as keyof typeof statusStyles]?.bg, statusStyles[selectedAudit.status as keyof typeof statusStyles]?.text)}>
                {selectedAudit.status}
              </Badge>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Progreso</span>
                  <span>{selectedAudit.progress}%</span>
                </div>
                <Progress value={selectedAudit.progress} className="h-2" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-in">
          <div className="border-b p-6 flex items-center justify-between bg-muted/10">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-bold text-foreground">Registro de Hallazgos</h2>
            </div>
            {!isClosed && isEditor && (
              <Button onClick={() => setIsFindingModalOpen(true)} className="gap-2 bg-primary hover:bg-primary-dark shadow-sm">
                <Plus className="h-4 w-4" /> Nuevo Hallazgo
              </Button>
            )}
          </div>
          
          <div className="divide-y divide-border">
            {findings.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No se han registrado hallazgos en esta auditoría.</div>
            ) : (
              findings.map((f: any) => (
                <div key={f.id} className="group flex flex-col sm:flex-row items-start justify-between p-6 hover:bg-muted/5 transition-colors gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("mt-1 p-2 rounded-full shrink-0 shadow-sm", f.type === 'mayor' ? "bg-destructive/10 text-destructive" : f.type === 'menor' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}>
                      <Info className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold text-[10px] uppercase px-2 py-0.5 rounded border tracking-wide", f.type === 'mayor' ? "border-destructive/30 text-destructive bg-destructive/5" : f.type === 'menor' ? "border-warning/30 text-warning bg-warning/5" : "border-primary/30 text-primary bg-primary/5")}>
                          {f.type}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" /> {f.process}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground leading-relaxed">{f.description}</p>
                      {f.corrective_action && (
                        <div className="text-xs text-muted-foreground mt-2 pl-3 border-l-2 border-primary/20">
                          <span className="font-semibold block mb-1">Acción Correctiva:</span> 
                          {f.corrective_action}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("uppercase text-[10px] whitespace-nowrap self-start sm:self-center", f.status === 'abierto' ? 'border-destructive text-destructive bg-destructive/5' : 'border-success text-success bg-success/5')}>
                    {f.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal para Hallazgos dentro del detalle */}
        <Dialog open={isFindingModalOpen} onOpenChange={setIsFindingModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Hallazgo</DialogTitle></DialogHeader>
            {/* Aquí deberías adaptar FindingForm para recibir audit_id fijo o usar un AuditFindingForm */}
            <div className="py-4 text-sm text-muted-foreground">
               <p>Implementación del formulario de hallazgo de auditoría vinculada al ID: {selectedAudit.id}</p>
               {/* <FindingForm ... /> */}
            </div>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  // === VISTA PRINCIPAL (LISTA) ===
  return (
    <MainLayout title="Auditorías" subtitle="Planificación y seguimiento de auditorías">
      
      {/* STATS - RESTAURADO VISUALMENTE (Iconos grandes, negritas, sombras) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4 animate-fade-in">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Total</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-success/10 p-3">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.completadas}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Completadas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-warning/10 p-3">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.enCurso}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">En Curso</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-muted p-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.programadas}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Programadas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-end animate-fade-in">
        {isEditor && (
          <Button onClick={() => setIsAuditModalOpen(true)} className="gap-2 bg-primary hover:bg-primary-dark shadow-sm h-10 px-4">
            <Plus className="h-4 w-4" /> Programar Auditoría
          </Button>
        )}
      </div>

      {/* LISTA DE AUDITORÍAS - RESTAURADA VISUALMENTE */}
      <div className="space-y-4 animate-fade-in">
        {audits.map((audit, index) => {
          const statusStyle = statusStyles[audit.status as keyof typeof statusStyles] || statusStyles.programada;
          const StatusIcon = statusStyle.icon;

          return (
            <div
              key={audit.id}
              onClick={() => setSelectedAudit(audit)}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Main Info */}
                <div className="flex items-start gap-5">
                  {/* Icono Grande con Fondo de Color */}
                  <div className={cn("rounded-xl p-3 shrink-0 transition-colors", statusStyle.bg)}>
                    <StatusIcon className={cn("h-8 w-8", statusStyle.text)} />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {audit.title}
                      </h3>
                      {/* Badge Tipo */}
                      <Badge variant="outline" className={cn("capitalize text-xs font-normal", typeStyles[audit.type as keyof typeof typeStyles] || "bg-muted")}>
                        {audit.type}
                      </Badge>
                    </div>

                    {/* Meta Data Row */}
                    <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary/70" />
                        <span>{new Date(audit.scheduled_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary/70" />
                        <span>{audit.auditor}</span>
                      </div>
                    </div>

                    {/* Scope Badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {audit.scope && audit.scope.map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px] font-normal bg-muted/50 text-muted-foreground border-transparent">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Restaurada al diseño lateral) */}
                <div className="flex items-center gap-6 w-full lg:w-auto pl-16 lg:pl-0 mt-2 lg:mt-0">
                  <div className="w-full lg:w-40">
                    <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className={cn(audit.progress === 100 ? "text-success" : "text-primary")}>{audit.progress}%</span>
                    </div>
                    <Progress value={audit.progress} className="h-2.5" />
                  </div>
                  <ChevronRight className="h-6 w-6 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL PROGRAMACIÓN */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Programar Auditoría</DialogTitle></DialogHeader>
          <AuditForm onSuccess={() => setIsAuditModalOpen(false)} />
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
};

export default Auditorias;