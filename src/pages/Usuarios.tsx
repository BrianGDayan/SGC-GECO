import { useState } from "react";
import { 
  Users as UsersIcon, 
  Mail, 
  Shield, 
  MoreVertical,
  Loader2,
  Trash2,
  UserPlus,
  Check,
  X
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const roleStyles: Record<string, string> = {
  editor: "bg-primary/10 text-primary border-primary/20",
  lector: "bg-secondary/10 text-secondary border-secondary/20",
};

const roleLabels: Record<string, string> = {
  editor: "Editor",
  lector: "Lector",
};

const Usuarios = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("users" as any)
        .select("*")
        .order("full_name", { ascending: true }) as any);

      if (error) throw error;
      return data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number; newRole: string }) => {
      const { error } = await (supabase
        .from("users" as any)
        .update({ role: newRole })
        .eq("id", userId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Rol actualizado");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { error } = await (supabase
        .from("users" as any)
        .delete()
        .eq("id", userId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuario eliminado");
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleSendInvitation = () => {
    const subject = encodeURIComponent("Invitación al Sistema de Gestión de Calidad");
    const body = encodeURIComponent(
      `Hola,\n\nTe invito a registrarte en nuestro Sistema de Gestión de Calidad ISO 9001.\n\nPuedes registrarte aquí: ${window.location.origin}/auth\n\nSaludos.`
    );
    window.location.href = `mailto:${inviteEmail}?subject=${subject}&body=${body}`;
    setIsInviteOpen(false);
    setInviteEmail("");
  };

  if (isLoading) {
    return (
      <MainLayout title="Usuarios" subtitle="Cargando...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Usuarios" subtitle="Gestión de accesos y permisos">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><UsersIcon className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Usuarios</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><Check className="h-5 w-5 text-success" /></div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><X className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Inactivos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2"><Shield className="h-5 w-5 text-secondary" /></div>
            <div>
              <p className="text-2xl font-bold">{users.filter((u: any) => u.role === "editor").length}</p>
              <p className="text-sm text-muted-foreground">Editores</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-end">
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" /> Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar colaborador</DialogTitle>
              <DialogDescription>Se enviará el enlace de registro por correo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input type="email" placeholder="ejemplo@empresa.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleSendInvitation} disabled={!inviteEmail}>Invitar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Registro</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u: any) => (
              <tr key={u.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium uppercase">
                        {u.full_name?.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={roleStyles[u.role]}>
                    {roleLabels[u.role]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">activo</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {currentUser?.id !== u.auth_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, newRole: u.role === 'editor' ? 'lector' : 'editor' })}>
                          Cambiar Rol
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => confirm("¿Borrar usuario?") && deleteUserMutation.mutate(u.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  );
};

export default Usuarios;