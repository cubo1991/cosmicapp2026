'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { rankingService } from '@/services/rankingService';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function RankingPage() {
  const [ranking, setRanking]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);
  const [tooltip, setTooltip]   = useState(false);

  useEffect(() => {
    rankingService.obtenerRankingGlobal()
      .then(data => setRanking(data))
      .catch(() => setError('Error cargando el ranking'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 16px 80px' }}>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: '44px' }}>
          <p className="cosmic-label" style={{ marginBottom: '12px' }}>CLASIFICACIÓN GALÁCTICA</p>
          <h1 style={{
            fontFamily: FD,
            fontSize: 'clamp(48px, 8vw, 80px)',
            letterSpacing: '0.06em',
            color: '#f0e8d6',
            lineHeight: 1, marginBottom: '10px',
          }}>
            🏆 RANKING GLOBAL
          </h1>

          {/* Tooltip trigger */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setTooltip(t => !t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: FB, color: '#4a3a5a', fontSize: '13px',
                display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto', padding: '4px 8px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#8a7a9a'; }}
              onMouseLeave={e => { if (!tooltip) e.currentTarget.style.color = '#4a3a5a'; }}>
              Suma de las últimas 10 partidas por jugador
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '16px', height: '16px', borderRadius: '50%',
                background: 'rgba(200,153,42,0.1)', border: '1px solid rgba(200,153,42,0.25)',
                fontFamily: FM, fontSize: '10px', color: '#c8992a',
              }}>?</span>
            </button>
            {tooltip && (
              <div style={{
                position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                marginTop: '8px', zIndex: 10, width: '280px',
                background: '#1a1330', border: '1px solid rgba(200,153,42,0.25)',
                borderRadius: '8px', padding: '14px 16px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                <p style={{ fontFamily: FB, fontSize: '13px', color: '#f0e8d6', lineHeight: 1.6, marginBottom: '8px' }}>
                  <strong>¿Cómo se calcula?</strong>
                </p>
                <p style={{ fontFamily: FB, fontSize: '12px', color: '#8a7a9a', lineHeight: 1.7 }}>
                  Cada jugador suma los puntos de sus <strong style={{ color: '#c8992a' }}>últimas 10 partidas jugadas</strong>, independientemente de la copa en que cayeron.
                </p>
                <p style={{ fontFamily: FB, fontSize: '12px', color: '#8a7a9a', lineHeight: 1.7, marginTop: '6px' }}>
                  Fórmula por partida: <strong style={{ color: '#c8992a' }}>CI×1 + CE×2 + Victoria(N÷G)</strong>
                </p>
                <button onClick={() => setTooltip(false)}
                  style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: FM, fontSize: '10px', color: '#4a3a5a' }}>
                  Cerrar ×
                </button>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : error ? (
          <div className="text-center py-12" style={{ color: '#e63946', fontFamily: FB }}>{error}</div>
        ) : ranking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 16px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌌</div>
            <p style={{ fontFamily: FD, fontSize: '28px', color: '#2a1a3a', letterSpacing: '0.06em', marginBottom: '8px' }}>
              LA GALAXIA AGUARDA
            </p>
            <p style={{ fontFamily: FB, color: '#4a3a5a', fontSize: '14px' }}>
              Sin datos de ranking aún. ¡Crea tu primera partida!
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <RankingTable ranking={ranking} />
            </div>
            {/* Mobile cards */}
            <div className="md:hidden">
              <RankingCards ranking={ranking} />
            </div>
          </>
        )}
      </div>

      {/* Click outside to close tooltip */}
      {tooltip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 5 }} onClick={() => setTooltip(false)} />
      )}
    </div>
  );
}

/* ── Desktop table ──────────────────────────────────────────────── */
function RankingTable({ ranking }) {
  return (
    <div>
      <div className="game-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(200,153,42,0.2)', background: 'rgba(200,153,42,0.03)' }}>
                {['#', 'Jugador', 'Puntos*', 'Partidas', 'Copas', 'Promedio', ''].map((h, i) => (
                  <th key={i} style={{
                    fontFamily: FM, fontSize: '10px', letterSpacing: '0.2em', color: '#4a3a5a',
                    padding: '14px 16px',
                    textAlign: h === 'Jugador' ? 'left' : 'center',
                    fontWeight: 400, whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((jugador, idx) => (
                <RankingRow key={jugador.id} jugador={jugador} index={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '16px', padding: '12px 18px',
        background: 'rgba(17,13,30,0.5)', border: '1px solid rgba(200,153,42,0.08)',
        borderRadius: '6px', textAlign: 'center' }}>
        <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', letterSpacing: '0.08em' }}>
          * Puntos = Suma de las últimas 10 partidas jugadas por cada jugador
        </p>
      </div>
    </div>
  );
}

function RankingRow({ jugador, index }) {
  const medals = ['🥇', '🥈', '🥉'];
  const isTop3 = index < 3;
  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(200,153,42,0.06)',
        background: isTop3 ? 'rgba(200,153,42,0.02)' : 'transparent',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isTop3 ? 'rgba(200,153,42,0.02)' : 'transparent'; }}>

      <td style={{ padding: '14px 16px', textAlign: 'center', width: '56px' }}>
        {index < 3
          ? <span style={{ fontSize: '20px' }}>{medals[index]}</span>
          : <span style={{ fontFamily: FM, fontSize: '13px', color: 'rgba(200,153,42,0.4)' }}>#{jugador.posicion}</span>
        }
      </td>

      <td style={{ padding: '14px 16px' }}>
        <Link href={`/players/${jugador.id}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            {jugador.avatar
              ? <img src={jugador.avatar} alt={jugador.nombre}
                  style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover',
                    border: '1px solid rgba(200,153,42,0.25)', flexShrink: 0 }} />
              : <div style={{ width: '38px', height: '38px', borderRadius: '50%',
                    background: 'rgba(100,50,180,0.2)', border: '1px solid rgba(200,153,42,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
            }
            <div>
              <p style={{ fontFamily: FD, fontSize: '15px', letterSpacing: '0.06em', color: '#f0e8d6', lineHeight: 1 }}>
                {jugador.nombre}
              </p>
              <p style={{ fontFamily: FM, fontSize: '9px', color: '#4a3a5a', marginTop: '2px' }}>
                {jugador.id.slice(0, 10)}…
              </p>
            </div>
          </div>
        </Link>
      </td>

      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: '20px', fontWeight: 700, color: '#c8992a' }}>
          {jugador.puntos.toFixed(1)}
        </span>
      </td>

      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FB, fontSize: '14px', color: '#f0e8d6', fontWeight: 600 }}>{jugador.partidas}</span>
      </td>

      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FB, fontSize: '14px', color: '#f0e8d6', fontWeight: 600 }}>{jugador.victorias}</span>
      </td>

      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FB, fontSize: '14px', color: '#f0e8d6', fontWeight: 600 }}>
          {jugador.puntosPromedio.toFixed(1)}
        </span>
      </td>

      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <Link href={`/players/${jugador.id}`}>
          <button style={{
            fontFamily: FD, fontSize: '12px', letterSpacing: '0.1em',
            padding: '5px 16px',
            background: 'rgba(200,153,42,0.06)', border: '1px solid rgba(200,153,42,0.25)',
            color: '#c8992a', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.14)'; e.currentTarget.style.color = '#e8c547'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.06)'; e.currentTarget.style.color = '#c8992a'; }}>
            VER
          </button>
        </Link>
      </td>
    </tr>
  );
}

/* ── Mobile cards ───────────────────────────────────────────────── */
function RankingCards({ ranking }) {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {ranking.map((jugador, idx) => (
        <Link key={jugador.id} href={`/players/${jugador.id}`}>
          <div
            className="game-panel-hover"
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 18px',
              background: idx < 3 ? 'rgba(200,153,42,0.03)' : 'rgba(17,13,30,0.6)',
              border: `1px solid ${idx < 3 ? 'rgba(200,153,42,0.15)' : 'rgba(200,153,42,0.08)'}`,
              borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s',
            }}>
            {/* Position */}
            <div style={{ minWidth: '40px', textAlign: 'center' }}>
              {idx < 3
                ? <span style={{ fontSize: '22px' }}>{medals[idx]}</span>
                : <span style={{ fontFamily: FM, fontSize: '16px', fontWeight: 700, color: 'rgba(200,153,42,0.45)' }}>#{jugador.posicion}</span>
              }
            </div>

            {/* Avatar */}
            {jugador.avatar
              ? <img src={jugador.avatar} alt={jugador.nombre}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover',
                    border: '1px solid rgba(200,153,42,0.2)', flexShrink: 0 }} />
              : <div style={{ width: '40px', height: '40px', borderRadius: '50%',
                    background: 'rgba(100,50,180,0.15)', border: '1px solid rgba(200,153,42,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>👤</div>
            }

            {/* Name + stats */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: FD, fontSize: '15px', letterSpacing: '0.06em', color: '#f0e8d6',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1 }}>
                {jugador.nombre}
              </p>
              <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', marginTop: '3px' }}>
                {jugador.partidas} partidas · {jugador.victorias} copas
              </p>
            </div>

            {/* Score */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: FM, fontSize: '22px', fontWeight: 700, color: '#c8992a', lineHeight: 1 }}>
                {jugador.puntos.toFixed(1)}
              </p>
              <p style={{ fontFamily: FM, fontSize: '9px', color: '#4a3a5a', marginTop: '2px' }}>pts</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────── */
function SkeletonTable() {
  return (
    <div className="game-panel" style={{ overflow: 'hidden' }}>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse"
          style={{ height: '64px', background: 'rgba(200,153,42,0.025)',
            borderBottom: '1px solid rgba(200,153,42,0.05)' }} />
      ))}
    </div>
  );
}
