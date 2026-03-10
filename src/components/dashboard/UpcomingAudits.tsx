import { useNavigate } from "react-router-dom";
import { Calendar, MapPin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UpcomingAuditsProps {
  audits: any[];
}

const typeStyles = {
  interna: "bg-primary/10 text-primary border-primary/20",
  externa: "bg-secondary/10 text-secondary border-secondary/20",
  revisión: "bg-accent/10 text-accent border-accent/20",
};

const UpcomingAudits = ({ audits }: UpcomingAuditsProps) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up">
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Próximas Auditorías</h3>
        <p className="text-sm text-muted-foreground">Calendario de revisiones programadas</p>
      </div>
      <div className="divide-y divide-border">
        {audits.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground italic">No hay auditorías programadas.</p>
        ) : (
          audits.map((audit) => (
            <div 
              key={audit.id} 
              onClick={() => navigate("/auditorias")}
              className="group p-4 transition-all hover:bg-muted/50 cursor-pointer relative"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                  {audit.name || audit.title}
                </h4>
                <Badge variant="outline" className={cn("shrink-0 whitespace-nowrap transition-colors", typeStyles[audit.type as keyof typeof typeStyles] || typeStyles.interna)}>
                  {audit.type}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(audit.scheduled_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {audit.location || "Oficina"}
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UpcomingAudits;