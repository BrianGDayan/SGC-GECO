import { useState } from "react";
import { 
  FileText, 
  Upload, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  FolderOpen,
  Plus
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const categories = [
  { id: "manual", name: "Manual de Calidad", count: 5 },
  { id: "procedimiento", name: "Procedimientos", count: 28 },
  { id: "instruccion", name: "Instrucciones de Trabajo", count: 45 },
  { id: "registro", name: "Registros", count: 62 },
  { id: "politica", name: "Políticas", count: 8 },
  { id: "formato", name: "Formatos", count: 35 },
];

const documents = [
  {
    id: 1,
    code: "MC-001",
    name: "Manual de Calidad v3.2",
    category: "Manual de Calidad",
    version: "3.2",
    updatedAt: "2025-01-15",
    updatedBy: "Ana García",
    status: "vigente",
  },
  {
    id: 2,
    code: "PR-001",
    name: "Procedimiento de Auditorías Internas",
    category: "Procedimientos",
    version: "2.1",
    updatedAt: "2025-01-10",
    updatedBy: "Carlos López",
    status: "vigente",
  },
  {
    id: 3,
    code: "PR-002",
    name: "Procedimiento de Control de Documentos",
    category: "Procedimientos",
    version: "1.5",
    updatedAt: "2025-01-08",
    updatedBy: "María Rodríguez",
    status: "revisión",
  },
  {
    id: 4,
    code: "RG-001",
    name: "Registro de No Conformidades",
    category: "Registros",
    version: "1.0",
    updatedAt: "2025-01-05",
    updatedBy: "Pedro Sánchez",
    status: "vigente",
  },
  {
    id: 5,
    code: "PL-001",
    name: "Política de Calidad 2025",
    category: "Políticas",
    version: "1.0",
    updatedAt: "2025-01-01",
    updatedBy: "Director General",
    status: "vigente",
  },
  {
    id: 6,
    code: "IT-001",
    name: "Instrucción de Trabajo - Calibración",
    category: "Instrucciones de Trabajo",
    version: "2.0",
    updatedAt: "2024-12-20",
    updatedBy: "Luis Martínez",
    status: "borrador",
  },
];

const statusStyles = {
  vigente: "bg-success/10 text-success border-success/20",
  revisión: "bg-warning/10 text-warning border-warning/20",
  borrador: "bg-muted text-muted-foreground border-border",
  obsoleto: "bg-destructive/10 text-destructive border-destructive/20",
};

const Documentos = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = !selectedCategory || doc.category.toLowerCase().includes(selectedCategory);
    const matchesSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MainLayout title="Documentos" subtitle="Gestión documental del Sistema de Calidad">
      <div className="flex gap-6">
        {/* Sidebar - Categories */}
        <aside className="w-64 shrink-0">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <h3 className="mb-4 font-semibold text-foreground">Categorías</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  !selectedCategory ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>Todos</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {documents.length}
                </Badge>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    selectedCategory === cat.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{cat.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {cat.count}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-9"
                />
              </div>
              <Select>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="revision">En revisión</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Subir Documento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Subir Nuevo Documento</DialogTitle>
                  <DialogDescription>
                    Complete la información del documento y adjunte el archivo.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Código</Label>
                      <Input id="code" placeholder="Ej: PR-003" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">Versión</Label>
                      <Input id="version" placeholder="Ej: 1.0" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre del Documento</Label>
                    <Input id="name" placeholder="Nombre descriptivo del documento" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <Textarea id="description" placeholder="Descripción breve del documento" />
                  </div>
                  <div className="space-y-2">
                    <Label>Archivo</Label>
                    <div className="rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
                      <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Arrastra un archivo aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, DOC, DOCX, XLS hasta 10MB</p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => setIsUploadOpen(false)}>
                    Subir Documento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Documents Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Código</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Categoría</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Versión</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Actualizado</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-primary">{doc.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{doc.category}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">v{doc.version}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        <p className="text-foreground">{doc.updatedAt}</p>
                        <p className="text-muted-foreground">{doc.updatedBy}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={statusStyles[doc.status as keyof typeof statusStyles]}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Documentos;