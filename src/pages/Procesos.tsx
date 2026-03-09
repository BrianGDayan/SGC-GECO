import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { 
  FileText, BarChart3, ChevronRight, ArrowLeft, Target, AlertTriangle, 
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
import ProcessForm from "@/components/forms/ProcessForm";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";
import FindingForm from "@/components/forms/FindingForm";
import { Edit } from "lucide-react"; // Asegúrate de importar Edit
import IndicatorForm from "@/components/forms/IndicatorForm";
import DocumentVersionForm from "@/components/forms/DocumentVersionForm";
import DocumentRecordsModal from "@/components/modals/DocumentRecordsModal";

const PROCESS_HALLAZGOS_NAME = "Gestión de Hallazgos, No Conformidades y Acciones Correctivas y/o Preventivas";

const findingTypeStyles = {
  no_conformidad: "bg-destructive/10 text-destructive border-destructive/20",
  observacion: "bg-warning/10 text-warning border-warning/20",
  oportunidad_mejora: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  "en revision": "bg-warning/10 text-warning border-warning/20",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20",
  obsoleto: "bg-muted text-muted-foreground border-border", 
};

const getComplianceColor = (compliance: number) => {
  if (compliance >= 90) return "text-success";
  if (compliance >= 75) return "text-warning";
  return "text-destructive";
};

const Procesos = () => {
  const queryClient = useQueryClient();
  // AQUÍ ESTÁ LA MAGIA: Traemos isAdmin y canManageProcess
  const { isAdmin, canManageProcess } = useAuth();
  const navigate = useNavigate();
  
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [versioningDoc, setVersioningDoc] = useState<any>(null);
  const [recordDoc, setRecordDoc] = useState<any>(null);

  // 1. Agrega este estado junto a los demás
const [editingProcess, setEditingProcess] = useState<any>(null);

// 2. Agrega esta función antes del return
const handleEditProcess = (e: React.MouseEvent, process: any) => {
  e.stopPropagation(); // Evita entrar al detalle del proceso
  setEditingProcess(process);
  setIsModalOpen(true);
};
  
  useEffect(() => {
    if (selectedProcess) {
      window.scrollTo(0, 0); 
      const main = document.querySelector('main'); 
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedProcess]);

  const { data: processes = [], isLoading, isFetching } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      // Nota: Si processes_view no tiene la columna manager_ids, 
      // asegurate de recrear la vista en BD o cambiar esto a la tabla original 'processes'
      const [procRes, indRes] = await Promise.all([
        supabase.from("processes_view" as any).select("*").order("code", { ascending: true }),
        supabase.from("indicators" as any).select("*")
      ]);
        
      if (procRes.error) throw procRes.error;
      
      const allInds = indRes.data || [];
      
      return (procRes.data || []).map((p: any) => {
        const pInds = allInds.filter((i: any) => i.process === p.name);
        
        let finalCompliance = 100; 
        
        if (pInds.length > 0) {
          let sumPct = 0;
          pInds.forEach((ind: any) => {
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
          finalCompliance = Math.round(sumPct / pInds.length);
        }
        
        return {
          ...p,
          compliance: finalCompliance, 
          indicator_count: pInds.length 
        };
      });
    }
  });

  const { data: detail = { docs: [], inds: [], findings: [] }, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["process-content", selectedProcess?.id],
    queryFn: async () => {
      const isFindingProcess = selectedProcess.name === PROCESS_HALLAZGOS_NAME;

      const [docs, inds, findings] = await Promise.all([
        supabase.from("documents_view" as any).select("*").eq("process", selectedProcess.name),
        supabase.from("indicators" as any).select("*").eq("process", selectedProcess.name),
        isFindingProcess 
          ? supabase.from("findings" as any).select("*").order('created_at', { ascending: false })
          : supabase.from("findings" as any).select("*").eq("process_id", selectedProcess.id)
      ]);

      const findingsData = findings.data as any[];

      return { 
        docs: (docs.data as any[]) || [], 
        inds: (inds.data as any[]) || [], 
        findings: findingsData || []
      };
    },
    enabled: !!selectedProcess
  });

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

  if (isLoading) return <MainLayout title="Procesos"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  // === VISTA DE DETALLE ===
  if (selectedProcess) {
    const isFindingProcess = selectedProcess.name === PROCESS_HALLAZGOS_NAME;
    // Verificamos si el usuario actual tiene permiso en ESTE proceso específico
    const hasProcessPermissions = canManageProcess(selectedProcess.manager_ids);

    return (
      <MainLayout title={selectedProcess.name} subtitle={`Dashboard de ${selectedProcess.code}`}>
        <div key="detail-view" className="animate-fade-in">
          <Button variant="ghost" onClick={() => { setSelectedProcess(null); setSearchTerm(""); setDocStatusFilter("all"); }} className="mb-6 gap-2 text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Volver al Mapa
          </Button>

          {isLoadingDetail ? (
            <div className="flex h-[60vh] flex-col items-center justify-center animate-fade-in">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Cargando datos del proceso...</p>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-2xl font-bold text-foreground">{detail.docs.length}</p><p className="text-sm text-muted-foreground">Documentos</p></div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-secondary/10 p-2"><BarChart3 className="h-5 w-5 text-secondary" /></div>
                    <div><p className="text-2xl font-bold text-foreground">{detail.inds.length}</p><p className="text-sm text-muted-foreground">Indicadores</p></div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-success/10 p-2"><Target className="h-5 w-5 text-success" /></div>
                    <div><p className="text-2xl font-bold text-foreground">{selectedProcess.compliance}%</p><p className="text-sm text-muted-foreground">Cumplimiento</p></div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-destructive/10 p-2"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{detail.findings.filter((f: any) => f.status === 'abierto').length}</p>
                      <p className="text-sm text-muted-foreground">Hallazgos</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
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
                              <tr key={doc.doc_id || doc.id} className="hover:bg-muted/10">
                                <td className="p-4 font-mono text-sm text-primary">{doc.code}</td>
                                <td className="p-4 font-medium">{doc.title}</td>
                                <td className="p-4"><Badge variant="outline" className={cn("text-[10px] uppercase font-bold", statusStyles[doc.status as keyof typeof statusStyles] || "bg-gray-100")}>{doc.status}</Badge></td>
                                <td className="p-4 text-right">
                                  <div className="flex justify-end gap-1">
                                    {/* Botón de Registros - Ahora también validado */}
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
                                    {/* Botón de Nueva Versión - Ahora protegido por permisos */}
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

                  {/* Tabla Hallazgos */}
                  {(isFindingProcess || detail.findings.length > 0) && (
                    <div className="rounded-xl border border-destructive/20 bg-card shadow-sm overflow-hidden animate-fade-in">
                      <div className="border-b p-4 bg-destructive/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-5 w-5 text-destructive" />
                          <h3 className="font-bold text-sm text-destructive uppercase tracking-wider">
                            {isFindingProcess ? "Registro Global de Hallazgos" : "Hallazgos en este Proceso"}
                          </h3>
                        </div>
                        {/* Nuevo Hallazgo - Protegido por Admin o permisos de proceso */}
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
                            {detail.findings.map((f: any) => (
                              <tr key={f.id} className="hover:bg-muted/10">
                                <td className="p-4 max-w-sm truncate text-sm">{f.description}</td>
                                <td className="p-4">
                                  <Badge variant="outline" className={cn("text-[10px] uppercase", findingTypeStyles[f.type as keyof typeof findingTypeStyles])}>
                                    {f.type?.replace(/_/g, " ") || "Hallazgo"}
                                  </Badge>
                                </td>
                                <td className="p-4 text-sm font-medium">
                                  {isFindingProcess ? (processes.find((p: any) => p.id === f.process_id)?.name || "General") : selectedProcess.name}
                                </td>
                                <td className="p-4">
                                  <Badge className={f.status === 'abierto' ? 'bg-destructive' : 'bg-success'}>{f.status}</Badge>
                                </td>
                                <td className="p-4 text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-primary hover:bg-primary/10"
                                    onClick={() => navigate(`/hallazgos/${f.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {/* SECCIÓN INDICADORES */}
                  <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
                    <div className="border-b border-border p-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Indicadores Clave</h3>
                        <p className="text-sm text-muted-foreground">Progreso hacia objetivos de calidad</p>
                      </div>
                      {/* Botón Cargar Datos Indicador - Protegido */}
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
                            <div key={ind.id} className="p-4 hover:bg-muted/30 transition-colors">
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

                  {/* SECCIÓN SUBPROCESOS */}
                  <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "200ms" }}>
                    <div className="border-b border-border p-6">
                      <h3 className="text-lg font-semibold text-foreground">Subprocesos Vinculados</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex flex-wrap gap-1">
                        {!selectedProcess.subprocesses || selectedProcess.subprocesses.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Sin subprocesos.</p>
                        ) : (
                          selectedProcess.subprocesses.map((sub: string) => (
                            <Badge key={sub} variant="secondary" className="text-[12px] font-normal">
                              {sub}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MODALES EXISTENTES */}
              <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle>Cargar Medición</DialogTitle></DialogHeader>
                  <IndicatorMeasurementForm 
                    indicators={detail.inds} 
                    onSuccess={() => {
                      setIsUploadOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["process-content"] });
                      queryClient.invalidateQueries({ queryKey: ["processes"] });
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
        </div>
      </MainLayout>
    );
  }

  // === VISTA PRINCIPAL (MAPA) ===
  return (
    <MainLayout title="Procesos" subtitle="Mapa estratégico del Sistema de Gestión">
      {(isLoading || isFetching) ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <div key="map-view" className="animate-fade-in">
          <div className="mb-6 flex justify-end">
            {/* AQUÍ ESTÁ EL CAMBIO: El botón de Crear Proceso es solo para Administradores */}
            {isAdmin && <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-primary hover:bg-primary-dark shadow-sm"><Plus className="h-4 w-4" /> Nuevo Proceso</Button>}
          </div>
          
          <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Mapa de Procesos ISO 9001:2015</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {['estratégico', 'operativo', 'apoyo'].map((type) => (
                <div key={type} className={cn("rounded-lg p-4", type === 'estratégico' ? "bg-primary/5" : type === 'operativo' ? "bg-secondary/10" : "bg-accent/10")}>
                  <h4 className="mb-3 text-sm font-medium capitalize">
                    {type === 'apoyo' ? 'Procesos de Apoyo' : `Procesos ${type}s`}
                  </h4>
                  <div className="space-y-2">
                    {processes.filter((p: any) => p.type === type).map((p: any) => (
                      <div key={p.id} onClick={() => setSelectedProcess(p)} className="rounded bg-card p-2 text-sm shadow-sm cursor-pointer hover:border-primary border transition-colors">{p.name}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {processes.map((process: any, index: number) => (
              <div 
                key={process.id} 
                onClick={() => setSelectedProcess(process)} 
                className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {(isAdmin || canManageProcess(process.manager_ids)) && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                  onClick={(e) => handleEditProcess(e, process)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                      {process.code}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {process.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{process.responsibles}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="mb-4 grid grid-cols-3 gap-4 text-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">{process.doc_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Documentos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <p className="text-lg font-semibold text-foreground">{process.indicator_count || "-"}</p>
                    <p className="text-xs text-muted-foreground">Indicadores</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-semibold ${getComplianceColor(process.compliance)}`}>
                      {process.compliance}%
                    </p>
                    <p className="text-xs text-muted-foreground">Cumplimiento</p>
                  </div>
                </div>

                <div className="mb-4">
                  <Progress value={process.compliance} className="h-2" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Subprocesos
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(!process.subprocesses || process.subprocesses.length === 0) ? (
                      <span className="text-[13px] text-muted-foreground italic">Sin subprocesos</span>
                    ) : (
                      process.subprocesses.map((sub: string) => (
                        <Badge key={sub} variant="secondary" className="text-xs font-normal">{sub}</Badge>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={isModalOpen} onOpenChange={(open) => { setIsModalOpen(open); if(!open) setEditingProcess(null); }}>
            {/* Ajuste de alineación y scroll */}
            <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto !align-top !top-[2.5vh] !translate-y-0">
              <DialogHeader>
                <DialogTitle>{editingProcess ? "Editar Proceso" : "Nuevo Proceso"}</DialogTitle>
                <DialogDescription>
                  {editingProcess ? `Editando ${editingProcess.name}` : "Cree un nuevo proceso."}
                </DialogDescription>
              </DialogHeader>
              
              <ProcessForm 
                editingProcess={editingProcess} 
                onSuccess={() => { 
                  setIsModalOpen(false); 
                  setEditingProcess(null); 
                  queryClient.invalidateQueries({ queryKey: ["processes"] }); 
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </MainLayout>
  );
};

export default Procesos;