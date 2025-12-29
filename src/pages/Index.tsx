import { FileText, BarChart3, CheckCircle, AlertTriangle } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import StatCard from "@/components/dashboard/StatCard";
import RecentDocuments from "@/components/dashboard/RecentDocuments";
import IndicatorProgress from "@/components/dashboard/IndicatorProgress";
import QuickActions from "@/components/dashboard/QuickActions";
import UpcomingAudits from "@/components/dashboard/UpcomingAudits";

const Index = () => {
  return (
    <MainLayout title="Dashboard" subtitle="Sistema de Gestión de Calidad ISO 9001:2015">
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Documentos Activos"
          value={156}
          description="32 actualizados este mes"
          icon={FileText}
          variant="primary"
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Indicadores"
          value={24}
          description="18 en meta"
          icon={BarChart3}
          variant="secondary"
          trend={{ value: 8, positive: true }}
        />
        <StatCard
          title="Auditorías Completadas"
          value={8}
          description="De 12 programadas"
          icon={CheckCircle}
          variant="accent"
        />
        <StatCard
          title="No Conformidades"
          value={5}
          description="3 pendientes de cierre"
          icon={AlertTriangle}
          variant="default"
          trend={{ value: -15, positive: true }}
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
          <QuickActions />
          <IndicatorProgress />
          <UpcomingAudits />
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;