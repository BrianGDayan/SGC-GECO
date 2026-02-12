import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UpcomingAuditsProps {
  audits: any[];
}

const typeStyles = {
  interna: "bg-primary/10 text-primary border-primary/20",
  externa: "bg-secondary/10 text-secondary border-secondary/20",
  revisión: "bg-accent/10 text-accent border-accent/20",
};

const UpcomingAudits = ({ audits }: UpcomingAuditsProps) => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Próximas Auditorías</h3>
        <p className="text-sm text-muted-foreground">Calendario de revisiones programadas</p>
      </div>
      <div className="divide-y divide-border">
        {audits.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No hay auditorías programadas.</p>
        ) : (
          audits.map((audit) => (
            <div key={audit.id} className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <h4 className="font-medium text-foreground">{audit.title}</h4>
                <Badge variant="outline" className={typeStyles[audit.type as keyof typeof typeStyles] || typeStyles.interna}>
                  {audit.type}
                </Badge>
              </div>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UpcomingAudits;