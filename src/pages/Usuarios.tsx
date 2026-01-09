import { useState } from "react";
import { 
  Users as UsersIcon, Plus, Mail, Shield, MoreVertical, Check, X, AlertTriangle, Loader2 
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const roleStyles: Record<string, string> = {
  editor: "bg-primary/10 text-primary border-primary/20",
  lector: "bg-secondary/10 text-secondary border-secondary/20",
};

const roleLabels: Record<string, string> = {
  editor: "Editor",
  lector: "Lector",
};

const Usuarios = () => {
  const { userData: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

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

  const isUserActive = (lastAccess: string) => {
    if (!lastAccess) return false;
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    return new Date(lastAccess) > twoWeeksAgo;
  };

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: number; newRole: string }) => {
      const { error } = await (supabase.from("users" as any).update({ role: newRole }).eq("id", userId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Rol actualizado");
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const { error } = await (supabase.from("users" as any).delete().eq("id", userId) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteDialogOpen(false);
      toast.success("Usuario eliminado");
    }
  });

  const handleSendInvitation = () => {
    if (!inviteEmail) return;

    const subject = "Invitacion al sistema de gestion de calidad - GECO SRL";
    const body = `Estimado, para registrarse en el Sistema de Gestion de Calidad de la empresa ingrese al siguiente enlace: https://sgc-geco.vercel.app/

  Ante cualquier consulta, contacte al administrador.`;

    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${inviteEmail}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(outlookUrl, '_blank');

    setIsInviteOpen(false);
    setInviteEmail("");
  };

  if (isLoading) return <MainLayout title="Usuarios"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout title="Usuarios" subtitle="Gestión de accesos y permisos">
      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><UsersIcon className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold">{users.length}</p><p className="text-sm text-muted-foreground">Total Usuarios</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><Check className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold">{users.filter((u: any) => isUserActive(u.last_access)).length}</p><p className="text-sm text-muted-foreground">Activos</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><X className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold">{users.filter((u: any) => !isUserActive(u.last_access)).length}</p><p className="text-sm text-muted-foreground">Inactivos</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2"><Shield className="h-5 w-5 text-secondary" /></div>
            <div><p className="text-2xl font-bold">{users.filter((u: any) => u.role === "editor").length}</p><p className="text-sm text-muted-foreground">Editores</p></div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex justify-end">
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invitar colaborador</DialogTitle></DialogHeader>
            <div className="py-4"><Label>Correo Electrónico</Label><Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@empresa.com" /></div>
            <DialogFooter><Button onClick={handleSendInvitation} disabled={!inviteEmail}>Enviar Invitación</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full table-fixed border-collapse">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="w-[40%] px-4 py-3 text-left text-sm font-medium text-muted-foreground">Usuario</th>
              <th className="w-[20%] px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
              <th className="w-[15%] px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="w-[20%] px-4 py-3 text-left text-sm font-medium text-muted-foreground">Último Acceso</th>
              <th className="w-[5%] px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u: any) => (
              <tr key={u.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium uppercase">
                        {u.full_name?.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{u.full_name}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground truncate">
                        <Mail className="h-3 w-3 shrink-0" /> {u.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={roleStyles[u.role]}>{roleLabels[u.role]}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${isUserActive(u.last_access) ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className="text-sm text-muted-foreground capitalize">{isUserActive(u.last_access) ? "activo" : "inactivo"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {u.last_access ? formatDistanceToNow(new Date(u.last_access), { addSuffix: true, locale: es }) : "Nunca"}
                </td>
                <td className="px-4 py-3 text-right">
                  {currentUser?.auth_id !== u.auth_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, newRole: u.role === 'editor' ? 'lector' : 'editor' })}>Cambiar Rol</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => { setUserToDelete(u); setDeleteDialogOpen(true); }}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle className="h-6 w-6" /></div>
            <DialogTitle className="text-center">¿Confirmar eliminación?</DialogTitle>
            <DialogDescription className="text-center">Esta acción eliminará a <strong>{userToDelete?.full_name}</strong> permanentemente.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteUserMutation.mutate(userToDelete?.id)}>Eliminar Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Usuarios;