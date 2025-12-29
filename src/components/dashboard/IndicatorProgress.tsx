import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const indicators = [
  {
    id: 1,
    name: "Satisfacción del Cliente",
    value: 92,
    target: 90,
    trend: "up",
    unit: "%",
  },
  {
    id: 2,
    name: "Tiempo de Respuesta",
    value: 24,
    target: 48,
    trend: "up",
    unit: "hrs",
  },
  {
    id: 3,
    name: "No Conformidades Cerradas",
    value: 78,
    target: 95,
    trend: "down",
    unit: "%",
  },
  {
    id: 4,
    name: "Capacitaciones Completadas",
    value: 85,
    target: 100,
    trend: "stable",
    unit: "%",
  },
];

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
};

const trendColors = {
  up: "text-success",
  down: "text-destructive",
  stable: "text-muted-foreground",
};

const IndicatorProgress = () => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Indicadores Clave</h3>
        <p className="text-sm text-muted-foreground">Progreso hacia objetivos de calidad</p>
      </div>
      <div className="divide-y divide-border">
        {indicators.map((indicator) => {
          const TrendIcon = trendIcons[indicator.trend as keyof typeof trendIcons];
          const progress = indicator.unit === "hrs" 
            ? Math.min(100, ((indicator.target - indicator.value) / indicator.target) * 100 + 50)
            : (indicator.value / indicator.target) * 100;
          const isOnTarget = indicator.unit === "hrs" 
            ? indicator.value <= indicator.target 
            : indicator.value >= indicator.target;

          return (
            <div key={indicator.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{indicator.name}</span>
                  <TrendIcon className={cn("h-4 w-4", trendColors[indicator.trend as keyof typeof trendColors])} />
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  isOnTarget ? "text-success" : "text-warning"
                )}>
                  {indicator.value}{indicator.unit} / {indicator.target}{indicator.unit}
                </span>
              </div>
              <Progress 
                value={Math.min(progress, 100)} 
                className="h-2"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IndicatorProgress;