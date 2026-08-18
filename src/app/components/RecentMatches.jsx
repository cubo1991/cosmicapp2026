"use client";

import { useState, useEffect } from "react";
import { playerService } from "@/services/playerService";

export default function RecentMatches() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        setError(null);

        // Obtener todos los jugadores
        const jugadores = await playerService.obtenerTodos();

        // Crear array de todas las partidas con info del jugador
        const todasLasPartidas = [];

        for (const jugador of jugadores) {
          const historial = jugador.historial || [];

          for (const partida of historial) {
            todasLasPartidas.push({
              jugadorId: jugador.id,
              nombreJugador: jugador.name,
              matchId: partida.matchId,
              nombrePartida: partida.nombrePartida,
              puntos: partida.puntos,
              esGanador: partida.esGanador,
              fecha: partida.fecha,
              copId: partida.copId,
              ligaId: partida.ligaId,
            });
          }
        }

        // Ordenar por fecha descendente
        todasLasPartidas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Tomar solo las últimas 50 partidas de todos los jugadores
        setDatos(todasLasPartidas.slice(0, 50));
        setLoading(false);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError(err.message || "Error cargando partidas");
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const formatearFecha = (fechaString) => {
    const fecha = new Date(fechaString);
    return new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(fecha);
  };

  const getEstadoBadge = (esGanador) => {
    return esGanador
      ? "bg-green-100 text-green-800"
      : "bg-gray-100 text-gray-800";
  };

  const getEstadoTexto = (esGanador) => {
    return esGanador ? "🏆 Ganador" : "📊 Participante";
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 text-center">
        <div className="text-gray-400">Cargando partidas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 rounded p-4">
          Error: {error}
        </div>
      </div>
    );
  }

  if (datos.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 text-center">
        <div className="text-gray-300">Sin partidas registradas aún</div>
      </div>
    );
  }

  return (
    <div className="w-full bg-black/30 backdrop-blur-sm py-16 border-y border-purple-500/30">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          📊 Últimas Partidas - Top {Math.min(datos.length, 50)}
        </h2>

        <div className="max-w-6xl mx-auto overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-600/30 to-blue-600/30 border-b border-purple-500/50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-purple-100">
                  Jugador
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-purple-100">
                  Partida
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-purple-100">
                  Puntos
                </th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-purple-100">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-purple-100">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.map((partida, index) => (
                <tr
                  key={`${partida.matchId}-${partida.jugadorId}-${index}`}
                  className="border-b border-purple-500/20 hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-purple-100 font-medium">
                    {partida.nombreJugador}
                  </td>
                  <td className="px-6 py-4 text-sm text-purple-200">
                    {partida.nombrePartida}
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-bold text-yellow-300">
                    {partida.puntos.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadge(partida.esGanador)}`}
                    >
                      {getEstadoTexto(partida.esGanador)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-purple-300">
                    {formatearFecha(partida.fecha)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-center text-purple-300 text-sm mt-6">
          Mostrando {datos.length} de las últimas partidas
        </div>
      </div>
    </div>
  );
}
