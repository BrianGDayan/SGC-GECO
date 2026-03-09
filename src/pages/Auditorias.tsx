import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, Clock, Calendar, User, AlertTriangle, Plus, 
  ChevronRight, ArrowLeft, Printer, Loader2, Info, Edit, Eye, ClipboardList
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
  completada: { bg: "bg-success/10 hover:bg-success/20 transition-colors", text: "text-success", border: "border-success/20", icon: CheckCircle },
  finalizada: { bg: "bg-success/10 hover:bg-success/20 transition-colors", text: "text-success", border: "border-success/20", icon: CheckCircle },
  "en curso": { bg: "bg-warning/10 hover:bg-warning/20 transition-colors", text: "text-warning", border: "border-warning/20", icon: Clock },
  programada: { bg: "bg-primary/10 hover:bg-primary/20 transition-colors", text: "text-primary", border: "border-primary/20", icon: Calendar },
  pendiente: { bg: "bg-muted hover:bg-muted/80 transition-colors", text: "text-muted-foreground", border: "border-muted", icon: Calendar },
};

const typeStyles: any = {
  interna: "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20 transition-colors",
  externa: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors",
  revisión: "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20 transition-colors",
};

const findingTypeStyles: Record<string, string> = {
  no_conformidad: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors",
  observacion: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20 transition-colors",
  oportunidad_mejora: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 transition-colors",
};

const findingTypeLabels: Record<string, string> = {
  no_conformidad: "No Conformidad",
  observacion: "Observación",
  oportunidad_mejora: "Oportunidad de Mejora",
};

const Auditorias = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isAuditor } = useAuth();
  const navigate = useNavigate(); 

  const canManageAudit = isAdmin || isAuditor;
  
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [auditToEdit, setAuditToEdit] = useState<any>(null);

  const finalizeAuditMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("audits" as any)
        .update({ status: "finalizada", progress: 100 })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auditoría finalizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["audits"] });
      setSelectedAudit((prev: any) => ({ ...prev, status: "finalizada", progress: 100 }));
    },
    onError: (e: any) => toast.error("Error al finalizar: " + e.message)
  });

  const { data: processesList = [] } = useQuery({
    queryKey: ["processes-lookup-audit"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await (supabase.from("processes_view" as any).select("id, name") as any);
      if (error) throw error;
      return data || [];
    }
  });

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
        let scopeArray: string[] = ["General"];
        if (Array.isArray(audit.scope)) {
          scopeArray = audit.scope;
        } else if (typeof audit.scope === 'string') {
          const cleanString = audit.scope.replace(/^\{|\}$/g, ''); 
          if (cleanString.trim().length > 0) scopeArray = cleanString.split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
        }

        const auditDateOnly = audit.scheduled_date.includes('T') ? audit.scheduled_date.split('T')[0] : audit.scheduled_date;
        const realStatus = (audit.status || "programada").toLowerCase();
        const isPastDue = auditDateOnly < todayISO && !["finalizada", "completada"].includes(realStatus);

        const rawType = audit.type || "interna";

        return {
          ...audit,
          id: audit.id,
          name: audit.title,
          status: realStatus,
          type: rawType.toLowerCase(), 
          date: audit.scheduled_date,
          auditor: audit.auditor || "Sin asignar",
          scope: scopeArray,
          progress: audit.progress || 0,
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

  const { data: findingsList = [], isLoading: isLoadingFindings } = useQuery({
    queryKey: ["findings", selectedAudit?.id],
    queryFn: async () => {
      if (!selectedAudit) return [];
      const { data, error } = await supabase.from("findings" as any).select("*").eq("audit_id", selectedAudit.id);
      if (error) return []; 
      return data || [];
    },
    enabled: !!selectedAudit
  });

  // LOGICA CORREGIDA: "En curso" si no está cerrada y la fecha ya pasó o es hoy. "Programadas" si es a futuro.
  const todayISO = new Date().toISOString().split('T')[0];
  const stats = {
    total: audits.length,
    completadas: audits.filter((a: any) => ["completada", "finalizada"].includes(a.status)).length,
    enCurso: audits.filter((a: any) => {
      const auditDateOnly = a.date.includes('T') ? a.date.split('T')[0] : a.date;
      return !["completada", "finalizada"].includes(a.status) && auditDateOnly <= todayISO;
    }).length,
    programadas: audits.filter((a: any) => {
      const auditDateOnly = a.date.includes('T') ? a.date.split('T')[0] : a.date;
      return !["completada", "finalizada"].includes(a.status) && auditDateOnly > todayISO;
    }).length,
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
            const typeLabel = findingTypeLabels[f.type as keyof typeof findingTypeLabels] || "Hallazgo";
            return [typeLabel, f.description, f.status];
        });
        autoTable(doc, { startY: 60, head: [['Tipo', 'Descripción', 'Estado']], body: rows });
    } else doc.text("Sin hallazgos registrados.", 14, 60);
    doc.save(`Reporte_${selectedAudit.name}.pdf`);
  };

  const handleEdit = () => {
    if (["completada", "finalizada"].includes(selectedAudit.status)) {
        toast.error("La auditoría ya ha sido cerrada y no se puede modificar.");
        return;
    }
    setAuditToEdit(selectedAudit);
    setIsAuditModalOpen(true);
  };

  if (isLoading) return <MainLayout title="Auditorías"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  // === VISTA DE DETALLE ===
  if (selectedAudit) {
    const isClosed = ["completada", "finalizada"].includes(selectedAudit.status);
    const StatusIcon = statusStyles[selectedAudit.status]?.icon || Calendar;
    
    return (
      <MainLayout title={selectedAudit.name} subtitle={`Auditoría ${selectedAudit.type}`}>
        <div key="detail-view" className="animate-fade-in">
            <Button variant="ghost" onClick={() => setSelectedAudit(null)} className="mb-6 gap-2 text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Volver al listado
            </Button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                <div className="flex items-center gap-4">
                    <div className={cn("p-3 rounded-xl hidden sm:block", statusStyles[selectedAudit.status]?.bg)}><StatusIcon className={cn("h-6 w-6", statusStyles[selectedAudit.status]?.text)} /></div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{selectedAudit.name}</h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Badge variant="outline" className={cn("capitalize font-medium cursor-default", typeStyles[selectedAudit.type])}>{selectedAudit.type}</Badge>
                            <Badge className={cn("capitalize shadow-none font-medium cursor-default", statusStyles[selectedAudit.status]?.bg, statusStyles[selectedAudit.status]?.text)}>{selectedAudit.status}</Badge>
                            {selectedAudit.isPastDue && <Badge variant="destructive" className="shadow-none text-[10px] h-5">Vencida</Badge>}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" onClick={generatePDF} className="gap-2 bg-background shadow-sm hover:bg-accent"><Printer className="h-4 w-4" /> <span className="hidden sm:inline">Exportar PDF</span></Button>
                    {!isClosed && canManageAudit && (
                        <>
                            <Button onClick={() => setIsFindingModalOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm transition-all"><Plus className="h-4 w-4" /> Nuevo Hallazgo</Button>
                            <Button variant="secondary" onClick={handleEdit} className="gap-2 border shadow-sm hover:bg-muted transition-all"><Edit className="h-4 w-4" /> Modificar</Button>
                            <Button 
                              onClick={() => finalizeAuditMutation.mutate(selectedAudit.id)} 
                              disabled={finalizeAuditMutation.isPending}
                              className="gap-2 bg-success text-white hover:bg-success/90 shadow-sm transition-all"
                            >
                              {finalizeAuditMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              Finalizar
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
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
                        {selectedAudit.scope.map((s: string, idx: number) => <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs font-medium bg-secondary/10 text-secondary-dark border-secondary/20 hover:bg-secondary/20 cursor-default transition-colors">{s}</Badge>)}
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2"><h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso Global</h3><span className="text-2xl font-bold text-foreground">{selectedAudit.progress}%</span></div>
                    <Progress value={selectedAudit.progress} className="h-2 w-full" />
                </div>
            </div>
            
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="border-b p-4 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-sm">Registro de Hallazgos</h3>
                    </div>
                    <Badge variant="secondary" className="font-normal">{findingsList.length} Registros</Badge>
                </div>
                {isLoadingFindings ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 text-muted-foreground border-b text-left">
                        <tr>
                          <th className="p-4">Descripción</th>
                          <th className="p-4">Tipo</th>
                          <th className="p-4">Proceso</th>
                          <th className="p-4">Estado</th>
                          <th className="p-4 text-right">Ver</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {findingsList.length === 0 ? (
                          <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No hay hallazgos asociados.</td></tr>
                        ) : findingsList.map((f:any) => {
                          const typeLabel = findingTypeLabels[f.type as keyof typeof findingTypeLabels] || "Hallazgo";
                          const typeClass = findingTypeStyles[f.type as keyof typeof findingTypeStyles] || "bg-gray-100";
                          const processName = processesList.find((p: any) => p.id === f.process_id)?.name || "General";

                          return (
                            <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                              <td className="p-4 max-w-sm truncate font-medium text-foreground">{f.description}</td>
                              <td className="p-4">
                                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold cursor-default", typeClass)}>
                                  {typeLabel}
                                </Badge>
                              </td>
                              <td className="p-4 text-muted-foreground">{processName}</td>
                              <td className="p-4">
                                <Badge className={f.status === 'abierto' ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors' : 'bg-success/10 text-success border-success/20 hover:bg-success/20 transition-colors'} variant="outline">
                                  {f.status}
                                </Badge>
                              </td>
                              <td className="p-4 text-right">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => navigate(`/hallazgos/${f.id}`)}
                                  title="Ver detalle del hallazgo"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
        </div>
      </MainLayout>
    );
  }

  // === VISTA PRINCIPAL (LISTADO) ===
  return (
    <MainLayout title="Auditorías" subtitle="Planificación y seguimiento de auditorías">
      <div key="map-view" className="animate-fade-in">
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><Calendar className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{stats.total}</p><p className="text-sm text-muted-foreground">Total Auditorías</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2"><CheckCircle className="h-5 w-5 text-success" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-success transition-colors">{stats.completadas}</p><p className="text-sm text-muted-foreground">Completadas</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2"><Clock className="h-5 w-5 text-warning" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-warning transition-colors">{stats.enCurso}</p><p className="text-sm text-muted-foreground">En Curso</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2"><Calendar className="h-5 w-5 text-muted-foreground" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{stats.programadas}</p><p className="text-sm text-muted-foreground">Programadas</p></div>
              </div>
            </div>
          </div>

          <div className="mb-6 flex justify-end">
            {canManageAudit && (
                <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:shadow-md" onClick={() => { setAuditToEdit(null); setIsAuditModalOpen(true); }}>
                  <Plus className="h-4 w-4" /> Programar Auditoría
                </Button>
            )}
          </div>

          <div className="space-y-4">
            {audits.map((audit: any, index: number) => {
              const statusStyle = statusStyles[audit.status] || statusStyles.programada;
              const StatusIcon = statusStyle.icon;

              return (
                <div key={audit.id} onClick={() => setSelectedAudit(audit)} className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30 cursor-pointer animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn("rounded-lg p-3 transition-colors", statusStyle.bg)}>
                        <StatusIcon className={cn("h-6 w-6", statusStyle.text)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{audit.name}</h3>
                          <Badge variant="outline" className={typeStyles[audit.type]}>{audit.type}</Badge>
                          {audit.isPastDue && <Badge variant="destructive" className="h-4 text-[9px] shadow-none uppercase font-bold px-1.5 py-0">Vencida</Badge>}
                        </div>
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
      </div>
    </MainLayout>
  );
};

export default Auditorias;