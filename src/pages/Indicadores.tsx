import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, Plus, TrendingUp, TrendingDown, Target, Calendar, Loader2, Edit, Upload
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Indicator {
  id: number;
  name: string;
  process: string;
  objective: string;
  responsible: string;
  calculation_info: string;
  target_value: number;
  current_value: number;
  unit: string;
  frequency: string;
  input_1: string;
  input_2: string;
  formula: string;
  status: string;
  trend: string;
  last_period_value: number | null;
  period_start_date: string;
  last_update: string;
}

const statusStyles = {
  cumple: { bg: "bg-success/10", text: "text-success", border: "border-success/20", label: "Cumple" },
  "no cumple": { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "No Cumple" },
  "en proceso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", label: "En Proceso" },
};

const Indicadores = () => {
  const queryClient = useQueryClient();
  const { isEditor, user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);

  const [processFilter, setProcessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(""); // Inicializado vacío para mostrar placeholder

  const [uploadData, setUploadData] = useState({
    indicator_id: "", v1: "", v2: "", period: "", obs: ""
  });

  const [form, setForm] = useState({
    name: "", process: "", objective: "", target_value: "", current_value: "0",
    unit: "%", input_1: "", input_2: "", frequency: "Trimestral",
    responsible: "", calculation_info: "", formula: "(A/B)*100"
  });

  const { data: indicators = [], isLoading } = useQuery<Indicator[]>({
    queryKey: ["indicators"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("indicators" as any)
        .select("*")
        .order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data as Indicator[];
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const ind = indicators.find((i) => i.id.toString() === uploadData.indicator_id);
      if (!ind) return;

      const v1 = parseFloat(uploadData.v1);
      const v2 = parseFloat(uploadData.v2);
      const newResult = v2 !== 0 ? (v1 / v2) * 100 : 0;

      const periodMap: Record<string, number> = { "Mensual": 1, "Trimestral": 3, "Semestral": 6, "Anual": 12 };
      const targetMonths = periodMap[ind.frequency] || 3;
      const monthsElapsed = (new Date().getTime() - new Date(ind.period_start_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

      let newStatus = ind.status;
      let newTrend = ind.trend;
      let newLastPeriodValue = ind.last_period_value;
      let newPeriodStart = ind.period_start_date;

      if (monthsElapsed >= targetMonths) {
        newStatus = newResult >= ind.target_value ? "cumple" : "no cumple";
        if (ind.last_period_value !== null) {
          if (newResult > ind.last_period_value) newTrend = "up";
          else if (newResult < ind.last_period_value) newTrend = "down";
          else newTrend = "stable";
        }
        newLastPeriodValue = newResult;
        newPeriodStart = new Date().toISOString().split('T')[0];
      }

      await supabase.from("indicator_history" as any).insert([{
        indicator_id: ind.id, value_1: v1, value_2: v2, result: newResult,
        period_date: uploadData.period + "-01", observations: uploadData.obs
      }]);

      await supabase.from("indicators" as any).update({
        current_value: newResult, status: newStatus, trend: newTrend,
        last_period_value: newLastPeriodValue, period_start_date: newPeriodStart,
        last_update: new Date().toISOString().split('T')[0]
      }).eq("id", ind.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      toast.success("Datos cargados correctamente");
      closeModal();
    }
  });

 const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { 
        ...form, 
        target_value: parseFloat(form.target_value) || 0,
        current_value: parseFloat(form.current_value) || 0,
        last_update: new Date().toISOString().split('T')[0],
        created_by: user?.id // Vinculación para trazabilidad y RLS
      };

      if (editingIndicator) {
        const { error } = await supabase
          .from("indicators" as any)
          .update(payload)
          .eq("id", editingIndicator.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("indicators" as any)
          .insert([{ 
            ...payload, 
            period_start_date: new Date().toISOString().split('T')[0] 
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      toast.success("Operación exitosa");
      closeModal();
    },
    onError: (error: any) => {
      toast.error("Error al guardar: " + error.message);
    }
  });

  const openModal = (ind: Indicator | null = null) => {
    if (ind) {
      setEditingIndicator(ind);
      setForm({
        name: ind.name, process: ind.process || "", objective: ind.objective || "",
        target_value: ind.target_value.toString(), current_value: ind.current_value.toString(),
        unit: ind.unit || "%", input_1: ind.input_1 || "", input_2: ind.input_2 || "",
        frequency: ind.frequency || "Trimestral", responsible: ind.responsible || "",
        calculation_info: ind.calculation_info || "", formula: ind.formula || "(A/B)*100"
      });
    } else { 
      setEditingIndicator(null);
      resetForm(); 
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setIsUploadOpen(false); 
    setEditingIndicator(null); 
    resetForm(); 
    setUploadData({ indicator_id: "", v1: "", v2: "", period: "", obs: "" });
  };

  const resetForm = () => setForm({ 
    name: "", process: "", objective: "", target_value: "", current_value: "0", 
    unit: "%", input_1: "", input_2: "", frequency: "Trimestral", responsible: "", 
    calculation_info: "", formula: "" 
  });

  const filteredIndicators = indicators.filter((ind) => {
    const matchesProcess = processFilter === "all" || ind.process === processFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || ind.status === statusFilter;
    return matchesProcess && matchesStatus;
  });

  if (isLoading) return <MainLayout title="Indicadores"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout title="Indicadores" subtitle="Seguimiento de KPIs y métricas de calidad">
      
      {/* Mini Dashboard */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><Target className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.filter(i => i.status === 'cumple').length}</p><p className="text-sm text-muted-foreground">En Meta</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2"><BarChart3 className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.filter(i => i.status === 'en proceso').length}</p><p className="text-sm text-muted-foreground">En Proceso</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><TrendingDown className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.filter(i => i.status === 'no cumple').length}</p><p className="text-sm text-muted-foreground">Fuera de Meta</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Calendar className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.length}</p><p className="text-sm text-muted-foreground">Total Indicadores</p></div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={processFilter} onValueChange={setProcessFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Todos los procesos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los procesos</SelectItem>
              {Array.from(new Set(indicators.map(i => i.process))).filter(Boolean).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cumple">Cumple</SelectItem>
              <SelectItem value="en proceso">En Proceso</SelectItem>
              <SelectItem value="no cumple">No Cumple</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isEditor && (
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setIsUploadOpen(true)}><Upload className="h-4 w-4" /> Cargar Datos</Button>
            <Button onClick={() => openModal()} className="gap-2 bg-primary hover:bg-primary-dark"><Plus className="h-4 w-4" /> Nuevo Indicador</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredIndicators.map((ind, index) => {
          const style = statusStyles[ind.status as keyof typeof statusStyles] || statusStyles["en proceso"];
          const isInitial = !ind.last_period_value;

          return (
            <div key={ind.id} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              {isEditor && <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => openModal(ind)}><Edit className="h-4 w-4" /></Button>}
              <div className="mb-4 flex items-start justify-between pr-6">
                <div><h3 className="font-semibold">{ind.name}</h3><p className="text-sm text-muted-foreground">{ind.process}</p></div>
                <Badge variant="outline" className={cn(style.bg, style.text, style.border)}>{style.label}</Badge>
              </div>
              <div className="mb-4">
                <div className="mb-2 flex items-end justify-between">
                  <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-foreground">{ind.current_value}</span><span className="text-sm text-muted-foreground">{ind.unit}</span></div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground"><Target className="h-4 w-4" /> Meta: {ind.target_value}{ind.unit}</div>
                </div>
                <Progress value={(ind.current_value / (ind.target_value || 1)) * 100} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground"><Calendar className="h-4 w-4" /> {ind.frequency}</div>
                <div className="flex items-center gap-1 text-muted-foreground">
                   {isInitial ? <Target className="h-4 w-4"/> : ind.trend === "up" ? <TrendingUp className="text-success h-4 w-4"/> : <TrendingDown className="text-destructive h-4 w-4"/>}
                   <span>{isInitial ? "Tendencia" : ind.responsible}</span>
                </div>
              </div>
              <div className="mt-4 flex items-end gap-1 h-12">
                {[40, 40, 40, 40, 40, 40].map((v, i) => <div key={i} className="flex-1 rounded-sm bg-primary/20" style={{ height: `${v}%` }} />)}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingIndicator ? "Editar Indicador" : "Crear Nuevo Indicador"}</DialogTitle>
            <DialogDescription>Defina un nuevo indicador para el sistema de gestión.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Nombre del Indicador</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Ej: Tasa de Reclamaciones" /></div>
            <div className="space-y-2"><Label>Proceso</Label><Input value={form.process} onChange={(e) => setForm({...form, process: e.target.value})} placeholder="Ej: Gestión de Calidad" /></div>
            <div className="space-y-2"><Label>Responsable</Label><Input value={form.responsible} onChange={(e) => setForm({...form, responsible: e.target.value})} placeholder="Cargo o nombre" /></div>
            <div className="space-y-2"><Label>Objetivo</Label><Textarea value={form.objective} onChange={(e) => setForm({...form, objective: e.target.value})} placeholder="Descripción del objetivo" /></div>
            <div className="space-y-2"><Label>Información para el Cálculo</Label><Textarea rows={2} value={form.calculation_info} onChange={(e) => setForm({...form, calculation_info: e.target.value})} placeholder="Detalle de datos necesarios" /></div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Meta</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({...form, target_value: e.target.value})} placeholder="90" /></div>
              <div className="space-y-2"><Label>Unidad</Label><Input value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} placeholder="%" /></div>
              <div className="space-y-2"><Label>Frecuencia</Label>
                <Select value={form.frequency} onValueChange={(v) => setForm({...form, frequency: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent><SelectItem value="Trimestral">Trimestral</SelectItem><SelectItem value="Semestral">Semestral</SelectItem><SelectItem value="Anual">Anual</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Entrada 1 (A)</Label><Input value={form.input_1} onChange={(e) => setForm({...form, input_1: e.target.value})} /></div>
              <div className="space-y-2"><Label>Entrada 2 (B)</Label><Input value={form.input_2} onChange={(e) => setForm({...form, input_2: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Fórmula de Cálculo</Label><Input value={form.formula} onChange={(e) => setForm({...form, formula: e.target.value})} placeholder="Ej: (A/B)*100" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Cargar Datos de Indicador</DialogTitle><DialogDescription>Actualice el valor de un indicador existente.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Indicador</Label>
              <Select onValueChange={(v) => setUploadData({...uploadData, indicator_id: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar indicador" /></SelectTrigger>
                <SelectContent>{indicators.map((ind) => <SelectItem key={ind.id} value={ind.id.toString()}>{ind.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Valor 1 (A)</Label><Input type="number" value={uploadData.v1} onChange={(e) => setUploadData({...uploadData, v1: e.target.value})} placeholder="0" /></div>
              <div className="space-y-2"><Label>Valor 2 (B)</Label><Input type="number" value={uploadData.v2} onChange={(e) => setUploadData({...uploadData, v2: e.target.value})} placeholder="0" /></div>
              <div className="space-y-2"><Label>Período</Label><Input type="month" value={uploadData.period} onChange={(e) => setUploadData({...uploadData, period: e.target.value})} /></div>
            </div>
            <div className="space-y-2"><Label>Observaciones</Label><Input value={uploadData.obs} onChange={(e) => setUploadData({...uploadData, obs: e.target.value})} placeholder="Comentarios opcionales" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeModal}>Cancelar</Button><Button onClick={() => uploadMutation.mutate()} disabled={uploadMutation.isPending}>Guardar Datos</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Indicadores;