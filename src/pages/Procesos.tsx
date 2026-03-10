import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { FileText, BarChart3, Target, Loader2, Plus, Edit } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import ProcessForm from "@/components/forms/ProcessForm";

const getComplianceColor = (compliance: number) => {
  if (compliance >= 90) return "text-success";
  if (compliance >= 75) return "text-warning";
  return "text-destructive";
};

const Procesos = () => {
  const queryClient = useQueryClient();
  const { isAdmin, canManageProcess } = useAuth();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<any>(null);

  const handleEditProcess = (e: React.MouseEvent, process: any) => {
    e.stopPropagation(); 
    setEditingProcess(process);
    setIsModalOpen(true);
  };
  
  const { data: processes = [], isLoading, isFetching } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
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

  return (
    <MainLayout title="Procesos" subtitle="Mapa estratégico del Sistema de Gestión">
      {(isLoading || isFetching) ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div key="map-view" className="animate-fade-in">
          <div className="mb-6 flex justify-end">
            {isAdmin && (
              <Button 
                onClick={() => setIsModalOpen(true)} 
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:shadow-md"
              >
                <Plus className="h-4 w-4" /> Nuevo Proceso
              </Button>
            )}
          </div>
          
          <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-all duration-300">
            <h3 className="mb-4 text-lg font-semibold">Mapa de Procesos ISO 9001:2015</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {['estratégico', 'operativo', 'apoyo'].map((type) => (
                <div key={type} className={cn("rounded-lg p-4 transition-colors", type === 'estratégico' ? "bg-primary/5 hover:bg-primary/10" : type === 'operativo' ? "bg-secondary/10 hover:bg-secondary/20" : "bg-accent/10 hover:bg-accent/20")}>
                  <h4 className="mb-3 text-sm font-medium capitalize">
                    {type === 'apoyo' ? 'Procesos de Apoyo' : `Procesos ${type}s`}
                  </h4>
                  <div className="space-y-2">
                    {processes.filter((p: any) => p.type === type).map((p: any) => (
                      <div 
                        key={p.id} 
                        onClick={() => navigate(`/procesos/${p.id}`)} 
                        className="rounded bg-card p-2 text-sm shadow-sm cursor-pointer hover:border-primary border transition-colors"
                      >
                        {p.name}
                      </div>
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
                onClick={() => navigate(`/procesos/${process.id}`)} 
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
                </div>

                <div className="mb-4 grid grid-cols-3 gap-4 text-center">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground h-4">
                      <FileText className="h-4 w-4" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mt-1">{process.doc_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Documentos</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground h-4">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <p className="text-lg font-semibold text-foreground mt-1">{process.indicator_count || "-"}</p>
                    <p className="text-xs text-muted-foreground">Indicadores</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground h-4">
                      <Target className="h-4 w-4" />
                    </div>
                    <p className={`text-lg font-semibold mt-1 ${getComplianceColor(process.compliance)}`}>
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