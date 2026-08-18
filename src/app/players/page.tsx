'use client';

import { useState } from 'react';
import { usePlayers } from '@/hooks/usePlayer';
import CrearJugador from '@/components/forms/CrearJugador';
import BotónEliminar from '@/components/buttons/BotónEliminar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlayersPage() {
  const { players, loading, error } = usePlayers();
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtro, setFiltro] = useState('');
  const router = useRouter();

  const jugadoresFiltrados = players.filter(p =>
    p.name?.toLowerCase().includes(filtro.toLowerCase()) ||
    p.email?.toLowerCase().includes(filtro.toLowerCase())
  );

  const handleNuevoJugador = () => {
    setMostrarFormulario(false);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">👥 Jugadores</h1>
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            {mostrarFormulario ? '❌ Cancelar' : '➕ Crear Jugador'}
          </button>
        </div>

        {mostrarFormulario && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <CrearJugador />
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {error}
          </div>
        )}

        {/* Barra de búsqueda */}
        {jugadoresFiltrados.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-600">Cargando jugadores...</div>
        ) : jugadoresFiltrados.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {players.length === 0 ? 'No hay jugadores. Crea uno para comenzar.' : 'No se encontraron jugadores.'}
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Mostrando {jugadoresFiltrados.length} de {players.length} jugadores
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jugadoresFiltrados.map(player => (
                <div key={player.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  {player.avatar && (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                    />
                  )}
                  <h3 className="text-xl font-semibold text-gray-800 text-center mb-1">
                    {player.name}
                  </h3>
                  <p className="text-gray-600 text-center text-sm mb-4">{player.email}</p>

                  {player.stats && (
                    <div className="bg-gray-50 p-4 rounded mb-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Partidas:</span>
                        <span className="font-semibold">{player.stats.partidas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Victorias:</span>
                        <span className="font-semibold">{player.stats.victorias}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Promedio:</span>
                        <span className="font-semibold">{(player.stats.puntosPromedio || 0).toFixed(2)} pts</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/players/${player.id}`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition">
                        👁️ Ver
                      </button>
                    </Link>
                    <Link href={`/players/${player.id}/edit`} className="flex-1">
                      <button className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition">
                        ✏️ Editar
                      </button>
                    </Link>
                    <div className="flex-1">
                      <BotónEliminar
                        tipo="jugador"
                        id={player.id}
                        nombre={player.name}
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
  )
}
