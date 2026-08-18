'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loginWithGoogle } from '@/firebase/auth';

export default function AdminLoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push('/admin');
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

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Conectando...' : 'Iniciar sesión con Google'}
          </button>

          <p className="mt-4 text-gray-400 text-xs text-center">
            Solo las cuentas autorizadas como administrador tienen acceso al panel.
          </p>

          <div className="mt-6 text-center">
            <Link href="/">
              <p className="text-purple-300 hover:text-purple-200 text-sm transition cursor-pointer">
                ← Volver al inicio
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
