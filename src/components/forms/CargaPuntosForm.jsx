'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { playerService } from '@/services/playerService';
import { scoringService } from '@/services/scoringService';
import { rankingService } from '@/services/rankingService';

export default function CargaPuntosForm({ matchId, copaId, posicion, onSuccess }) {
  const [match, setMatch] = useState(null);
  const [jugadores, setJugadores] = useState({});
  const [puntos, setPuntos] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Cargar partida y jugadores
  useEffect(() => {
    const cargar = async () => {
      try {
        // Obtener partida
        const matchRef = doc(db, 'matches', matchId);
        const matchSnap = await getDoc(matchRef);
        
        if (!matchSnap.exists()) {
          throw new Error('Partida no encontrada');
        }

        const matchData = matchSnap.data();
        setMatch(matchData);

        const jugadoresInfo = {};
        const puntosIniciales = {};

        // Manejar jugadores en formato array (partida nueva) u objeto (ya puntuada)
        const jugadoresList = Array.isArray(matchData.jugadores)
          ? matchData.jugadores
              .filter(j => j.playerId)
              .map(j => ({ playerId: j.playerId, nombre: j.nombre, datosExistentes: null }))
          : Object.entries(matchData.jugadores).map(([id, datos]) => ({
              playerId: id,
              nombre: datos.nombre,
              datosExistentes: datos
            }));

        for (const { playerId, nombre, datosExistentes } of jugadoresList) {
          const player = await playerService.obtenerPorId(playerId);
          if (!player) continue;

          jugadoresInfo[playerId] = player.name;

          if (datosExistentes?.coloniasInternas !== undefined) {
            puntosIniciales[playerId] = {
              nombre: player.name,
              CI: datosExistentes.coloniasInternas || 0,
              CE: datosExistentes.coloniasExternas || 0,
              ganador: datosExistentes.esGanador || false,
              participó: datosExistentes.participó !== false
            };
          } else {
            puntosIniciales[playerId] = {
              nombre: player.name,
              CI: 0,
              CE: 0,
              ganador: false,
              participó: true
            };
          }
        }

        setJugadores(jugadoresInfo);
        setPuntos(puntosIniciales);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    cargar();
  }, [matchId]);

  const handleChangeColonias = (playerId, tipo, valor) => {
    setPuntos(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [tipo]: Math.max(0, parseInt(valor) || 0)
      }
    }));
  };

  const handleToggleParticipacion = (playerId) => {
    setPuntos(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        participó: !prev[playerId].participó,
        // Si no participa, resetear sus datos
        ...(!prev[playerId].participó ? { CI: 0, CE: 0, ganador: false } : {})
      }
    }));
  };

  const handleToggleGanador = (playerId) => {
    setPuntos(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        ganador: !prev[playerId].ganador
      }
    }));
  };

  const calcularPrevision = (datos) => {
    if (!datos.participó) {
      return 'NO PARTICIPA';
    }
    const colonias = datos.CI * 1 + datos.CE * 2;
    const victoria = datos.ganador ? ' + V' : '';
    return `${colonias}${victoria}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');

    try {
      // Procesar resultados
      const { resultados, resumen } = scoringService.procesarResultadosPartida(puntos);

      // Validar
      if (resumen.totalGanadores === 0) {
        throw new Error('Debe haber al menos un ganador');
      }

      // Actualizar partida en Firestore
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        jugadores: resultados,
        resumen: resumen,
        estado: 'finalizada',
        'auditoria.cargadaPor': 'admin_user', // TODO: Obtener de auth context
        'auditoria.fechaCarga': serverTimestamp(),
        fechaFinalizacion: serverTimestamp()
      });

      // Actualizar ranking de copa
      await scoringService.actualizarRankingCopaSeguro(
        copaId,
        posicion,
        matchId,
        resultados
      );

      // Actualizar stats individuales de jugadores
      try {
        await rankingService.registrarPartidaPorJugador(matchId, resultados, new Date());
        await Promise.all(
          Object.entries(resultados)
            .filter(([_, datos]) => datos.participó)
            .map(([playerId, datos]) =>
              Promise.all([
                rankingService.actualizarLast10Score(playerId),
                scoringService.actualizarEstadisticasJugador(playerId, datos)
              ])
            )
        );
      } catch (statsError) {
        console.warn('⚠️ No se pudieron actualizar stats:', statsError.message);
      }

      // Éxito
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Cargando jugadores...</div>;
  }

  if (!match) {
    return <div className="p-6 text-center text-red-600">Partida no encontrada</div>;
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Cargar Puntos</h2>
        <p className="text-gray-600">
          {match.nombre} • Posición #{posicion}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabla principal */}
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                  Jugador
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                  ¿Participó?
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                  CI
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                  CE
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center font-semibold">
                  ¿Ganador?
                </th>
                <th className="border border-gray-300 px-4 py-3 text-right font-semibold">
                  Previsión
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(puntos).map(([playerId, datos]) => (
                <tr
                  key={playerId}
                  className={
                    !datos.participó
                      ? 'bg-gray-50'
                      : 'hover:bg-blue-50'
                  }
                >
                  <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-800">
                    {datos.nombre}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={datos.participó}
                      onChange={() => handleToggleParticipacion(playerId)}
                      className="w-5 h-5 cursor-pointer"
                      disabled={enviando}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={datos.CI}
                      onChange={(e) =>
                        handleChangeColonias(playerId, 'CI', e.target.value)
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-mono"
                      disabled={!datos.participó || enviando}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={datos.CE}
                      onChange={(e) =>
                        handleChangeColonias(playerId, 'CE', e.target.value)
                      }
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center font-mono"
                      disabled={!datos.participó || enviando}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={datos.ganador && datos.participó}
                      onChange={() => handleToggleGanador(playerId)}
                      className="w-5 h-5 cursor-pointer"
                      disabled={!datos.participó || enviando}
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-right font-semibold text-blue-600">
                    {calcularPrevision(datos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info de cálculo */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
          <h3 className="font-bold text-blue-900">📊 Fórmula de Cálculo</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              • <strong>Colonias Internas (CI):</strong> 1 punto cada una
            </li>
            <li>
              • <strong>Colonias Externas (CE):</strong> 2 puntos cada una
            </li>
            <li>
              • <strong>Bonificación Victoria:</strong> (participantes ÷ ganadores) si ganaste
            </li>
            <li className="text-xs text-blue-700 mt-2">
              💡 Si un jugador NO participa → no suma puntos y no ocupa lugar
            </li>
          </ul>
        </div>

        {/* Botón envío */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
          >
            {enviando ? '⏳ Guardando...' : '✓ Guardar Puntos'}
          </button>
        </div>
      </form>
    </div>
  );
}
