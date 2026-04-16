'use client';

import { useState } from 'react';
import { useLigas } from '@/hooks/useLiga';
import CrearLiga from '@/components/forms/CrearLiga';
import BotónEliminar from '@/components/buttons/BotónEliminar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LigasPage() {
  const { ligas, loading, error } = useLigas();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const router = useRouter();

  const ligasFiltradas = ligas.filter(liga => {
    const coincideEstado = !filtroEstado || liga.estado === filtroEstado;
    const coincideBusqueda = liga.nombre?.toLowerCase().includes(busqueda.toLowerCase());
    return coincideEstado && coincideBusqueda;
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">⚽ Ligas</h1>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            {mostrarFormulario ? '❌ Cancelar' : '➕ Crear Liga'}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <CrearLiga />
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Filtros y búsqueda */}
        {ligasFiltradas.length > 0 && (
          <div className="mb-6 flex gap-4">
            <input
              type="text"
              placeholder="Buscar liga por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Todos los estados</option>
              <option value="activa">Activas</option>
              <option value="finalizada">Finalizadas</option>
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Cargando ligas...</div>
        ) : ligasFiltradas.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {ligas.length === 0 ? 'No hay ligas. Crea una para comenzar.' : 'No se encontraron ligas.'}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Mostrando {ligasFiltradas.length} de {ligas.length} ligas
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ligasFiltradas.map(liga => (
                <div key={liga.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">
                        {liga.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Por: {liga.propietario || 'N/A'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      liga.estado === 'activa'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {liga.estado}
                    </span>
                  </div>

                  {liga.descripcion && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{liga.descripcion}</p>
                  )}

                  <div className="bg-gray-50 p-3 rounded mb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Miembros:</span>
                      <span className="font-semibold">{liga.miembros?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Partidas:</span>
                      <span className="font-semibold">{liga.partidas?.length || 0}</span>
                    </div>
                    {liga.estadisticas?.juegosPorJugador && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Promedio juegos:</span>
                        <span className="font-semibold text-orange-600">
                          {(liga.estadisticas.juegosPorJugador).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/ligas/${liga.id}`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                        👁️ Ver
                      </button>
                    </Link>
                    <Link href={`/ligas/${liga.id}/edit`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                        ✏️ Editar
                      </button>
                    </Link>
                    <div className="flex-1">
                      <BotónEliminar
                        tipo="liga"
                        id={liga.id}
                        nombre={liga.nombre}
                        onSuccess={() => router.refresh()}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
