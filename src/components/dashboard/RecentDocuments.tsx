import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface RecentDocumentsProps {
  documents?: any[];
}

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  "en revision": "bg-warning/10 text-warning border-warning/20",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20",
  "no aprobado": "bg-destructive/10 text-destructive border-destructive/20",
  obsoleto: "bg-muted text-muted-foreground border-border",
};

const RecentDocuments = ({ documents = [] }: RecentDocumentsProps) => {
  const navigate = useNavigate();

  const handleDownload = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
    } catch (e) { window.open(url, "_blank"); }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up h-full">
      <div className="flex items-center justify-between border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Documentos Recientes</h3>
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/documentos")}>
          Ver todos
        </Button>
      </div>
      <div className="divide-y divide-border">
        {documents.map((doc) => {
          const dateStr = new Date(doc.uploaded_at).toLocaleDateString("es-ES", { day: '2-digit', month: 'short' });
          // CORRECCIÓN: Eliminar guiones bajos de la categoría
          const catName = doc.category?.replace(/_/g, ' ') || "Documento";

          return (
            <div key={doc.version_id || doc.id} className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{doc.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {catName} • {dateStr}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={statusStyles[doc.status as keyof typeof statusStyles] || "bg-muted text-muted-foreground"}>
                  {doc.status}
                </Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <a href={doc.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(doc.file_url, doc.file_name)}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentDocuments;