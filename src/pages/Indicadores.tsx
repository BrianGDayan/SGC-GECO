import { useState } from "react";
import { 
  BarChart3, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  Upload
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const indicators = [
  {
    id: 1,
    name: "Satisfacción del Cliente",
    process: "Gestión Comercial",
    currentValue: 92,
    targetValue: 90,
    unit: "%",
    frequency: "Mensual",
    trend: "up",
    history: [85, 87, 89, 90, 91, 92],
    status: "cumple",
    lastUpdate: "2025-01-15",
  },
  {
    id: 2,
    name: "Tiempo de Respuesta a Quejas",
    process: "Atención al Cliente",
    currentValue: 24,
    targetValue: 48,
    unit: "horas",
    frequency: "Mensual",
    trend: "up",
    history: [72, 60, 48, 36, 30, 24],
    status: "cumple",
    lastUpdate: "2025-01-14",
  },
  {
    id: 3,
    name: "No Conformidades Cerradas",
    process: "Gestión de Calidad",
    currentValue: 78,
    targetValue: 95,
    unit: "%",
    frequency: "Mensual",
    trend: "down",
    history: [85, 82, 80, 79, 78, 78],
    status: "no cumple",
    lastUpdate: "2025-01-13",
  },
  {
    id: 4,
    name: "Capacitaciones Completadas",
    process: "Recursos Humanos",
    currentValue: 85,
    targetValue: 100,
    unit: "%",
    frequency: "Trimestral",
    trend: "stable",
    history: [70, 75, 80, 82, 84, 85],
    status: "en proceso",
    lastUpdate: "2025-01-12",
  },
  {
    id: 5,
    name: "Efectividad de Acciones Correctivas",
    process: "Gestión de Calidad",
    currentValue: 88,
    targetValue: 85,
    unit: "%",
    frequency: "Mensual",
    trend: "up",
    history: [75, 78, 80, 83, 86, 88],
    status: "cumple",
    lastUpdate: "2025-01-11",
  },
  {
    id: 6,
    name: "Índice de Productividad",
    process: "Producción",
    currentValue: 94,
    targetValue: 95,
    unit: "%",
    frequency: "Semanal",
    trend: "up",
    history: [88, 90, 91, 92, 93, 94],
    status: "en proceso",
    lastUpdate: "2025-01-10",
  },
];

const statusStyles = {
  "cumple": { bg: "bg-success/10", text: "text-success", border: "border-success/20", label: "Cumple" },
  "no cumple": { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "No Cumple" },
  "en proceso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", label: "En Proceso" },
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Target,
};

const Indicadores = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const getProgress = (current: number, target: number, unit: string) => {
    if (unit === "horas") {
      return Math.max(0, Math.min(100, ((target - current) / target) * 100 + 50));
    }
    return Math.min(100, (current / target) * 100);
  };

  return (
    <MainLayout title="Indicadores" subtitle="Seguimiento de KPIs y métricas de calidad">
      {/* Stats Summary */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2">
              <Target className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">18</p>
              <p className="text-sm text-muted-foreground">En Meta</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-warning/10 p-2">
              <BarChart3 className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">4</p>
              <p className="text-sm text-muted-foreground">En Proceso</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">2</p>
              <p className="text-sm text-muted-foreground">Fuera de Meta</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">24</p>
              <p className="text-sm text-muted-foreground">Total Indicadores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los procesos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los procesos</SelectItem>
              <SelectItem value="calidad">Gestión de Calidad</SelectItem>
              <SelectItem value="comercial">Gestión Comercial</SelectItem>
              <SelectItem value="rrhh">Recursos Humanos</SelectItem>
              <SelectItem value="produccion">Producción</SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cumple">Cumple</SelectItem>
              <SelectItem value="proceso">En Proceso</SelectItem>
              <SelectItem value="nocumple">No Cumple</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Cargar Datos
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cargar Datos de Indicador</DialogTitle>
                <DialogDescription>
                  Actualice el valor de un indicador existente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Indicador</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar indicador" />
                    </SelectTrigger>
                    <SelectContent>
                      {indicators.map((ind) => (
                        <SelectItem key={ind.id} value={ind.id.toString()}>
                          {ind.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Input type="month" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Input placeholder="Comentarios opcionales" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsUploadOpen(false)}>
                  Guardar Datos
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Indicador
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Indicador</DialogTitle>
                <DialogDescription>
                  Defina un nuevo KPI para el sistema de gestión.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre del Indicador</Label>
                  <Input placeholder="Ej: Tasa de Reclamaciones" />
                </div>
                <div className="space-y-2">
                  <Label>Proceso</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="calidad">Gestión de Calidad</SelectItem>
                      <SelectItem value="comercial">Gestión Comercial</SelectItem>
                      <SelectItem value="rrhh">Recursos Humanos</SelectItem>
                      <SelectItem value="produccion">Producción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Meta</Label>
                    <Input type="number" placeholder="90" />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidad</Label>
                    <Input placeholder="%" />
                  </div>
                  <div className="space-y-2">
                    <Label>Frecuencia</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fórmula de Cálculo</Label>
                  <Input placeholder="Descripción del cálculo del indicador" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setIsAddOpen(false)}>
                  Crear Indicador
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Indicators Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {indicators.map((indicator, index) => {
          const TrendIcon = trendIcons[indicator.trend as keyof typeof trendIcons];
          const progress = getProgress(indicator.currentValue, indicator.targetValue, indicator.unit);
          const statusStyle = statusStyles[indicator.status as keyof typeof statusStyles];

          return (
            <div
              key={indicator.id}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{indicator.name}</h3>
                  <p className="text-sm text-muted-foreground">{indicator.process}</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(statusStyle.bg, statusStyle.text, statusStyle.border)}
                >
                  {statusStyle.label}
                </Badge>
              </div>

              <div className="mb-4">
                <div className="mb-2 flex items-end justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{indicator.currentValue}</span>
                    <span className="text-sm text-muted-foreground">{indicator.unit}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Meta: {indicator.targetValue}{indicator.unit}
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {indicator.frequency}
                </div>
                <div className={cn(
                  "flex items-center gap-1",
                  indicator.trend === "up" ? "text-success" : 
                  indicator.trend === "down" ? "text-destructive" : "text-muted-foreground"
                )}>
                  <TrendIcon className="h-4 w-4" />
                  <span>Tendencia</span>
                </div>
              </div>

              {/* Mini Chart */}
              <div className="mt-4 flex items-end gap-1 h-12">
                {indicator.history.map((value, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-primary/20 transition-all hover:bg-primary/40"
                    style={{ height: `${(value / Math.max(...indicator.history)) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </MainLayout>
  );
};

export default Indicadores;