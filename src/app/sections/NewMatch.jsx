"use client";
import React, { useState, useEffect } from "react";
import codigoColores from "../utils/colors";
import Jugador from "../models/jugador";
import { createMatch } from "@/services/matchService";
import asignadorAliens from "../utils/asignadorAliens";
import { useStore } from "@/store/useStore";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ShareMatchCode } from "../components/ShareMatchCode";

function NewMatch() {
  const [coloresSeleccionados, setColoresSeleccionados] = useState([]);
  const [partidaCreada, setPartidaCreada] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const codigoPartida = useStore((state) => state.codigoPartida);
  const resetAliensPartida = useStore((state) => state.setAliensPartida);

  useEffect(() => {
    resetAliensPartida([]);
    setError(null);
  }, [resetAliensPartida]);

  const toggleColor = (name, code) => {
    setColoresSeleccionados((prev) => {
      const existe = prev.find((c) => c.name === name);
      if (existe) {
        return prev.filter((c) => c.name !== name);
      } else {
        return [...prev, { name, code }];
      }
    });
  };

  const crearPartida = async (e) => {
    e.preventDefault();
    setError(null);

    if (coloresSeleccionados.length === 0) {
      setError("Selecciona al menos un color para continuar");
      return;
    }

    try {
      setIsCreating(true);

      const jugadores = coloresSeleccionados.map(
        ({ name, code }) => new Jugador(name, code),
      );

      const success = await asignadorAliens(jugadores);
      if (!success) {
        setError("Error al asignar aliens. Por favor intenta de nuevo.");
        return;
      }

      await createMatch({
        jugadores: jugadores.map((j) => j.toJSON()),
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
        <h1 className="text-4xl font-bold text-white text-center mb-4">
          Crear Nueva Partida
        </h1>
        <p className="text-purple-200 text-center mb-8">
          Selecciona los colores de los jugadores
        </p>

        {!partidaCreada ? (
          <form
            className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20"
            onSubmit={crearPartida}
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
                  Jugadores seleccionados ({coloresSeleccionados.length}):
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

            {/* Botón crear */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Crear Partida ✨
            </button>
          </form>
        ) : (
          <ShareMatchCode code={codigoPartida} />
        )}
      </div>
    </div>
  );
}

export default NewMatch;
