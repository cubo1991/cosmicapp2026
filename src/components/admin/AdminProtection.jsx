"use client";

import { useProtectedAdmin } from "@/hooks/useAdminAccess";
import { useRouter } from "next/navigation";

/**
 * Componente wrapper para proteger páginas administrativas
 *
 * Uso:
 * <AdminProtection>
 *   <TuContenidoAdmin />
 * </AdminProtection>
 */
export function AdminProtection({ children, redirectTo = "/" }) {
  const { isAuthorized, loading, error } = useProtectedAdmin(redirectTo);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            ⚠️ Error de Acceso
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return isAuthorized ? children : null;
}

/**
 * Hook para verificar permisos en rutas
 */
export function useAdminRoute(requiredRole = "admin") {
  const { isAdmin, loading } = useProtectedAdmin();
  const router = useRouter();

  if (!loading && !isAdmin) {
    // TODO: Redirigir cuando se implemente autenticación real
    console.warn("Redirigiendo: usuario no tiene permisos de administrador");
  }

  return {
    isAuthorized: isAdmin || loading,
    loading,
    canAccess: (permission) => {
      // TODO: Implementar verificación de permisos granulares
      return isAdmin;
    },
  };
}
