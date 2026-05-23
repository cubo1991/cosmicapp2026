'use client';

import { useState, useEffect } from 'react';
import { getMatchById } from '@/firebase/db';
import { ErrorState } from '../../components/ErrorState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function PartidaDetailPage() {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        const partida = await getMatchById(id);

        if (!partida) {
          setError({
            title: 'Partida no encontrada',
            message: `La partida con ID "${id}" no existe o ha sido eliminada.`,
            action: { href: '/matches', label: 'Ver todas las partidas' }
          });
          return;
        }

        setMatch(partida);
      } catch (err) {
        console.error('Error al obtener la partida:', err);
        setError({
          title: 'Error al cargar',
          message: 'No pudimos conectar con el servidor. Por favor intenta más tarde.',
          action: { href: '/matches', label: 'Volver a partidas' }
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchMatch();
  }, [id]);

  if (loading) {
    return <LoadingOverlay message="Cargando partida..." />;
  }

  if (error) {
    return <ErrorState {...error} />;
  }

  if (!match) {
    return (
      <ErrorState
        title="Partida vacía"
        message="No se pudieron cargar los detalles de la partida."
        action={{ href: '/matches', label: 'Volver' }}
      />
    );
  }

  // Convertir jugadores a array si es necesario
  const jugadoresArray = Array.isArray(match.jugadores) 
    ? match.jugadores 
    : Object.values(match.jugadores || {});

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Volver
          </button>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {match.nombre || `Partida ${id.slice(0, 8)}`}
          </h1>
          <p className="text-gray-600">
            {match.fechaCreacion && new Date(match.fechaCreacion.seconds * 1000).toLocaleDateString('es-ES')}
          </p>
        </div>

        {/* Estado */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Estado</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Código de partida:</span>
                  <span className="font-semibold text-blue-600">{id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className={`font-semibold px-3 py-1 rounded-full ${
                    match.estado === 'finalizada' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {match.estado}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suma a Copa:</span>
                  <span className="font-semibold">
                    {match.asociarACopa !== false ? '✓ Sí' : '✗ No'}
                  </span>
                </div>
                {match.copId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Copa ID:</span>
                    <Link href={`/copas/${match.copId}`} className="font-semibold text-blue-600 hover:text-blue-800">
                      {match.copId}
                    </Link>
                  </div>
                )}
                {match.ligaId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Liga ID:</span>
                    <Link href={`/ligas/${match.ligaId}`} className="font-semibold text-blue-600 hover:text-blue-800">
                      {match.ligaId}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Jugadores */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Jugadores ({jugadoresArray.length})
          </h2>
          
          {jugadoresArray.length === 0 ? (
            <p className="text-gray-600">No hay jugadores registrados</p>
          ) : (
            <div className="space-y-3">
              {jugadoresArray.map((jugador, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    {jugador.color && (
                      <div
                        className="w-8 h-8 rounded-full border-2 border-gray-300"
                        style={{ backgroundColor: jugador.color }}
                      />
                    )}
                    <div>
                      <p className="font-semibold text-gray-800">{jugador.nombre}</p>
                      {jugador.playerId && (
                        <p className="text-sm text-gray-600">ID: {jugador.playerId}</p>
                      )}
                      {!jugador.playerId && (
                        <p className="text-sm text-orange-600">👤 Visitante</p>
                      )}
                    </div>
                  </div>
                  {jugador.aliens && jugador.aliens.length > 0 && (
                    <p className="text-sm text-gray-600">
                      👽 {jugador.aliens.length} aliens
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones */}
        {match.estado !== 'finalizada' && (
          <div className="flex gap-3">
            <Link href={`/matches/${id}/edit`} className="flex-1">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">
                ✏️ Editar
              </button>
            </Link>
            <Link href={`/cargarPartida/${id}`} className="flex-1">
              <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition">
                📊 Cargar Puntos
              </button>
            </Link>
          </div>
        )}

        {match.estado === 'finalizada' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-700 font-semibold">✓ Esta partida ha sido finalizada</p>
          </div>
        )}
      </div>
    </div>
  );
}
