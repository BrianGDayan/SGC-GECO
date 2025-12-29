import { 
  Users as UsersIcon, 
  Plus, 
  Mail, 
  Shield, 
  MoreVertical,
  Check,
  X
} from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const users = [
  {
    id: 1,
    name: "Ana García",
    email: "ana.garcia@empresa.com",
    role: "Administrador",
    department: "Calidad",
    status: "activo",
    lastAccess: "Hace 5 min",
    permissions: ["documentos", "indicadores", "auditorias", "usuarios"],
  },
  {
    id: 2,
    name: "Carlos López",
    email: "carlos.lopez@empresa.com",
    role: "Auditor",
    department: "Calidad",
    status: "activo",
    lastAccess: "Hace 1 hora",
    permissions: ["documentos", "indicadores", "auditorias"],
  },
  {
    id: 3,
    name: "María Rodríguez",
    email: "maria.rodriguez@empresa.com",
    role: "Editor",
    department: "Producción",
    status: "activo",
    lastAccess: "Hace 2 horas",
    permissions: ["documentos", "indicadores"],
  },
  {
    id: 4,
    name: "Pedro Sánchez",
    email: "pedro.sanchez@empresa.com",
    role: "Colaborador",
    department: "Recursos Humanos",
    status: "activo",
    lastAccess: "Ayer",
    permissions: ["documentos"],
  },
  {
    id: 5,
    name: "Laura Martínez",
    email: "laura.martinez@empresa.com",
    role: "Colaborador",
    department: "Comercial",
    status: "inactivo",
    lastAccess: "Hace 1 semana",
    permissions: ["documentos"],
  },
];

const roleStyles = {
  Administrador: "bg-primary/10 text-primary border-primary/20",
  Auditor: "bg-secondary/10 text-secondary border-secondary/20",
  Editor: "bg-accent/10 text-accent border-accent/20",
  Colaborador: "bg-muted text-muted-foreground border-border",
};

const permissionLabels: Record<string, string> = {
  documentos: "Documentos",
  indicadores: "Indicadores",
  auditorias: "Auditorías",
  usuarios: "Usuarios",
};

const Usuarios = () => {
  return (
    <MainLayout title="Usuarios" subtitle="Gestión de accesos y permisos">
      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <UsersIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Usuarios</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-success/10 p-2">
              <Check className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.status === "activo").length}
              </p>
              <p className="text-sm text-muted-foreground">Activos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-destructive/10 p-2">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.status === "inactivo").length}
              </p>
              <p className="text-sm text-muted-foreground">Inactivos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary/10 p-2">
              <Shield className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {users.filter(u => u.role === "Administrador").length}
              </p>
              <p className="text-sm text-muted-foreground">Administradores</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex justify-end">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Invitar Usuario
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Departamento</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Permisos</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Último Acceso</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={roleStyles[user.role as keyof typeof roleStyles]}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{user.department}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs font-normal">
                        {permissionLabels[perm]}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${user.status === "activo" ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className="text-sm text-muted-foreground capitalize">{user.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{user.lastAccess}</td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar permisos</DropdownMenuItem>
                      <DropdownMenuItem>Ver actividad</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Desactivar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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