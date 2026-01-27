import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Search, User, LogOut, Loader2, FileText } from "lucide-react";
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

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const roleLabels: Record<string, string> = {
  editor: "Editor",
  lector: "Lector",
  viewer: "Lector",
  admin: "Administrador"
};

const Header = ({ title, subtitle }: HeaderProps) => {
  const { userData, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // --- LÓGICA DE NOTIFICACIONES ---
  const { data: recentDocs = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ["recent-docs-notifications"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents_view" as any)
        .select("*")
        .order("uploaded_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 60000 
  });

  const hasNewNotifications = recentDocs.some((doc: any) => {
    const diffTime = Math.abs(new Date().getTime() - new Date(doc.uploaded_at).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3; 
  });

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigate(`/documentos?q=${encodeURIComponent(searchTerm)}`);
      setSearchTerm("");
    }
  };

  const handleNotificationClick = (docCode: string) => {
    navigate(`/documentos?q=${encodeURIComponent(docCode)}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* === BUSCADOR GLOBAL === */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="w-64 pl-9 bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        {/* === NOTIFICACIONES === */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative cursor-pointer">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {hasNewNotifications && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Actividad Reciente</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {loadingNotifs ? (
                <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              ) : recentDocs.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No hay actividad reciente.</div>
              ) : (
                recentDocs.map((doc: any) => (
                  <DropdownMenuItem 
                    key={doc.version_id} 
                    className="cursor-pointer flex items-start gap-3 p-3 border-b border-border/50 last:border-0 focus:bg-muted/50"
                    onClick={() => handleNotificationClick(doc.code)}
                  >
                    <div className="mt-1 rounded bg-primary/10 p-1.5 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-foreground">{doc.code}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(doc.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground/90">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.revision === 0 ? "Nuevo documento" : `Rev. ${doc.revision}`}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* === USUARIO (TU CÓDIGO ORIGINAL RESTAURADO) === */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-muted cursor-pointer">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {userData?.full_name || "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userData?.email}
                </p>
                
                <div className="flex flex-wrap gap-1 pt-1">
                  {userData?.role && (
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {roleLabels[userData.role] || userData.role}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
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