import { 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  AlertTriangle,
  FileText,
  Plus,
  ChevronRight
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const audits = [
  {
    id: 1,
    name: "Auditoría Interna Q1 2025",
    type: "interna",
    status: "completada",
    date: "2025-01-15",
    auditor: "Auditor 1",
    scope: ["Producción", "Calidad"],
    findings: { major: 0, minor: 2, observations: 5 },
    progress: 100,
  },
  {
    id: 2,
    name: "Auditoría de Certificación ISO 9001",
    type: "externa",
    status: "programada",
    date: "2025-03-10",
    auditor: "Bureau Veritas",
    scope: ["Todos los procesos"],
    findings: null,
    progress: 0,
  },
  {
    id: 3,
    name: "Auditoría Interna - RRHH",
    type: "interna",
    status: "en curso",
    date: "2025-01-20",
    auditor: "Auditor 2",
    scope: ["Recursos Humanos", "Formación"],
    findings: { major: 1, minor: 1, observations: 3 },
    progress: 65,
  },
  {
    id: 4,
    name: "Auditoría de Seguimiento",
    type: "externa",
    status: "programada",
    date: "2025-06-15",
    auditor: "SGS",
    scope: ["Producción", "Compras"],
    findings: null,
    progress: 0,
  },
  {
    id: 5,
    name: "Revisión por la Dirección",
    type: "revisión",
    status: "completada",
    date: "2025-01-05",
    auditor: "Gerencia",
    scope: ["Sistema de Gestión"],
    findings: { major: 0, minor: 0, observations: 8 },
    progress: 100,
  },
];

const statusStyles = {
  completada: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: CheckCircle },
  "en curso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", icon: Clock },
  programada: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", icon: Calendar },
};

const typeStyles = {
  interna: "bg-secondary/10 text-secondary border-secondary/20",
  externa: "bg-primary/10 text-primary border-primary/20",
  revisión: "bg-accent/10 text-accent border-accent/20",
};

const Auditorias = () => {
  const stats = {
    total: audits.length,
    completadas: audits.filter(a => a.status === "completada").length,
    enCurso: audits.filter(a => a.status === "en curso").length,
    programadas: audits.filter(a => a.status === "programada").length,
  };

  return (
    <MainLayout title="Auditorías" subtitle="Planificación y seguimiento de auditorías">
      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Auditorías</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.completadas}</p>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.enCurso}</p>
              <p className="text-sm text-muted-foreground">En Curso</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.programadas}</p>
              <p className="text-sm text-muted-foreground">Programadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex justify-end">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Programar Auditoría
        </Button>
      </div>

      {/* Audits List */}
      <div className="space-y-4">
        {audits.map((audit, index) => {
          const statusStyle = statusStyles[audit.status as keyof typeof statusStyles];
          const StatusIcon = statusStyle.icon;

          return (
            <div
              key={audit.id}
              className="group rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Main Info */}
                <div className="flex items-start gap-4">
                  <div className={cn("rounded-lg p-3", statusStyle.bg)}>
                    <StatusIcon className={cn("h-6 w-6", statusStyle.text)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {audit.name}
                      </h3>
                      <Badge variant="outline" className={typeStyles[audit.type as keyof typeof typeStyles]}>
                        {audit.type}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {audit.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {audit.auditor}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {audit.scope.map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs font-normal">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Progress & Findings */}
                <div className="flex items-center gap-6">
                  {audit.findings && (
                    <div className="flex gap-4 text-sm">
                      <div className="text-center">
                        <p className={cn("text-lg font-semibold", audit.findings.major > 0 ? "text-destructive" : "text-success")}>
                          {audit.findings.major}
                        </p>
                        <p className="text-xs text-muted-foreground">Mayor</p>
                      </div>
                      <div className="text-center">
                        <p className={cn("text-lg font-semibold", audit.findings.minor > 0 ? "text-warning" : "text-success")}>
                          {audit.findings.minor}
                        </p>
                        <p className="text-xs text-muted-foreground">Menor</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-muted-foreground">
                          {audit.findings.observations}
                        </p>
                        <p className="text-xs text-muted-foreground">Obs.</p>
                      </div>
                    </div>
                  )}

                  <div className="w-32">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted-foreground">Progreso</span>
                      <span className="font-medium text-foreground">{audit.progress}%</span>
                    </div>
                    <Progress value={audit.progress} className="h-2" />
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
};

export default Auditorias;