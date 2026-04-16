'use client';

import { usePlayer } from '@/hooks/usePlayer';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function PlayerDetailPage() {
  const { id } = useParams();
  const { player, loading, error } = usePlayer(id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">Cargando jugador...</div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center text-red-600">
          Error: Jugador no encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/players" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Volver a Jugadores
        </Link>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-8 mb-8">
            {player.avatar && (
              <img
                src={player.avatar}
                alt={player.name}
                className="w-40 h-40 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">{player.name}</h1>
              <p className="text-gray-600 mb-4">{player.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded">
              <p className="text-gray-600 text-sm">Partidas Jugadas</p>
              <p className="text-2xl font-bold text-gray-800">{player.stats?.partidas || 0}</p>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <p className="text-gray-600 text-sm">Victorias</p>
              <p className="text-2xl font-bold text-gray-800">{player.stats?.victorias || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded">
              <p className="text-gray-600 text-sm">Promedio de Puntos</p>
              <p className="text-2xl font-bold text-gray-800">
                {(player.stats?.puntosPromedio || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded">
              <p className="text-gray-600 text-sm">Tasa de Victoria</p>
              <p className="text-2xl font-bold text-gray-800">
                {player.stats?.partidas > 0
                  ? ((player.stats.victorias / player.stats.partidas) * 100).toFixed(1) + '%'
                  : '0%'}
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Copas</h2>
            {player.copas && player.copas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {player.copas.map(copaId => (
                  <Link
                    key={copaId}
                    href={`/copas/${copaId}`}
                    className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition"
                  >
                    <p className="text-blue-600 hover:text-blue-800">Ver copa</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No participa en ninguna copa</p>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Ligas</h2>
            {player.ligas && player.ligas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {player.ligas.map(ligaId => (
                  <Link
                    key={ligaId}
                    href={`/ligas/${ligaId}`}
                    className="p-4 border border-gray-200 rounded hover:bg-gray-50 transition"
                  >
                    <p className="text-blue-600 hover:text-blue-800">Ver liga</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No participa en ninguna liga</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
