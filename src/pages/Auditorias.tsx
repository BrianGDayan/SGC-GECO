import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom"; // <-- AGREGADO
import { 
  CheckCircle, Clock, Calendar, User, AlertTriangle, Plus, 
  ChevronRight, ArrowLeft, Printer, Loader2, Info, Edit, Eye // <-- AGREGADO Eye
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AuditForm from "@/components/forms/AuditForm";
import FindingForm from "@/components/forms/FindingForm"; 
import { toast } from "sonner";

const statusStyles: any = {
  completada: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: CheckCircle },
  finalizada: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: CheckCircle },
  "en curso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", icon: Clock },
  programada: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", icon: Calendar },
  pendiente: { bg: "bg-muted", text: "text-muted-foreground", border: "border-muted", icon: Calendar },
};

const typeStyles: any = {
  interna: "bg-secondary/10 text-secondary border-secondary/20",
  externa: "bg-primary/10 text-primary border-primary/20",
  revisión: "bg-accent/10 text-accent border-accent/20",
};

const Auditorias = () => {
  const queryClient = useQueryClient();
  const { isEditor } = useAuth();
  const navigate = useNavigate(); // <-- AGREGADO
  
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [auditToEdit, setAuditToEdit] = useState<any>(null);

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audits" as any)
        .select("*")
        .order("scheduled_date", { ascending: false });
      
      if (error) throw error;
      
      const now = new Date();
      const todayISO = now.toISOString().split('T')[0];

      return (data || []).map((audit: any) => {
        // Scope Logic
        let scopeArray: string[] = ["General"];
        if (Array.isArray(audit.scope)) {
          scopeArray = audit.scope;
        } else if (typeof audit.scope === 'string') {
          const cleanString = audit.scope.replace(/^\{|\}$/g, ''); 
          if (cleanString.trim().length > 0) scopeArray = cleanString.split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
        }

        // Date & Status Logic
        const auditDateOnly = audit.scheduled_date.includes('T') ? audit.scheduled_date.split('T')[0] : audit.scheduled_date;
        const isPastDue = auditDateOnly < todayISO;
        const computedProgress = isPastDue ? 100 : (audit.progress || 0);
        const computedStatus = isPastDue ? "completada" : (audit.status || "programada").toLowerCase();

        const rawType = audit.type || "interna";

        return {
          ...audit,
          id: audit.id,
          name: audit.title,
          status: computedStatus,
          type: rawType.toLowerCase(), 
          date: audit.scheduled_date,
          auditor: audit.auditor || "Sin asignar",
          scope: scopeArray,
          progress: computedProgress,
          isPastDue: isPastDue,
          findings: {
            nc: audit.findings_nc ?? 0,
            om: audit.findings_om ?? 0,
            obs: audit.findings_observations ?? 0
          }
        };
      });
    }
  });

  const { data: findingsList = [] } = useQuery({
    queryKey: ["findings", selectedAudit?.id],
    queryFn: async () => {
      if (!selectedAudit) return [];
      const { data, error } = await supabase.from("findings" as any).select("*").eq("audit_id", selectedAudit.id);
      if (error) return []; 
      return data || [];
    },
    enabled: !!selectedAudit
  });

  const stats = {
    total: audits.length,
    completadas: audits.filter((a: any) => ["completada", "finalizada"].includes(a.status)).length,
    enCurso: audits.filter((a: any) => a.status === "en curso").length,
    programadas: audits.filter((a: any) => ["programada", "pendiente"].includes(a.status)).length,
  };

  const generatePDF = () => {
    if (!selectedAudit) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Auditoría", 14, 20);
    doc.setFontSize(12);
    doc.text(`Auditoría: ${selectedAudit.name}`, 14, 30);
    doc.text(`Tipo: ${selectedAudit.type}`, 14, 38);
    doc.text(`Fecha: ${new Date(selectedAudit.date).toLocaleDateString()}`, 14, 46);
    if (findingsList.length > 0) {
        const rows = findingsList.map((f: any) => {
            let typeLabel = "Obs.";
            if (f.type === 'no_conformidad') typeLabel = "NC";
            if (f.type === 'oportunidad_mejora') typeLabel = "OM";
            return [typeLabel, f.description, f.status];
        });
        autoTable(doc, { startY: 60, head: [['Tipo', 'Descripción', 'Estado']], body: rows });
    } else doc.text("Sin hallazgos registrados.", 14, 60);
    doc.save(`Reporte_${selectedAudit.name}.pdf`);
  };

  const handleEdit = () => {
    if (selectedAudit.isPastDue) {
        toast.error("La auditoría ya ha sido cerrada automáticamente y no se puede modificar.");
        return;
    }
    setAuditToEdit(selectedAudit);
    setIsAuditModalOpen(true);
  };

  if (isLoading) return <MainLayout title="Auditorías"><div className="flex h-96 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  if (selectedAudit) {
    const isClosed = selectedAudit.status === "completada";
    const StatusIcon = statusStyles[selectedAudit.status]?.icon;
    
    return (
      <MainLayout title={selectedAudit.name} subtitle={`Auditoría ${selectedAudit.type}`}>
        <div className="flex flex-col gap-4 mb-8 animate-fade-in">
            <div><Button variant="ghost" size="sm" onClick={() => setSelectedAudit(null)} className="gap-1 pl-0 text-muted-foreground hover:text-foreground h-auto p-0 hover:bg-transparent"><ArrowLeft className="h-4 w-4" /> Volver al listado</Button></div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl hidden sm:block", statusStyles[selectedAudit.status]?.bg)}><StatusIcon className={cn("h-6 w-6", statusStyles[selectedAudit.status]?.text)} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{selectedAudit.name}</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className={cn("capitalize font-medium border-primary/20 text-primary bg-primary/5", typeStyles[selectedAudit.type])}>{selectedAudit.type}</Badge>
                            <Badge className={cn("capitalize shadow-none font-medium", statusStyles[selectedAudit.status]?.bg, statusStyles[selectedAudit.status]?.text)}>{selectedAudit.status}</Badge>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={generatePDF} className="gap-2 bg-background shadow-sm hover:bg-accent"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span></Button>
                    {!isClosed && isEditor && (
                        <>
                            <Button onClick={() => setIsFindingModalOpen(true)} className="gap-2 bg-primary hover:bg-primary-dark shadow-sm"><Plus className="h-4 w-4" /> Nuevo Hallazgo</Button>
                            <Button variant="secondary" onClick={handleEdit} className="gap-2 border shadow-sm hover:bg-muted"><Edit className="h-4 w-4" /> Modificar</Button>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Datos Generales</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm group"><div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors"><Calendar className="h-4 w-4" /></div><span className="font-medium text-foreground">{new Date(selectedAudit.date).toLocaleDateString()}</span></div>
                    <div className="flex items-center gap-3 text-sm group"><div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors"><User className="h-4 w-4" /></div><span className="font-medium text-foreground">{selectedAudit.auditor}</span></div>
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Alcance Definido</h3>
                <div className="flex flex-wrap gap-2 content-start">
                    {selectedAudit.scope.map((s: string, idx: number) => <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-secondary/10 text-secondary-dark border-secondary/20 hover:bg-secondary/20">{s}</Badge>)}
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-center">
                 <div className="flex justify-between items-end mb-2"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso Global</h3><span className="text-2xl font-bold text-foreground">{selectedAudit.progress}%</span></div>
                 <Progress value={selectedAudit.progress} className="h-2 w-full" />
            </div>
        </div>
        
        <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/5">
                <h3 className="font-bold text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Registro de Hallazgos</h3>
                <Badge variant="secondary" className="font-normal">{findingsList.length} Registros</Badge>
            </div>
            <div className="divide-y divide-border">
                {findingsList.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                        <div className="bg-muted/50 p-4 rounded-full mb-3"><Info className="h-8 w-8 text-muted-foreground/50" /></div>
                        <p>No se han registrado hallazgos en esta auditoría.</p>
                    </div>
                ) : findingsList.map((f:any) => {
                    let badgeLabel = "Obs.";
                    let badgeColorClass = "border-primary text-primary bg-primary/5";
                    if (f.type === 'no_conformidad') { badgeLabel = "NC"; badgeColorClass = "border-destructive text-destructive bg-destructive/5"; }
                    else if (f.type === 'oportunidad_mejora') { badgeLabel = "OM"; badgeColorClass = "border-warning text-warning bg-warning/5"; }

                    return (
                        <div key={f.id} className="p-5 flex flex-col sm:flex-row sm:justify-between sm:items-start hover:bg-muted/5 transition-colors gap-4 group">
                            <div className="flex gap-4 items-start flex-1">
                                <div className={cn("mt-1 p-2 rounded-full h-fit shrink-0 shadow-sm", f.type === 'no_conformidad' ? "bg-destructive/10 text-destructive" : f.type === 'oportunidad_mejora' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}><AlertTriangle className="h-4 w-4" /></div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">{f.process || f.process_id || "General"}</span></div>
                                    <p className="font-medium text-foreground text-base">{f.description}</p>
                                    {f.corrective_action && (<div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50"><CheckCircle className="h-4 w-4 text-success mt-0.5" /><div><span className="font-semibold text-foreground text-xs uppercase mr-1">Acción:</span>{f.corrective_action}</div></div>)}
                                </div>
                            </div>
                            
                            {/* CAJA DE ACCIONES Y BADGES (Alineada a la derecha en desktop) */}
                            <div className="flex items-center gap-4 self-start sm:self-center shrink-0">
                                <Badge variant="outline" className={cn("capitalize whitespace-nowrap px-3 py-1 text-xs font-medium", badgeColorClass)}>{badgeLabel}</Badge>
                                
                                {/* BOTÓN DE VER DETALLE (AGREGADO) */}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  onClick={() => navigate(`/hallazgos/${f.id}`)}
                                  title="Ver detalle del hallazgo"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        <Dialog open={isFindingModalOpen} onOpenChange={setIsFindingModalOpen}>
          <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Registrar Hallazgo</DialogTitle></DialogHeader>
            <FindingForm onSuccess={() => {
                setIsFindingModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ["findings"] });
                queryClient.invalidateQueries({ queryKey: ["audits"] });
            }} />
          </DialogContent>
        </Dialog>

        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>{auditToEdit ? "Modificar Auditoría" : "Programar Auditoría"}</DialogTitle></DialogHeader>
                <AuditForm onSuccess={() => { setIsAuditModalOpen(false); setAuditToEdit(null); setSelectedAudit(null); queryClient.invalidateQueries({ queryKey: ["audits"] }); }} initialData={auditToEdit} />
            </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Auditorías" subtitle="Planificación y seguimiento de auditorías">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4 animate-fade-in">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2"><Calendar className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-sm text-muted-foreground">Total Auditorías</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-3"><div className="rounded-lg bg-success/10 p-2"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold text-foreground">{stats.completadas}</p><p className="text-sm text-muted-foreground">Completadas</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-3"><div className="rounded-lg bg-warning/10 p-2"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold text-foreground">{stats.enCurso}</p><p className="text-sm text-muted-foreground">En Curso</p></div></div></div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all"><div className="flex items-center gap-3"><div className="rounded-lg bg-muted p-2"><Calendar className="h-5 w-5 text-muted-foreground" /></div><div><p className="text-2xl font-bold text-foreground">{stats.programadas}</p><p className="text-sm text-muted-foreground">Programadas</p></div></div></div>
      </div>

      <div className="mb-6 flex justify-end animate-fade-in">
        {isEditor && (
            <Button className="gap-2 shadow-sm" onClick={() => { setAuditToEdit(null); setIsAuditModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Programar Auditoría
            </Button>
        )}
      </div>

      <div className="space-y-4 animate-fade-in">
        {audits.map((audit: any, index: number) => {
          const statusStyle = statusStyles[audit.status] || statusStyles.programada;
          const StatusIcon = statusStyle.icon;

          return (
            <div key={audit.id} onClick={() => setSelectedAudit(audit)} className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className={cn("rounded-lg p-3 transition-colors", statusStyle.bg)}><StatusIcon className={cn("h-6 w-6", statusStyle.text)} /></div>
                  <div>
                    <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{audit.name}</h3><Badge variant="outline" className={typeStyles[audit.type]}>{audit.type}</Badge></div>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground"><div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(audit.date).toLocaleDateString()}</div><div className="flex items-center gap-1"><User className="h-4 w-4" />{audit.auditor}</div></div>
                    <div className="mt-2 flex flex-wrap gap-1">{audit.scope.map((s: string, i: number) => <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex gap-4 text-sm">
                    <div className="text-center"><p className={cn("text-lg font-semibold", audit.findings.nc > 0 ? "text-destructive" : "text-success")}>{audit.findings.nc}</p><p className="text-xs text-muted-foreground">NC</p></div>
                    <div className="text-center"><p className={cn("text-lg font-semibold", audit.findings.om > 0 ? "text-warning" : "text-success")}>{audit.findings.om}</p><p className="text-xs text-muted-foreground">OM</p></div>
                    <div className="text-center"><p className="text-lg font-semibold text-muted-foreground">{audit.findings.obs}</p><p className="text-xs text-muted-foreground">Obs.</p></div>
                  </div>
                  <div className="w-32 hidden sm:block"><div className="mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Progreso</span><span className="font-medium text-foreground">{audit.progress}%</span></div><Progress value={audit.progress} className="h-2" /></div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{auditToEdit ? "Modificar Auditoría" : "Programar Auditoría"}</DialogTitle></DialogHeader>
          <AuditForm onSuccess={() => { setIsAuditModalOpen(false); setAuditToEdit(null); }} initialData={auditToEdit} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Auditorias;