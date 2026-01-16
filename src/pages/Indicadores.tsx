import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import IndicatorForm from "@/components/forms/IndicatorForm";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";

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
  const { isEditor } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<Indicator | null>(null);

  const [processFilter, setProcessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState(""); 

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await (supabase.from("processes" as any).select("id, name") as any);
      return (data || []) as any[];
    }
  });

  const { data: indicators = [], isLoading } = useQuery<Indicator[]>({
    queryKey: ["indicators"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("indicators" as any).select("*").order("created_at", { ascending: false }) as any);
      if (error) throw error;
      return data as Indicator[];
    }
  });

  const openModal = (ind: Indicator | null = null) => {
    setEditingIndicator(ind);
    setIsModalOpen(true);
  };

  const closeModal = () => { 
    setIsModalOpen(false); 
    setIsUploadOpen(false); 
    setEditingIndicator(null); 
  };

  const filteredIndicators = indicators.filter((ind) => {
    const matchesProcess = processFilter === "all" || ind.process === processFilter;
    const matchesStatus = !statusFilter || statusFilter === "all" || ind.status === statusFilter;
    return matchesProcess && matchesStatus;
  });

  if (isLoading) return <MainLayout title="Indicadores"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout title="Indicadores" subtitle="Seguimiento de KPIs y métricas de calidad">
      
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
              {processes.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
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
                   <span>{ind.responsible}</span>
                </div>
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
          <IndicatorForm editingIndicator={editingIndicator} onSuccess={closeModal} />
        </DialogContent>
      </Dialog>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Cargar Datos de Indicador</DialogTitle><DialogDescription>Actualice el valor de un indicador existente.</DialogDescription></DialogHeader>
          <IndicatorMeasurementForm indicators={indicators} onSuccess={closeModal} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Indicadores;