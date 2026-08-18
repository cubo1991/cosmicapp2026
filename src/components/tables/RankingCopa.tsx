"use client";

import { useCopa } from "@/hooks/useCopa";
import Link from "next/link";

export default function RankingCopa({ copaId }) {
  const { copa, ranking, loading, error } = useCopa(copaId);

  if (loading) {
    return <div className="p-6 text-center">Cargando ranking...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  if (!copa) {
    return (
      <div className="p- 6 text-center text-gray-600">Copa no encontrada</div>
    );
  }

  const rankingArray = Object.entries(ranking)
    .map(([playerId, datos]) => ({
      playerId,
      ...datos,
    }))
    .sort((a, b) => a.posicion - b.posicion);

  const esFinalizada = copa.estado === 'finalizada';

  return (
    <div className="w-full space-y-6">
      {/* Banner de campeón cuando la copa está finalizada */}
      {esFinalizada && copa.ganador && (
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg shadow-lg p-6 text-center">
          <p className="text-yellow-900 text-sm font-semibold uppercase tracking-wide mb-1">Campeón de la Copa</p>
          <p className="text-4xl font-black text-yellow-900">{copa.ganador.nombre}</p>
          <p className="text-yellow-800 mt-1 text-lg font-bold">
            {copa.ganador.puntosTotales?.toFixed(2)} puntos
          </p>
        </div>
      )}

      {/* Encabezado */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{copa.nombre}</h2>
            {copa.descripcion && (
              <p className="text-gray-600 mt-1">{copa.descripcion}</p>
            )}
          </div>
          <span
            className={`px-4 py-2 rounded font-semibold text-sm ${
              copa.estado === "activa"
                ? "bg-green-100 text-green-800"
                : copa.estado === "finalizada"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {copa.estado === 'finalizada' ? 'FINALIZADA' : copa.estado.toUpperCase()}
          </span>
        </div>

        {!esFinalizada && (
          <div className="flex gap-3 mt-4">
            <Link
              href={`/copas/${copaId}/sumarPuntos`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition inline-flex items-center gap-2"
            >
              📊 Sumar Puntos
            </Link>
            <Link
              href={`/copas/${copaId}/edit`}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded transition inline-flex items-center gap-2"
            >
              ✏️ Editar
            </Link>
          </div>
        )}
      </div>

      {/* Ranking */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Ranking</h3>

        {rankingArray.length === 0 ? (
          <div className="p-6 bg-gray-50 rounded text-center text-gray-600">
            No hay datos de ranking aún
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="border-r border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                    Posición
                  </th>
                  <th className="border-r border-gray-200 px-4 py-3 text-left font-semibold text-gray-700">
                    Jugador
                  </th>
                  <th className="border-r border-gray-200 px-4 py-3 text-center font-semibold text-gray-700">
                    Partidas
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Puntos Totales
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankingArray.map((entrada) => (
                  <tr
                    key={entrada.playerId}
                    className="border-b border-gray-200 hover:bg-blue-50 transition"
                  >
                    <td className="border-r border-gray-200 px-4 py-3 font-bold text-lg text-center w-12">
                      {entrada.posicion === 1 && "🥇"}
                      {entrada.posicion === 2 && "🥈"}
                      {entrada.posicion === 3 && "🥉"}
                      {entrada.posicion > 3 && entrada.posicion}
                    </td>
                    <td className="border-r border-gray-200 px-4 py-3 font-semibold text-gray-800">
                      {entrada.nombreJugador}
                    </td>
                    <td className="border-r border-gray-200 px-4 py-3 text-center text-gray-700">
                      {Object.values(entrada.participacionesPorPosicion || {}).filter(Boolean).length}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 text-lg">
                      {(entrada.puntosTotales || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info de partidas */}
      {copa.partidas && copa.partidas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📋 <strong>{copa.partidas.length}/10</strong> partidas cargadas en
            esta copa
          </p>
        </div>
      )}
    </div>
  );
}
