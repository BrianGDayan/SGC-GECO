import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  FolderOpen,
  Users,
  CheckCircle,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
// IMPORTAMOS EL HOOK
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Documentos", href: "/documentos", icon: FileText },
  { name: "Indicadores", href: "/indicadores", icon: BarChart3 },
  { name: "Procesos", href: "/procesos", icon: FolderOpen },
  { name: "Auditorías", href: "/auditorias", icon: CheckCircle },
  { name: "Usuarios", href: "/usuarios", icon: Users, adminOnly: true }, // <-- Agregamos esta bandera
];

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, signOut } = useAuth();

  // Filtramos la navegación. Si tiene 'adminOnly' y el usuario no es admin, lo sacamos.
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
      <div className="flex h-full flex-col">
        
        {/* === HEADER DEL SIDEBAR === */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-sidebar-border/50">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="truncate font-semibold text-sm text-sidebar-foreground tracking-tight">GECO SRL</span>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">Gestión de Calidad</span>
          </div>
        </div>

        {/* Navigation - AHORA USA EL ARRAY FILTRADO */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;