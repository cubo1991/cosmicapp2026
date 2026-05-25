"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";

/**
 * CE_INDEX — Índice de rendimiento relativo en Colonias Externas
 * SOLO VISIBLE EN ADMINISTRADOR
 *
 * CE_INDEX = avg_CE_jugador / avg_CE_global × 100
 * > 100 → por encima del promedio del grupo
 * < 100 → por debajo del promedio del grupo
 *
 * Basado en estadísticas históricas LCE (estadisticas.colonias / estadisticas.jugadas)
 */
export default function AdminCEIndex() {
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minPartidas, setMinPartidas] = useState(10);

  useEffect(() => {
    const fetchJugadores = async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        const data = snap.docs
          .map((d) => {
            const p = d.data();
            const jugadas = p.estadisticas?.jugadas || p.stats?.partidas || 0;
            const colonias = p.estadisticas?.colonias || 0;
            const avgCE = jugadas > 0 ? colonias / jugadas : 0;
            return {
              id: d.id,
              nombre: p.name || "Sin nombre",
              jugadas,
              colonias,
              avgCE,
              last10Score: p.last10Score || 0,
              avgPuntos: p.stats?.puntosPromedio || 0,
            };
          })
          .filter((j) => j.jugadas > 0);
        setJugadores(data);
      } catch (err) {
        console.error("Error cargando jugadores:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJugadores();
  }, []);

  const jugadoresFiltrados = jugadores.filter((j) => j.jugadas >= minPartidas);

  // Global avg CE across filtered players
  const globalAvgCE =
    jugadoresFiltrados.length > 0
      ? jugadoresFiltrados.reduce((s, j) => s + j.avgCE, 0) / jugadoresFiltrados.length
      : 0;

  const conIndex = jugadoresFiltrados
    .map((j) => ({
      ...j,
      ceIndex: globalAvgCE > 0 ? (j.avgCE / globalAvgCE) * 100 : 100,
    }))
    .sort((a, b) => b.ceIndex - a.ceIndex);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Calculando CE_INDEX...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📈 CE_INDEX</h2>
          <p className="text-sm text-gray-500 mt-1">
            Índice de rendimiento relativo en Colonias Externas. Solo visible en admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Mín. partidas:</label>
          <select
            value={minPartidas}
            onChange={(e) => setMinPartidas(parseInt(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            {[5, 10, 20, 50].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>CE_INDEX = avg_CE_jugador / avg_CE_grupo × 100</strong>
        <br />
        Promedio grupal actual: <strong>{globalAvgCE.toFixed(3)} CE/partida</strong>
        {" "}· {jugadoresFiltrados.length} jugadores con ≥{minPartidas} partidas
        <br />
        <span className="text-xs text-blue-600">
          &gt;110 = ofensivo · 90–110 = equilibrado · &lt;90 = defensivo / colonial interno
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-gray-600 font-medium">#</th>
              <th className="px-4 py-3 text-left text-gray-600 font-medium">Jugador</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">Partidas</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">CE total</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">CE/partida</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">CE_INDEX</th>
              <th className="px-4 py-3 text-center text-gray-600 font-medium">Perfil</th>
            </tr>
          </thead>
          <tbody>
            {conIndex.map((j, idx) => {
              const idx100 = Math.round(j.ceIndex);
              const perfil =
                idx100 >= 110
                  ? { label: "Ofensivo", color: "text-red-600 bg-red-50", icon: "⚡" }
                  : idx100 >= 90
                  ? { label: "Equilibrado", color: "text-blue-600 bg-blue-50", icon: "⚖️" }
                  : { label: "Territorial", color: "text-green-600 bg-green-50", icon: "🛡️" };

              return (
                <tr
                  key={j.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 text-gray-500 font-mono">{idx + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{j.nombre}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{j.jugadas}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{j.colonias}</td>
                  <td className="px-4 py-3 text-center text-gray-700 font-mono">
                    {j.avgCE.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="h-2 rounded-full bg-gray-100 overflow-hidden"
                        style={{ width: "60px" }}
                      >
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${Math.min(100, idx100 / 2)}%` }}
                        />
                      </div>
                      <span
                        className={`font-bold font-mono text-base ${
                          idx100 >= 110
                            ? "text-red-600"
                            : idx100 >= 90
                            ? "text-blue-700"
                            : "text-green-700"
                        }`}
                      >
                        {idx100}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${perfil.color}`}
                    >
                      {perfil.icon} {perfil.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {conIndex.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No hay jugadores con ≥{minPartidas} partidas registradas
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Datos basados en estadísticas históricas LCE (estadisticas.colonias / estadisticas.jugadas).
        A medida que se carguen más partidas en el nuevo sistema, el índice usará datos más recientes.
      </p>
    </div>
  );
}
