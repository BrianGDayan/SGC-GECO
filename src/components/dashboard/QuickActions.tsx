import { FilePlus, BarChart3, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onUploadDoc: () => void;
  onRecordIndicator: () => void;
  onCreateAudit: () => void;
}

const QuickActions = ({ onUploadDoc, onRecordIndicator, onCreateAudit }: QuickActionsProps) => {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 font-semibold text-foreground">Acciones Rápidas</h3>
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 hover:bg-primary/5 hover:text-primary transition-colors" 
          onClick={onUploadDoc}
        >
          <FilePlus className="h-4 w-4 text-primary" />
          <span className="text-sm">Subir Documento</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 hover:bg-secondary/5 hover:text-secondary transition-colors" 
          onClick={onRecordIndicator}
        >
          <BarChart3 className="h-4 w-4 text-secondary" />
          <span className="text-sm">Registrar Indicador</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 hover:bg-primary/5 hover:text-primary transition-colors" 
          onClick={onCreateAudit}
        >
          <Calendar className="h-4 w-4 text-primary" />
          <span className="text-sm">Nueva Auditoría</span>
        </Button>
      </div>
    </div>
  );
};

export default QuickActions;