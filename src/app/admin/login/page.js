'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * Página de login para administrador
 * Listo para integración con:
 * - Firebase Auth
 * - Email/Password auth
 * - Google OAuth
 * - Verificación de rol de admin
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Implementar autenticación real
      /*
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error('Credenciales inválidas');
      }

      const data = await response.json();
      
      // Guardar token
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_role', data.role);

      // Redirigir al admin
      window.location.href = '/admin';
      */

      // Por ahora, solo redirigir (desarrollo)
      window.location.href = '/admin';
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">⚙️ Admin Login</h1>
            <p className="text-gray-300">Panel de administración de CosmicAPP</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500 text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-gray-400 text-sm text-center mb-4">
              ℹ️ Desarrollo: Acceso sin autenticación
            </p>
            <Link href="/admin">
              <button className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition border border-white/20">
                Continuar al Panel (Modo Desarrollo)
              </button>
            </Link>
          </div>

          <div className="mt-6 text-center">
            <Link href="/">
              <p className="text-purple-300 hover:text-purple-200 text-sm transition cursor-pointer">
                ← Volver al inicio
              </p>
            </Link>
          </div>
        </div>

        {/* Información de desarrollo */}
        <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
          <p className="text-blue-200 text-xs">
            <strong>📝 TODO:</strong> Integrar autenticación real
            <br />
            Descomentar código en: middleware.js, useAdminAccess.js, /api/auth/*
          </p>
        </div>
      </div>
    </div>
  );
}
