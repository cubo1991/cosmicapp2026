"use client";
import { getAlienById, getMatchById } from "@/firebase/db";
import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { AlienCard } from "../components/alienCard";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ErrorState } from "../components/ErrorState";
import { activeCopaService } from "@/services/activeCopaService";
import { scoringService } from "@/services/scoringService";

const JoinMatch = ({ matchId }) => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealedPlayers, setRevealedPlayers] = useState({});

  // NUEVO: Estado para puntos
  const [puntos, setPuntos] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(null);

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        const partida = await getMatchById(matchId);

        if (!partida) {
          setError({
            title: "Partida no encontrada",
            message: `El código "${matchId}" no existe o ha expirado.`,
            action: {
              href: "/cargarPartida",
              label: "Intentar con otro código",
            },
          });
          setLoading(false);
          return;
        }

        setMatch(partida);

        // NUEVO: Inicializar estado de puntos con playerId como clave
        const puntosPorJugador = {};
        if (Array.isArray(partida.jugadores)) {
          partida.jugadores.forEach((jugador, idx) => {
            // Usar playerId si existe, si no usar color + nombre, o como fallback usar índice
            const identificador = jugador.playerId || `${jugador.color || jugador.nombre || idx}`;
            puntosPorJugador[identificador] = {
              nombre: jugador.nombre,
              playerId: jugador.playerId || null,
              color: jugador.color,
              CI: 0,
              CE: 0,
              ganador: false,
              participó: true
            };
          });
        }
        setPuntos(puntosPorJugador);
        setError(null);
      } catch (err) {
        console.error("Error al obtener la partida:", err);
        setError({
          title: "Error al cargar",
          message:
            "No pudimos conectar con el servidor. Por favor intenta más tarde.",
          action: { href: "/", label: "Volver al inicio" },
        });
      } finally {
        setLoading(false);
      }
    };

    if (matchId) fetchMatch();
  }, [matchId]);

  const toggleReveal = (playerKey) => {
    setRevealedPlayers((prev) => ({
      ...prev,
      [playerKey]: !prev[playerKey],
    }));
  };

  // NUEVO: Cambiar valores de puntos (usa playerId o identificador de visitante)
  const handleChangePuntos = (playerKey, campo, valor) => {
    setPuntos(prev => ({
      ...prev,
      [playerKey]: {
        ...prev[playerKey],
        [campo]: campo === 'ganador' || campo === 'participó' ? !prev[playerKey][campo] : parseInt(valor) || 0
      }
    }));
  };

  // NUEVO: Guardar resultados
  const handleGuardarResultados = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensajeExito(null);

    try {
      // Validación: debe haber participantes y ganadores
      const participantes = Object.values(puntos).filter(p => p.participó).length;
      const ganadores = Object.values(puntos).filter(p => p.participó && p.ganador).length;

      if (participantes === 0) {
        throw new Error('Debe haber al menos un participante');
      }

      if (ganadores === 0) {
        throw new Error('Debe haber al menos un ganador');
      }

      // Asegurar que copa activa existe y obtener partida de copa
      const copaActiva = await activeCopaService.obtenerOCrearCopaActiva();
      
      let copId = match.copId;
      let posicion = match.posicion;

      // Si partida no tiene copa, asignarla automáticamente
      if (!copId) {
        const resultado = await activeCopaService.agregarPartidaAutomatica(matchId);
        copId = resultado.copaId;
        posicion = resultado.posicion;
      }

      // Finalizar partida con copa (integrado)
      const resultado = await scoringService.finalizarPartidaConCopa(matchId, puntos);

      // Mostrar éxito y recargar
      setMensajeExito('✓ Resultados guardados correctamente');
      setMostrarFormulario(false);

      // Actualizar match en interfaz
      const matchActualizado = await getMatchById(matchId);
      setMatch(matchActualizado);
    } catch (err) {
      console.error('Error guardando resultados:', err);
      setError({
        title: 'Error al guardar',
        message: err.message || 'No se pudieron guardar los resultados',
        action: { href: '/cargarPartida', label: 'Volver' }
      });
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Cargando partida..." />;
  }

  if (error) {
    return (
      <ErrorState
        title={error.title}
        message={error.message}
        action={error.action}
      />
    );
  }

  if (
    !match ||
    !match.jugadores ||
    (Array.isArray(match.jugadores) && match.jugadores.length === 0) ||
    (typeof match.jugadores === 'object' && Object.keys(match.jugadores).length === 0)
  ) {
    return (
      <ErrorState
        title="Partida vacía"
        message="Esta partida no tiene jugadores registrados."
        action={{ href: "/", label: "Volver al inicio" }}
      />
    );
  }

  // Convertir jugadores a array si es necesario
  const jugadoresArray = Array.isArray(match.jugadores) 
    ? match.jugadores 
    : Object.values(match.jugadores);

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-2">
            🎮 Partida en Curso
          </h2>
          <div className="inline-block bg-purple-600 text-white px-6 py-2 rounded-full font-mono font-bold text-lg">
            {matchId}
          </div>
          <p className="text-purple-200 mt-4">
            {jugadoresArray.length} jugador{jugadoresArray.length !== 1 ? "es" : ""}
          </p>
          {match.estado === 'finalizada' && (
            <p className="text-green-400 mt-2 font-bold">✓ Partida Finalizada</p>
          )}
        </div>

        {/* Mensaje de éxito */}
        {mensajeExito && (
          <div className="mb-8 bg-green-500/20 border border-green-500 rounded-lg p-4 text-green-200 text-center font-semibold">
            {mensajeExito}
          </div>
        )}

        {/* Info de estrategia */}
        <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-8 text-blue-200 text-center">
          💡 Los aliens están ocultos por estrategia. ¡Revela los tuyos cuando
          quieras!
        </div>

        {/* Jugadores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {jugadoresArray.map((jugador, index) => {
            // Usar playerId si existe, si no usar color + nombre, o como fallback usar índice
            const playerKey = jugador.playerId || `${jugador.color || jugador.nombre || index}`;
            return (
              <PlayerCard
                key={playerKey}
                jugador={jugador}
                index={index}
                playerKey={playerKey}
                isRevealed={revealedPlayers[playerKey] || false}
                onToggleReveal={() => toggleReveal(playerKey)}
              />
            );
          })}
        </div>

        {/* NUEVO: Botón para mostrar/ocultar formulario de puntos */}
        {match.estado !== 'finalizada' && match.asociarACopa !== false && (
          <button
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="w-full mb-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            {mostrarFormulario ? '❌ Cancelar' : '📊 Cargar Puntos'}
          </button>
        )}

        {/* Advertencia si partida no suma a copa */}
        {match.asociarACopa === false && (
          <div className="mb-8 bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 text-yellow-200 text-center">
            ⚠️ Esta partida tiene visitantes y NO suma a copa
          </div>
        )}

        {/* NUEVO: Formulario de puntos (integrado) */}
        {mostrarFormulario && match.estado !== 'finalizada' && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">📊 Carga de Resultados</h3>

            <form onSubmit={handleGuardarResultados} className="space-y-6">
              {/* Tabla de jugadores */}
              <div className="overflow-x-auto border border-white/20 rounded-lg">
                <table className="w-full text-sm text-white">
                  <thead className="bg-purple-600/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Jugador</th>
                      <th className="px-4 py-3 text-center font-semibold">Participó</th>
                      <th className="px-4 py-3 text-center font-semibold">CI</th>
                      <th className="px-4 py-3 text-center font-semibold">CE</th>
                      <th className="px-4 py-3 text-center font-semibold">Ganador</th>
                      <th className="px-4 py-3 text-right font-semibold">Previsión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {jugadoresArray.map((jugador, idx) => {
                      const playerKey = jugador.playerId || `${jugador.color || jugador.nombre || idx}`;
                      const datosPuntos = puntos[playerKey] || {};
                      const previsión = !datosPuntos.participó
                        ? 'NO'
                        : `${(datosPuntos.CI || 0) * 1 + (datosPuntos.CE || 0) * 2}${datosPuntos.ganador ? '+V' : ''}`;

                      return (
                        <tr
                          key={idx}
                          className={
                            datosPuntos.participó
                              ? 'bg-white/5 hover:bg-white/10'
                              : 'bg-red-900/10 hover:bg-red-900/20'
                          }
                        >
                          <td className="px-4 py-3 font-semibold">{jugador.nombre}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={datosPuntos.participó || false}
                              onChange={() =>
                                handleChangePuntos(playerKey, 'participó')
                              }
                              className="w-5 h-5 cursor-pointer accent-blue-500"
                              disabled={guardando || match.estado === 'finalizada'}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={datosPuntos.CI || 0}
                              onChange={(e) =>
                                handleChangePuntos(playerKey, 'CI', e.target.value)
                              }
                              className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-center text-white font-semibold focus:outline-none focus:border-blue-500"
                              disabled={
                                !datosPuntos.participó ||
                                guardando ||
                                match.estado === 'finalizada'
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              value={datosPuntos.CE || 0}
                              onChange={(e) =>
                                handleChangePuntos(playerKey, 'CE', e.target.value)
                              }
                              className="w-16 px-2 py-1 bg-white/10 border border-white/20 rounded text-center text-white font-semibold focus:outline-none focus:border-blue-500"
                              disabled={
                                !datosPuntos.participó ||
                                guardando ||
                                match.estado === 'finalizada'
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={datosPuntos.ganador || false}
                              onChange={() =>
                                handleChangePuntos(playerKey, 'ganador')
                              }
                              className="w-5 h-5 cursor-pointer accent-yellow-400"
                              disabled={
                                !datosPuntos.participó ||
                                guardando ||
                                match.estado === 'finalizada'
                              }
                            />
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-300">
                            {previsión}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Explicación de fórmula */}
              <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 text-blue-200 text-sm space-y-2">
                <p>
                  <strong>📐 Fórmula de Puntos:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>CI (Colonias Internas):</strong> 1 punto cada una
                  </li>
                  <li>
                    <strong>CE (Colonias Externas):</strong> 2 puntos cada una
                  </li>
                  <li>
                    <strong>Victoria:</strong> (total participantes ÷ ganadores)
                  </li>
                  <li>
                    <strong>Total:</strong> Colonias + Victoria (si gana)
                  </li>
                </ul>
              </div>

              {/* Botón guardar */}
              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                {guardando ? '⏳ Guardando resultados...' : '✓ Guardar Resultados'}
              </button>
            </form>
          </div>
        )}

        {/* Share Section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20 text-center">
          <p className="text-white font-semibold mb-6">
            ¿Quieres que se unan más jugadores?
          </p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `🎮 Únete a mi partida de CosmicAPP\n\nCódigo: ${matchId}\n\n${typeof window !== "undefined" ? window.location.origin : ""}/cargarPartida/${matchId}`,
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            📱 Compartir por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

function PlayerCard({ jugador, index, isRevealed, onToggleReveal }) {
  const [aliensLoading, setAliensLoading] = useState(true);
  const [aliens, setAliens] = useState([]);

  useEffect(() => {
    const fetchAliens = async () => {
      if (!Array.isArray(jugador.aliens) || jugador.aliens.length === 0) {
        setAliens([]);
        setAliensLoading(false);
        return;
      }

      try {
        const results = await Promise.all(
          jugador.aliens.map((id) => getAlienById(id).catch(() => null)),
        );
        setAliens(results.filter(Boolean));
      } catch (err) {
        console.error("Error cargando aliens:", err);
        setAliens([]);
      } finally {
        setAliensLoading(false);
      }
    };

    fetchAliens();
  }, [jugador.aliens]);

  const textColor =
    jugador.color === "#FFFFFF" || jugador.color === "#FFFF00"
      ? "#000000"
      : "#FFFFFF";

  return (
    <div
      className="rounded-lg p-6 border-2 border-white/20 backdrop-blur-sm transition-all hover:border-white/40 hover:shadow-lg"
      style={{ backgroundColor: jugador.color + "20" }}
    >
      {/* Player Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full border-3 border-white flex items-center justify-center font-bold text-lg"
          style={{ backgroundColor: jugador.color, color: textColor }}
        >
          {index + 1}
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">{jugador.nombre}</h3>
          <p className="text-purple-200 text-sm">
            {jugador.aliens?.length || 0} alien
            {jugador.aliens?.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Aliens Section - ESTRATÉGICO */}
      <div>
        <p className="text-white font-semibold mb-3">Aliens asignados:</p>

        {!isRevealed ? (
          /* Aliens OCULTOS */
          <div className="bg-gray-900/50 rounded-lg p-6 text-center border-2 border-dashed border-gray-600">
            <p className="text-gray-400 mb-4 text-2xl">🔒</p>
            <p className="text-gray-300 font-semibold mb-4">
              {jugador.aliens?.length || 0} aliens ocultos por estrategia
            </p>
            <button
              onClick={onToggleReveal}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all"
            >
              👁️ Revelar aliens
            </button>
          </div>
        ) : (
          /* Aliens REVELADOS */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-400 font-bold">✓ Revelado</span>
              <button
                onClick={onToggleReveal}
                className="ml-auto px-4 py-1 bg-red-600/30 hover:bg-red-600/50 text-red-200 font-semibold rounded text-sm transition-colors"
              >
                Ocultar
              </button>
            </div>

            {aliensLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin text-2xl">🌌</div>
                <span className="text-gray-400 ml-2">Cargando...</span>
              </div>
            ) : aliens.length > 0 ? (
              <div className="space-y-3">
                {aliens.map((alien, idx) => (
                  <AlienCard
                    key={alien?.id || idx}
                    alien={alien}
                    simple={true}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 py-4 text-center">Sin aliens</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default JoinMatch;
