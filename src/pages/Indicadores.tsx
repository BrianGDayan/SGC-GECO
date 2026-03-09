import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth"; 
import { BarChart3, Plus, TrendingUp, TrendingDown, Target, Calendar, Loader2, Edit, Upload, Minus } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import IndicatorForm from "@/components/forms/IndicatorForm";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";

const statusStyles = {
  cumple: { bg: "bg-success/10", text: "text-success", border: "border-success/20", label: "Cumple" },
  "no cumple": { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "No Cumple" },
  "en proceso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", label: "En Proceso" },
};

const trendIcons: Record<string, any> = { up: TrendingUp, down: TrendingDown, stable: Minus };

const Indicadores = () => {
  const { isAdmin, isEditor, canManageProcess } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<any | null>(null);
  const [processFilter, setProcessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes").select("id, name, manager_ids");
      return (data || []) as any[];
    }
  });

  const { data: rawIndicators = [], isLoading } = useQuery({
    queryKey: ["indicators-with-history"],
    queryFn: async () => {
      const { data } = await supabase.from("indicators").select("*, indicator_measurements(value, period, comments, created_at)").order("created_at", { ascending: false });
      return (data || []) as any[];
    }
  });

  const indicators = rawIndicators.map((ind: any) => {
    const historyObjects = (ind.indicator_measurements || []).sort((a: any, b: any) => a.period.localeCompare(b.period));
    const hasHistory = historyObjects.length > 0;
    const current = hasHistory ? Number(Number(historyObjects[historyObjects.length - 1].value).toFixed(1)) : 0;
    const previous = historyObjects.length > 1 ? Number(historyObjects[historyObjects.length - 2].value) : current;
    const target = Number(ind.target_value) || 1;
    const unit = (ind.unit || "").toLowerCase();
    const isInverse = unit.includes("hr") || unit.includes("día") || unit.includes("dia");

    let trend = "stable";
    if (current > previous) trend = "up";
    if (current < previous) trend = "down";

    let status = "en proceso";
    if (hasHistory) {
      status = isInverse ? (current <= target ? "cumple" : "no cumple") : (current >= target ? "cumple" : "no cumple");
    }

    const associatedProcess = processes.find(p => p.name === ind.process);
    return {
      ...ind,
      computedCurrent: current,
      computedTrend: trend,
      computedTrendColor: trend === "up" ? (isInverse ? "text-destructive" : "text-success") : (trend === "down" ? (isInverse ? "text-success" : "text-destructive") : "text-muted-foreground"),
      computedStatus: status,
      computedProgress: isInverse ? Math.max(0, Math.min(100, ((target - current) / target) * 100 + 50)) : Math.min(100, (current / target) * 100),
      historyArray: historyObjects,
      manager_ids: associatedProcess?.manager_ids || []
    };
  });

  const filteredIndicators = indicators.filter((ind) => {
    const matchesProcess = processFilter === "all" || ind.process === processFilter;
    const matchesStatus = statusFilter === "all" || ind.computedStatus === statusFilter;
    return matchesProcess && matchesStatus;
  });

  const indicatorsAllowedToUpload = isAdmin ? rawIndicators : indicators.filter(ind => canManageProcess(ind.manager_ids));

  if (isLoading) return <MainLayout title="Indicadores"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout title="Indicadores" subtitle="Seguimiento de indicadores y métricas de calidad">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><Target className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.filter(i => i.computedStatus === 'cumple').length}</p><p className="text-sm text-muted-foreground">En Meta</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2"><BarChart3 className="h-5 w-5 text-warning" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.filter(i => i.computedStatus === 'en proceso').length}</p><p className="text-sm text-muted-foreground">En Proceso</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><TrendingDown className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.filter(i => i.computedStatus === 'no cumple').length}</p><p className="text-sm text-muted-foreground">Fuera de Meta</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><Calendar className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground">{indicators.length}</p><p className="text-sm text-muted-foreground">Total</p></div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={processFilter} onValueChange={setProcessFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Proceso" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los procesos</SelectItem>{processes.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="cumple">Cumple</SelectItem><SelectItem value="en proceso">En Proceso</SelectItem><SelectItem value="no cumple">No Cumple</SelectItem></SelectContent></Select>
        </div>
        <div className="flex gap-3">
          {(isAdmin || (isEditor && indicatorsAllowedToUpload.length > 0)) && (<Button variant="outline" onClick={() => setIsUploadOpen(true)}><Upload className="mr-2 h-4 w-4" /> Cargar Datos</Button>)}
          {isAdmin && (<Button onClick={() => {setEditingIndicator(null); setIsModalOpen(true);}}><Plus className="mr-2 h-4 w-4" /> Nuevo Indicador</Button>)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {filteredIndicators.map((ind, index) => {
          const style = statusStyles[ind.computedStatus as keyof typeof statusStyles] || statusStyles["en proceso"];
          const TrendIcon = trendIcons[ind.computedTrend] || Minus;
          return (
            <div key={ind.id} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all">
              {canManageProcess(ind.manager_ids) && (<Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => {setEditingIndicator(ind); setIsModalOpen(true);}}><Edit className="h-4 w-4" /></Button>)}
              <div className="mb-4 flex items-start justify-between">
                <div><h3 className="font-semibold leading-tight">{ind.name}</h3><p className="text-xs text-muted-foreground">{ind.process}</p></div>
                <Badge className={cn(style.bg, style.text, style.border)} variant="outline">{style.label}</Badge>
              </div>
              <div className="mb-4">
                <div className="mb-2 flex items-baseline justify-between"><div className="flex items-baseline gap-1"><span className="text-3xl font-bold">{ind.computedCurrent}</span><span className="text-sm text-muted-foreground">{ind.unit}</span></div><div className="text-sm text-muted-foreground">Meta: {ind.target_value}</div></div>
                <Progress value={ind.computedProgress} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {ind.frequency}</div>
                <div className={cn("flex items-center gap-1 font-medium", ind.computedTrendColor)}><TrendIcon className="h-4 w-4" /> Tendencia</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Nuevo/Editar Indicador */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto !top-[2.5vh] !translate-y-0">
          <DialogHeader>
            <DialogTitle>{editingIndicator ? "Editar Indicador" : "Nuevo Indicador"}</DialogTitle>
          </DialogHeader>
          <IndicatorForm editingIndicator={editingIndicator} onSuccess={() => setIsModalOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal para Cargar Medición */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto !top-[2.5vh] !translate-y-0">
          <DialogHeader>
            <DialogTitle>Cargar Medición</DialogTitle>
          </DialogHeader>
          <IndicatorMeasurementForm 
            indicators={indicatorsAllowedToUpload} 
            onSuccess={() => setIsUploadOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Indicadores;