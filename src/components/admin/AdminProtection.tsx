"use client";

import { useState } from "react";
import Link from "next/link";
import { useProtectedAdmin } from "@/hooks/useAdminAccess";
import { loginWithGoogle, logout } from "@/firebase/auth";

/**
 * Componente wrapper para proteger páginas administrativas
 *
 * Uso:
 * <AdminProtection>
 *   <TuContenidoAdmin />
 * </AdminProtection>
 */
export function AdminProtection({ children }) {
  const { isAdmin, loading, error, user } = useProtectedAdmin();
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    setLoginError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      setLoginError(err.message || "Error al iniciar sesión");
    }
  };

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
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            🔒 Acceso restringido
          </h2>
          <p className="text-gray-600 mb-6">
            Iniciá sesión con la cuenta de Google autorizada como
            administrador.
          </p>

          {loginError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition mb-4"
          >
            Iniciar sesión con Google
          </button>

          {user && (
            <div className="text-left text-xs text-gray-500 bg-gray-50 rounded p-3 border border-gray-200">
              <p className="mb-1">
                Conectado como <strong>{user.email}</strong> pero esta cuenta
                no tiene permisos de administrador.
              </p>
              <p>
                Para darle acceso, creá en Firestore un documento en{" "}
                <code>admins/{user.uid}</code>.
              </p>
              <button
                onClick={() => logout()}
                className="mt-2 text-blue-600 hover:underline"
              >
                Cerrar sesión
              </button>
            </div>
          )}

          <Link
            href="/"
            className="block mt-4 text-blue-600 hover:underline text-sm"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminProtection;
