"use client";

import { useCopa } from "@/hooks/useCopa";

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

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{copa.nombre}</h2>
        <p className="text-gray-600">{copa.descripcion}</p>
        <p className="text-sm text-gray-500">
          Estado: <span className="font-semibold">{copa.estado}</span>
        </p>
      </div>

      {rankingArray.length === 0 ? (
        <div className="p-6 bg-gray-50 rounded text-center text-gray-600">
          No hay datos de ranking aún
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Posición
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Jugador
                </th>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Partidas
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right">
                  Puntos Totales
                </th>
              </tr>
            </thead>
            <tbody>
              {rankingArray.map((entrada) => (
                <tr key={entrada.playerId} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 font-semibold">
                    {entrada.posicion}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    {entrada.nombreJugador}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {entrada.participaciones || 0}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                    {(entrada.puntosTotales || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
