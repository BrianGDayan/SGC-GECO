import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, BarChart3, ChevronRight, ArrowLeft, Target, AlertTriangle, 
  Loader2, Plus, Search, Filter, TrendingUp, Download 
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const { isEditor, user } = useAuth();
  
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  
  const [form, setForm] = useState({ name: "", code: "", type: "operativo", responsibles: "", subprocesses: "" });
  const [uploadData, setUploadData] = useState({ indicator_id: "", v1: "", v2: "", period: "", obs: "" });

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

  const saveProcess = useMutation({
    mutationFn: async () => {
      const payload = { 
        ...form, 
        subprocesses: form.subprocesses.split(",").map(s => s.trim()).filter(Boolean),
        created_by: user?.id
      };
      const { error } = await supabase.from("processes").insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      setIsModalOpen(false);
      setForm({ name: "", code: "", type: "operativo", responsibles: "", subprocesses: "" });
      toast.success("Proceso creado exitosamente");
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const ind = detail.inds.find((i: any) => i.id.toString() === uploadData.indicator_id);
      if (!ind) return;
      const v1 = parseFloat(uploadData.v1);
      const v2 = parseFloat(uploadData.v2);
      const newResult = v2 !== 0 ? (v1 / v2) * 100 : 0;

      // CORRECCIÓN AQUÍ: Agregamos 'as any' para evitar el error de tipado
      await supabase.from("indicator_history" as any).insert([{
        indicator_id: ind.id, value_1: v1, value_2: v2, result: newResult,
        period_date: uploadData.period + "-01", observations: uploadData.obs
      }]);

      await supabase.from("indicators" as any).update({
        current_value: newResult, 
        status: newResult >= ind.target_value ? "cumple" : "no cumple",
        last_update: new Date().toISOString().split('T')[0]
      }).eq("id", ind.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      queryClient.invalidateQueries({ queryKey: ["process-content"] });
      setIsUploadOpen(false);
      setUploadData({ indicator_id: "", v1: "", v2: "", period: "", obs: "" });
      toast.success("Medición registrada");
    }
  });

  const filteredDocs = detail.docs.filter((doc: any) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = docStatusFilter === "all" || doc.status === docStatusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <MainLayout title="Procesos"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

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
          <div key={process.id} onClick={() => setSelectedProcess(process)} className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/30 cursor-pointer transition-all animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">{process.code}</div>
                <div><h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{process.name}</h3><p className="text-sm text-muted-foreground">{process.responsibles}</p></div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div><p className="text-lg font-semibold">{process.doc_count || 0}</p><p className="text-xs text-muted-foreground uppercase">Docs</p></div>
              <div><p className="text-lg font-semibold">{process.indicator_count || "-"}</p><p className="text-xs text-muted-foreground uppercase">KPIs</p></div>
              <div><p className={cn("text-lg font-semibold", getComplianceColor(process.compliance))}>{process.compliance}%</p><p className="text-xs text-muted-foreground uppercase">Cumplimiento</p></div>
            </div>
            <Progress value={process.compliance} className="h-2" />
          </div>
        ))}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Nuevo Proceso</DialogTitle><DialogDescription>Complete la información técnica del proceso.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1 space-y-2"><Label>Código</Label><Input value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} placeholder="Ej: PG-001" /></div>
              <div className="col-span-3 space-y-2"><Label>Nombre del Proceso</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Ej: Logística y Taller" /></div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Proceso</Label>
              <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent><SelectItem value="estratégico">Estratégico</SelectItem><SelectItem value="operativo">Operativo</SelectItem><SelectItem value="apoyo">Apoyo</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Responsables</Label><Input value={form.responsibles} onChange={(e) => setForm({...form, responsibles: e.target.value})} placeholder="Ej: Gerente Comercial, Responsable RRHH" /></div>
            <div className="space-y-2"><Label>Subprocesos (separados por coma)</Label><Textarea value={form.subprocesses} onChange={(e) => setForm({...form, subprocesses: e.target.value})} placeholder="Gestión estratégica, Auditorías, etc." rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button><Button onClick={() => saveProcess.mutate()} className="bg-primary hover:bg-primary-dark">Guardar Proceso</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Procesos;