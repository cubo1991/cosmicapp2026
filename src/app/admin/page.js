'use client';

import { useState } from 'react';
import AdminEstadisticas from '@/components/admin/AdminEstadisticas';
import AdminJugadores from '@/components/admin/AdminJugadores';
import AdminPartidas from '@/components/admin/AdminPartidas';
import AdminCopas from '@/components/admin/AdminCopas';
import AdminLigas from '@/components/admin/AdminLigas';
import AdminCargarPartidas from '@/components/admin/AdminCargarPartidas';
import AdminGenerarPartidas from '@/components/admin/AdminGenerarPartidas';
import AdminEstadisticasLCE from '@/components/admin/AdminEstadisticasLCE';

export default function AdminPage() {
  const [pestanaActiva, setPestanaActiva] = useState('estadisticas');

  const pestanas = [
    { id: 'estadisticas', nombre: '📊 Estadísticas', icono: '📊' },
    { id: 'jugadores', nombre: '👥 Jugadores', icono: '👥' },
    { id: 'partidas', nombre: '🎮 Partidas', icono: '🎮' },
    { id: 'copas', nombre: '🏆 Copas', icono: '🏆' },
    { id: 'ligas', nombre: '⚽ Ligas', icono: '⚽' },
    { id: 'cargarPartidas', nombre: '📥 Cargar Partidas', icono: '📥' },
    { id: 'generarPartidas', nombre: '🎲 Generar Prueba', icono: '🎲' },
    { id: 'estadisticasLCE', nombre: '📋 Liga LCE', icono: '📋' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">⚙️ Panel de Administrador</h1>
          <p className="text-gray-300">Gestiona todos los aspectos de tu torneo</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Pestañas */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {pestanas.map(pestana => (
            <button
              key={pestana.id}
              onClick={() => setPestanaActiva(pestana.id)}
              className={`px-4 py-3 rounded-lg font-semibold transition whitespace-nowrap ${
                pestanaActiva === pestana.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {pestana.icono} {pestana.nombre}
            </button>
          ))}
        </div>

        {/* Contenido de las pestañas */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {pestanaActiva === 'estadisticas' && <AdminEstadisticas />}
          {pestanaActiva === 'jugadores' && <AdminJugadores />}
          {pestanaActiva === 'partidas' && <AdminPartidas />}
          {pestanaActiva === 'copas' && <AdminCopas />}
          {pestanaActiva === 'ligas' && <AdminLigas />}
          {pestanaActiva === 'cargarPartidas' && <AdminCargarPartidas />}
          {pestanaActiva === 'generarPartidas' && <AdminGenerarPartidas />}
          {pestanaActiva === 'estadisticasLCE' && <AdminEstadisticasLCE />}
        </div>
      </div>
    </div>
  );
}
