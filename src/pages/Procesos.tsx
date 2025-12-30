import { FolderOpen, FileText, Users, ChevronRight, BarChart3 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const processes = [
  {
    id: 1,
    name: "Gestión Empresarial",
    code: "PD",
    owner: "Gerente Comercial, Gerente Financiero",
    documents: 12,
    indicators: 4,
    compliance: 95,
    subprocesses: ["Planificación Estratégica", "Revisión por la Dirección", "Comunicación"],
  },
  {
    id: 2,
    name: "Gestión de competencias",
    code: "GC",
    owner: "Responsable de Recursos Humanos",
    documents: 18,
    indicators: 6,
    compliance: 88,
    subprocesses: ["Gestión de la polivalencia", "Detección de necesidades de capacitación", "Ejecución de la capacitación"],
  },
  {
    id: 3,
    name: "Logística",
    code: "PR",
    owner: "Responsable de compras, Responsable de Taller y Logística",
    documents: 35,
    indicators: 8,
    compliance: 92,
    subprocesses: ["Retiro de la compra", "Traslado", "Entrega"],
  },
  {
    id: 4,
    name: "Gestión de Calidad",
    code: "GQ",
    owner: "Responsable de Calidad",
    documents: 28,
    indicators: 10,
    compliance: 97,
    subprocesses: ["Control de Documentos", "Auditorías", "Mejora Continua", "No Conformidades"],
  },
  {
    id: 5,
    name: "Recursos Humanos",
    code: "RH",
    owner: "Responsable de RRHH",
    documents: 22,
    indicators: 5,
    compliance: 85,
    subprocesses: ["Selección", "Formación", "Evaluación del Desempeño"],
  },
  {
    id: 6,
    name: "Compras",
    code: "CO",
    owner: "Responsable de Compras",
    documents: 15,
    indicators: 4,
    compliance: 90,
    subprocesses: ["Evaluación de Proveedores", "Generación de la Orden de Compra y comunicación al proveedor", "Retiro de bienes", "Carga de factura y Pago del proveedor"],
  },
];

const getComplianceColor = (compliance: number) => {
  if (compliance >= 90) return "text-success";
  if (compliance >= 75) return "text-warning";
  return "text-destructive";
};

const getComplianceBg = (compliance: number) => {
  if (compliance >= 90) return "bg-success";
  if (compliance >= 75) return "bg-warning";
  return "bg-destructive";
};

const Procesos = () => {
  return (
    <MainLayout title="Procesos" subtitle="Mapa de procesos del Sistema de Gestión de Calidad">
      {/* Process Map Overview */}
      <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Mapa de Procesos ISO 9001:2015</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Strategic Processes */}
          <div className="rounded-lg bg-primary/5 p-4">
            <h4 className="mb-3 text-sm font-medium text-primary">Procesos Estratégicos</h4>
            <div className="space-y-2">
              <div className="rounded bg-card p-2 text-sm shadow-sm">Sistema de Gestión de la Calidad</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Atención al cliente</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Gestión Empresarial</div>
            </div>
          </div>
          
          {/* Core Processes */}
          <div className="rounded-lg bg-secondary/10 p-4">
            <h4 className="mb-3 text-sm font-medium text-secondary">Procesos Operativos</h4>
            <div className="space-y-2">
              <div className="rounded bg-card p-2 text-sm shadow-sm">Planificación</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Ejecución</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Pre Entrega</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Control de calidad</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Entrega Final</div>
              
            </div>
          </div>
          
          {/* Support Processes */}
          <div className="rounded-lg bg-accent/10 p-4">
            <h4 className="mb-3 text-sm font-medium text-accent">Procesos de Apoyo</h4>
            <div className="space-y-2">
              <div className="rounded bg-card p-2 text-sm shadow-sm">Gestión de competencias</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Compras</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Comunicacion</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Gestión de proveedores</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Logística</div>
              <div className="rounded bg-card p-2 text-sm shadow-sm">Pago a proveedores</div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {processes.map((process, index) => (
          <div
            key={process.id}
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                  {process.code}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {process.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">{process.owner}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Stats */}
            <div className="mb-4 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold text-foreground">{process.documents}</p>
                <p className="text-xs text-muted-foreground">Documentos</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold text-foreground">{process.indicators}</p>
                <p className="text-xs text-muted-foreground">Indicadores</p>
              </div>
              <div className="text-center">
                <p className={`text-lg font-semibold ${getComplianceColor(process.compliance)}`}>
                  {process.compliance}%
                </p>
                <p className="text-xs text-muted-foreground">Cumplimiento</p>
              </div>
            </div>

            {/* Compliance Progress */}
            <div className="mb-4">
              <Progress 
                value={process.compliance} 
                className="h-2"
              />
            </div>

            {/* Subprocesses */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Subprocesos
              </p>
              <div className="flex flex-wrap gap-1">
                {process.subprocesses.map((sub) => (
                  <Badge 
                    key={sub} 
                    variant="secondary" 
                    className="text-xs font-normal"
                  >
                    {sub}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
};

export default Procesos;