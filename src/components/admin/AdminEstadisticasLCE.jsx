'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  estadisticasService,
  CAMPOS_EDITABLES,
  estadisticasVacias
} from '@/services/estadisticasService';

function calcularDerivadasJugador(e) {
  const jugadas = e.jugadas || 0;
  const victorias = e.victorias || 0;
  const colonias = e.colonias || 0;
  return {
    promVictorias: jugadas > 0 ? victorias / jugadas : 0,
    promColonias: jugadas > 0 ? colonias / jugadas : 0,
  };
}

function ModalEdicion({ jugador, onGuardar, onCerrar }) {
  const [form, setForm] = useState(() => ({ ...estadisticasVacias(), ...(jugador.estadisticas || {}) }));
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    setGuardando(true);
    try {
      const parsed = {};
      CAMPOS_EDITABLES.forEach(({ key }) => {
        parsed[key] = parseInt(form[key], 10) || 0;
      });
      await estadisticasService.actualizarEstadisticas(jugador.id, parsed);
      onGuardar(jugador.id, parsed);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl">
          <h3 className="text-xl font-bold">Editar Estadísticas — {jugador.nombre}</h3>
        </div>
        <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
          {CAMPOS_EDITABLES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="w-44 text-sm font-medium text-gray-700 flex-shrink-0">{label}</label>
              <input
                type="number"
                min="0"
                value={form[key] ?? 0}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded transition"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={onCerrar}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEstadisticasLCE() {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jugadorEditando, setJugadorEditando] = useState(null);
  const [snapshotInfo, setSnapshotInfo] = useState(null);
  const [accion, setAccion] = useState(null); // 'sembrando' | 'guardando' | 'restaurando'
  const [mensaje, setMensaje] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [ligaGanadorId, setLigaGanadorId] = useState('');
  const [asignandoLiga, setAsignandoLiga] = useState(false);

  const cargarJugadores = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'players'));
      const lista = snap.docs.map(d => ({
        id: d.id,
        nombre: d.data().name || 'Sin nombre',
        estadisticas: { ...estadisticasVacias(), ...(d.data().estadisticas || {}) }
      }));
      lista.sort((a, b) => (b.estadisticas.jugadas || 0) - (a.estadisticas.jugadas || 0));
      setJugadores(lista);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarSnapshot = useCallback(async () => {
    const info = await estadisticasService.leerInfoSnapshot();
    setSnapshotInfo(info);
  }, []);

  useEffect(() => {
    cargarJugadores();
    cargarSnapshot();
  }, [cargarJugadores, cargarSnapshot]);

  function handleGuardadoExitoso(playerId, nuevasEstadisticas) {
    setJugadores(prev =>
      prev.map(j => j.id === playerId ? { ...j, estadisticas: nuevasEstadisticas } : j)
    );
    setJugadorEditando(null);
  }

  async function handleSembrar() {
    setAccion('sembrando');
    setMensaje(null);
    try {
      const res = await estadisticasService.sembrarDatosIniciales();
      setMensaje({ tipo: 'ok', texto: `Datos sembrados: ${res.actualizados} jugadores con datos del Excel, ${res.total - res.actualizados} con estadísticas vacías.` });
      await cargarJugadores();
      await cargarSnapshot();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setAccion(null);
    }
  }

  async function handleGuardarSnapshot() {
    setAccion('guardando');
    setMensaje(null);
    try {
      await estadisticasService.guardarSnapshot();
      setMensaje({ tipo: 'ok', texto: 'Snapshot guardado correctamente.' });
      await cargarSnapshot();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setAccion(null);
    }
  }

  async function handleAsignarLiga() {
    if (!ligaGanadorId) return;
    setAsignandoLiga(true);
    try {
      await updateDoc(doc(db, 'players', ligaGanadorId), {
        'estadisticas.campanas': increment(1),
        updatedAt: serverTimestamp()
      });
      setJugadores(prev =>
        prev.map(j => j.id === ligaGanadorId
          ? { ...j, estadisticas: { ...j.estadisticas, campanas: (j.estadisticas.campanas || 0) + 1 } }
          : j
        )
      );
      setMensaje({ tipo: 'ok', texto: `Victoria de Liga registrada para ${jugadores.find(j => j.id === ligaGanadorId)?.nombre}.` });
      setLigaGanadorId('');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setAsignandoLiga(false);
    }
  }

  async function handleRestaurar() {
    setConfirmando(false);
    setAccion('restaurando');
    setMensaje(null);
    try {
      const n = await estadisticasService.restaurarSnapshot();
      setMensaje({ tipo: 'ok', texto: `Estadísticas restauradas para ${n} jugadores.` });
      await cargarJugadores();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setAccion(null);
    }
  }

  // Calcular totales y líderes
  const totales = jugadores.reduce((acc, j) => {
    const e = j.estadisticas;
    CAMPOS_EDITABLES.forEach(({ key }) => {
      acc[key] = (acc[key] || 0) + (e[key] || 0);
    });
    return acc;
  }, {});

  const n = jugadores.length || 1;
  const promedios = {};
  CAMPOS_EDITABLES.forEach(({ key }) => {
    promedios[key] = totales[key] / n;
  });

  function lider(key) {
    if (jugadores.length === 0) return '-';
    return jugadores.reduce((best, j) =>
      (j.estadisticas[key] || 0) > (best.estadisticas[key] || 0) ? j : best
    ).nombre;
  }

  const columnas = [
    { key: 'jugadas',             label: 'Jugadas',   resumen: 'suma' },
    { key: 'victorias',           label: 'Victorias', resumen: 'suma' },
    { key: '_promV',              label: 'Prom. V',   resumen: 'prom', derived: true },
    { key: 'colonias',            label: 'Colonias',  resumen: 'suma' },
    { key: '_promC',              label: 'Prom. C',   resumen: 'prom', derived: true },
    { key: 'victoriasEspeciales', label: 'V. Esp.',   resumen: 'suma' },
    { key: 'campanas',            label: 'Campañas',  resumen: 'suma' },
    { key: 'copas',               label: 'Copas',     resumen: 'suma' },
    { key: 'podioCopas',          label: 'Podio pts', resumen: 'suma' },
    { key: 'ataqueSolitario',     label: 'At. Sol.',  resumen: 'suma' },
    { key: 'defensaSolitaria',    label: 'Def. Sol.', resumen: 'suma' },
    { key: 'pijon',               label: 'Pijón',     resumen: 'suma' },
  ];

  function getCellValue(j, col) {
    const e = j.estadisticas;
    const { promVictorias, promColonias } = calcularDerivadasJugador(e);
    if (col.key === '_promV') return promVictorias;
    if (col.key === '_promC') return promColonias;
    return e[col.key] || 0;
  }

  function getResumenValue(col) {
    if (col.key === '_promV') {
      const totalJ = totales.jugadas || 0;
      return totalJ > 0 ? totales.victorias / totalJ : 0;
    }
    if (col.key === '_promC') {
      const totalJ = totales.jugadas || 0;
      return totalJ > 0 ? totales.colonias / totalJ : 0;
    }
    if (col.resumen === 'suma') return totales[col.key] || 0;
    return promedios[col.key] || 0;
  }

  function formatVal(val, col) {
    if (col.key === '_promV' || col.key === '_promC') return val.toFixed(2);
    return val;
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando estadísticas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-800">Liga Cosmic Encounter — Estadísticas</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSembrar}
            disabled={!!accion}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded transition"
          >
            {accion === 'sembrando' ? 'Sembrando...' : '🌱 Sembrar Datos Iniciales'}
          </button>
          <button
            onClick={handleGuardarSnapshot}
            disabled={!!accion}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded transition"
          >
            {accion === 'guardando' ? 'Guardando...' : '📸 Guardar Snapshot'}
          </button>
          <button
            onClick={() => setConfirmando(true)}
            disabled={!!accion || !snapshotInfo}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded transition"
          >
            {accion === 'restaurando' ? 'Restaurando...' : '↩️ Resetear a Snapshot'}
          </button>
        </div>
      </div>

      {snapshotInfo && (
        <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-4 py-2">
          Snapshot: <strong>{snapshotInfo.descripcion}</strong> — {snapshotInfo.jugadores} jugadores
        </div>
      )}

      {mensaje && (
        <div className={`px-4 py-3 rounded text-sm font-medium ${mensaje.tipo === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {mensaje.texto}
        </div>
      )}

      {/* Asignar Victoria de Liga */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm font-semibold text-indigo-800 mb-1">Asignar Victoria de Liga (Campañas +1)</label>
          <select
            value={ligaGanadorId}
            onChange={e => setLigaGanadorId(e.target.value)}
            className="border border-indigo-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">— Seleccionar jugador —</option>
            {jugadores.map(j => (
              <option key={j.id} value={j.id}>{j.nombre} (actual: {j.estadisticas.campanas || 0})</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAsignarLiga}
          disabled={!ligaGanadorId || asignandoLiga}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded transition"
        >
          {asignandoLiga ? 'Registrando...' : '🏅 Registrar victoria'}
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="px-4 py-3 text-left font-semibold sticky left-0 bg-gray-800 z-10">Jugador</th>
              {columnas.map(col => (
                <th key={col.key} className="px-3 py-3 text-center font-semibold whitespace-nowrap">{col.label}</th>
              ))}
              <th className="px-3 py-3 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {jugadores.map((j, idx) => {
              return (
                <tr key={j.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                  <td className={`px-4 py-2 font-semibold text-gray-800 sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {j.nombre}
                  </td>
                  {columnas.map(col => (
                    <td key={col.key} className="px-3 py-2 text-center text-gray-700">
                      {formatVal(getCellValue(j, col), col)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setJugadorEditando(j)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-xs px-2 py-1 border border-blue-300 rounded hover:bg-blue-50 transition"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            {/* Totales / Promedios */}
            <tr className="bg-gray-100 border-t-2 border-gray-300 font-semibold text-gray-700">
              <td className="px-4 py-2 sticky left-0 bg-gray-100 z-10">Total / Prom.</td>
              {columnas.map(col => {
                const val = getResumenValue(col);
                const label = col.resumen === 'suma' ? val : val.toFixed(2);
                return (
                  <td key={col.key} className="px-3 py-2 text-center">{label}</td>
                );
              })}
              <td />
            </tr>
            {/* Líder por columna */}
            <tr className="bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-800">
              <td className="px-4 py-2 font-semibold sticky left-0 bg-yellow-50 z-10">Líder</td>
              {columnas.map(col => {
                if (col.key === '_promV') return <td key={col.key} className="px-3 py-2 text-center">{lider('victorias')}</td>;
                if (col.key === '_promC') return <td key={col.key} className="px-3 py-2 text-center">{lider('colonias')}</td>;
                return <td key={col.key} className="px-3 py-2 text-center">{lider(col.key)}</td>;
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {jugadorEditando && (
        <ModalEdicion
          jugador={jugadorEditando}
          onGuardar={handleGuardadoExitoso}
          onCerrar={() => setJugadorEditando(null)}
        />
      )}

      {confirmando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <p className="text-2xl">⚠️</p>
            <p className="font-bold text-gray-800 text-lg">¿Resetear estadísticas?</p>
            <p className="text-gray-600 text-sm">
              Esto sobreescribirá todas las estadísticas actuales con los datos del snapshot guardado. Esta acción no se puede deshacer.
            </p>
            {snapshotInfo && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-2">
                Snapshot: <strong>{snapshotInfo.descripcion}</strong>
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleRestaurar}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded transition"
              >
                Sí, resetear
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
