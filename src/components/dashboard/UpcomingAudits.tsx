import { Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const audits = [
  {
    id: 1,
    title: "Auditoría Interna Q1",
    date: "15 Ene 2025",
    time: "09:00",
    location: "Oficina Principal",
    type: "interna",
  },
  {
    id: 2,
    title: "Auditoría de Seguimiento ISO",
    date: "28 Feb 2025",
    time: "10:00",
    location: "Virtual",
    type: "externa",
  },
  {
    id: 3,
    title: "Revisión por la Dirección",
    date: "10 Mar 2025",
    time: "14:00",
    location: "Sala de Juntas",
    type: "revisión",
  },
];

const typeStyles = {
  interna: "bg-primary/10 text-primary border-primary/20",
  externa: "bg-secondary/10 text-secondary border-secondary/20",
  revisión: "bg-accent/10 text-accent border-accent/20",
};

const UpcomingAudits = () => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up" style={{ animationDelay: "300ms" }}>
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Próximas Auditorías</h3>
        <p className="text-sm text-muted-foreground">Calendario de revisiones programadas</p>
      </div>
      <div className="divide-y divide-border">
        {audits.map((audit) => (
          <div key={audit.id} className="p-4">
            <div className="mb-2 flex items-start justify-between">
              <h4 className="font-medium text-foreground">{audit.title}</h4>
              <Badge variant="outline" className={typeStyles[audit.type as keyof typeof typeStyles]}>
                {audit.type}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {audit.date}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {audit.time}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {audit.location}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingAudits;