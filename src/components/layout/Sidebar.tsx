import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  Settings,
  FolderOpen,
  Users,
  CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Documentos", href: "/documentos", icon: FileText },
  { name: "Indicadores", href: "/indicadores", icon: BarChart3 },
  { name: "Procesos", href: "/procesos", icon: FolderOpen },
  { name: "Auditorías", href: "/auditorias", icon: CheckCircle },
  { name: "Usuarios", href: "/usuarios", icon: Users },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
      <div className="flex h-full flex-col">
        
        {/* === HEADER DEL SIDEBAR MEJORADO === */}
        <div className="flex h-20 items-center gap-3 px-6 border-b border-sidebar-border/50">
          {/* Contenedor del Logo: Evita deformaciones */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-8 w-8 object-contain" 
            />
          </div>
          
          {/* Textos con Jerarquía */}
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="truncate font-semibold text-sm text-sidebar-foreground tracking-tight">
              GECO SRL
            </span>
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
              Gestión de Calidad
            </span>
          </div>
        </div>
        {/* ==================================== */}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
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

        {/* Settings */}
        <div className="border-t border-sidebar-border p-3">
          <Link
            to="/configuracion"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <Settings className="h-5 w-5" />
            Configuración
          </Link>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;