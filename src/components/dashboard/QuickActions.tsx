import { Upload, BarChart3, Search, FileText } from "lucide-react";

interface QuickActionsProps {
  onUploadDoc: () => void;
  onRecordIndicator: () => void;
  onNewFinding: () => void;
  onCreateProcess?: () => void; // AHORA ES OPCIONAL
}

const colorStyles = {
  primary: "bg-primary/10 text-primary hover:bg-primary/20",
  secondary: "bg-secondary/10 text-secondary hover:bg-secondary/20",
  destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  accent: "bg-accent/10 text-accent hover:bg-accent/20",
};

const QuickActions = ({ onUploadDoc, onRecordIndicator, onNewFinding, onCreateProcess }: QuickActionsProps) => {
  // Construimos la lista base (las 3 acciones que los Editores sí ven)
  const actions = [
    { icon: Upload, label: "Subir Documento", color: "primary", onClick: onUploadDoc },
    { icon: BarChart3, label: "Registrar Indicador", color: "secondary", onClick: onRecordIndicator },
    { icon: Search, label: "Nuevo Hallazgo", color: "destructive", onClick: onNewFinding },
  ];

  // Si nos pasaron la función (es decir, el usuario es Admin), agregamos el cuarto botón
  if (onCreateProcess) {
    actions.push({ icon: FileText, label: "Crear Proceso", color: "accent", onClick: onCreateProcess });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm animate-slide-up">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Acciones Rápidas</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
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