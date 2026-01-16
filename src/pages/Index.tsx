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

// Diálogos y Formulario
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DocumentForm from "@/components/forms/DocumentForm";
import IndicatorMeasurementForm from "@/components/forms/IndicatorMeasurementForm";

const Index = () => {
  const [activeModal, setActiveModal] = useState<"upload_doc" | "record_indicator" | "create_audit" | null>(null);

  // Consulta de estadísticas globales
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [docs, inds, audits, findings] = await Promise.all([
        supabase.from("documents" as any).select("*", { count: "exact", head: true }),
        supabase.from("indicators" as any).select("status, current_value, target_value"),
        supabase.from("audits" as any).select("status"),
        supabase.from("audit_findings" as any).select("id").eq("status", "abierto")
      ]);

      const indicators = (inds.data as any[]) || [];
      const auditsData = (audits.data as any[]) || [];

      return {
        docsTotal: docs.count || 0,
        indsInMeta: indicators.filter(i => i.status === "cumple").length,
        indsTotal: indicators.length,
        auditsDone: auditsData.filter(a => a.status === "completada").length,
        auditsTotal: auditsData.length,
        findingsOpen: (findings.data as any[])?.length || 0
      };
    }
  });

  // Query adicional para pasar la lista de indicadores al formulario de carga
  const { data: indicators = [] } = useQuery({
    queryKey: ["indicators-list"],
    queryFn: async () => {
      const { data } = await supabase.from("indicators" as any).select("*");
      return data || [];
    }
  });

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
          description="Total en el sistema"
          icon={FileText}
          variant="primary"
        />
        <StatCard
          title="Indicadores"
          value={`${stats?.indsInMeta}/${stats?.indsTotal}`}
          description="Cumpliendo meta"
          icon={BarChart3}
          variant="secondary"
        />
        <StatCard
          title="Auditorías"
          value={`${stats?.auditsDone}/${stats?.auditsTotal}`}
          description="Completadas"
          icon={CheckCircle}
          variant="accent"
        />
        <StatCard
          title="No Conformidades"
          value={stats?.findingsOpen || 0}
          description="Pendientes de cierre"
          icon={AlertTriangle}
          variant="default"
        />
      </div>

      

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Documents */}
        <div className="lg:col-span-2">
          <RecentDocuments />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <QuickActions 
            onUploadDoc={() => setActiveModal("upload_doc")}
            onRecordIndicator={() => setActiveModal("record_indicator")}
            onCreateAudit={() => setActiveModal("create_audit")}
          />
          <IndicatorProgress />
          <UpcomingAudits />
        </div>
      </div>

      {/* MODAL: SUBIR DOCUMENTO */}
      <Dialog open={activeModal === "upload_doc"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Subir Nuevo Documento</DialogTitle>
            <DialogDescription>Cargue un registro oficial al sistema documental.</DialogDescription>
          </DialogHeader>
          <DocumentForm onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      {/* MODAL: REGISTRAR INDICADOR */}
      <Dialog open={activeModal === "record_indicator"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Cargar Medición de Indicador</DialogTitle>
            <DialogDescription>Actualice los valores actuales de desempeño.</DialogDescription>
          </DialogHeader>
          <IndicatorMeasurementForm indicators={indicators} onSuccess={() => setActiveModal(null)} />
        </DialogContent>
      </Dialog>

      {/* MODAL: NUEVA AUDITORÍA / PROCEDIMIENTO */}
      <Dialog open={activeModal === "create_audit"} onOpenChange={() => setActiveModal(null)}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning mb-4" />
          <DialogHeader>
            <DialogTitle>Módulo en Desarrollo</DialogTitle>
            <DialogDescription>
              La creación de auditorías se habilitará una vez finalizada la configuración de hallazgos.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

    </MainLayout>
  );
};

export default Index;