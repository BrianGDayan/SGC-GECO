import { FileText, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Definimos la interfaz para recibir los datos reales
interface RecentDocumentsProps {
  documents?: any[];
}

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  "en revision": "bg-warning/10 text-warning border-warning/20",
  "en aprobacion": "bg-primary/10 text-primary border-primary/20",
  "no aprobado": "bg-destructive/10 text-destructive border-destructive/20",
  // Fallback para otros estados
  borrador: "bg-muted text-muted-foreground border-border",
};

const RecentDocuments = ({ documents = [] }: RecentDocumentsProps) => {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm animate-slide-up h-full">
      <div className="flex items-center justify-between border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">Documentos Recientes</h3>
        <Button variant="ghost" size="sm" className="text-primary">
          Ver todos
        </Button>
      </div>
      <div className="divide-y divide-border">
        {documents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No hay documentos cargados recientemente.
          </div>
        ) : (
          documents.map((doc) => {
            // Formateo de fecha (created_at viene de la BD)
            const dateObj = new Date(doc.created_at || Date.now());
            const dateStr = dateObj.toLocaleDateString("es-ES", { day: 'numeric', month: 'short' });
            
            // Mapeo de estilos de estado
            const statusKey = (doc.status as keyof typeof statusStyles) || "borrador";
            const style = statusStyles[statusKey];

            // Mapeo de categoría (si en la BD es null, ponemos 'Doc')
            const categoryName = doc.category_name || "Documento"; // Si hiciste join, o usa doc.category si es texto

            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    {/* Usamos doc.title que es el campo real en la BD */}
                    <p className="font-medium text-foreground">{doc.title}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                       {/* Mostramos Código o Categoría + Fecha */}
                      {doc.code || categoryName} • {dateStr}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`capitalize ${style}`}>
                    {doc.status}
                  </Badge>
                  
                  {/* Botones de acción (visuales por ahora) */}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* Si tienes la URL del archivo en doc.file_url, podrías usarla aquí */}
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RecentDocuments;