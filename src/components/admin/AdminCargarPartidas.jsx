"use client";

import { useState } from "react";
import { bulkMatchService } from "@/services/bulkMatchService";

/**
 * 🔄 Admin: Cargar Partidas Manuales
 * Para migración de datos de otros sistemas
 */
export default function AdminCargarPartidas() {
  const [activeTab, setActiveTab] = useState("manual"); // 'manual' o 'csv'
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  // Formulario manual
  const [nombrePartida, setNombrePartida] = useState("");
  const [fechaPartida, setFechaPartida] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [jugadores, setJugadores] = useState([
    { playerId: "", nombre: "", puntos: 0, esGanador: false },
  ]);

  // CSV
  const [csvContent, setCsvContent] = useState("");

  /**
   * Agregar fila de jugador
   */
  const agregarJugador = () => {
    setJugadores([
      ...jugadores,
      { playerId: "", nombre: "", puntos: 0, esGanador: false },
    ]);
  };

  /**
   * Actualizar jugador
   */
  const actualizarJugador = (index, field, value) => {
    const nuevos = [...jugadores];
    nuevos[index][field] =
      field === "puntos"
        ? parseFloat(value)
        : field === "esGanador"
          ? value === "true"
          : value;
    setJugadores(nuevos);
  };

  /**
   * Eliminar jugador
   */
  const eliminarJugador = (index) => {
    setJugadores(jugadores.filter((_, i) => i !== index));
  };

  /**
   * Cargar partida manual
   */
  const cargarPartidaManual = async () => {
    try {
      // Validación del nombre
      if (!nombrePartida || nombrePartida.trim() === "") {
        setMensaje({
          tipo: "error",
          texto: "El nombre de la partida es requerido",
        });
        return;
      }

      // Validación de fecha
      if (!fechaPartida) {
        setMensaje({
          tipo: "error",
          texto: "La fecha de la partida es requerida",
        });
        return;
      }

      // Validar que todos los jugadores tengan datos completos
      const erroresJugadores = [];
      const jugadoresValidos = [];

      jugadores.forEach((j, index) => {
        const errores = [];

        if (!j.playerId || j.playerId.trim() === "") {
          errores.push("ID de jugador");
        }
        if (!j.nombre || j.nombre.trim() === "") {
          errores.push("nombre");
        }
        if (typeof j.puntos !== "number" || j.puntos < 0) {
          errores.push("puntos válidos (>= 0)");
        }

        if (errores.length > 0) {
          erroresJugadores.push(
            `Jugador ${index + 1}: faltan ${errores.join(", ")}`,
          );
        } else {
          jugadoresValidos.push(j);
        }
      });

      if (erroresJugadores.length > 0) {
        setMensaje({
          tipo: "error",
          texto: `Errores en jugadores:\n${erroresJugadores.join("\n")}`,
        });
        return;
      }

      if (jugadoresValidos.length < 2) {
        setMensaje({
          tipo: "error",
          texto: "Necesitas al menos 2 jugadores con datos completos",
        });
        return;
      }

      // Validar que al menos uno sea ganador
      if (!jugadoresValidos.some((j) => j.esGanador)) {
        setMensaje({ tipo: "error", texto: "Debe haber al menos un ganador" });
        return;
      }

      setLoading(true);
      setMensaje(null);

      const matchData = {
        nombre: nombrePartida.trim(),
        fecha: new Date(fechaPartida),
        jugadores: jugadoresValidos.reduce((acc, j) => {
          acc[j.playerId.trim()] = {
            nombre: j.nombre.trim(),
            puntos: j.puntos,
            esGanador: j.esGanador,
          };
          return acc;
        }, {}),
      };

      console.log("Enviando datos:", matchData); // Debug

      const resultado = await bulkMatchService.cargarPartidaManual(matchData);

      setMensaje({
        tipo: "exito",
        texto: `✓ ${resultado.mensaje} (ID: ${resultado.matchId})`,
      });

      // Limpiar formulario
      setNombrePartida("");
      setFechaPartida(new Date().toISOString().split("T")[0]);
      setJugadores([{ playerId: "", nombre: "", puntos: 0, esGanador: false }]);
    } catch (error) {
      console.error("Error completo:", error);
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cargar desde CSV
   */
  const cargarDesdeCSV = async () => {
    try {
      if (!csvContent.trim()) {
        setMensaje({ tipo: "error", texto: "El CSV está vacío" });
        return;
      }

      setLoading(true);
      setMensaje(null);

      // Parsear CSV
      const partidas = bulkMatchService.parseCSV(csvContent);

      if (partidas.length === 0) {
        setMensaje({
          tipo: "error",
          texto: "No se encontraron partidas válidas en el CSV",
        });
        return;
      }

      // Cargar partidas
      const resultado = await bulkMatchService.cargarPartidas({ partidas });

      setMensaje({
        tipo: resultado.fallidas === 0 ? "exito" : "advertencia",
        texto: `✓ ${resultado.exitosas} exitosas | ✗ ${resultado.fallidas} fallidas${
          resultado.errores.length > 0
            ? "\n\nErrores:\n" +
              resultado.errores
                .map((e) => `• ${e.nombre}: ${e.error}`)
                .join("\n")
            : ""
        }`,
      });

      // Limpiar
      if (resultado.fallidas === 0) {
        setCsvContent("");
      }
    } catch (error) {
      setMensaje({ tipo: "error", texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Descargar template CSV
   */
  const descargarTemplate = () => {
    const template = `partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador
Partida 1,2026-04-20,user_001,Juan García,8.5,true
Partida 1,2026-04-20,user_002,María López,5.2,false
Partida 2,2026-04-21,user_001,Juan García,7.0,false
Partida 2,2026-04-21,user_003,Carlos Díaz,9.3,true`;

    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_partidas.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          📥 Cargar Partidas Manuales
        </h2>
        <p className="text-gray-300">
          Migra datos de otro sistema o carga partidas manualmente para llenar
          el ranking
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/20">
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "manual"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📝 Carga Manual
        </button>
        <button
          onClick={() => setActiveTab("csv")}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === "csv"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-white"
          }`}
        >
          📊 Importar CSV
        </button>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div
          className={`p-4 rounded-lg border ${
            mensaje.tipo === "exito"
              ? "bg-green-500/10 border-green-500/50 text-green-300"
              : mensaje.tipo === "error"
                ? "bg-red-500/10 border-red-500/50 text-red-300"
                : "bg-yellow-500/10 border-yellow-500/50 text-yellow-300"
          }`}
        >
          <pre className="whitespace-pre-wrap text-sm">{mensaje.texto}</pre>
        </div>
      )}

      {/* TAB: Manual */}
      {activeTab === "manual" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          {/* Nombre partida */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Nombre de la Partida
            </label>
            <input
              type="text"
              value={nombrePartida}
              onChange={(e) => setNombrePartida(e.target.value)}
              placeholder="ej: Partida Final - Abril 2026"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Fecha de la Partida
            </label>
            <input
              type="date"
              value={fechaPartida}
              onChange={(e) => setFechaPartida(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tabla de jugadores */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Jugadores
            </label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 px-2 text-gray-400">
                      ID Jugador
                    </th>
                    <th className="text-left py-2 px-2 text-gray-400">
                      Nombre
                    </th>
                    <th className="text-center py-2 px-2 text-gray-400">
                      Puntos
                    </th>
                    <th className="text-center py-2 px-2 text-gray-400">
                      ¿Ganador?
                    </th>
                    <th className="text-center py-2 px-2 text-gray-400">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jugadores.map((jugador, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-white/10 hover:bg-white/5"
                    >
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={jugador.playerId}
                          onChange={(e) =>
                            actualizarJugador(idx, "playerId", e.target.value)
                          }
                          placeholder="user_001"
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={jugador.nombre}
                          onChange={(e) =>
                            actualizarJugador(idx, "nombre", e.target.value)
                          }
                          placeholder="Juan García"
                          className="w-full px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          step="0.1"
                          value={jugador.puntos}
                          onChange={(e) =>
                            actualizarJugador(idx, "puntos", e.target.value)
                          }
                          className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs text-center"
                        />
                      </td>
                      <td className="py-2 px-2 text-center">
                        <select
                          value={jugador.esGanador ? "true" : "false"}
                          onChange={(e) =>
                            actualizarJugador(idx, "esGanador", e.target.value)
                          }
                          className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        >
                          <option value="false">No</option>
                          <option value="true">Sí</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {jugadores.length > 2 && (
                          <button
                            onClick={() => eliminarJugador(idx)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={agregarJugador}
              className="mt-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white text-sm transition-colors"
            >
              + Agregar Jugador
            </button>
          </div>

          {/* Botón Cargar */}
          <button
            onClick={cargarPartidaManual}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
          >
            {loading ? "⏳ Cargando..." : "✓ Cargar Partida"}
          </button>
        </div>
      )}

      {/* TAB: CSV */}
      {activeTab === "csv" && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-4">
          <p className="text-gray-300 text-sm">
            Sube un CSV con el formato especificado. Las columnas deben ser:
            <br />
            <code className="bg-black/30 px-2 py-1 rounded inline-block mt-1 font-mono">
              partida_nombre, fecha, jugador_id, jugador_nombre, puntos,
              es_ganador
            </code>
          </p>

          {/* Template */}
          <button
            onClick={descargarTemplate}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white text-sm transition-colors"
          >
            📥 Descargar Template CSV
          </button>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Contenido CSV
            </label>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador&#10;Partida 1,2026-04-20,user_001,Juan García,8.5,true&#10;Partida 1,2026-04-20,user_002,María López,5.2,false"
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono text-sm h-40 resize-none"
            />
          </div>

          {/* Botón Cargar */}
          <button
            onClick={cargarDesdeCSV}
            disabled={loading}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
          >
            {loading ? "⏳ Importando..." : "✓ Importar CSV"}
          </button>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-300">
        <p>
          💡 <strong>Nota:</strong> Las partidas cargadas se marcarán como
          "manuales" y se registrarán automáticamente en el ranking global. Los
          puntos se sumarán a las estadísticas del jugador.
        </p>
      </div>
    </div>
  );
}
