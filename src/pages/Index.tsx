import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileText, BarChart3, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import RecentDocuments from "@/components/dashboard/RecentDocuments";
import IndicatorProgress from "@/components/dashboard/IndicatorProgress";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAudits from "@/components/dashboard/UpcomingAudits";

// Diálogos y Formularios
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentForm from "@/components/forms/DocumentForm";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";
import ProcessForm from "@/components/forms/ProcessForm";
import FindingForm from "@/components/forms/FindingForm";

const Index = () => {
  // Estado para controlar qué modal está activo
  const [activeModal, setActiveModal] = useState<"upload_doc" | "record_indicator" | "new_finding" | "create_process" | null>(null);

  // 1. Consulta de estadísticas globales
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [docs, inds, audits, findRes] = await Promise.all([
        supabase.from("documents" as any).select("*", { count: "exact", head: true }),
        supabase.from("indicators" as any).select("status"),
        supabase.from("audits" as any).select("status"),
        supabase.from("findings" as any).select("id").eq("status", "abierto")
      ]);

      const indicators = (inds.data as any[]) || [];
      const auditsData = (audits.data as any[]) || [];

      return {
        docsTotal: docs.count || 0,
        indsInMeta: indicators.filter(i => i.status === "cumple").length,
        indsTotal: indicators.length,
        auditsDone: auditsData.filter(a => a.status === "completada").length,
        auditsTotal: auditsData.length,
        findingsOpen: (findRes.data as any[])?.length || 0
      };
    }
  });

  // 2. Consulta de Indicadores (Lista para Dashboard y Modal)
  const { data: indicators = [], isLoading: isLoadingInds } = useQuery({
    queryKey: ["indicators-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("indicators" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    }
  });

  // 3. Consulta de Documentos Recientes
  const { data: recentDocs = [] } = useQuery({
    queryKey: ["recent-documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents_view" as any) 
        .select("*")
        .order("uploaded_at", { ascending: false }) 
        .limit(10);
      return (data || []) as any[];
    }
  });

  // 4. Consulta de Auditorías Próximas Reales
  const { data: upcomingAudits = [], isLoading: isLoadingAudits } = useQuery({
    queryKey: ["upcoming-audits"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("audits" as any)
        .select("*")
        .gt("scheduled_date", now)
        .order("scheduled_date", { ascending: true })
        .limit(5);
      return (data || []) as any[];
    }
  });

  const isLoading = isLoadingStats || isLoadingInds || isLoadingAudits;

  if (isLoading) {
    return (
      <MainLayout title="Dashboard">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard" subtitle="Sistema de Gestión de Calidad ISO 9001:2015">
      
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Documentos Activos"
          value={stats?.docsTotal || 0}
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="Indicadores"
          value={`${stats?.indsInMeta}/${stats?.indsTotal}`}
          icon={BarChart3}
          variant="secondary"
        />
        <StatCard
          title="Auditorías"
          value={`${stats?.auditsDone}/${stats?.auditsTotal}`}
          icon={CheckCircle}
          variant="accent"
        />
        <StatCard
          title="No Conformidades"
          value={stats?.findingsOpen || 0}
          icon={AlertTriangle}
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lado Izquierdo - Documentos */}
        <div className="lg:col-span-2">
          <RecentDocuments documents={recentDocs} />
        </div>

        {/* Lado Derecho - Acciones y Widgets */}
        <div className="space-y-6">
          <QuickActions 
            onUploadDoc={() => setActiveModal("upload_doc")}
            onRecordIndicator={() => setActiveModal("record_indicator")}
            onNewFinding={() => setActiveModal("new_finding")}
            onCreateProcess={() => setActiveModal("create_process")}
          />
          <IndicatorProgress indicators={indicators.slice(0, 5)} />
          <UpcomingAudits audits={upcomingAudits} />
        </div>
      </div>

      {/* MODAL: SUBIR DOCUMENTO */}
      <Dialog open={activeModal === "upload_doc"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subir Nuevo Documento</DialogTitle>
          </DialogHeader>
          <DocumentForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      {/* MODAL: REGISTRAR INDICADOR */}
      <Dialog open={activeModal === "record_indicator"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cargar Medición de Indicador</DialogTitle>
          </DialogHeader>
          <IndicatorMeasurementForm indicators={indicators} onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      {/* MODAL: NUEVO HALLAZGO */}
      <Dialog open={activeModal === "new_finding"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Hallazgo</DialogTitle>
            <DialogDescription>Detección de desviaciones o mejoras fuera de auditorías.</DialogDescription>
          </DialogHeader>
          <FindingForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      {/* MODAL: CREAR PROCEDIMIENTO / PROCESO */}
      <Dialog open={activeModal === "create_process"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo Proceso / Procedimiento</DialogTitle>
          </DialogHeader>
          <ProcessForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
};

export default Index;