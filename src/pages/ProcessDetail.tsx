import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, BarChart3, ArrowLeft, Target, AlertTriangle, 
  Loader2, Plus, Search, Filter, Eye, ClipboardList, Download, TrendingUp, TrendingDown, Minus, FileUp
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";
import FindingForm from "@/components/forms/FindingForm";
import DocumentVersionForm from "@/components/forms/DocumentVersionForm";
import DocumentRecordsModal from "@/components/modals/DocumentRecordsModal";

const PROCESS_HALLAZGOS_NAME = "Gestión de Hallazgos, No Conformidades y Acciones Correctivas y/o Preventivas";

const findingTypeStyles = {
  no_conformidad: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors cursor-default",
  observacion: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20 transition-colors cursor-default",
  oportunidad_mejora: "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-default",
};

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20 hover:bg-success/20 transition-colors cursor-default",
  "en revision": "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20 transition-colors cursor-default",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors cursor-default",
  obsoleto: "bg-muted text-muted-foreground border-border hover:bg-muted/80 transition-colors cursor-default", 
};

const ProcessDetail = () => {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { isAdmin, canManageProcess, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [versioningDoc, setVersioningDoc] = useState<any>(null);
  const [recordDoc, setRecordDoc] = useState<any>(null);

  useEffect(() => {
    window.scrollTo(0, 0); 
    const main = document.querySelector('main'); 
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const { data: processData, isLoading: isLoadingProcess } = useQuery({
    queryKey: ["process", id],
    queryFn: async (): Promise<any> => {
      const { data, error } = await (supabase.from("processes_view" as any).select("*").eq("id", id).single() as any);
      if (error) throw error;
      return data;
    },
  });

  const { data: processesList = [], isLoading: isLoadingList } = useQuery({
    queryKey: ["processes-lookup"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await (supabase.from("processes_view" as any).select("id, name") as any);
      if (error) throw error;
      return data || [];
    }
  });

  const { data: detail = { docs: [], inds: [], findings: [] }, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["process-content", processData?.id],
    queryFn: async () => {
      const isFindingProcess = processData?.name === PROCESS_HALLAZGOS_NAME;

      const [docs, inds, findings] = await Promise.all([
        supabase.from("documents_view" as any).select("*").eq("process", processData?.name),
        supabase.from("indicators" as any).select("*").eq("process", processData?.name),
        isFindingProcess 
          ? supabase.from("findings" as any).select("*").order('created_at', { ascending: false })
          : supabase.from("findings" as any).select("*").eq("process_id", processData?.id)
      ]);

      return { 
        docs: (docs.data as any[]) || [], 
        inds: (inds.data as any[]) || [], 
        findings: (findings.data as any[]) || []
      };
    },
    enabled: !!processData
  });

  let processCompliance = 100;
  if (detail.inds.length > 0) {
    let sumPct = 0;
    detail.inds.forEach((ind: any) => {
      const val = ind.current_value || 0;
      const target = ind.target_value || 1;
      const unit = (ind.unit || "").toLowerCase();
      const isInverse = unit.includes("hr") || unit.includes("día") || unit.includes("dia");
      
      let pct = 0;
      if (isInverse) {
        pct = val <= target ? 100 : (target / val) * 100;
      } else {
        pct = val >= target ? 100 : (val / target) * 100;
      }
      sumPct += pct; 
    });
    processCompliance = Math.round(sumPct / detail.inds.length);
  }

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
    } catch (e) { window.open(url, "_blank"); }
  };

  const filteredDocs = detail.docs.filter((doc: any) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = docStatusFilter === "all" || doc.status === docStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const openVersionModal = (doc: any) => { setVersioningDoc(doc); setIsVersionModalOpen(true); };
  const openRecordsModal = (doc: any) => { setRecordDoc(doc); setIsRecordsModalOpen(true); };
  
  const closeDocModals = () => {
    setIsVersionModalOpen(false);
    setIsRecordsModalOpen(false);
    setVersioningDoc(null);
    setRecordDoc(null);
  };

  const isPageLoading = isLoadingProcess || isLoadingList || isLoadingDetail || authLoading || !processData;

  const pageTitle = isPageLoading ? "Cargando detalle..." : processData?.name;
  const pageSubtitle = isPageLoading ? "Obteniendo información del proceso" : `Dashboard de ${processData?.code}`;

  const isFindingProcess = processData?.name === PROCESS_HALLAZGOS_NAME;
  const hasProcessPermissions = canManageProcess(processData?.manager_ids);

  return (
    <MainLayout title={pageTitle} subtitle={pageSubtitle}>
      {isPageLoading ? (
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div key="detail-view" className="animate-fade-in w-full">
          <Button variant="ghost" onClick={() => navigate("/procesos")} className="mb-6 gap-2 text-muted-foreground hover:text-primary transition-colors animate-slide-up">
            <ArrowLeft className="h-4 w-4" /> Volver al Mapa
          </Button>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4 animate-slide-up">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{detail.docs.length}</p><p className="text-sm text-muted-foreground">Documentos</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-secondary/10 p-2"><BarChart3 className="h-5 w-5 text-secondary" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-secondary transition-colors">{detail.inds.length}</p><p className="text-sm text-muted-foreground">Indicadores</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2"><Target className="h-5 w-5 text-success" /></div>
                <div><p className="text-2xl font-bold text-foreground group-hover:text-success transition-colors">{processCompliance}%</p><p className="text-sm text-muted-foreground">Cumplimiento</p></div>
              </div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-destructive/10 p-2"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors">{detail.findings.filter((f: any) => f.status === 'abierto').length}</p>
                  <p className="text-sm text-muted-foreground">Hallazgos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-300 animate-slide-up">
                <div className="border-b p-4 bg-muted/30">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="font-semibold text-sm">Documentación del Proceso</h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-8 w-40 pl-8 text-xs" />
                      </div>
                      <Select value={docStatusFilter} onValueChange={setDocStatusFilter}>
                        <SelectTrigger className="h-8 w-32 text-xs"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Estado" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {Object.keys(statusStyles).map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground border-b text-left">
                      <tr>
                        <th className="p-4">Código</th>
                        <th className="p-4">Título</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredDocs.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No hay documentos asociados.</td></tr>
                      ) : (
                        filteredDocs.map((doc: any) => (
                          <tr key={doc.doc_id || doc.id} className={cn("transition-colors hover:bg-muted/50", doc.status === 'obsoleto' ? 'opacity-60 bg-muted/10' : '')}>
                            <td className="p-4 font-mono text-sm text-primary">{doc.code}</td>
                            <td className="p-4 font-medium">{doc.title}</td>
                            <td className="p-4"><Badge variant="outline" className={cn("text-[10px] uppercase font-bold", statusStyles[doc.status as keyof typeof statusStyles] || "bg-gray-100")}>{doc.status}</Badge></td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-1">
                                {doc.category === 'registro' && doc.status === 'vigente' && hasProcessPermissions && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-blue-600 hover:bg-secondary hover:text-white transition-colors" 
                                        onClick={() => openRecordsModal(doc)} 
                                        title="Ver Registros Completados"
                                    >
                                        <ClipboardList className="h-4 w-4" />
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Ver documento">
                                  <a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.file_url, doc.title)} title="Descargar documento">
                                  <Download className="h-4 w-4" />
                                </Button>
                                {doc.status !== 'obsoleto' && hasProcessPermissions && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openVersionModal(doc)} title="Nueva Versión de documento">
                                        <FileUp className="h-4 w-4" />
                                    </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {(isFindingProcess || detail.findings.length > 0) && (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md hover:border-destructive/30 transition-all duration-300 animate-slide-up">
                  <div className="border-b p-4 bg-destructive/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-destructive" />
                      <h3 className="font-bold text-sm text-destructive uppercase tracking-wider">
                        {isFindingProcess ? "Registro Global de Hallazgos" : "Hallazgos en este Proceso"}
                      </h3>
                    </div>
                    {isFindingProcess && (isAdmin || hasProcessPermissions) && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="h-8 gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => setIsFindingModalOpen(true)}
                      >
                        <Plus className="h-4 w-4" /> Nuevo Hallazgo
                      </Button>
                    )}
                  </div>
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
                        {detail.findings.map((f: any) => {
                          const processName = isFindingProcess 
                              ? (processesList.find((p: any) => p.id === f.process_id)?.name || "General") 
                              : processData.name;

                          return (
                            <tr key={f.id} className="hover:bg-muted/50 transition-colors">
                              <td className="p-4 max-w-sm truncate text-sm">{f.description}</td>
                              <td className="p-4">
                                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold", findingTypeStyles[f.type as keyof typeof findingTypeStyles])}>
                                  {f.type?.replace(/_/g, " ") || "Hallazgo"}
                                </Badge>
                              </td>
                              <td className="p-4 text-sm font-medium">
                                {processName}
                              </td>
                              <td className="p-4">
                                <Badge className={f.status === 'abierto' ? 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-colors cursor-default' : 'bg-success/10 text-success border-success/20 hover:bg-success/20 transition-colors cursor-default'} variant="outline">
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
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 animate-slide-up">
                <div className="border-b border-border p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Indicadores Clave</h3>
                    <p className="text-sm text-muted-foreground">Progreso hacia objetivos de calidad</p>
                  </div>
                  {hasProcessPermissions && (
                    <Button size="icon" variant="ghost" onClick={() => setIsUploadOpen(true)} className="h-8 w-8 text-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {detail.inds.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">No hay indicadores definidos.</p>
                  ) : (
                    detail.inds.map((ind: any) => {
                      const trendIcons = { up: TrendingUp, down: TrendingDown, stable: Minus };
                      const trendColors = { up: "text-success", down: "text-destructive", stable: "text-muted-foreground" };
                      
                      const trendKey = (ind.trend as keyof typeof trendIcons) || "stable";
                      const TrendIcon = trendIcons[trendKey];
                      
                      const val = ind.current_value || 0;
                      const target = ind.target_value || 1;
                      const unit = (ind.unit || "").toLowerCase();

                      const isInverse = unit.includes("hr") || unit.includes("día") || unit.includes("dia");
                      const isOnTarget = isInverse ? val <= target : val >= target;
                      
                      let progress = 0;
                      if (isInverse) {
                        progress = val <= target ? 100 : (target / val) * 100;
                      } else {
                        progress = val >= target ? 100 : (val / target) * 100;
                      }

                      return (
                        <div key={ind.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{ind.name}</span>
                              <TrendIcon className={cn("h-4 w-4", trendColors[trendKey])} />
                            </div>
                            <span className={cn("text-sm font-semibold", isOnTarget ? "text-success" : "text-warning")}>
                              {val}{unit} / {target}{unit}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 animate-slide-up">
                <div className="border-b border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground">Subprocesos Vinculados</h3>
                </div>
                <div className="p-6">
                  <div className="flex flex-wrap gap-1">
                    {!processData.subprocesses || processData.subprocesses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin subprocesos.</p>
                    ) : (
                      processData.subprocesses.map((sub: string) => (
                        <Badge key={sub} variant="secondary" className="text-[12px] font-normal hover:bg-secondary/20 transition-colors cursor-default">
                          {sub}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MODALES */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Cargar Medición</DialogTitle></DialogHeader>
              <IndicatorMeasurementForm 
                indicators={detail.inds} 
                onSuccess={() => {
                  setIsUploadOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["process-content"] });
                  queryClient.invalidateQueries({ queryKey: ["process"] });
                }} 
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isFindingModalOpen} onOpenChange={setIsFindingModalOpen}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Hallazgo / No Conformidad</DialogTitle>
              </DialogHeader>
              <FindingForm 
                onSuccess={() => { 
                  setIsFindingModalOpen(false); 
                  queryClient.invalidateQueries({ queryKey: ["process-content"] }); 
                }} 
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Generar Nueva Versión</DialogTitle>
                <DialogDescription>Cargar actualización para el documento maestro <strong>{versioningDoc?.code}</strong>.</DialogDescription>
              </DialogHeader>
              {versioningDoc && <DocumentVersionForm parentDoc={versioningDoc} onSuccess={() => {
                  closeDocModals();
                  queryClient.invalidateQueries({ queryKey: ["process-content"] });
              }} />}
            </DialogContent>
          </Dialog>

          {recordDoc && (
            <DocumentRecordsModal 
              document={recordDoc} 
              isOpen={isRecordsModalOpen} 
              onClose={closeDocModals} 
            />
          )}

        </div>
      )}
    </MainLayout>
  );
};

export default ProcessDetail;