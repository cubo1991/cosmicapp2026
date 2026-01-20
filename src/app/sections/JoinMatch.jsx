"use client";
import { getAlienByName, getMatchById } from "@/firebase/db";
import { useEffect, useState } from "react";
import { AlienCard } from "../components/alienCard";
import AlienCardSimple from "../components/alienCardSimple";

const JoinMatch = ({ matchId }) => {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visiblePlayers, setVisiblePlayers] = useState({});

  useEffect(() => {
    console.log("matchId:", matchId);
    const fetchMatch = async () => {
      try {
        const partida = await getMatchById(matchId);

        setMatch(partida);
        setLoading(false);
      } catch (err) {
        console.error("Error al obtener la partida:", err);
        setError(err);
        setLoading(false);
      }
    };

    if (matchId) fetchMatch();
  }, [matchId]);

  const togglePlayerAliens = (playerId) => {
    setVisiblePlayers((prev) => ({
      ...prev,
      [playerId]: !prev[playerId],
    }));
  };

  if (loading) return <div>Cargando partida...</div>;
  if (error) return <div>Error al cargar la partida: {error.message}</div>;
  if (!match) return <div>No se encontró la partida</div>;

  return (
    <section className="joinmatch" aria-labelledby="joinmatch-title">
      <h2 id="joinmatch-title" className="joinmatch-title">
        Partida Código: {matchId}
      </h2>

      <div className="joinmatch-list">
        {Array.isArray(match?.jugadores) && match.jugadores.length > 0 ? (
          match.jugadores.map((jugador, index) => {
            const playerId = jugador.id || jugador.uid || index;
            return (
              <article
                key={playerId}
                className="joinmatch-item"
                style={{
                  backgroundColor: jugador.color || undefined,
                  color:
                    jugador.color === "#FFFFFF" || jugador.color === "#FFFF00"
                      ? "#000000"
                      : "#FFFFFF",
                }}
              >
                <h3 className="joinmatch-player-name">
                  Jugador: {jugador.nombre}
                </h3>
                <button
                  onClick={() => togglePlayerAliens(playerId)}
                  className="joinmatch-toggle-button"
                >
                  {visiblePlayers[playerId] ? "Ocultar aliens" : "Ver aliens"}
                </button>
                {visiblePlayers[playerId] && (
                  <PlayerAliens alienNames={jugador.aliens} />
                )}
              </article>
            );
          })
        ) : (
          <p className="joinmatch-empty">No hay jugadores</p>
        )}
      </div>
              <p>Compartí esta partida</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Mira esta partida: ${window.location.origin}/cargarPartida/${matchId}\nHaz clic en el enlace de arriba para unirte a la partida!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shareWhatsappButton"
            >
              Compartir por WhatsApp
            </a>
    </section>
  );

  function PlayerAliens({ alienNames }) {
    const [aliens, setAliens] = useState([]);

    useEffect(() => {
      let active = true;
      const fetchAliens = async () => {
        if (!Array.isArray(alienNames) || alienNames.length === 0) {
          setAliens([]);
          return;
        }
        const results = await Promise.all(
          alienNames.map((name) => getAlienByName(name).catch(() => null))
        );
        if (active) setAliens(results.filter(Boolean));
      };
      fetchAliens();
      return () => {
        active = false;
      };
    }, [alienNames]);

    if (!alienNames || alienNames.length === 0) return <p>Sin aliens</p>;

    return (
      <div className="joinmatch-aliens">
        {aliens.length === 0 ? (
          <p>Cargando aliens...</p>
        ) : (
          aliens.map((alien, idx) => (
            <AlienCardSimple key={alien?.id || idx} alien={alien} />
           
          ))
        )}


      </div>

    );
  }
};

export default JoinMatch;
