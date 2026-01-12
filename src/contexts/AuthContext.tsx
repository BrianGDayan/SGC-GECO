import { useState, useEffect, createContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "editor" | "lector";

export interface SgcUser {
  id: number;
  auth_id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  last_access: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userData: SgcUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ data: any, error: any }>;
  signOut: () => Promise<void>;
  isEditor: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userData, setUserData] = useState<SgcUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (auth_id: string) => {
  try {
    const { data, error } = await supabase
      .from("users" as any)
      .select("*")
      .eq("auth_id", auth_id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      // FIX: Doble casteo para evitar el error ts(2352)
      setUserData(data as unknown as SgcUser);
      
      supabase
        .from("users" as any)
        .update({ last_access: new Date().toISOString() })
        .eq("auth_id", auth_id)
        .then();
    } else {
      if (window.location.pathname !== "/auth") {
        signOut();
      }
    }
  } catch (error) {
    console.error("Error al obtener datos:", error);
  }
};

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      else setUserData(null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut().then(() => { setUserData(null); setUser(null); });
  const signUp = (email: string, password: string, fullName?: string) => 
    supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });

  return (
    <AuthContext.Provider value={{ user, session, userData, loading, signIn, signUp, signOut, isEditor: userData?.role === "editor" }}>
      {children}
    </AuthContext.Provider>
  );
}