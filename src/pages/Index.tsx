import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth"; 
import { FileText, BarChart3, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import RecentDocuments from "@/components/dashboard/RecentDocuments";
import IndicatorProgress from "@/components/dashboard/IndicatorProgress";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAudits from "@/components/dashboard/UpcomingAudits";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentForm from "@/components/forms/DocumentForm";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";
import ProcessForm from "@/components/forms/ProcessForm";
import FindingForm from "@/components/forms/FindingForm";

const Index = () => {
  const { isAdmin, isEditor } = useAuth();
  const [activeModal, setActiveModal] = useState<"upload_doc" | "record_indicator" | "new_finding" | "create_process" | null>(null);

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
   queryFn: async () => {
      // Forzamos 'as any' en las respuestas para saltar el error de inferencia de TS
      const [docsRes, indsRes, auditsRes, findRes]: any[] = await Promise.all([
        supabase.from("documents" as any).select("id"),
        supabase.from("indicators" as any).select("id, target_value"),
        supabase.from("audits" as any).select("status"),
        supabase.from("findings" as any).select("status, type")
      ]);

      // Hacemos lo mismo con las mediciones
      const { data: measurements }: any = await supabase
        .from("indicator_measurements" as any)
        .select("indicator_id, value")
        .order("created_at", { ascending: false });

      const indsData = indsRes.data || [];
      const measData = measurements || [];

      // Cálculo de indicadores que cumplen la meta
      const indsInMeta = indsData.filter((indicator: any) => {
        const lastMeas = measData.find((m: any) => m.indicator_id === indicator.id);
        if (!lastMeas) return false;
        // Comparamos valores numéricos
        return Number(lastMeas.value) >= Number(indicator.target_value);
      }).length;

      return {
        docsTotal: (docsRes.data || []).length,
        indsInMeta,
        indsTotal: indsData.length,
        auditsDone: (auditsRes.data || []).filter((a: any) => 
          ["finalizada", "completada", "cerrada"].includes(a.status?.toLowerCase())
        ).length,
        auditsTotal: (auditsRes.data || []).length,
        findingsOpen: (findRes.data || []).filter((f: any) => 
          ["abierto", "pendiente"].includes(f.status?.toLowerCase()) && f.type === "no_conformidad"
        ).length
      };
    }
  });

  const { data: indicators = [], isLoading: isLoadingInds } = useQuery({
    queryKey: ["indicators-list"],
    queryFn: async () => {
      const { data } = await supabase.from("indicators").select("*").order("created_at", { ascending: false });
      return (data || []) as any[];
    }
  });

  const { data: recentDocs = [] } = useQuery({
    queryKey: ["recent-documents"],
    queryFn: async () => {
      const { data } = await supabase.from("documents_view" as any).select("*").order("uploaded_at", { ascending: false }).limit(10);
      return (data || []) as any[];
    }
  });

  const { data: upcomingAudits = [], isLoading: isLoadingAudits } = useQuery({
    queryKey: ["upcoming-audits"],
    queryFn: async () => {
      const { data } = await supabase.from("audits").select("*").gt("scheduled_date", new Date().toISOString()).order("scheduled_date", { ascending: true }).limit(5);
      return (data || []) as any[];
    }
  });

  if (isLoadingStats || isLoadingInds || isLoadingAudits) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle="Sistema de Gestión de Calidad ISO 9001:2015">
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        <StatCard title="Documentos Activos" value={stats?.docsTotal || 0} icon={FileText} variant="primary" />
        <StatCard title="Indicadores" value={`${stats?.indsInMeta}/${stats?.indsTotal}`} icon={BarChart3} variant="secondary" />
        <StatCard title="Auditorías" value={`${stats?.auditsDone}/${stats?.auditsTotal}`} icon={CheckCircle} variant="accent" />
        <StatCard title="No Conformidades" value={stats?.findingsOpen || 0} icon={AlertTriangle} variant="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><RecentDocuments documents={recentDocs} /></div>
        <div className="space-y-6">
          {(isAdmin || isEditor) && (
            <QuickActions 
              onUploadDoc={() => setActiveModal("upload_doc")}
              onRecordIndicator={() => setActiveModal("record_indicator")}
              onNewFinding={() => setActiveModal("new_finding")}
              onCreateProcess={isAdmin ? () => setActiveModal("create_process") : undefined}
            />
          )}
          <IndicatorProgress indicators={indicators.slice(0, 5)} />
          <UpcomingAudits audits={upcomingAudits} />
        </div>
      </div>

      <Dialog open={activeModal === "upload_doc"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Subir Nuevo Documento</DialogTitle></DialogHeader>
          <DocumentForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "record_indicator"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Cargar Medición de Indicador</DialogTitle></DialogHeader>
          <IndicatorMeasurementForm indicators={indicators} onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "new_finding"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Nuevo Hallazgo</DialogTitle></DialogHeader>
          <FindingForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      <Dialog open={activeModal === "create_process"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Crear Nuevo Proceso</DialogTitle></DialogHeader>
          <ProcessForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Index;