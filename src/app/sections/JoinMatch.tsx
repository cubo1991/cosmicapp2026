"use client";
import { getAlienById, getAliens, getMatchById } from "@/firebase/db";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { AlienCard } from "../components/alienCard";
import { LoadingOverlay } from "../components/LoadingOverlay";
import { ErrorState } from "../components/ErrorState";
import { scoringService } from "@/services/scoringService";
import { createMatch } from "@/services/matchService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useRouter } from "next/navigation";

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

// ── Live points calculation ──────────────────────────────────────
function calcularPreview(puntos: Record<string, any>) {
  const participantes = Object.values(puntos).filter((p: any) => p.participó);
  const nP = participantes.length;
  const nG = participantes.filter((p: any) => p.ganador).length;
  const ptsV = nG > 0 ? nP / nG : 0;
  const resultado: Record<string, any> = {};
  Object.entries(puntos).forEach(([k, d]: [string, any]) => {
    const colonias = (d.CI || 0) + (d.CE || 0) * 2;
    const victoria = d.participó && d.ganador ? ptsV : 0;
    resultado[k] = { total: parseFloat((colonias + victoria).toFixed(2)) };
  });
  return { resultado, nP, nG, ptsV };
}

// ── Format elapsed time ──────────────────────────────────────────
function formatDuration(minutes) {
  if (!minutes && minutes !== 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ── Random alien assignment (2 per player, no repeats) ──────────
async function asignarAliensNuevos(jugadores) {
  const allAliens = await getAliens().catch(() => []);
  if (allAliens.length === 0) throw new Error("No hay aliens disponibles");
  const pool = [...allAliens];
  return jugadores.map(j => {
    const picked = [];
    for (let i = 0; i < 2 && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool.splice(idx, 1)[0].id);
    }
    return { ...j, aliens: picked };
  });
}

const JoinMatch = ({ matchId }) => {
  const router = useRouter();
  const [match,              setMatch]              = useState(null);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [revealedPlayers,    setRevealedPlayers]    = useState({});
  const [puntos,             setPuntos]             = useState<Record<string, any>>({});
  const [guardando,          setGuardando]          = useState(false);
  const [step,               setStep]               = useState("view"); // 'view'|'form'|'confirm'|'success'|'copa-ceremony'
  const [mensajeExito,       setMensajeExito]       = useState(null);
  const [copaFinalizada,     setCopaFinalizada]     = useState(null);
  const [alienesConfirmados, setAlienesConfirmados] = useState({}); // { [playerId]: alienId }
  const [confirmandoAlien,   setConfirmandoAlien]   = useState(null); // playerId being saved
  const [creandoRevancha,    setCreandoRevancha]    = useState(false);
  const [elapsedMin,         setElapsedMin]         = useState(null);
  const timerRef = useRef(null);

  // ── Load match ──────────────────────────────────────────────
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        const partida = await getMatchById(matchId);
        if (!partida) {
          setError({ title: "Partida no encontrada", message: `El código "${matchId}" no existe.`, action: { href: "/cargarPartida", label: "Intentar con otro código" } });
          setLoading(false); return;
        }
        setMatch(partida);
        setAlienesConfirmados(partida.alienesConfirmados || {});

        const puntosPorJugador = {};
        if (Array.isArray(partida.jugadores)) {
          partida.jugadores.forEach((j, idx) => {
            const key = j.playerId || `${j.color || j.nombre || idx}`;
            puntosPorJugador[key] = {
              nombre: j.nombre, playerId: j.playerId || null, color: j.color,
              CI: 0, CE: 0, ganador: false, participó: true,
            };
          });
        }
        setPuntos(puntosPorJugador);
        setError(null);
      } catch (err) {
        setError({ title: "Error al cargar", message: "No se pudo conectar con el servidor.", action: { href: "/", label: "Volver al inicio" } });
      } finally { setLoading(false); }
    };
    if (matchId) fetchMatch();
  }, [matchId]);

  // ── Match timer ──────────────────────────────────────────────
  useEffect(() => {
    if (!match) return;
    const calcElapsed = () => {
      if (!match.fechaCreacion) return;
      const start = match.fechaCreacion.toDate
        ? match.fechaCreacion.toDate()
        : new Date(match.fechaCreacion);
      if (match.estado === 'finalizada' && match.fechaFinalizacion) {
        const end = match.fechaFinalizacion.toDate
          ? match.fechaFinalizacion.toDate()
          : new Date(match.fechaFinalizacion);
        setElapsedMin(Math.round((end - start) / 60000));
        return;
      }
      setElapsedMin(Math.round((Date.now() - start.getTime()) / 60000));
    };
    calcElapsed();
    if (match.estado !== 'finalizada') {
      timerRef.current = setInterval(calcElapsed, 30000);
    }
    return () => clearInterval(timerRef.current);
  }, [match]);

  const preview = useMemo(() => calcularPreview(puntos), [puntos]);

  const jugadoresArray = match
    ? Array.isArray(match.jugadores) ? match.jugadores : Object.values(match.jugadores)
    : [];

  // ── Handlers ──────────────────────────────────────────────
  const toggleReveal = (k) => setRevealedPlayers(p => ({ ...p, [k]: !p[k] }));

  const handleChange = (key, campo, valor) => {
    setPuntos(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [campo]: (campo === 'ganador' || campo === 'participó')
          ? !prev[key][campo]
          : Math.max(0, parseInt(valor) || 0),
      },
    }));
  };

  const goToConfirm = (e) => {
    e.preventDefault();
    if (preview.nG === 0) { alert("Debe haber al menos un ganador"); return; }
    setStep("confirm");
  };

  // ── "Este es mi alien" handler ──────────────────────────────
  const handleConfirmAlien = useCallback(async (playerId, alienId) => {
    if (!playerId || !alienId || !matchId) return;
    setConfirmandoAlien(playerId);
    try {
      const updated = { ...alienesConfirmados, [playerId]: alienId };
      await updateDoc(doc(db, 'matches', matchId), {
        [`alienesConfirmados.${playerId}`]: alienId,
      });
      setAlienesConfirmados(updated);
    } catch (err) {
      console.warn('No se pudo guardar alien confirmado:', err.message);
    } finally {
      setConfirmandoAlien(null);
    }
  }, [alienesConfirmados, matchId]);

  // ── Revancha ─────────────────────────────────────────────────
  const handleRevancha = useCallback(async () => {
    if (!match) return;
    setCreandoRevancha(true);
    try {
      // Build player list regardless of whether jugadores is the original array
      // (active match) or the finalized results object (which now preserves color+aliens)
      let jugadoresBase;
      if (Array.isArray(match.jugadores)) {
        jugadoresBase = match.jugadores;
      } else {
        // Finalized match: jugadores is { [key]: { nombre, color, playerId, aliens, ... } }
        jugadoresBase = Object.values(match.jugadores);
      }

      // Filter to valid players (have a color or a name)
      const jugadoresValidos = jugadoresBase
        .filter(j => j.color || j.nombre)
        .map(j => ({ nombre: j.nombre, color: j.color || null, playerId: j.playerId || null, aliens: [] }));

      if (jugadoresValidos.length < 2) {
        throw new Error('No hay suficientes jugadores para la revancha');
      }

      // Keep same players/colors, assign new aliens
      const jugadoresConAliens = await asignarAliensNuevos(jugadoresValidos);

      const newMatchId = await createMatch({
        jugadores: jugadoresConAliens,
        asociarACopa: match.asociarACopa !== false,
        sessionId: match.sessionId || null, // inherit session
        ligaId: match.ligaId || null, // la revancha queda en la misma liga que la partida original
      });

      router.push(`/cargarPartida/${newMatchId}`);
    } catch (err) {
      console.error('Error creando revancha:', err);
      alert('No se pudo crear la revancha. Intenta de nuevo.');
    } finally {
      setCreandoRevancha(false);
    }
  }, [match, router]);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const participantes = Object.values(puntos).filter(p => p.participó).length;
      const ganadores     = Object.values(puntos).filter(p => p.participó && p.ganador).length;
      if (participantes === 0) throw new Error("Debe haber al menos un participante");
      if (ganadores === 0)     throw new Error("Debe haber al menos un ganador");

      // La asignación a copa ya la garantiza la Cloud Function `crearPartida`
      // al crear la partida (ver docs/PLAN_MULTI_LIGA.md Fase 5) — este
      // fallback llamaba a activeCopaService, que escribe copas sin ligaId y
      // por afuera del ciclo de la Cloud Function; se sacó porque ya no hace
      // falta y podía crear una copa "huérfana" de ninguna liga.
      const resultado = await scoringService.finalizarPartidaConCopa(matchId, puntos);

      // Check if copa was closed (posicion 10)
      const matchFresh = await getMatchById(matchId);
      if (matchFresh?.posicion === 10 && matchFresh?.copId) {
        try {
          const { doc: firestoreDoc, getDoc } = await import('firebase/firestore');
          const { db: firestoreDb } = await import('@/firebase/config');
          const copaSnap = await getDoc(firestoreDoc(firestoreDb, 'copas', matchFresh.copId));
          if (copaSnap.exists() && copaSnap.data().estado === 'finalizada') {
            const copaData = copaSnap.data();
            const podio: Record<string, any>[] = Object.entries(copaData.ranking || {})
              .sort((a: [string, any], b: [string, any]) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
              .slice(0, 3)
              .map(([pid, d]: [string, any], idx) => ({ pos: idx + 1, nombre: d.nombreJugador, puntos: d.puntosTotales }));
            setCopaFinalizada({ nombre: copaData.nombre, podio });
            setMatch(matchFresh);
            setStep("copa-ceremony");
            return;
          }
        } catch {}
      }

      setMensajeExito("✓ Resultados guardados correctamente");
      const matchActualizado = await getMatchById(matchId);
      setMatch(matchActualizado);
      setStep("view");
    } catch (err) {
      console.error(err);
      setError({ title: "Error al guardar", message: err.message || "No se pudieron guardar los resultados", action: { href: "/cargarPartida", label: "Volver" } });
    } finally { setGuardando(false); }
  };

  // ── Guards ────────────────────────────────────────────────
  if (loading) return <LoadingOverlay message="Cargando partida..." />;
  if (error)   return <ErrorState title={error.title} message={error.message} action={error.action} />;
  if (!match || jugadoresArray.length === 0)
    return <ErrorState title="Partida vacía" message="Esta partida no tiene jugadores." action={{ href: "/", label: "Inicio" }} />;

  // ── COPA CEREMONY ────────────────────────────────────────
  if (step === "copa-ceremony" && copaFinalizada) {
    const medals = ["🥇", "🥈", "🥉"];
    const medalColors = ["#e8c547", "#a0aec0", "#cd7f32"];
    return (
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 16px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }}>🏆</div>
          <p className="cosmic-label" style={{ marginBottom: "12px" }}>COPA FINALIZADA</p>
          <h1 style={{ fontFamily: FD, fontSize: "clamp(36px, 8vw, 56px)", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1, marginBottom: "8px" }}>
            {copaFinalizada.nombre}
          </h1>
          <p style={{ fontFamily: FB, color: "#8a7a9a", fontSize: "14px", marginBottom: "36px" }}>
            La copa ha concluido. ¡Felicitaciones a los ganadores!
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
            {copaFinalizada.podio.map((p) => (
              <div key={p.pos} style={{
                display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px",
                background: `rgba(${p.pos === 1 ? '232,197,71' : p.pos === 2 ? '160,174,192' : '205,127,50'},0.06)`,
                border: `1px solid rgba(${p.pos === 1 ? '232,197,71' : p.pos === 2 ? '160,174,192' : '205,127,50'},0.25)`,
                borderRadius: "10px",
              }}>
                <span style={{ fontSize: "28px" }}>{medals[p.pos - 1]}</span>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontFamily: FD, fontSize: "20px", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1 }}>{p.nombre}</p>
                </div>
                <span style={{ fontFamily: FM, fontSize: "22px", fontWeight: 700, color: medalColors[p.pos - 1] }}>
                  {parseFloat(p.puntos?.toFixed(1) || 0)}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setStep("view")}
            style={{
              width: "100%", padding: "14px",
              background: "linear-gradient(135deg, rgba(200,153,42,0.5), rgba(168,125,0,0.6))",
              border: "1px solid rgba(200,153,42,0.4)", borderRadius: "8px",
              color: "#f0e8d6", fontFamily: FD, fontSize: "20px", letterSpacing: "0.1em", cursor: "pointer",
            }}>
            VER PARTIDA ✓
          </button>
        </div>
      </section>
    );
  }

  // ── CONFIRM SCREEN ───────────────────────────────────────
  if (step === "confirm") {
    return (
      <section style={{ minHeight: "100vh", padding: "48px 16px", position: "relative", zIndex: 1 }}>
        <div className="container mx-auto" style={{ maxWidth: "600px" }}>
          <div className="text-center" style={{ marginBottom: "28px" }}>
            <p className="cosmic-label" style={{ marginBottom: "8px" }}>CONFIRMACIÓN</p>
            <h2 style={{ fontFamily: FD, fontSize: "clamp(28px, 6vw, 44px)", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1 }}>
              ¿TODO CORRECTO?
            </h2>
            <p style={{ fontFamily: FM, fontSize: "11px", color: "#4a3a5a", marginTop: "8px" }}>
              Victoria = {preview.nP}/{preview.nG} = <span style={{ color: "#c8992a" }}>{parseFloat(preview.ptsV.toFixed(2))} pts</span>
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {Object.entries(puntos).map(([key, d]) => {
              const pts = preview.resultado[key];
              return (
                <div key={key} style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px",
                  background: d.participó ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                  border: `1px solid ${d.ganador ? "rgba(200,153,42,0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "8px", opacity: d.participó ? 1 : 0.45,
                }}>
                  {d.color && <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: d.color, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: FB, fontSize: "14px", fontWeight: 600, color: "#f0e8d6", lineHeight: 1 }}>
                      {d.ganador && <span style={{ color: "#c8992a", marginRight: "5px" }}>🏆</span>}
                      {d.nombre}
                    </p>
                    {d.participó && (
                      <p style={{ fontFamily: FM, fontSize: "10px", color: "#4a3a5a", marginTop: "3px" }}>
                        CI×{d.CI} + CE×{d.CE}{d.ganador ? ` + V(${parseFloat(preview.ptsV.toFixed(2))})` : ""}
                      </p>
                    )}
                  </div>
                  <span style={{ fontFamily: FM, fontSize: "20px", fontWeight: 700, color: d.ganador ? "#c8992a" : d.participó ? "#f0e8d6" : "#2a1a3a" }}>
                    {d.participó ? parseFloat(pts?.total?.toFixed(1) || "0") : "NO"}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" onClick={() => setStep("form")} disabled={guardando}
              style={{ flex: 1, padding: "13px", background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                color: "#8a7a9a", fontFamily: FB, fontSize: "14px", cursor: "pointer" }}>
              ← Corregir
            </button>
            <button type="button" onClick={handleGuardar} disabled={guardando}
              style={{ flex: 2, padding: "13px",
                background: guardando ? "rgba(38,198,195,0.05)" : "linear-gradient(135deg, rgba(38,198,195,0.6), rgba(26,180,180,0.7))",
                border: "1px solid rgba(38,198,195,0.4)", borderRadius: "8px",
                color: "#f0e8d6", fontFamily: FD, fontSize: "20px", letterSpacing: "0.1em",
                cursor: guardando ? "not-allowed" : "pointer" }}>
              {guardando ? "⏳ GUARDANDO..." : "CONFIRMAR ✓"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ── SCORING FORM ─────────────────────────────────────────
  if (step === "form") {
    return (
      <section style={{ minHeight: "100vh", padding: "48px 16px", position: "relative", zIndex: 1 }}>
        <div className="container mx-auto" style={{ maxWidth: "600px" }}>
          <div className="text-center" style={{ marginBottom: "28px" }}>
            <p className="cosmic-label" style={{ marginBottom: "8px" }}>CARGA DE RESULTADOS</p>
            <h2 style={{ fontFamily: FD, fontSize: "clamp(28px, 6vw, 44px)", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1 }}>
              CARGAR PUNTOS
            </h2>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "10px",
              padding: "5px 14px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "20px" }}>
              <span style={{ fontFamily: FM, fontSize: "11px", color: "#a855f7", letterSpacing: "0.1em" }}>
                {matchId}
              </span>
            </div>
          </div>

          {/* Victory preview */}
          {preview.nG > 0 && (
            <div style={{ padding: "10px 16px", background: "rgba(200,153,42,0.06)",
              border: "1px solid rgba(200,153,42,0.2)", borderRadius: "6px", marginBottom: "16px",
              display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: FM, fontSize: "11px", color: "#4a3a5a", letterSpacing: "0.1em" }}>VICTORIA:</span>
              <span style={{ fontFamily: FM, fontSize: "14px", fontWeight: 700, color: "#c8992a" }}>
                {preview.nP} ÷ {preview.nG} = {parseFloat(preview.ptsV.toFixed(2))} pts
              </span>
            </div>
          )}

          <form onSubmit={goToConfirm}>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {jugadoresArray.map((jugador, idx) => {
                const key = jugador.playerId || `${jugador.color || jugador.nombre || idx}`;
                const d = puntos[key] || {};
                return (
                  <InlineScoringCard
                    key={key}
                    keyId={key}
                    jugador={jugador}
                    data={d}
                    pts={preview.resultado[key]}
                    onChange={handleChange}
                  />
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="button" onClick={() => setStep("view")}
                style={{ padding: "13px 20px", background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                  color: "#8a7a9a", fontFamily: FB, fontSize: "14px", cursor: "pointer" }}>
                ← Cancelar
              </button>
              <button type="submit" disabled={preview.nG === 0}
                style={{ flex: 1, padding: "13px",
                  background: preview.nG > 0
                    ? "linear-gradient(135deg, rgba(168,85,247,0.65), rgba(139,92,246,0.8))"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${preview.nG > 0 ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "8px",
                  color: preview.nG > 0 ? "#f0e8d6" : "#2a1a3a",
                  fontFamily: FD, fontSize: "18px", letterSpacing: "0.1em",
                  cursor: preview.nG > 0 ? "pointer" : "not-allowed" }}>
                {preview.nG === 0 ? "MARCA UN GANADOR" : "REVISAR →"}
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  // ── VIEW (main match view) ───────────────────────────────
  const finalizada = match.estado === "finalizada";
  const timerLabel = formatDuration(elapsedMin);

  return (
    <section style={{ minHeight: "100vh", padding: "48px 16px", position: "relative", zIndex: 1 }}>
      <div className="container mx-auto" style={{ maxWidth: "800px" }}>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: "36px" }}>
          <p className="cosmic-label" style={{ marginBottom: "10px" }}>PARTIDA EN CURSO</p>
          <h2 style={{ fontFamily: FD, fontSize: "clamp(36px, 8vw, 56px)", color: "#f0e8d6", letterSpacing: "0.06em", lineHeight: 1, marginBottom: "10px" }}>
            🎮 CÓSMICA
          </h2>

          {/* Code + timer row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "6px 18px", background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.25)", borderRadius: "20px" }}>
              <span style={{ fontFamily: FM, fontSize: "13px", color: "#a855f7", letterSpacing: "0.15em" }}>
                {matchId}
              </span>
            </div>

            {timerLabel && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "6px 14px", background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px" }}>
                <span style={{ fontSize: "11px" }}>⏱</span>
                <span style={{ fontFamily: FM, fontSize: "11px", color: finalizada ? "#26c6c3" : "#8a7a9a", letterSpacing: "0.1em" }}>
                  {timerLabel}
                </span>
              </div>
            )}
          </div>

          {finalizada && (
            <div style={{ marginTop: "14px", display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "5px 14px", background: "rgba(38,198,195,0.08)",
              border: "1px solid rgba(38,198,195,0.25)", borderRadius: "20px" }}>
              <span style={{ fontFamily: FM, fontSize: "11px", color: "#26c6c3", letterSpacing: "0.12em" }}>
                ✓ FINALIZADA
              </span>
            </div>
          )}
        </div>

        {/* Success message */}
        {mensajeExito && (
          <div style={{ marginBottom: "24px", padding: "14px 20px",
            background: "rgba(38,198,195,0.08)", border: "1px solid rgba(38,198,195,0.25)",
            borderRadius: "8px", textAlign: "center",
            fontFamily: FB, color: "#26c6c3", fontSize: "14px" }}>
            {mensajeExito}
          </div>
        )}

        {/* Player cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          {jugadoresArray.map((jugador, idx) => {
            const key = jugador.playerId || `${jugador.color || jugador.nombre || idx}`;
            return (
              <PlayerCard
                key={key}
                jugador={jugador}
                index={idx}
                isRevealed={revealedPlayers[key] || false}
                onToggleReveal={() => toggleReveal(key)}
                alienConfirmado={alienesConfirmados[jugador.playerId] || null}
                onConfirmAlien={jugador.playerId ? handleConfirmAlien : null}
                isConfirming={confirmandoAlien === jugador.playerId}
              />
            );
          })}
        </div>

        {/* Action buttons */}
        {!finalizada && (
          <button
            onClick={() => setStep("form")}
            style={{
              display: "block", width: "100%", padding: "15px",
              background: "linear-gradient(135deg, rgba(38,198,195,0.5), rgba(26,180,180,0.65))",
              border: "1px solid rgba(38,198,195,0.35)", borderRadius: "8px",
              color: "#f0e8d6", fontFamily: FD, fontSize: "20px", letterSpacing: "0.1em",
              cursor: "pointer", marginBottom: "14px", transition: "all 0.25s",
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = "brightness(1.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = ""; }}>
            📊 CARGAR PUNTOS
          </button>
        )}

        {/* Revancha button (only shown when match is finalized) */}
        {finalizada && (
          <button
            onClick={handleRevancha}
            disabled={creandoRevancha}
            style={{
              display: "block", width: "100%", padding: "15px", marginBottom: "14px",
              background: creandoRevancha
                ? "rgba(200,153,42,0.05)"
                : "linear-gradient(135deg, rgba(200,153,42,0.45), rgba(168,125,0,0.55))",
              border: "1px solid rgba(200,153,42,0.35)", borderRadius: "8px",
              color: "#f0e8d6", fontFamily: FD, fontSize: "20px", letterSpacing: "0.1em",
              cursor: creandoRevancha ? "not-allowed" : "pointer", transition: "all 0.25s",
            }}
            onMouseEnter={e => { if (!creandoRevancha) e.currentTarget.style.filter = "brightness(1.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.filter = ""; }}>
            {creandoRevancha ? "⏳ CREANDO REVANCHA..." : "🔄 REVANCHA"}
          </button>
        )}

        {/* Non-copa notice */}
        {match.asociarACopa === false && (
          <div style={{ marginBottom: "14px", padding: "12px 16px",
            background: "rgba(255,185,0,0.06)", border: "1px solid rgba(255,185,0,0.2)",
            borderRadius: "8px", fontFamily: FB, color: "#8a7a9a", fontSize: "13px", textAlign: "center" }}>
            ⚠️ Esta partida tiene visitantes y no sumará al ranking de copa
          </div>
        )}

        {/* Share */}
        <div className="game-panel" style={{ padding: "24px", textAlign: "center" }}>
          <p style={{ fontFamily: FB, color: "#8a7a9a", fontSize: "13px", marginBottom: "14px" }}>
            ¿Quieres que se unan más jugadores?
          </p>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `🎮 Únete a mi partida de CosmicAPP\n\nCódigo: ${matchId}\n\n${typeof window !== "undefined" ? window.location.origin : ""}/cargarPartida/${matchId}`
            )}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "10px 24px", background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.25)", borderRadius: "7px",
              color: "#25d366", fontFamily: FB, fontSize: "14px", fontWeight: 600,
              textDecoration: "none", transition: "all 0.2s",
            }}>
            📱 Compartir por WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
};

/* ── Inline scoring card (in the form) ─────────────────────────── */
function InlineScoringCard({ keyId, jugador, data, pts, onChange }) {
  const total = data.participó ? (pts?.total ?? 0) : null;
  return (
    <div style={{
      padding: "16px 18px",
      background: data.ganador ? "rgba(200,153,42,0.05)" : data.participó ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
      border: `1px solid ${data.ganador ? "rgba(200,153,42,0.25)" : data.participó ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)"}`,
      borderRadius: "10px", opacity: data.participó ? 1 : 0.5, transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: data.participó ? "12px" : 0 }}>
        {jugador.color && <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: jugador.color, flexShrink: 0 }} />}
        <p style={{ flex: 1, fontFamily: FB, fontWeight: 600, fontSize: "15px", color: "#f0e8d6" }}>{jugador.nombre}</p>

        <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
          <input type="checkbox" checked={data.participó ?? true}
            onChange={() => onChange(keyId, "participó")} className="w-4 h-4 accent-teal-400" />
          <span style={{ fontFamily: FM, fontSize: "10px", color: "#4a3a5a", letterSpacing: "0.08em" }}>JUGÓ</span>
        </label>

        {data.participó && (
          <span style={{ fontFamily: FM, fontSize: "20px", fontWeight: 700, minWidth: "44px", textAlign: "right",
            color: data.ganador ? "#c8992a" : "#f0e8d6" }}>
            {parseFloat(total?.toFixed(1) || "0")}
          </span>
        )}
      </div>

      {data.participó && (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <SpinnerField label="CI" value={data.CI || 0} onChange={(v) => onChange(keyId, "CI", v)} />
          <SpinnerField label="CE" value={data.CE || 0} onChange={(v) => onChange(keyId, "CE", v)} />
          <label style={{
            display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto",
            padding: "6px 12px",
            background: data.ganador ? "rgba(200,153,42,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${data.ganador ? "rgba(200,153,42,0.4)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "6px", cursor: "pointer", transition: "all 0.2s",
          }}>
            <input type="checkbox" checked={data.ganador || false}
              onChange={() => onChange(keyId, "ganador")} className="w-4 h-4 accent-yellow-400" />
            <span style={{ fontFamily: FM, fontSize: "11px", letterSpacing: "0.1em",
              color: data.ganador ? "#c8992a" : "#4a3a5a" }}>
              {data.ganador ? "🏆 GANÓ" : "GANÓ"}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function SpinnerField({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
      <span style={{ fontFamily: FM, fontSize: "9px", letterSpacing: "0.15em", color: "#4a3a5a" }}>{label}</span>
      <div style={{ display: "flex" }}>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
          style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px 0 0 4px",
            color: "#8a7a9a", cursor: "pointer", fontSize: "16px" }}>−</button>
        <input type="number" min="0" value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: "36px", height: "28px", textAlign: "center",
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderLeft: "none", borderRight: "none",
            color: "#f0e8d6", fontFamily: FM, fontSize: "14px", outline: "none" }} />
        <button type="button" onClick={() => onChange(value + 1)}
          style={{ width: "28px", height: "28px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0 4px 4px 0",
            color: "#8a7a9a", cursor: "pointer", fontSize: "16px" }}>+</button>
      </div>
    </div>
  );
}

/* ── Player card (view mode) ─────────────────────────────────────── */
function PlayerCard({ jugador, index, isRevealed, onToggleReveal, alienConfirmado, onConfirmAlien, isConfirming }) {
  const [aliens, setAliens] = useState([]);
  const [aliensLoading, setAliensLoading] = useState(true);

  useEffect(() => {
    const fetchAliens = async () => {
      if (!Array.isArray(jugador.aliens) || jugador.aliens.length === 0) {
        setAliens([]); setAliensLoading(false); return;
      }
      try {
        const results = await Promise.all(jugador.aliens.map(id => getAlienById(id).catch(() => null)));
        setAliens(results.filter(Boolean));
      } catch { setAliens([]); }
      finally { setAliensLoading(false); }
    };
    fetchAliens();
  }, [jugador.aliens]);

  const isDark = jugador.color === "#FFFFFF" || jugador.color === "#FFFF00";

  return (
    <div style={{
      padding: "24px", borderRadius: "10px",
      background: `${jugador.color || "#444"}18`,
      border: "1px solid rgba(255,255,255,0.1)",
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "50%",
          background: jugador.color, border: "2px solid rgba(255,255,255,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FM, fontSize: "16px", fontWeight: 700,
          color: isDark ? "#000" : "#fff", flexShrink: 0,
        }}>{index + 1}</div>
        <div>
          <h3 style={{ fontFamily: FD, fontSize: "20px", letterSpacing: "0.06em", color: "#f0e8d6", lineHeight: 1 }}>
            {jugador.nombre}
          </h3>
          <p style={{ fontFamily: FM, fontSize: "10px", color: "#4a3a5a", marginTop: "4px" }}>
            {jugador.aliens?.length || 0} alien{jugador.aliens?.length !== 1 ? "s" : ""}
            {alienConfirmado && <span style={{ color: "#26c6c3", marginLeft: "6px" }}>· alien confirmado</span>}
          </p>
        </div>
      </div>

      {!isRevealed ? (
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "24px",
          textAlign: "center", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: "28px", marginBottom: "10px" }}>🔒</div>
          <p style={{ fontFamily: FB, color: "#4a3a5a", fontSize: "13px", marginBottom: "14px" }}>
            {jugador.aliens?.length || 0} aliens ocultos
          </p>
          <button onClick={onToggleReveal}
            style={{ padding: "7px 20px",
              background: "linear-gradient(135deg, rgba(255,185,0,0.2), rgba(255,120,0,0.25))",
              border: "1px solid rgba(255,185,0,0.3)", borderRadius: "6px",
              color: "#ffb900", fontFamily: FM, fontSize: "11px", letterSpacing: "0.1em",
              cursor: "pointer" }}>
            👁️ REVELAR
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <span style={{ fontFamily: FM, fontSize: "10px", color: "#26c6c3", letterSpacing: "0.1em" }}>✓ REVELADO</span>
            <button onClick={onToggleReveal} style={{ marginLeft: "auto", padding: "3px 10px",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "4px", color: "#4a3a5a", cursor: "pointer", fontSize: "11px", fontFamily: FB }}>
              Ocultar
            </button>
          </div>
          {aliensLoading ? (
            <p style={{ fontFamily: FB, color: "#4a3a5a", fontSize: "13px" }}>Cargando...</p>
          ) : aliens.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {aliens.map((alien, i) => {
                const isConfirmed = alienConfirmado === alien.id;
                const canConfirm = !!onConfirmAlien && !!jugador.playerId;
                return (
                  <div key={alien?.id || i}>
                    <AlienCard alien={alien} simple={true} />
                    {canConfirm && (
                      <button
                        onClick={() => handleConfirmThisAlien(alien.id)}
                        disabled={isConfirming}
                        style={{
                          marginTop: "6px", width: "100%", padding: "7px 12px",
                          background: isConfirmed
                            ? "rgba(38,198,195,0.18)"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isConfirmed ? "rgba(38,198,195,0.5)" : "rgba(255,255,255,0.1)"}`,
                          borderRadius: "6px",
                          color: isConfirmed ? "#26c6c3" : "#8a7a9a",
                          fontFamily: FM, fontSize: "10px", letterSpacing: "0.1em",
                          cursor: isConfirming ? "not-allowed" : "pointer",
                          transition: "all 0.2s",
                        }}>
                        {isConfirmed ? "✓ ESTE ES MI ALIEN" : isConfirming ? "..." : "👽 ESTE ES MI ALIEN"}
                      </button>
                    )}
                  </div>
                );

                function handleConfirmThisAlien(id) {
                  if (onConfirmAlien) onConfirmAlien(jugador.playerId, id);
                }
              })}
            </div>
          ) : (
            <p style={{ fontFamily: FB, color: "#2a1a3a", fontSize: "13px" }}>Sin aliens</p>
          )}
        </div>
      )}
    </div>
  );
}

export default JoinMatch;
