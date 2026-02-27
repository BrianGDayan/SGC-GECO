import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bell, Search, User, LogOut, Loader2, FileText, FileUp, 
  BarChart3, CalendarCheck, AlertTriangle, Layers 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

const roleLabels: Record<string, string> = {
  editor: "Editor",
  lector: "Lector",
  viewer: "Lector",
  admin: "Administrador"
};

const Header = ({ title, subtitle, className }: HeaderProps) => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  
  // NUEVO ESTADO: Controla si hay notificaciones sin leer
  const [hasUnread, setHasUnread] = useState(false);

  // --- LÓGICA DE NOTIFICACIONES GLOBALES ---
  const { data: recentActivity = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ["global-activity"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("global_activity_view" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Error cargando notificaciones:", error);
        return [];
      }
      return data as any[];
    },
    refetchInterval: 60000 
  });

  // NUEVO: Efecto que compara la última notificación con la última vez que abriste el menú
  useEffect(() => {
    if (recentActivity.length > 0) {
      const lastViewed = localStorage.getItem("lastViewedNotifications");
      const newestActivityTime = new Date(recentActivity[0].created_at).getTime();

      // Si nunca ha abierto las notificaciones, o la más reciente es posterior a su última lectura
      if (!lastViewed || newestActivityTime > parseInt(lastViewed)) {
        setHasUnread(true);
      } else {
        setHasUnread(false);
      }
    }
  }, [recentActivity]);

  // NUEVO: Apagar la alerta y guardar la fecha cuando abre el menú
  const handleNotificationsOpen = (isOpen: boolean) => {
    if (isOpen) {
      setHasUnread(false);
      localStorage.setItem("lastViewedNotifications", Date.now().toString());
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigate(`/documentos?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
    }
  };

  const getActivityConfig = (item: any) => {
    switch (item.activity_type) {
      case 'document_new':
        return { icon: FileText, colorClass: "text-primary bg-primary/10", message: `Nuevo documento creado: ${item.title}`, path: `/documentos?q=${encodeURIComponent(item.reference_id)}` };
      case 'document_version':
        return { icon: FileUp, colorClass: "text-blue-500 bg-blue-500/10", message: `Nueva versión del documento: ${item.title}`, path: `/documentos?q=${encodeURIComponent(item.reference_id)}` };
      case 'indicator':
        return { icon: BarChart3, colorClass: "text-secondary bg-secondary/10", message: `Nuevo indicador cargado: ${item.title}`, path: `/procesos` };
      case 'audit':
        return { icon: CalendarCheck, colorClass: "text-purple-600 bg-purple-600/10", message: `Nueva auditoría agregada: ${item.title}`, path: `/auditorias` };
      case 'finding':
        return { icon: AlertTriangle, colorClass: "text-destructive bg-destructive/10", message: `Nuevo hallazgo registrado`, path: `/procesos` };
      case 'process':
        return { icon: Layers, colorClass: "text-amber-500 bg-amber-500/10", message: `Nuevo procedimiento agregado: ${item.title}`, path: `/procesos` };
      default:
        return { icon: Bell, colorClass: "text-muted-foreground bg-muted", message: `Nueva actividad: ${item.title}`, path: `/` };
    }
  };

  return (
    <header className={cn(
      "flex h-20 w-full shrink-0 items-center justify-between border-b border-border bg-card px-8",
      className
    )}>
      <div className="flex flex-col min-w-0 pr-4">
        <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate hidden sm:block">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        
        {/* BUSCADOR */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="w-64 pl-9 bg-background/50 focus:bg-background transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* NOTIFICACIONES */}
        {/* CAMBIO AQUÍ: Agregamos onOpenChange al DropdownMenu */}
        <DropdownMenu onOpenChange={handleNotificationsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative cursor-pointer hover:bg-primary/10 transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {/* CAMBIO AQUÍ: Evaluamos hasUnread */}
              {hasUnread && (
                <span className="absolute top-2.5 right-2.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[340px] border-border/60 shadow-lg backdrop-blur-sm bg-card/95">
            <DropdownMenuLabel className="flex justify-between items-center py-3">
              <span>Actividad Reciente</span>
              <Badge variant="outline" className="text-[10px] font-normal">Todo el sistema</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[350px]">
              {loadingNotifs ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : recentActivity.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  No hay actividad reciente.
                </div>
              ) : (
                recentActivity.map((item: any) => {
                  const config = getActivityConfig(item);
                  const Icon = config.icon;

                  return (
                    <DropdownMenuItem 
                      key={item.unique_id} 
                      className="cursor-pointer flex items-start gap-3 p-3 border-b border-border/30 last:border-0 focus:bg-muted/60"
                      onClick={() => navigate(config.path)}
                    >
                      <div className={cn("mt-1 rounded-md p-2", config.colorClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-foreground truncate" title={config.message}>
                            {config.message}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-tight line-clamp-1 text-muted-foreground">
                          {item.description}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  );
                })
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* PERFIL DE USUARIO */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-muted/50 border border-border cursor-pointer hover:bg-primary/10 transition-colors">
              <User className="h-4 w-4 text-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-border/60 shadow-lg backdrop-blur-sm bg-card/95">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1.5 p-1">
                <p className="text-sm font-semibold leading-none truncate text-foreground">
                  {userData?.full_name || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate font-normal">
                  {userData?.email}
                </p>
                
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {userData?.role && (
                    <Badge variant="secondary" className="text-[10px] h-5 bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/20">
                      {roleLabels[userData.role] || userData.role}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;