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
  const { isAdmin, isEditor, canManageProcess, loading: authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<any | null>(null);
  const [processFilter, setProcessFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); 

  const { data: processes = [], isLoading: isLoadingProcesses } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes").select("id, name, manager_ids");
      return (data || []) as any[];
    }
  });

  const { data: rawIndicators = [], isLoading: isLoadingIndicators } = useQuery({
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

  // UNIFICAMOS LOS ESTADOS DE CARGA PARA EVITAR EL PESTAÑEO
  const isPageLoading = isLoadingIndicators || isLoadingProcesses || authLoading;

  if (isPageLoading) {
    return (
      <MainLayout title="Indicadores" subtitle="Seguimiento de indicadores y métricas de calidad">
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Indicadores" subtitle="Seguimiento de indicadores y métricas de calidad">
      <div key="indicadores-view" className="animate-fade-in w-full">
        
        {/* TARJETAS SUPERIORES */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4 animate-fade-in">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2"><Target className="h-5 w-5 text-success" /></div>
              <div><p className="text-2xl font-bold text-foreground group-hover:text-success transition-colors">{indicators.filter(i => i.computedStatus === 'cumple').length}</p><p className="text-sm text-muted-foreground">En Meta</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2"><BarChart3 className="h-5 w-5 text-warning" /></div>
              <div><p className="text-2xl font-bold text-foreground group-hover:text-warning transition-colors">{indicators.filter(i => i.computedStatus === 'en proceso').length}</p><p className="text-sm text-muted-foreground">En Proceso</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-destructive/10 p-2"><TrendingDown className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors">{indicators.filter(i => i.computedStatus === 'no cumple').length}</p><p className="text-sm text-muted-foreground">Fuera de Meta</p></div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group cursor-default">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2"><Calendar className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{indicators.length}</p><p className="text-sm text-muted-foreground">Total</p></div>
            </div>
          </div>
        </div>

        {/* FILTROS Y BOTONES */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <Select value={processFilter} onValueChange={setProcessFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Proceso" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los procesos</SelectItem>{processes.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="cumple">Cumple</SelectItem><SelectItem value="en proceso">En Proceso</SelectItem><SelectItem value="no cumple">No Cumple</SelectItem></SelectContent></Select>
          </div>
          <div className="flex gap-3">
            {(isAdmin || (isEditor && indicatorsAllowedToUpload.length > 0)) && (<Button variant="outline" onClick={() => setIsUploadOpen(true)} className="hover:shadow-md transition-all"><Upload className="mr-2 h-4 w-4" /> Cargar Datos</Button>)}
            {isAdmin && (<Button onClick={() => {setEditingIndicator(null); setIsModalOpen(true);}} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:shadow-md"><Plus className="h-4 w-4" /> Nuevo Indicador</Button>)}
          </div>
        </div>

        {/* GRILLA DE TARJETAS */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 animate-slide-up">
          {filteredIndicators.map((ind, index) => {
            const style = statusStyles[ind.computedStatus as keyof typeof statusStyles] || statusStyles["en proceso"];
            const TrendIcon = trendIcons[ind.computedTrend] || Minus;
            
            const maxValue = Math.max(...ind.historyArray.map((h: any) => Number(h.value)), Number(ind.target_value));
            const unit = (ind.unit || "").toLowerCase();
            const isInverse = unit.includes("hr") || unit.includes("día") || unit.includes("dia");
            const target = Number(ind.target_value);

            return (
              <div key={ind.id} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all hover:border-primary/20">
                
                {/* Botón de edición en Absolute (Top-Right) */}
                {canManageProcess(ind.manager_ids) && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-10" 
                    onClick={() => {setEditingIndicator(ind); setIsModalOpen(true);}}
                  >
                    <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                  </Button>
                )}

                {/* Contenedor Flex para el Título y la Etiqueta (con margen mt-1 y pr-6 para separarse del botón) */}
                <div className="mb-4 mt-1 pr-6 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors pr-2">{ind.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{ind.process}</p>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    <Badge className={cn(style.bg, style.text, style.border, "transition-colors")} variant="outline">{style.label}</Badge>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="mb-2 flex items-baseline justify-between"><div className="flex items-baseline gap-1"><span className="text-3xl font-bold">{ind.computedCurrent}</span><span className="text-sm text-muted-foreground">{ind.unit}</span></div><div className="text-sm text-muted-foreground">Meta: {ind.target_value}</div></div>
                  <Progress value={ind.computedProgress} className="h-2" />
                </div>

                {/* Contenedor de mini-barras del historial GRISES con Tooltip Estructurado */}
                {ind.historyArray.length > 0 && (
                  <div className="mb-4 mt-2 h-10 w-full flex items-end gap-1 px-1">
                      {ind.historyArray.slice(-10).map((h: any, i: number) => {
                          const val = Number(h.value);
                          const heightPct = maxValue > 0 ? (val / maxValue) * 100 : 0;
                          
                          let pct = 0;
                          if (isInverse) {
                            pct = val <= target ? 100 : (target / val) * 100;
                          } else {
                            pct = val >= target ? 100 : (val / target) * 100;
                          }
                          const formattedPct = Math.round(pct);
                          
                          // Tooltip con el formato exacto solicitado
                          const tooltipText = `${h.period}\nValor registrado: ${val}${ind.unit} (${formattedPct}% DE CUMPLIMIENTO)` + (h.comments ? `\n${h.comments}` : "");

                          return (
                              <div 
                                  key={i} 
                                  className="flex-1 rounded-t-sm transition-all relative group/bar cursor-pointer" 
                                  style={{ height: `${Math.max(10, heightPct)}%` }}
                                  title={tooltipText}
                              >
                                  <div className="absolute inset-0 rounded-t-sm w-full h-full bg-muted-foreground/20 hover:bg-muted-foreground/50 transition-colors"></div>
                              </div>
                          )
                      })}
                  </div>
                )}
                {ind.historyArray.length === 0 && (
                    <div className="mb-4 mt-2 h-10 w-full flex items-center justify-center text-xs text-muted-foreground italic border border-dashed border-border rounded bg-muted/30">Sin mediciones previas</div>
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
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

      </div>
    </MainLayout>
  );
};

export default Indicadores;