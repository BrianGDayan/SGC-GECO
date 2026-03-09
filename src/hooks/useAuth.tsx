import { useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }

  // Ahora leemos el rol directamente desde el contexto que acabamos de arreglar
  const role = context.role;
  const user = context.user;

  // Banderas rápidas de roles
  const isAdmin = role === 'admin';
  const isEditor = role === 'editor';
  const isColaborador = role === 'colaborador';
  const isAuditor = role === 'auditor';

  /**
   * Evalúa si el usuario actual tiene permiso para modificar algo de este proceso.
   * @param managerIds Array de UUIDs de los usuarios que gestionan el proceso (manager_ids)
   */
  const canManageProcess = (managerIds?: string[] | null) => {
    if (isAdmin) return true; // El admin tiene acceso global
    
    // Si es editor, verificamos si su ID de auth está dentro del array de managers de este proceso
    if (isEditor && user?.id && managerIds) {
      return managerIds.includes(user.id);
    }
    
    return false; // Colaboradores, auditores, u otros editores no pueden
  };

  return {
    ...context,
    isAdmin,
    isEditor,
    isColaborador,
    isAuditor,
    canManageProcess
  };
}