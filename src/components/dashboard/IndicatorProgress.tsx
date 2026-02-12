import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "100ms" }}>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Indicadores Clave</h3>
        <p className="text-sm text-muted-foreground">Progreso hacia objetivos de calidad</p>
      </div>
      <div className="divide-y divide-border">
        {indicators.map((indicator) => {
          const trendKey = (indicator.trend as keyof typeof trendIcons) || "stable";
          const TrendIcon = trendIcons[trendKey];
          
          const val = indicator.current_value || 0;
          const target = indicator.target_value || 1;
          const unit = indicator.unit || "";

          // Lógica original:hrs (menos es mejor) vs otros (más es mejor)
          const progress = unit.toLowerCase().includes("hr") 
            ? Math.min(100, ((target - val) / target) * 100 + 50)
            : (val / target) * 100;

          const isOnTarget = unit.toLowerCase().includes("hr") 
            ? val <= target 
            : val >= target;

          return (
            <div 
              key={indicator.id} 
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate('/indicadores')}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{indicator.name}</span>
                  <TrendIcon className={cn("h-4 w-4", trendColors[trendKey])} />
                </div>
                <span className={cn("text-sm font-semibold", isOnTarget ? "text-success" : "text-warning")}>
                  {val}{unit} / {target}{unit}
                </span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IndicatorProgress;