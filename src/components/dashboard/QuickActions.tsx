import { Upload, FileText, BarChart3, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  {
    icon: Upload,
    label: "Subir Documento",
    description: "Añadir nuevo documento al sistema",
    color: "primary",
  },
  {
    icon: BarChart3,
    label: "Registrar Indicador",
    description: "Actualizar datos de indicadores",
    color: "secondary",
  },
  {
    icon: AlertCircle,
    label: "Nueva No Conformidad",
    description: "Reportar incidencia de calidad",
    color: "destructive",
  },
  {
    icon: FileText,
    label: "Crear Procedimiento",
    description: "Documentar nuevo proceso",
    color: "accent",
  },
];

const colorStyles = {
  primary: "bg-primary/10 text-primary hover:bg-primary/20",
  secondary: "bg-secondary/10 text-secondary hover:bg-secondary/20",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  accent: "bg-accent/10 text-accent hover:bg-accent/20",
};

const QuickActions = () => {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-slide-up" style={{ animationDelay: "200ms" }}>
      <h3 className="mb-4 text-lg font-semibold text-foreground">Acciones Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className={`flex flex-col items-center gap-2 rounded-lg p-4 text-center transition-all duration-200 ${colorStyles[action.color as keyof typeof colorStyles]}`}
          >
            <action.icon className="h-6 w-6" />
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;