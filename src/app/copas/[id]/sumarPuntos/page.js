'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useCopa } from '@/hooks/useCopa';
import CargaPuntosForm from '@/components/forms/CargaPuntosForm';
import Link from 'next/link';

export default function SumarPuntosPage() {
  const params = useParams();
  const copaId = params.id;

  const { copa, partidas, loading, error } = useCopa(copaId);
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Cargando copa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 p-6 rounded">
            ❌ Error: {error}
          </div>
        </div>
      </div>
    );
  }

  if (!copa) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-100 p-6 rounded text-center text-gray-600">
            Copa no encontrada
          </div>
        </div>
      </div>
    );
  }

  const ultimasPartidas = (partidas || [])
    .sort((a, b) => new Date(b.fechaJuego || 0) - new Date(a.fechaJuego || 0))
    .slice(0, 5);

  if (selectedMatch) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setSelectedMatch(null)}
            className="text-blue-600 hover:text-blue-800 mb-6 flex items-center gap-2 font-semibold"
          >
            ← Volver al listado
          </button>

          <CargaPuntosForm
            matchId={selectedMatch.matchId}
            copaId={copaId}
            posicion={selectedMatch.posicion}
            onSuccess={() => {
              setSelectedMatch(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <div className="mb-8">
          <Link
            href={`/copas/${copaId}`}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2 font-semibold"
          >
            ← Volver a Copa
          </Link>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-bold text-gray-800">📊 Sumar Puntos</h1>
                <p className="text-lg text-gray-600 mt-1">{copa.nombre}</p>
              </div>
              <span
                className={`text-sm font-semibold px-4 py-2 rounded ${
                  copa.estado === 'activa'
                    ? 'bg-green-100 text-green-800'
                    : copa.estado === 'planificada'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {copa.estado.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Últimas Partidas</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
              {partidas.length} partidas
            </span>
          </div>

          {ultimasPartidas.length === 0 ? (
            <div className="p-12 bg-gray-50 rounded text-center">
              <p className="text-gray-600 text-lg">📭 No hay partidas en esta copa aún</p>
              <p className="text-gray-500 text-sm mt-2">
                Crea una partida primero para comenzar a cargar puntos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Posición
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Fecha de Juego
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ultimasPartidas.map((partida) => (
                    <tr
                      key={partida.matchId}
                      className="border-b border-gray-200 hover:bg-blue-50 transition"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                          {partida.posicion}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-gray-700">
                        {partida.fechaJuego
                          ? new Date(partida.fechaJuego).toLocaleDateString('es-AR', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Sin fecha'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                            partida.estado === 'cargada'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {partida.estado === 'cargada' ? '✓ Cargada' : '⏳ Pendiente'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedMatch(partida)}
                          className={`font-semibold py-2 px-4 rounded transition ${
                            partida.estado === 'cargada'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {partida.estado === 'cargada' ? '✏️ Editar' : '📝 Cargar'} Puntos
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {ultimasPartidas.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Haz click en una partida para cargar o editar sus puntos.
              Los jugadores que no participen no sumará puntos en esa posición.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}