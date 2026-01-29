import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ProcessFormProps {
  onSuccess: () => void;
}

const ProcessForm = ({ onSuccess }: ProcessFormProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [form, setForm] = useState({ 
    name: "", 
    code: "", 
    type: "operativo", 
    responsibles: "", 
    subprocesses: "" 
  });

  const saveProcess = useMutation({
    mutationFn: async () => {
      // 1. Validaciones
      if (!form.name || !form.code) throw new Error("Nombre y Código son obligatorios");

      // 2. Obtener ID numérico del usuario (Corrección UUID vs Integer)
      const { data: userData, error: userError } = await supabase
        .from("users" as any)
        .select("id")
        .eq("auth_id", user?.id) // Asumiendo que 'auth_id' guarda el UUID
        .single();

      if (userError || !userData) {
        throw new Error("No se pudo identificar el usuario en la base de datos.");
      }
      
      const userDb = userData as any;

      // 3. Preparar Array de Subprocesos
      const subprocessesArray = form.subprocesses && form.subprocesses.trim() !== ""
        ? form.subprocesses.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      // 4. Payload con ID Entero (owner_id)
      const payload = { 
        ...form, 
        subprocesses: subprocessesArray, 
        owner_id: userDb.id 
      };

      const { error } = await supabase.from("processes").insert([payload]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processes"] });
      toast.success("Proceso creado exitosamente");
      // SOLO cerramos la modal aquí
      onSuccess();
    },
    onError: (err) => {
      // NO cerramos la modal si hay error
      toast.error("Error: " + err.message);
    }
  });

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
        <Label>Responsables</Label>
        <Input 
          value={form.responsibles} 
          onChange={(e) => setForm({...form, responsibles: e.target.value})} 
          placeholder="Ej: Gerente Comercial, Responsable RRHH" 
        />
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

      <div className="flex justify-end gap-3 mt-4">
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