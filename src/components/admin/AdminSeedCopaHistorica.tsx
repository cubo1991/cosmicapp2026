'use client';

import { useState } from 'react';
import { copaSeederService } from '@/services/copaSeederService';

export default function AdminSeedCopaHistorica() {
  const [logs, setLogs] = useState([]);
  const [estado, setEstado] = useState('idle'); // idle | loading | done | error
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const preview = copaSeederService.getPreviewData()
    .sort((a, b) => b.puntosTotales - a.puntosTotales);

  function addLog(msg) {
    setLogs(prev => [...prev, msg]);
  }

  async function handleSeed() {
    setConfirmando(false);
    setEstado('loading');
    setLogs([]);
    setResultado(null);
    try {
      const res = await copaSeederService.sembrarCopaHistorica(addLog);
      setResultado(res);
      setEstado('done');
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      setEstado('error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Copa Histórica LCE</h2>
        <p className="text-gray-600 mt-1 text-sm">
          Crea una copa finalizada con los puntajes históricos del Excel LCE.
          Las partidas se marcan como <code className="bg-gray-100 px-1 rounded">omitirEstadisticas</code> —
          no alteran las estadísticas individuales (jugadas, victorias, colonias, copas).
        </p>
      </div>

      {/* Tabla de preview */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Jugador (Firebase)</th>
              <th className="px-4 py-3 text-center">Partidas jugadas</th>
              <th className="px-4 py-3 text-right">Puntos totales</th>
              <th className="px-4 py-3 text-center text-xs font-normal">Participación (P1→P10)</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((j, idx) => (
              <tr key={j.nombre} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-4 py-2 font-bold text-gray-500">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                </td>
                <td className="px-4 py-2 font-semibold text-gray-800">{j.nombre}</td>
                <td className="px-4 py-2 text-center text-gray-700">{j.participaciones}</td>
                <td className="px-4 py-2 text-right font-bold text-blue-700">{j.puntosTotales.toFixed(1)}</td>
                <td className="px-4 py-2 text-center">
                  <div className="flex gap-0.5 justify-center">
                    {j.patron.map((p, i) => (
                      <span
                        key={i}
                        title={`Partida ${i + 1}`}
                        className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${
                          p ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 space-y-1">
        <p><strong>⚠️ Esta acción crea una copa nueva en Firestore.</strong></p>
        <p>No modifica ninguna copa existente. La copa quedará en estado <strong>finalizada</strong> con Goyo como ganador.</p>
        <p>Los puntos por partida son promedios calculados (puntosTotales ÷ partidas jugadas). No se modifican estadísticas individuales.</p>
      </div>

      {estado !== 'done' && (
        <button
          onClick={() => setConfirmando(true)}
          disabled={estado === 'loading'}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition"
        >
          {estado === 'loading' ? '⏳ Creando copa...' : '🏆 Cargar Copa Histórica LCE'}
        </button>
      )}

      {resultado && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-green-800 text-sm space-y-1">
          <p className="font-bold text-base">✅ Copa creada correctamente</p>
          <p>ID: <code className="bg-green-200 px-1 rounded">{resultado.copaId}</code></p>
          <p>Jugadores incluidos: {resultado.jugadoresIncluidos}</p>
          {resultado.noEncontrados.length > 0 && (
            <p className="text-yellow-700">No encontrados en Firebase: {resultado.noEncontrados.join(', ')}</p>
          )}
        </div>
      )}

      {logs.length > 0 && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
          {logs.map((log, i) => (
            <p key={i}>{log}</p>
          ))}
          {estado === 'loading' && (
            <p className="animate-pulse">▌</p>
          )}
        </div>
      )}

      {confirmando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="text-2xl">🏆</p>
            <p className="font-bold text-gray-800 text-lg">¿Cargar Copa Histórica LCE?</p>
            <p className="text-gray-600 text-sm">
              Se creará una nueva copa <strong>finalizada</strong> con 10 partidas y los puntajes del Excel.
              Las estadísticas individuales no se modificarán.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSeed}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition"
              >
                Sí, crear
              </button>
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
