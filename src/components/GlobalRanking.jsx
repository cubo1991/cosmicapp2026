"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { rankingService } from "@/services/rankingService";

export default function GlobalRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    rankingService.obtenerRankingGlobal()
      .then(data => setRanking(data.slice(0, 10)))
      .catch(() => setError("Error al cargar el ranking"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <SkeletonRanking />;
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8">
        <p>{error}</p>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="text-center text-purple-300 py-8">
        <p>Sin datos de ranking aún. ¡Crea tu primera partida!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top 3 Destacado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {ranking.slice(0, 3).map((jugador, idx) => (
          <RankingCardTop3
            key={jugador.id}
            jugador={jugador}
            posicion={idx + 1}
          />
        ))}
      </div>

      {/* Top 4-10 */}
      <div className="space-y-2">
        {ranking.slice(3, 10).map((jugador) => (
          <RankingRowCompact key={jugador.id} jugador={jugador} />
        ))}
      </div>

      {/* Enlace a ranking completo */}
      <div className="text-center mt-8">
        <Link href="/ranking">
          <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold">
            Ver Ranking Completo
          </button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Tarjeta destacada para top 3
 */
function RankingCardTop3({ jugador, posicion }) {
  const medalEmoji = ["🥇", "🥈", "🥉"][posicion - 1];
  const bgColor = [
    "from-yellow-500/20 to-yellow-600/20",
    "from-slate-400/20 to-slate-500/20",
    "from-orange-600/20 to-orange-700/20",
  ][posicion - 1];
  const borderColor = [
    "border-yellow-500/50",
    "border-slate-400/50",
    "border-orange-600/50",
  ][posicion - 1];

  return (
    <Link href={`/players/${jugador.id}`}>
      <div
        className={`bg-gradient-to-br ${bgColor} border ${borderColor} rounded-lg p-6 text-center hover:scale-105 transition-transform cursor-pointer backdrop-blur-sm`}
      >
        <div className="text-4xl mb-2">{medalEmoji}</div>

        {jugador.avatar && (
          <img
            src={jugador.avatar}
            alt={jugador.nombre}
            className="w-16 h-16 rounded-full mx-auto mb-3 object-cover border-2 border-white/30"
          />
        )}

        <h3 className="text-lg font-bold text-white truncate">
          {jugador.nombre}
        </h3>
        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 mt-2">
          {jugador.puntos.toFixed(1)} pts
        </p>

        <div className="text-xs text-purple-300 mt-2 space-y-1">
          <p>Partidas en copa: {jugador.partidas}</p>
          <p>Copas ganadas: {jugador.victorias}</p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Fila compacta para posiciones 4-10
 */
function RankingRowCompact({ jugador }) {
  return (
    <Link href={`/players/${jugador.id}`}>
      <div className="bg-white/5 hover:bg-white/10 border border-purple-500/30 hover:border-purple-500/60 rounded-lg p-4 transition-all flex items-center gap-4 cursor-pointer backdrop-blur-sm">
        {/* Posición */}
        <div className="text-center min-w-12">
          <p className="text-2xl font-bold text-purple-400">
            #{jugador.posicion}
          </p>
        </div>

        {/* Avatar + Nombre */}
        <div className="flex-1 flex items-center gap-3">
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
            <p className="text-xs text-purple-300">
              {jugador.partidas} partidas
            </p>
          </div>
        </div>

        {/* Puntos */}
        <div className="text-right">
          <p className="text-xl font-bold text-yellow-300">
            {jugador.puntos.toFixed(1)}
          </p>
          <p className="text-xs text-gray-400">últimas 10 partidas</p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Skeleton loading
 */
function SkeletonRanking() {
  return (
    <div className="space-y-4">
      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5 rounded-lg p-6 animate-pulse">
            <div className="h-12 bg-white/10 rounded-full mx-auto mb-3 w-12"></div>
            <div className="h-6 bg-white/10 rounded mb-2"></div>
            <div className="h-8 bg-white/10 rounded mb-2"></div>
            <div className="h-4 bg-white/10 rounded"></div>
          </div>
        ))}
      </div>

      {/* Rows */}
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="bg-white/5 rounded-lg p-4 h-16 animate-pulse flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-white/10 rounded"></div>
          <div className="flex-1 h-4 bg-white/10 rounded"></div>
          <div className="w-20 h-4 bg-white/10 rounded"></div>
        </div>
      ))}
    </div>
  );
}
