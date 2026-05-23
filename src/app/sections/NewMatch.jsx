"use client";
import React, { useState, useEffect } from "react";
import codigoColores from "../utils/colors";
import Jugador from "../models/jugador";
import { createMatch } from "@/services/matchService";
import asignadorAliens from "../utils/asignadorAliens";
import { useStore } from "@/store/useStore";
import { usePlayers } from "@/hooks/usePlayer";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ShareMatchCode } from "../components/ShareMatchCode";

function NewMatch() {
  const [coloresSeleccionados, setColoresSeleccionados] = useState([]);
  const [jugadoresAsignados, setJugadoresAsignados] = useState({});
  const [asociarACopa, setAsociarACopa] = useState(true);
  const [partidaCreada, setPartidaCreada] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState("seleccionar-colores"); // 'seleccionar-colores' | 'asignar-jugadores'

  const codigoPartida = useStore((state) => state.codigoPartida);
  const resetAliensPartida = useStore((state) => state.setAliensPartida);
  const { players, loading: loadingPlayers } = usePlayers();

  useEffect(() => {
    resetAliensPartida([]);
    setError(null);
  }, [resetAliensPartida]);

  const toggleColor = (name, code) => {
    setColoresSeleccionados((prev) => {
      const existe = prev.find((c) => c.name === name);
      if (existe) {
        // Remover color
        const nuevo = prev.filter((c) => c.name !== name);
        // Limpiar asignación de jugador
        setJugadoresAsignados((prev) => {
          const copy = { ...prev };
          delete copy[name];
          return copy;
        });
        return nuevo;
      } else {
        // Agregar color con playerId null (sin asignar)
        setJugadoresAsignados((prev) => ({
          ...prev,
          [name]: null,
        }));
        return [...prev, { name, code }];
      }
    });
  };

  const asignarJugador = (colorName, playerId) => {
    // VALIDACIÓN: No permitir repetir el mismo jugador
    if (playerId) {
      const yaAsignado = Object.entries(jugadoresAsignados).some(
        ([color, id]) => color !== colorName && id === playerId,
      );

      if (yaAsignado) {
        setError(
          `⚠️ ${players.find((p) => p.id === playerId)?.name || "Este jugador"} ya está asignado a otro color`,
        );
        return;
      }
    }

    setError(null);
    setJugadoresAsignados((prev) => ({
      ...prev,
      [colorName]: playerId || null,
    }));
  };

  const todosConJugador = coloresSeleccionados.every(
    (c) =>
      jugadoresAsignados[c.name] !== null &&
      jugadoresAsignados[c.name] !== undefined,
  );

  const siguientePaso = () => {
    if (coloresSeleccionados.length === 0) {
      setError("Selecciona al menos un color para continuar");
      return;
    }
    setStep("asignar-jugadores");
    setError(null);
  };

  const crearPartida = async (e) => {
    e.preventDefault();
    setError(null);

    if (coloresSeleccionados.length === 0) {
      setError("Selecciona al menos un color para continuar");
      return;
    }

    // Si "Sumar a Copa" está activado, todos deben tener jugador asignado
    if (asociarACopa && !todosConJugador) {
      setError("Para sumar a copa, todos los jugadores deben estar asociados");
      return;
    }

    try {
      setIsCreating(true);

      // PASO 1: Construir datos de jugadores con playerId
      const jugadoresData = coloresSeleccionados.map((color) => {
        const playerId = jugadoresAsignados[color.name];
        const nombreJugador = playerId
          ? players.find((p) => p.id === playerId)?.name || "Desconocido"
          : `Visitante ${color.name}`;

        return new Jugador(nombreJugador, color.code, playerId);
      });

      // VALIDACIÓN: Asegur que hay jugadores
      if (jugadoresData.length === 0) {
        setError("Error: No hay jugadores para crear la partida");
        return;
      }

      // PASO 2: Asignar aliens
      const success = await asignadorAliens(jugadoresData);
      if (!success) {
        setError("Error al asignar aliens. Por favor intenta de nuevo.");
        return;
      }

      // PASO 3: Serializar jugadores a array de objetos planos
      const jugadoresSerializados = jugadoresData.map((j) => ({
        nombre: j.nombre,
        color: j.color,
        playerId: j.playerId || null,
        aliens: j.aliens || [],
      }));

      // VALIDACIÓN: Confirmar que el array no esté vacío
      if (jugadoresSerializados.length === 0) {
        setError("Error: Lista de jugadores vacía");
        return;
      }

      console.log("🎮 Creando partida con jugadores:", jugadoresSerializados);

      // PASO 4: Crear partida
      await createMatch({
        jugadores: jugadoresSerializados,
        asociarACopa: asociarACopa,
      });

      setPartidaCreada(true);
    } catch (err) {
      console.error("Error al crear partida:", err);
      setError("Error al crear la partida. Por favor intenta de nuevo.");
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return <LoadingOverlay message="Creando partida y asignando aliens..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {!partidaCreada ? (
          <>
            {/* PASO 1: Seleccionar Colores */}
            {step === "seleccionar-colores" && (
              <>
                <h1 className="text-4xl font-bold text-white text-center mb-4">
                  Crear Nueva Partida
                </h1>
                <p className="text-purple-200 text-center mb-8">
                  Paso 1: Selecciona los colores de los jugadores
                </p>

                <form
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20"
                  onSubmit={(e) => {
                    e.preventDefault();
                    siguientePaso();
                  }}
                >
                  {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-red-200">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Color Grid */}
                  <div className="mb-8">
                    <p className="text-white font-semibold mb-4">
                      Colores disponibles:
                    </p>
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                      {Object.entries(codigoColores).map(([name, code]) => {
                        const seleccionado = coloresSeleccionados.some(
                          (c) => c.name === name,
                        );
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={() => toggleColor(name, code)}
                            className={`h-20 rounded-lg transition-all duration-300 font-semibold text-sm uppercase ${
                              seleccionado
                                ? "ring-4 ring-white scale-105 shadow-lg"
                                : "hover:scale-105 hover:shadow-md"
                            }`}
                            style={{ backgroundColor: code }}
                            title={name}
                          >
                            {seleccionado && "✓"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Jugadores seleccionados */}
                  {coloresSeleccionados.length > 0 && (
                    <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-white font-semibold mb-3">
                        Colores seleccionados ({coloresSeleccionados.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {coloresSeleccionados.map((c) => (
                          <span
                            key={c.name}
                            className="px-3 py-1 rounded-full text-white font-semibold text-sm"
                            style={{ backgroundColor: c.code }}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botón siguiente */}
                  <button
                    type="submit"
                    disabled={coloresSeleccionados.length === 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    Siguiente: Asignar Jugadores →
                  </button>
                </form>
              </>
            )}

            {/* PASO 2: Asignar Jugadores */}
            {step === "asignar-jugadores" && (
              <>
                <h1 className="text-4xl font-bold text-white text-center mb-4">
                  Asignar Jugadores
                </h1>
                <p className="text-purple-200 text-center mb-8">
                  Paso 2: Elige qué jugador juega cada color
                </p>

                <form
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20 space-y-6"
                  onSubmit={crearPartida}
                >
                  {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200">
                      ⚠️ {error}
                    </div>
                  )}

                  {/* Para cada color, elige jugador */}
                  {coloresSeleccionados.map((color) => (
                    <div
                      key={color.name}
                      className="bg-white/5 rounded-lg p-6 border border-white/10"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-lg"
                          style={{ backgroundColor: color.code }}
                        />
                        <div>
                          <p className="text-white font-semibold">
                            {color.name}
                          </p>
                          <p className="text-purple-200 text-sm">
                            {jugadoresAsignados[color.name]
                              ? `✓ ${
                                  players.find(
                                    (p) =>
                                      p.id === jugadoresAsignados[color.name],
                                  )?.name || "Seleccionado"
                                }`
                              : "Sin asignar"}
                          </p>
                        </div>
                      </div>

                      {loadingPlayers ? (
                        <p className="text-gray-400 text-sm">
                          Cargando jugadores...
                        </p>
                      ) : (
                        <>
                          {/* Opción: Jugador registrado */}
                          {players.length > 0 && (
                            <select
                              value={jugadoresAsignados[color.name] || ""}
                              onChange={(e) =>
                                asignarJugador(
                                  color.name,
                                  e.target.value || null,
                                )
                              }
                              className="w-full px-3 py-2 mb-3 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:border-purple-500"
                            >
                              <option value="">
                                -- Visitante (no suma a copa) --
                              </option>
                              {players.map((player) => (
                                <option
                                  style={{ color: "black" }}
                                  key={player.id}
                                  value={player.id}
                                >
                                  {player.name}
                                </option>
                              ))}
                            </select>
                          )}

                          {players.length === 0 && (
                            <p className="text-yellow-200 text-sm">
                              ⚠️ No hay jugadores registrados. Usa "Visitante".
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Toggle: ¿Sumar a Copa? */}
                  <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          🏆 ¿Sumar a Copa?
                        </p>
                        <p className="text-blue-200 text-sm mt-1">
                          {todosConJugador
                            ? "✓ Todos los jugadores están asociados. La partida sumará a la copa activa."
                            : "⚠️ Hay visitantes. Desactiva esta opción para crear partidas sin copa."}
                        </p>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={asociarACopa}
                          onChange={(e) => setAsociarACopa(e.target.checked)}
                          disabled={!todosConJugador}
                          className="w-6 h-6 cursor-pointer accent-blue-500"
                        />
                        <span className="text-white font-semibold">
                          {asociarACopa ? "SÍ" : "NO"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("seleccionar-colores");
                        setError(null);
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-all"
                    >
                      ← Atrás
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
                    >
                      Crear Partida ✨
                    </button>
                  </div>
                </form>
              </>
            )}
          </>
        ) : (
          <ShareMatchCode code={codigoPartida} />
        )}
      </div>
    </div>
  );
}

export default NewMatch;
