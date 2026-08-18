"use client";

import { useState, useEffect } from "react";
import { useMatch } from "@/hooks/useMatch";
import { playerService } from "@/services/playerService";

export default function CargaResultados({ matchId, onSuccess }) {
  const { match, finalizarPartida, loading, error } = useMatch(matchId);
  const [resultados, setResultados] = useState<Record<string, any>>({});
  const [jugadoresInfo, setJugadoresInfo] = useState({});
  const [mensajeError, setMensajeError] = useState("");
  const [cargandoJugadores, setCargandoJugadores] = useState(true);

  // Cargar info de jugadores
  useEffect(() => {
    if (!match) return;

    const cargarJugadores = async () => {
      try {
        const info = {};
        for (const playerId of Object.keys(match.jugadores)) {
          const jugador = await playerService.obtenerPorId(playerId);
          if (jugador) {
            info[playerId] = jugador.name || `Jugador ${playerId}`;
          }
        }
        setJugadoresInfo(info);

        // Inicializar resultados
        const resultadosIniciales = {};
        Object.keys(match.jugadores).forEach((playerId) => {
          resultadosIniciales[playerId] = {
            ...match.jugadores[playerId],
            coloniasInternas: 0,
            coloniasExternas: 0,
            esGanador: false,
          };
        });
        setResultados(resultadosIniciales);
        setCargandoJugadores(false);
      } catch (err) {
        setMensajeError("Error cargando jugadores");
        setCargandoJugadores(false);
      }
    };

    cargarJugadores();
  }, [match]);

  const handleChangeColonias = (playerId, tipo, valor) => {
    setResultados((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [tipo]: Math.max(0, parseInt(valor) || 0),
      },
    }));
  };

  const handleChangeGanador = (playerId) => {
    setResultados((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        esGanador: !prev[playerId].esGanador,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensajeError("");

    // Validar que haya al menos un ganador
    const ganadores = Object.values(resultados).filter(
      (r) => r.esGanador,
    ).length;
    if (ganadores === 0) {
      setMensajeError("Debe haber al menos un ganador");
      return;
    }

    const resultado = await finalizarPartida(resultados);
    if (resultado.success) {
      if (onSuccess) onSuccess(resultado);
    } else {
      setMensajeError(resultado.error);
    }
  };

  if (cargandoJugadores) {
    return <div className="p-6 text-center">Cargando jugadores...</div>;
  }

  if (!match) {
    return (
      <div className="p-6 text-center text-red-600">Partida no encontrada</div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Cargar Resultados
      </h2>
      <p className="text-gray-600 mb-4">
        Partida: <strong>{match.nombre}</strong>
      </p>

      {mensajeError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {mensajeError}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabla de jugadores */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Jugador
                </th>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Colonias Internas
                </th>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  Colonias Externas
                </th>
                <th className="border border-gray-300 px-4 py-2 text-center">
                  ¿Ganador?
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(resultados).map(([playerId, datos]) => (
                <tr key={playerId} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">
                    {jugadoresInfo[playerId] || "Cargando..."}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={datos.coloniasInternas}
                      onChange={(e) =>
                        handleChangeColonias(
                          playerId,
                          "coloniasInternas",
                          e.target.value,
                        )
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      min="0"
                      value={datos.coloniasExternas}
                      onChange={(e) =>
                        handleChangeColonias(
                          playerId,
                          "coloniasExternas",
                          e.target.value,
                        )
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={datos.esGanador}
                      onChange={() => handleChangeGanador(playerId)}
                      className="w-5 h-5"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info de puntos */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded">
          <h3 className="font-semibold mb-2">Cálculo de Puntos:</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              • <strong>Colonias Internas:</strong> 1 punto cada una
            </li>
            <li>
              • <strong>Colonias Externas:</strong> 2 puntos cada una
            </li>
            <li>
              • <strong>Puntos de Victoria:</strong> (total jugadores) /
              (ganadores)
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition"
        >
          {loading ? "Guardando..." : "Finalizar Partida"}
        </button>
      </form>
    </div>
  );
}
