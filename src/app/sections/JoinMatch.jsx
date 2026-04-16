"use client";
import { getAlienById, getMatchById } from "@/firebase/db";
import { useEffect, useState } from "react";
import { AlienCard } from "../components/alienCard";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ErrorState } from "../components/ErrorState";

const JoinMatch = ({ matchId }) => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revealedPlayers, setRevealedPlayers] = useState({});

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

  const toggleReveal = (playerIndex) => {
    setRevealedPlayers((prev) => ({
      ...prev,
      [playerIndex]: !prev[playerIndex],
    }));
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
    !Array.isArray(match.jugadores) ||
    match.jugadores.length === 0
  ) {
    return (
      <ErrorState
        title="Partida vacía"
        message="Esta partida no tiene jugadores registrados."
        action={{ href: "/", label: "Volver al inicio" }}
      />
    );
  }

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
            {match.jugadores.length} jugador
            {match.jugadores.length !== 1 ? "es" : ""}
          </p>
        </div>

        {/* Info de estrategia */}
        <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4 mb-8 text-blue-200 text-center">
          💡 Los aliens están ocultos por estrategia. ¡Revela los tuyos cuando
          quieras!
        </div>

        {/* Jugadores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {match.jugadores.map((jugador, index) => (
            <PlayerCard
              key={index}
              jugador={jugador}
              index={index}
              isRevealed={revealedPlayers[index] || false}
              onToggleReveal={() => toggleReveal(index)}
            />
          ))}
        </div>

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
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
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
