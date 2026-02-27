import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const MainLayout = ({ children, title, subtitle }: MainLayoutProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      
      <aside className="w-64 shrink-0 hidden md:block border-r bg-card z-50">
        <Sidebar />
      </aside>

      {/* Agregamos overflow-hidden aquí para asegurar que la columna no empuje la pantalla */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        
        <Header title={title} subtitle={subtitle} />

        {/* CORRECCIÓN: Cambiamos a overflow-auto para permitir scroll horizontal y vertical de forma natural */}
        <main className="flex-1 overflow-auto p-8 bg-background/50">
          <div className="animate-fade-in w-full">
            {children}
          </div>
        </main>
        
      </div>
    </div>
  );
};

export default MainLayout;