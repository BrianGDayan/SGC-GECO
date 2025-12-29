import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const documents = [
  {
    id: 1,
    name: "Manual de Calidad v3.2",
    category: "Manual",
    updatedAt: "Hace 2 horas",
    status: "vigente",
  },
  {
    id: 2,
    name: "Procedimiento de Auditorías Internas",
    category: "Procedimiento",
    updatedAt: "Hace 1 día",
    status: "vigente",
  },
  {
    id: 3,
    name: "Registro de No Conformidades",
    category: "Registro",
    updatedAt: "Hace 2 días",
    status: "revisión",
  },
  {
    id: 4,
    name: "Política de Calidad 2024",
    category: "Política",
    updatedAt: "Hace 3 días",
    status: "vigente",
  },
  {
    id: 5,
    name: "Plan de Formación Anual",
    category: "Plan",
    updatedAt: "Hace 5 días",
    status: "borrador",
  },
];

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  revisión: "bg-warning/10 text-warning border-warning/20",
  borrador: "bg-muted text-muted-foreground border-border",
};

const RecentDocuments = () => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up">
      <div className="flex items-center justify-between border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Documentos Recientes</h3>
        <Button variant="ghost" size="sm" className="text-primary">
          Ver todos
        </Button>
      </div>
      <div className="divide-y divide-border">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{doc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.category} • {doc.updatedAt}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={statusStyles[doc.status as keyof typeof statusStyles]}>
                {doc.status}
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentDocuments;