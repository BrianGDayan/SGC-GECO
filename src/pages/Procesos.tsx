import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, BarChart3, ChevronRight, ArrowLeft, Target, AlertTriangle, 
  Loader2, Plus, Search, Filter 
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
// CORRECCIÓN: Agregado DialogFooter a los imports
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ProcessForm from "@/components/forms/ProcessForm";

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  "en revision": "bg-warning/10 text-warning border-warning/20",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20",
  "no aprobado": "bg-destructive/10 text-destructive border-destructive/20",
};

const getComplianceColor = (compliance: number) => {
  if (compliance >= 90) return "text-success";
  if (compliance >= 75) return "text-warning";
  return "text-destructive";
};

const Procesos = () => {
  const queryClient = useQueryClient();
  const { isEditor } = useAuth();
  
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  // Estado solo para la medición de indicadores (Upload)
  const [uploadData, setUploadData] = useState({ indicator_id: "", v1: "", v2: "", period: "", obs: "" });

  // === 1. CARGA DE PROCESOS (VISTA SQL) ===
  const { data: processes = [], isLoading } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes_view" as any)
        .select("*")
        .order("code", { ascending: true });
        
      if (error) throw error;
      return data || [];
    }
  });

  // === 2. DETALLE DE PROCESO ===
  const { data: detail = { docs: [], inds: [] } } = useQuery({
    queryKey: ["process-content", selectedProcess?.id],
    queryFn: async () => {
      const [docs, inds] = await Promise.all([
        supabase.from("documents_view" as any).select("*").eq("process", selectedProcess.name),
        supabase.from("indicators" as any).select("*").eq("process", selectedProcess.name)
      ]);
      return { docs: (docs.data as any[]) || [], inds: (inds.data as any[]) || [] };
    },
    enabled: !!selectedProcess
  });

  // === 3. CARGAR MEDICIÓN (Logica existente) ===
  const uploadMutation = useMutation({
    mutationFn: async () => {
      // Validar que se haya seleccionado un indicador
      if (!uploadData.indicator_id) throw new Error("Debes seleccionar un indicador.");

      const ind = detail.inds.find((i: any) => i.id.toString() === uploadData.indicator_id);
      if (!ind) throw new Error("Indicador no encontrado.");
      
      const v1 = parseFloat(uploadData.v1) || 0;
      const v2 = parseFloat(uploadData.v2) || 0;
      const newResult = v2 !== 0 ? (v1 / v2) * 100 : 0;

      // 1. Insertar en el historial
      const { error: histError } = await supabase.from("indicator_history" as any).insert([{
        indicator_id: ind.id, 
        value_1: v1, 
        value_2: v2, 
        result: newResult,
        period_date: uploadData.period ? (uploadData.period + "-01") : new Date().toISOString().split('T')[0], 
        observations: uploadData.obs
      }]);
      
      if (histError) throw histError;

      // 2. Actualizar el indicador principal
      const { error: indError } = await supabase.from("indicators" as any).update({
        current_value: newResult, 
        status: newResult >= ind.target_value ? "cumple" : "no cumple",
        last_update: new Date().toISOString().split('T')[0]
      }).eq("id", ind.id);

      if (indError) throw indError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      queryClient.invalidateQueries({ queryKey: ["process-content"] });
      
      toast.success("Medición registrada correctamente");
      
      // SOLO cerramos la modal si todo salió bien
      setIsUploadOpen(false);
      setUploadData({ indicator_id: "", v1: "", v2: "", period: "", obs: "" });
    },
    onError: (err) => {
      // Si falla, mostramos el error y MANTENEMOS la modal abierta
      toast.error("Error al cargar medición: " + err.message);
    }
  });

  const filteredDocs = detail.docs.filter((doc: any) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = docStatusFilter === "all" || doc.status === docStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <MainLayout title="Procesos"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  // === VISTA DE DETALLE (DASHBOARD DEL PROCESO) ===
  if (selectedProcess) {
    return (
      <MainLayout title={selectedProcess.name} subtitle={`Dashboard de ${selectedProcess.code}`}>
        <Button variant="ghost" onClick={() => { setSelectedProcess(null); setSearchTerm(""); setDocStatusFilter("all"); }} className="mb-6 gap-2 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Volver al Mapa
        </Button>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center gap-4">
             <div className="rounded-lg bg-primary/10 p-2 text-primary"><FileText className="h-5 w-5" /></div>
             <div><p className="text-2xl font-bold">{detail.docs.length}</p><p className="text-xs text-muted-foreground">Documentos</p></div>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center gap-4">
             <div className="rounded-lg bg-secondary/10 p-2 text-secondary"><BarChart3 className="h-5 w-5" /></div>
             <div><p className="text-2xl font-bold">{detail.inds.length}</p><p className="text-xs text-muted-foreground">KPIs Activos</p></div>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center gap-4">
             <div className="rounded-lg bg-success/10 p-2 text-success"><Target className="h-5 w-5" /></div>
             <div><p className="text-2xl font-bold">{selectedProcess.compliance}%</p><p className="text-xs text-muted-foreground">Cumplimiento</p></div>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-sm flex items-center gap-4">
             <div className="rounded-lg bg-destructive/10 p-2 text-destructive"><AlertTriangle className="h-5 w-5" /></div>
             <div><p className="text-2xl font-bold">0</p><p className="text-xs text-muted-foreground">Desviaciones</p></div>
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
                    <tr><th className="p-4">Código</th><th className="p-4">Título</th><th className="p-4">Estado</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDocs.length === 0 ? (
                      <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No hay documentos asociados.</td></tr>
                    ) : (
                      filteredDocs.map((doc: any) => (
                        <tr key={doc.doc_id || doc.id} className="hover:bg-muted/10">
                          <td className="p-4 font-mono text-xs text-primary">{doc.code}</td>
                          <td className="p-4 font-medium">{doc.title}</td>
                          <td className="p-4"><Badge variant="outline" className={cn("text-[9px] uppercase font-bold", statusStyles[doc.status as keyof typeof statusStyles] || "bg-gray-100")}>{doc.status}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">KPIs de Desempeño</h3>
                {isEditor && <Button size="icon" variant="ghost" onClick={() => setIsUploadOpen(true)} className="h-8 w-8 text-primary"><Plus className="h-4 w-4" /></Button>}
              </div>
              <div className="space-y-6">
                {detail.inds.length === 0 ? <p className="text-xs text-muted-foreground">No hay indicadores definidos.</p> : detail.inds.map((ind: any) => (
                  <div key={ind.id} className="space-y-2">
                    <div className="flex justify-between text-xs font-medium"><span>{ind.name}</span><span className="text-primary">{ind.current_value}{ind.unit}</span></div>
                    <Progress value={Math.min((ind.current_value / (ind.target_value || 1)) * 100, 100)} className="h-1.5" />
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="mb-4 font-semibold text-sm">Subprocesos Vinculados</h3>
              <div className="flex flex-wrap gap-1">
                {!selectedProcess.subprocesses || selectedProcess.subprocesses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin subprocesos.</p>
                ) : (
                  selectedProcess.subprocesses.map((sub: string) => (<Badge key={sub} variant="secondary" className="text-[10px] font-normal">{sub}</Badge>))
                )}
              </div>
            </div>
          </div>
        </div>

        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Cargar Medición</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Select onValueChange={(v) => setUploadData({...uploadData, indicator_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar indicador" /></SelectTrigger>
                <SelectContent>{detail.inds.map((ind: any) => <SelectItem key={ind.id} value={ind.id.toString()}>{ind.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input type="number" placeholder="Valor A" onChange={(e) => setUploadData({...uploadData, v1: e.target.value})} />
                <Input type="number" placeholder="Valor B" onChange={(e) => setUploadData({...uploadData, v2: e.target.value})} />
              </div>
              <Input type="month" onChange={(e) => setUploadData({...uploadData, period: e.target.value})} />
            </div>
            <DialogFooter><Button onClick={() => uploadMutation.mutate()} className="bg-primary w-full">Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    );
  }

  // === VISTA PRINCIPAL (TARJETAS) ===
  return (
    <MainLayout title="Procesos" subtitle="Mapa estratégico del Sistema de Gestión">
      <div className="mb-6 flex justify-end">
        {isEditor && <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-primary hover:bg-primary-dark shadow-sm"><Plus className="h-4 w-4" /> Nuevo Proceso</Button>}
      </div>

      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Mapa de Procesos ISO 9001:2015</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {['estratégico', 'operativo', 'apoyo'].map((type) => (
            <div key={type} className={cn("rounded-lg p-4", type === 'estratégico' ? "bg-primary/5" : type === 'operativo' ? "bg-secondary/10" : "bg-accent/10")}>
              <h4 className="mb-3 text-sm font-medium capitalize">Procesos de {type}</h4>
              <div className="space-y-2">{processes.filter((p: any) => p.type === type).map((p: any) => (<div key={p.id} onClick={() => setSelectedProcess(p)} className="rounded bg-card p-2 text-sm shadow-sm cursor-pointer hover:border-primary border transition-colors">{p.name}</div>))}</div>
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
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 min-w-[3.5rem] px-2 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
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
                  <span className="text-[10px] text-muted-foreground italic">Sin subprocesos</span>
                ) : (
                  process.subprocesses.map((sub: string) => (
                    <Badge key={sub} variant="secondary" className="text-[10px] font-normal">{sub}</Badge>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo Proceso</DialogTitle>
            <DialogDescription>Complete la información técnica del proceso.</DialogDescription>
          </DialogHeader>
          <ProcessForm onSuccess={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Procesos;