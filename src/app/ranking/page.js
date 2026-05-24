'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { rankingService } from '@/services/rankingService';

/**
 * Página de Ranking Global Completo
 */
export default function RankingPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    rankingService.obtenerRankingGlobal()
      .then(data => setRanking(data))
      .catch(() => setError('Error cargando el ranking'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <NavBar />

      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">🏆 Ranking Global</h1>
          <p className="text-purple-300">Suma de las últimas 10 partidas de cada jugador</p>
        </div>

        {/* Contenido */}
        {loading ? (
          <SkeletonRankingPage />
        ) : error ? (
          <div className="text-center text-red-400 py-12">
            <p>{error}</p>
          </div>
        ) : ranking.length === 0 ? (
          <div className="text-center text-purple-300 py-12">
            <p>Sin datos de ranking aún.</p>
          </div>
        ) : (
          <RankingTable ranking={ranking} />
        )}
      </div>
    </div>
  );
}

/**
 * Tabla de ranking completo
 */
function RankingTable({ ranking }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-purple-500/50">
            <th className="text-left py-4 px-4 text-purple-300 font-semibold">#</th>
            <th className="text-left py-4 px-4 text-purple-300 font-semibold">Jugador</th>
            <th className="text-center py-4 px-4 text-purple-300 font-semibold">Puntos*</th>
            <th className="text-center py-4 px-4 text-purple-300 font-semibold">Partidas</th>
            <th className="text-center py-4 px-4 text-purple-300 font-semibold">Victorias</th>
            <th className="text-center py-4 px-4 text-purple-300 font-semibold">Promedio</th>
            <th className="text-center py-4 px-4 text-purple-300 font-semibold">Acción</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((jugador, idx) => (
            <RankingTableRow key={jugador.id} jugador={jugador} index={idx} />
          ))}
        </tbody>
      </table>

      {/* Nota al pie */}
      <div className="text-center text-sm text-purple-400 mt-8 px-4 py-4 bg-white/5 rounded-lg border border-purple-500/30">
        <p>* Puntos = Suma de las últimas 10 partidas jugadas por cada jugador individualmente</p>
      </div>
    </div>
  );
}

/**
 * Fila de tabla
 */
function RankingTableRow({ jugador, index }) {
  const getMedalEmoji = (pos) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `#${pos}`;
  };

  const rowBg = index < 3 ? 'bg-white/10' : 'hover:bg-white/5';

  return (
    <tr className={`border-b border-purple-500/20 ${rowBg} transition-colors`}>
      {/* Posición */}
      <td className="py-4 px-4">
        <div className="text-2xl font-bold text-yellow-300">
          {getMedalEmoji(jugador.posicion)}
        </div>
      </td>

      {/* Nombre + Avatar */}
      <td className="py-4 px-4">
        <Link href={`/players/${jugador.id}`}>
          <div className="flex items-center gap-3 cursor-pointer hover:text-purple-300 transition-colors">
            {jugador.avatar ? (
              <img
                src={jugador.avatar}
                alt={jugador.nombre}
                className="w-12 h-12 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-500/30 flex items-center justify-center border border-white/20">
                👤
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{jugador.nombre}</p>
              <p className="text-xs text-gray-400">{jugador.id}</p>
            </div>
          </div>
        </Link>
      </td>

      {/* Puntos */}
      <td className="py-4 px-4 text-center">
        <p className="text-xl font-bold text-yellow-300">{jugador.puntos.toFixed(1)}</p>
      </td>

      {/* Partidas */}
      <td className="py-4 px-4 text-center">
        <p className="text-white font-semibold">{jugador.partidas}</p>
      </td>

      {/* Victorias */}
      <td className="py-4 px-4 text-center">
        <p className="text-white font-semibold">{jugador.victorias}</p>
      </td>

      {/* Promedio */}
      <td className="py-4 px-4 text-center">
        <p className="text-white font-semibold">{jugador.puntosPromedio.toFixed(1)}</p>
      </td>

      {/* Acción */}
      <td className="py-4 px-4 text-center">
        <Link href={`/players/${jugador.id}`}>
          <button className="px-4 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors">
            Ver
          </button>
        </Link>
      </td>
    </tr>
  );
}

/**
 * Skeleton para tabla
 */
function SkeletonRankingPage() {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-purple-500/50">
              <th className="py-4 px-4 h-6 bg-white/10 rounded animate-pulse"></th>
              <th className="py-4 px-4 h-6 bg-white/10 rounded animate-pulse"></th>
              <th className="py-4 px-4 h-6 bg-white/10 rounded animate-pulse"></th>
              <th className="py-4 px-4 h-6 bg-white/10 rounded animate-pulse"></th>
              <th className="py-4 px-4 h-6 bg-white/10 rounded animate-pulse"></th>
              <th className="py-4 px-4 h-6 bg-white/10 rounded animate-pulse"></th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <tr key={i} className="border-b border-purple-500/20">
                <td className="py-4 px-4 h-16 bg-white/5 rounded animate-pulse"></td>
                <td className="py-4 px-4 h-16 bg-white/5 rounded animate-pulse"></td>
                <td className="py-4 px-4 h-16 bg-white/5 rounded animate-pulse"></td>
                <td className="py-4 px-4 h-16 bg-white/5 rounded animate-pulse"></td>
                <td className="py-4 px-4 h-16 bg-white/5 rounded animate-pulse"></td>
                <td className="py-4 px-4 h-16 bg-white/5 rounded animate-pulse"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
