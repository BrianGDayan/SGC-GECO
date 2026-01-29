import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Definimos la interfaz para recibir los datos reales
interface IndicatorProgressProps {
  indicators?: any[];
}

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

const IndicatorProgress = ({ indicators = [] }: IndicatorProgressProps) => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Indicadores Clave</h3>
        <p className="text-sm text-muted-foreground">Progreso hacia objetivos de calidad</p>
      </div>
      <div className="divide-y divide-border">
        {indicators.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No hay indicadores configurados.
          </div>
        ) : (
          indicators.map((indicator) => {
            // Mapeo de datos reales de la BD
            // Si trend viene nulo, asumimos 'stable'
            const trendKey = (indicator.trend as keyof typeof trendIcons) || "stable";
            const TrendIcon = trendIcons[trendKey];
            
            const current = indicator.current_value || 0;
            const target = indicator.target_value || 1; // Evitar división por cero
            const unit = indicator.unit || "";
            
            // Cálculo de progreso (simple para visualización)
            const progress = Math.min((current / target) * 100, 100);
            
            // Determinar si cumple (lógica visual básica basada en status)
            const isOnTarget = indicator.status === "cumple";

            return (
              <div key={indicator.id} className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate max-w-[150px]" title={indicator.name}>
                        {indicator.name}
                    </span>
                    <TrendIcon className={cn("h-4 w-4", trendColors[trendKey])} />
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    isOnTarget ? "text-success" : "text-warning"
                  )}>
                    {current}{unit} / {target}{unit}
                  </span>
                </div>
                <Progress 
                  value={progress} 
                  className="h-2"
                  // Opcional: Podrías personalizar el color de la barra si tu componente Progress lo soporta, 
                  // o dejarlo con el default del tema
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default IndicatorProgress;