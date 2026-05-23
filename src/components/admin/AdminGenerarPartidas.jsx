'use client';

import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { playerService } from '@/services/playerService';
import { scoringService } from '@/services/scoringService';
import { activeCopaService } from '@/services/activeCopaService';

const COLORES = [
  { name: 'rojo', code: '#FF0000' },
  { name: 'azul', code: '#0000FF' },
  { name: 'blanco', code: '#FFFFFF' },
  { name: 'amarillo', code: '#FFFF00' },
  { name: 'negro', code: '#000000' },
  { name: 'morado', code: '#800080' },
  { name: 'verde', code: '#008000' },
  { name: 'naranja', code: '#FFA500' },
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

export default function AdminGenerarPartidas() {
  const [generando, setGenerando] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [finalizado, setFinalizado] = useState(false);

  const addLog = (msg, tipo = 'ok') => {
    setLogs(prev => [...prev, { msg, tipo, ts: Date.now() }]);
  };

  const generar = async () => {
    setGenerando(true);
    setLogs([]);
    setError(null);
    setFinalizado(false);

    try {
      const jugadoresDB = await playerService.obtenerTodos();

      if (jugadoresDB.length < 2) {
        throw new Error(
          `Necesitás al menos 2 jugadores registrados. Hay ${jugadoresDB.length}.`
        );
      }

      addLog(`Jugadores disponibles: ${jugadoresDB.length}`);

      for (let i = 1; i <= 10; i++) {
        // Seleccionar entre 2 y min(5, total) jugadores al azar
        const cantJugadores = Math.min(randInt(2, 5), jugadoresDB.length);
        const jugadoresSeleccionados = shuffle(jugadoresDB).slice(0, cantJugadores);
        const coloresSeleccionados = shuffle(COLORES).slice(0, cantJugadores);

        // Construir array de jugadores para el documento de partida
        const jugadoresArray = jugadoresSeleccionados.map((player, idx) => ({
          nombre: player.name,
          color: coloresSeleccionados[idx].code,
          playerId: player.id,
          aliens: [],
        }));

        // Crear el documento de la partida en Firestore
        const docRef = await addDoc(collection(db, 'matches'), {
          nombre: `Test Partida #${i}`,
          copId: null,
          ligaId: null,
          estado: 'activa',
          asociarACopa: true,
          fechaCreacion: serverTimestamp(),
          fechaFinalizacion: null,
          jugadores: jugadoresArray,
        });
        const matchId = docRef.id;

        // Asignar a la copa activa (actualiza copId y posicion en el match)
        await activeCopaService.agregarPartidaAutomatica(matchId, new Date());

        // Determinar ganadores: 1 ganador siempre; 2 si hay 4+ jugadores (25% chance)
        const puedeHaber2Ganadores = cantJugadores >= 4 && Math.random() < 0.25;
        const cantGanadores = puedeHaber2Ganadores ? 2 : 1;
        const idsGanadores = new Set(
          shuffle(jugadoresSeleccionados).slice(0, cantGanadores).map(j => j.id)
        );

        // Construir el input de puntos (mismo formato que JoinMatch)
        const puntosInput = {};
        jugadoresSeleccionados.forEach((player) => {
          puntosInput[player.id] = {
            nombre: player.name,
            playerId: player.id,
            CI: randInt(0, 7),
            CE: randInt(0, 5),
            ganador: idsGanadores.has(player.id),
            participó: true,
          };
        });

        // Finalizar la partida: calcula puntos, actualiza copa y stats de jugadores
        await scoringService.finalizarPartidaConCopa(matchId, puntosInput);

        const nombresGanadores = jugadoresSeleccionados
          .filter(p => idsGanadores.has(p.id))
          .map(p => p.name)
          .join(' y ');

        const resumenPuntos = jugadoresSeleccionados
          .map(p => {
            const d = puntosInput[p.id];
            const pts = d.CI * 1 + d.CE * 2;
            return `${p.name}: CI=${d.CI} CE=${d.CE}${d.ganador ? ' [G]' : ''}`;
          })
          .join(' | ');

        addLog(`Partida ${i} (${cantJugadores}j) → ${resumenPuntos}`, 'ok');
      }

      addLog('¡10 partidas generadas y puntuadas correctamente!', 'exito');
      setFinalizado(true);
    } catch (err) {
      console.error('Error generando partidas:', err);
      setError(err.message);
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">🎲 Generador de Partidas de Prueba</h2>
        <p className="text-gray-600 text-sm">
          Crea 10 partidas con resultados aleatorios válidos usando los jugadores registrados.
          Cada partida se asigna a la copa activa y los puntos se calculan con la fórmula real
          (CI×1 + CE×2 + Victoria=participantes/ganadores).
        </p>
      </div>

      {/* Descripción de lo que hace */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800 space-y-1">
        <p><strong>Por cada partida:</strong></p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>2–5 jugadores elegidos al azar</li>
          <li>Colonias Internas: 0–7 | Colonias Externas: 0–5</li>
          <li>1 ganador siempre (o 2 si hay 4+ jugadores, con 25% probabilidad)</li>
          <li>Se asigna a la copa activa y se actualizan stats de jugadores</li>
        </ul>
      </div>

      {/* Botón */}
      <button
        onClick={generar}
        disabled={generando}
        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg transition shadow-md"
      >
        {generando ? '⏳ Generando...' : '🎲 Generar 10 Partidas de Prueba'}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-6 bg-red-50 border border-red-300 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Log de progreso */}
      {logs.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-700 mb-2">Progreso:</h3>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-1 max-h-80 overflow-y-auto">
            {logs.map((entry, idx) => (
              <p
                key={idx}
                className={
                  entry.tipo === 'exito'
                    ? 'text-green-400 font-bold'
                    : 'text-gray-300'
                }
              >
                {entry.tipo === 'exito' ? '🎉 ' : '✓ '}
                {entry.msg}
              </p>
            ))}
            {generando && (
              <p className="text-yellow-400 animate-pulse">⏳ Procesando...</p>
            )}
          </div>
        </div>
      )}

      {/* Mensaje final */}
      {finalizado && (
        <div className="mt-4 bg-green-50 border border-green-300 rounded-lg p-4 text-green-800 font-semibold text-center">
          ✓ Podés ir a la copa activa o al ranking global para ver los resultados.
        </div>
      )}
    </div>
  );
}
