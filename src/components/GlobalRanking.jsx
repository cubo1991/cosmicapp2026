"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { rankingService } from "@/services/rankingService";

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function GlobalRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    rankingService
      .obtenerRankingGlobal()
      .then((data) => setRanking(data.slice(0, 10)))
      .catch(() => setError("Error al cargar el ranking"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonRanking />;

  if (error)
    return (
      <div className="text-center py-8" style={{ color: "#e63946", fontFamily: FB }}>
        {error}
      </div>
    );

  if (ranking.length === 0)
    return (
      <div className="text-center py-8" style={{ color: "#8a7a9a", fontFamily: FB }}>
        Sin datos de ranking aún. ¡Crea tu primera partida!
      </div>
    );

  return (
    <div>
      {/* Top 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {ranking.slice(0, 3).map((jugador, idx) => (
          <RankingCardTop3 key={jugador.id} jugador={jugador} posicion={idx + 1} />
        ))}
      </div>

      {/* Pos 4–10 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ranking.slice(3, 10).map((jugador) => (
          <RankingRowCompact key={jugador.id} jugador={jugador} />
        ))}
      </div>

      {/* Link ranking completo */}
      <div className="text-center mt-8">
        <Link href="/ranking">
          <button
            style={{
              fontFamily: FD,
              fontSize: "15px",
              letterSpacing: "0.15em",
              padding: "11px 32px",
              background: "rgba(200,153,42,0.1)",
              border: "1px solid rgba(200,153,42,0.4)",
              color: "#c8992a",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(200,153,42,0.2)";
              e.currentTarget.style.color = "#e8c547";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(200,153,42,0.1)";
              e.currentTarget.style.color = "#c8992a";
            }}
          >
            VER RANKING COMPLETO
          </button>
        </Link>
      </div>
    </div>
  );
}

/* ── Top 3 cards ─────────────────────────────────────────────────── */

const TOP3_CONFIG = [
  {
    medal: "🥇",
    borderColor: "rgba(232,197,71,0.5)",
    bg: "rgba(232,197,71,0.06)",
    glow: "rgba(232,197,71,0.18)",
    textColor: "#e8c547",
  },
  {
    medal: "🥈",
    borderColor: "rgba(160,174,192,0.4)",
    bg: "rgba(160,174,192,0.05)",
    glow: "rgba(160,174,192,0.12)",
    textColor: "#a0aec0",
  },
  {
    medal: "🥉",
    borderColor: "rgba(205,127,50,0.4)",
    bg: "rgba(205,127,50,0.06)",
    glow: "rgba(205,127,50,0.15)",
    textColor: "#cd7f32",
  },
];

function RankingCardTop3({ jugador, posicion }) {
  const cfg = TOP3_CONFIG[posicion - 1];
  return (
    <Link href={`/players/${jugador.id}`}>
      <div
        className="game-panel-hover"
        style={{
          position: "relative",
          background: cfg.bg,
          border: `1px solid ${cfg.borderColor}`,
          borderRadius: "8px",
          padding: "24px 16px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.3s ease",
          boxShadow: `0 0 20px ${cfg.glow}, inset 0 0 30px rgba(0,0,0,0.3)`,
        }}
      >
        <div style={{ fontSize: "32px", marginBottom: "10px" }}>{cfg.medal}</div>

        {jugador.avatar ? (
          <img
            src={jugador.avatar}
            alt={jugador.nombre}
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              objectFit: "cover",
              margin: "0 auto 12px",
              border: `2px solid ${cfg.borderColor}`,
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(100,50,180,0.2)",
              border: `2px solid ${cfg.borderColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              margin: "0 auto 12px",
            }}
          >
            👤
          </div>
        )}

        <h3
          style={{
            fontFamily: FD,
            fontSize: "18px",
            letterSpacing: "0.08em",
            color: "#f0e8d6",
            marginBottom: "6px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {jugador.nombre}
        </h3>

        <p
          style={{
            fontFamily: FM,
            fontSize: "28px",
            fontWeight: 700,
            color: cfg.textColor,
            marginBottom: "4px",
            textShadow: `0 0 12px ${cfg.glow}`,
          }}
        >
          {jugador.puntos.toFixed(1)}
          <span style={{ fontFamily: FB, fontSize: "12px", color: "#8a7a9a", marginLeft: "4px" }}>
            pts
          </span>
        </p>

        {/* Forma indicator */}
        <div style={{ marginBottom: "8px" }}>
          <FormaChip forma={jugador.forma} />
        </div>

        <div style={{ fontFamily: FB, fontSize: "11px", color: "#8a7a9a", lineHeight: 1.8 }}>
          <p>Partidas: {jugador.partidas}</p>
          <p>Copas: {jugador.victorias}</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Filas compactas 4–10 ────────────────────────────────────────── */

function RankingRowCompact({ jugador }) {
  return (
    <Link href={`/players/${jugador.id}`}>
      <div
        className="game-panel-hover"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "14px 20px",
          background: "rgba(17,13,30,0.7)",
          border: "1px solid rgba(200,153,42,0.15)",
          borderRadius: "7px",
          cursor: "pointer",
          transition: "all 0.25s ease",
        }}
      >
        <div style={{ minWidth: "40px", textAlign: "center" }}>
          <span style={{ fontFamily: FM, fontSize: "18px", fontWeight: 700, color: "rgba(200,153,42,0.6)" }}>
            #{jugador.posicion}
          </span>
        </div>

        {jugador.avatar ? (
          <img
            src={jugador.avatar}
            alt={jugador.nombre}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(200,153,42,0.3)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "rgba(100,50,180,0.2)",
              border: "1px solid rgba(200,153,42,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            👤
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: FD,
              fontSize: "16px",
              letterSpacing: "0.06em",
              color: "#f0e8d6",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            {jugador.nombre}
          </p>
          <p style={{ fontFamily: FB, fontSize: "11px", color: "#8a7a9a", marginTop: "3px" }}>
            {jugador.partidas} partidas
          </p>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end", marginBottom: "2px" }}>
            <FormaChip forma={jugador.forma} compact />
            <p style={{ fontFamily: FM, fontSize: "20px", fontWeight: 700, color: "#c8992a" }}>
              {jugador.puntos.toFixed(1)}
            </p>
          </div>
          <p style={{ fontFamily: FB, fontSize: "10px", color: "#4a3a5a" }}>últ. 10 partidas</p>
        </div>
      </div>
    </Link>
  );
}

/* ── Forma chip ──────────────────────────────────────────────────── */
function FormaChip({ forma, compact = false }) {
  const cfg = {
    up:      { icon: "▲", color: "#26c6c3", label: compact ? "" : "en forma" },
    down:    { icon: "▼", color: "#e63946", label: compact ? "" : "bajando" },
    neutral: { icon: "→", color: "#4a3a5a", label: "" },
  }[forma] || { icon: "→", color: "#4a3a5a", label: "" };

  if (forma === "neutral" && compact) return null;

  return (
    <span style={{
      fontFamily: FM, fontSize: compact ? "10px" : "11px",
      color: cfg.color, letterSpacing: "0.06em",
      display: "inline-flex", alignItems: "center", gap: "2px",
    }}>
      {cfg.icon}{cfg.label ? ` ${cfg.label}` : ""}
    </span>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */
function SkeletonRanking() {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              background: "rgba(17,13,30,0.8)",
              border: "1px solid rgba(200,153,42,0.1)",
              borderRadius: "8px",
              height: "180px",
            }}
          />
        ))}
      </div>
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="animate-pulse"
          style={{
            background: "rgba(17,13,30,0.7)",
            border: "1px solid rgba(200,153,42,0.08)",
            borderRadius: "7px",
            height: "68px",
            marginBottom: "8px",
          }}
        />
      ))}
    </div>
  );
}
