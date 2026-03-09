import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";

interface ProcessFormProps {
  onSuccess: () => void;
  editingProcess?: any; // Agregado
}

const ProcessForm = ({ onSuccess, editingProcess }: ProcessFormProps) => { // Agregado
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [form, setForm] = useState({ 
    name: "", 
    code: "", 
    type: "operativo", 
    responsibles: "", 
    subprocesses: "",
    managerIds: [] as string[] // Nuevo estado para los UUIDs de los gestores
  });

  useEffect(() => {
    if (editingProcess) {
      setForm({
        name: editingProcess.name || "",
        code: editingProcess.code || "",
        type: editingProcess.type || "operativo",
        responsibles: editingProcess.responsibles || "",
        subprocesses: Array.isArray(editingProcess.subprocesses) 
          ? editingProcess.subprocesses.join(", ") 
          : "",
        managerIds: editingProcess.manager_ids || []
      });
    }
  }, [editingProcess]);

  // Consultar usuarios (perfiles) para poder asignarlos como responsables
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase.from("profiles" as any).select("id, full_name, email");
      if (error) throw error;
      return data || [];
    }
  });

 const saveProcess = useMutation({
    mutationFn: async () => {
      // 1. Validaciones
      if (!form.name || !form.code) throw new Error("Nombre y Código son obligatorios");

      // 2. Obtener ID numérico del creador (owner_id)
      const { data: userData, error: userError } = await supabase
        .from("users" as any)
        .select("id")
        .eq("auth_id", user?.id) 
        .single();

      if (userError || !userData) {
        throw new Error("No se pudo identificar el usuario en la base de datos.");
      }
      
      const userDb = userData as any;

      // 3. Preparar Array de Subprocesos
      const subprocessesArray = form.subprocesses && form.subprocesses.trim() !== ""
        ? form.subprocesses.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      // 4. Payload con los Gestores (manager_ids) y Texto Descriptivo
      const { managerIds, ...restForm } = form;
      const payload: any = { 
        ...restForm, 
        subprocesses: subprocessesArray, 
        owner_id: userDb.id,         // El creador
        manager_ids: managerIds      // Los jefes de área
      };

      // Si estamos editando, incluimos el ID para que upsert actualice la fila existente
      if (editingProcess?.id) {
        payload.id = editingProcess.id;
      }

      // 5. Ejecutar Upsert (crea si no existe id, actualiza si existe)
      const { error } = await supabase.from("processes" as any).upsert([payload]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      toast.success(editingProcess ? "Proceso actualizado exitosamente" : "Proceso creado exitosamente");
      onSuccess();
    },
    onError: (err: any) => {
      toast.error("Error: " + err.message);
    }
  });

  // Funciones para manejar la lista múltiple de Gestores
  const addManager = (id: string) => {
    if (!form.managerIds.includes(id)) {
      setForm({ ...form, managerIds: [...form.managerIds, id] });
    }
  };

  const removeManager = (id: string) => {
    setForm({ ...form, managerIds: form.managerIds.filter(m => m !== id) });
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1 space-y-2">
          <Label>Código</Label>
          <Input 
            value={form.code} 
            onChange={(e) => setForm({...form, code: e.target.value})} 
            placeholder="Ej: PG-001" 
          />
        </div>
        <div className="col-span-3 space-y-2">
          <Label>Nombre del Proceso</Label>
          <Input 
            value={form.name} 
            onChange={(e) => setForm({...form, name: e.target.value})} 
            placeholder="Ej: Logística y Taller" 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Tipo de Proceso</Label>
        <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="estratégico">Estratégico</SelectItem>
            <SelectItem value="operativo">Operativo</SelectItem>
            <SelectItem value="apoyo">Apoyo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cargo / Responsables (Texto Descriptivo)</Label>
        <Input 
          value={form.responsibles} 
          onChange={(e) => setForm({...form, responsibles: e.target.value})} 
          placeholder="Ej: Gerente Comercial, Responsable RRHH" 
        />
      </div>

      {/* NUEVO: Selector múltiple de Gestores Reales */}
      <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/30">
        <Label className="text-primary">Usuarios Gestores (Permisos de Edición)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Seleccione qué usuarios tendrán permiso para cargar indicadores y documentos en este proceso.
        </p>
        <Select onValueChange={addManager} value="">
          <SelectTrigger className="bg-background">
            <SelectValue placeholder="Asignar un usuario..." />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Renderizado de Etiquetas (Badges) para múltiples responsables */}
        {form.managerIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {form.managerIds.map(id => {
              const p = profiles.find((prof: any) => prof.id === id);
              return (
                <Badge key={id} variant="secondary" className="flex items-center gap-1.5 py-1 px-2">
                  {p?.full_name || p?.email}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                    onClick={() => removeManager(id)} 
                  />
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Subprocesos (separados por coma)</Label>
        <Textarea 
          value={form.subprocesses} 
          onChange={(e) => setForm({...form, subprocesses: e.target.value})} 
          placeholder="Gestión estratégica, Auditorías, etc." 
          rows={3} 
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" onClick={onSuccess}>Cancelar</Button>
        <Button 
          onClick={() => saveProcess.mutate()} 
          className="bg-primary hover:bg-primary-dark"
          disabled={saveProcess.isPending}
        >
          {saveProcess.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Guardando...</> : "Guardar Proceso"}
        </Button>
      </div>
    </div>
  );
};

export default ProcessForm;