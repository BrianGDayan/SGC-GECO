import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  CheckCircle, Clock, Calendar, User, FileText, Plus, ChevronRight, 
  ArrowLeft, Info, Loader2, AlertTriangle, Printer, X
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import AuditForm from "@/components/forms/AuditForm"; // IMPORTANTE: Importar el nuevo componente

const statusStyles = {
  completada: { bg: "bg-success/10", text: "text-success", border: "border-success/20", icon: CheckCircle },
  "en curso": { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", icon: Clock },
  programada: { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20", icon: Calendar },
};

const Auditorias = () => {
  const queryClient = useQueryClient();
  const { isEditor } = useAuth();
  const [selectedAudit, setSelectedAudit] = useState<any>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isFindingModalOpen, setIsFindingModalOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<any>(null);
  const [findingForm, setFindingForm] = useState({ 
    type: "menor", description: "", process: "", status: "abierto", corrective_action: "" 
  });

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["audits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audits" as any).select("*").order("scheduled_date", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes"],
    queryFn: async () => {
      const { data } = await supabase.from("processes" as any).select("id, name");
      return (data || []) as any[];
    }
  });

  const { data: findings = [] } = useQuery({
    queryKey: ["findings", selectedAudit?.id],
    queryFn: async () => {
      if (!selectedAudit) return [];
      const { data, error } = await supabase.from("audit_findings" as any).select("*").eq("audit_id", selectedAudit.id);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!selectedAudit
  });

  const generatePDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const primaryColor: [number, number, number] = [27, 95, 163]; 
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 297, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("REPORTE DE AUDITORÍA", 15, 25);
    autoTable(doc, {
      startY: 45,
      head: [['Título', 'Auditor', 'Fecha', 'Resultado']],
      body: [[selectedAudit.title, selectedAudit.auditor, selectedAudit.scheduled_date, `${selectedAudit.progress}%`]],
      headStyles: { fillColor: primaryColor }
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Tipo', 'Proceso', 'Descripción', 'Acción Correctiva', 'Estado']],
      body: findings.map((f: any) => [f.type?.toUpperCase(), f.process, f.description, f.corrective_action || "Pendiente", f.status?.toUpperCase()]),
      headStyles: { fillColor: primaryColor },
      columnStyles: { 2: { cellWidth: 70 }, 3: { cellWidth: 70 } }
    });
    doc.save(`Reporte_${selectedAudit.title}.pdf`);
  };

  if (isLoading) return <MainLayout title="Auditorías"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  if (selectedAudit) {
    const isClosed = selectedAudit.status === "completada";
    const isAllProcesses = selectedAudit.scope?.length === processes.length && processes.length > 0;

    return (
      <MainLayout title={selectedAudit.title} subtitle={`Auditoría ${selectedAudit.type}`}>
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={() => setSelectedAudit(null)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generatePDF} className="gap-2 border-primary text-primary"><Printer className="h-4 w-4" /> PDF</Button>
            {!isClosed && isEditor && <Button onClick={() => supabase.from("audits" as any).update({ status: "completada", progress: 100 }).eq("id", selectedAudit.id)} className="gap-2 bg-secondary">Finalizar</Button>}
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-border bg-card p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">General</Label>
            <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 text-primary" />{selectedAudit.scheduled_date}</div>
            <div className="flex items-center gap-3 text-sm"><User className="h-4 w-4 text-primary" />{selectedAudit.auditor}</div>
          </div>
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Procesos Vinculados (Alcance)</Label>
            <div className="flex flex-wrap gap-1">
              {isAllProcesses ? (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold">Todos los procesos</Badge>
              ) : (
                selectedAudit.scope?.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)
              )}
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Estado</Label>
            <Progress value={selectedAudit.progress} className="h-2" />
            <Badge className={cn("mt-2 uppercase", statusStyles[selectedAudit.status as keyof typeof statusStyles]?.bg, statusStyles[selectedAudit.status as keyof typeof statusStyles]?.text)}>{selectedAudit.status}</Badge>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Hallazgos</h2>
          {!isClosed && isEditor && <Button onClick={() => setIsFindingModalOpen(true)} className="gap-2 bg-primary"><Plus className="h-4 w-4" /> Nuevo Hallazgo</Button>}
        </div>

        <div className="grid grid-cols-1 gap-4">
          {findings.map((f: any) => (
            <div key={f.id} className="group relative flex items-center justify-between p-5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all">
              <div className="flex items-start gap-4">
                <div className={cn("p-2 rounded-full", f.type === 'mayor' ? "bg-destructive/10 text-destructive" : f.type === 'menor' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary")}><Info className="h-5 w-5" /></div>
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="font-bold text-xs uppercase">{f.type}</span><span className="text-xs text-muted-foreground">• {f.process}</span></div>
                  <p className="text-sm">{f.description}</p>
                </div>
              </div>
              <Badge variant="outline" className="uppercase">{f.status}</Badge>
            </div>
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Auditorías" subtitle="Planificación y seguimiento">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", val: audits.length, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
          { label: "Completadas", val: audits.filter((a:any) => a.status === 'completada').length, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
          { label: "En Curso", val: audits.filter((a:any) => a.status === 'en curso').length, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
          { label: "Programadas", val: audits.filter((a:any) => a.status === 'programada').length, icon: Calendar, color: "text-muted-foreground", bg: "bg-muted" }
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-3">
            <div className={cn("rounded-lg p-2", stat.bg)}><stat.icon className={cn("h-5 w-5", stat.color)} /></div>
            <div><p className="text-2xl font-bold">{stat.val}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
          </div>
        ))}
      </div>

      <div className="mb-6 flex justify-end">{isEditor && <Button onClick={() => setIsAuditModalOpen(true)} className="gap-2 bg-primary"><Plus className="h-4 w-4" /> Programar Auditoría</Button>}</div>

      <div className="space-y-4">
        {audits.map((audit: any) => (
          <div key={audit.id} onClick={() => setSelectedAudit(audit)} className="group rounded-xl border border-border bg-card p-6 shadow-sm hover:border-primary/30 cursor-pointer transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className={cn("rounded-lg p-3", statusStyles[audit.status as keyof typeof statusStyles]?.bg)}><FileText className={cn("h-6 w-6", statusStyles[audit.status as keyof typeof statusStyles]?.text)} /></div>
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{audit.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {audit.scope?.map((s: string) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Programación usando el NUEVO COMPONENTE */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Programar Auditoría</DialogTitle></DialogHeader>
          <AuditForm onSuccess={() => setIsAuditModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Auditorias;