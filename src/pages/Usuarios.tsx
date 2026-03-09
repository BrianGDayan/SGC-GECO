'use client';

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  admin: "bg-primary/10 text-primary border-primary/20",
  editor: "bg-secondary/10 text-secondary border-secondary/20",
  auditor: "bg-accent/10 text-accent border-accent/20",
  colaborador: "bg-muted text-muted-foreground border-border",
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  editor: "Editor (Jefe)",
  auditor: "Auditor",
  colaborador: "Colaborador",
};

const Usuarios = () => {
  const { userData: currentUser, isAdmin, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (!isAdmin) {
        toast.error("No tienes permisos para acceder a esta sección.");
        navigate("/"); 
      }
    }
  }, [authLoading, currentUser, isAdmin, navigate]);

  const { data: processes = [], isLoading: isLoadingProcesses } = useQuery({
    queryKey: ["processes-lookup"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processes").select("id, name, manager_ids");
      if (error) throw error;
      return data || [];
    }
  });

  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("users" as any)
        .select("*")
        .order("full_name", { ascending: true }) as any);
      if (error) throw error;
      return data;
    }
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
    const body = `Estimado, para registrarse en el Sistema de Gestion de Calidad de la empresa ingrese al siguiente enlace: https://sgc-geco.vercel.app/\n\nAnte cualquier consulta, contacte al administrador.`;

    const outlookUrl = `https://outlook.office.com/mail/deeplink/compose?to=${inviteEmail}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.open(outlookUrl, '_blank');

    setIsInviteOpen(false);
    setInviteEmail("");
  };

  if (authLoading || isLoadingUsers || isLoadingProcesses || !isAdmin) return <MainLayout title="Usuarios"><div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></MainLayout>;

  return (
    <MainLayout title="Usuarios" subtitle="Gestión de accesos y permisos">
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4 animate-fade-in">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2"><UsersIcon className="h-5 w-5 text-primary" /></div>
            <div><p className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{users.length}</p><p className="text-sm text-muted-foreground">Total Usuarios</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2"><Check className="h-5 w-5 text-success" /></div>
            <div><p className="text-2xl font-bold text-foreground group-hover:text-success transition-colors">{users.filter((u: any) => isUserActive(u.last_access)).length}</p><p className="text-sm text-muted-foreground">Activos</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2"><X className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-2xl font-bold text-foreground group-hover:text-destructive transition-colors">{users.filter((u: any) => !isUserActive(u.last_access)).length}</p><p className="text-sm text-muted-foreground">Inactivos</p></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2"><Shield className="h-5 w-5 text-secondary" /></div>
            <div><p className="text-2xl font-bold text-foreground group-hover:text-secondary transition-colors">{users.filter((u: any) => u.role === "editor").length}</p><p className="text-sm text-muted-foreground">Editores</p></div>
          </div>
        </div>
      </div>

      {/* ELIMINADO EL DELAY AQUÍ */}
      <div className="mb-6 flex justify-end animate-slide-up">
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all hover:shadow-md">
              <Plus className="h-4 w-4" /> Invitar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="text-xl">Invitar colaborador</DialogTitle></DialogHeader>
            <DialogDescription>Envíe un correo electrónico para que un nuevo usuario se registre en el sistema.</DialogDescription>
            <div className="py-4 space-y-2">
              <Label htmlFor="email" className="font-semibold text-slate-700">Correo Electrónico</Label>
              <Input id="email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@empresa.com" className="h-10 bg-white" autoFocus />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleSendInvitation} disabled={!inviteEmail} className="gap-2 bg-primary hover:bg-primary/90"><Mail className="h-4 w-4" /> Enviar Invitación</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ELIMINADO EL DELAY AQUÍ */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-slide-up">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-4 text-sm font-semibold tracking-wider text-left">Usuario</th>
                <th className="px-5 py-4 text-sm font-semibold tracking-wider text-left">Rol</th>
                <th className="px-5 py-4 text-sm font-semibold tracking-wider text-left">Procesos Vinculados</th>
                <th className="px-5 py-4 text-sm font-semibold tracking-wider text-left">Estado</th>
                <th className="px-5 py-4 text-sm font-semibold tracking-wider text-left">Último Acceso</th>
                <th className="px-5 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u: any) => {
                const userProcesses = (u.role === 'admin' || u.role === 'auditor') 
                  ? ["Todos los procesos"] 
                  : processes.filter(proc => Array.isArray(proc.manager_ids) && proc.manager_ids.includes(u.id)).map(proc => proc.name);

                return (
                  <tr key={u.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4 text-left">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-11 w-11 shrink-0 border border-primary/10 shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary font-bold text-sm uppercase">
                            {u.full_name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-base text-foreground truncate">{u.full_name}</p>
                          <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate mt-0.5">
                            <Mail className="h-3.5 w-3.5 shrink-0 opacity-70" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <Badge variant="outline" className={`${roleStyles[u.role] || roleStyles.colaborador} text-xs font-bold px-3 py-1 transition-all duration-300 hover:scale-105`}>
                        {roleLabels[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <div className="flex flex-wrap gap-1.5 max-w-[300px]">
                        {userProcesses.length > 0 ? (
                          userProcesses.map((name, i) => (
                            <Badge key={i} variant="secondary" className="font-medium text-[12px] px-2.5 py-0.5 bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-default">
                              {name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic opacity-70">Sin procesos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${isUserActive(u.last_access) ? "bg-success" : "bg-muted-foreground/30"}`} />
                        <span className="text-sm font-medium text-muted-foreground capitalize">
                          {isUserActive(u.last_access) ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap text-left">
                      {u.last_access ? formatDistanceToNow(new Date(u.last_access), { addSuffix: true, locale: es }) : "Nunca"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {currentUser?.auth_id !== u.auth_id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, newRole: 'admin' })}>Hacer Administrador</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, newRole: 'editor' })}>Hacer Editor</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, newRole: 'auditor' })}>Hacer Auditor</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => updateRoleMutation.mutate({ userId: u.id, newRole: 'colaborador' })}>Hacer Colaborador</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => { setUserToDelete(u); setDeleteDialogOpen(true); }}>
                              Eliminar Usuario
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-xl">¿Confirmar eliminación?</DialogTitle>
            <DialogDescription className="text-center">
              Esta acción eliminará a <strong>{userToDelete?.full_name}</strong> permanentemente del sistema. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteUserMutation.mutate(userToDelete?.id)}>Eliminar Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default Usuarios;