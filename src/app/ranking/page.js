'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { rankingService } from '@/services/rankingService';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function RankingPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    rankingService.obtenerRankingGlobal()
      .then(data => setRanking(data))
      .catch(() => setError('Error cargando el ranking'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <NavBar />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '48px 16px 80px' }}>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: '52px' }}>
          <p className="cosmic-label" style={{ marginBottom: '12px' }}>CLASIFICACIÓN GALÁCTICA</p>
          <h1
            style={{
              fontFamily: FD,
              fontSize: 'clamp(48px, 8vw, 80px)',
              letterSpacing: '0.06em',
              color: '#f0e8d6',
              lineHeight: 1,
              marginBottom: '10px',
            }}
          >
            🏆 RANKING GLOBAL
          </h1>
          <p style={{ fontFamily: FB, color: '#8a7a9a', fontSize: '14px', letterSpacing: '0.05em' }}>
            Suma de las últimas 10 partidas de cada jugador individualmente
          </p>
        </div>

        {loading ? (
          <SkeletonTable />
        ) : error ? (
          <div className="text-center py-12" style={{ color: '#e63946', fontFamily: FB }}>{error}</div>
        ) : ranking.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#8a7a9a', fontFamily: FB }}>Sin datos de ranking aún.</div>
        ) : (
          <RankingTable ranking={ranking} />
        )}
      </div>
    </div>
  );
}

function RankingTable({ ranking }) {
  return (
    <div>
      <div className="game-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(200,153,42,0.3)', background: 'rgba(200,153,42,0.04)' }}>
                {['#', 'Jugador', 'Puntos*', 'Partidas', 'Copas', 'Promedio', ''].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      fontFamily: FM,
                      fontSize: '11px',
                      letterSpacing: '0.2em',
                      color: '#8a7a9a',
                      padding: '16px',
                      textAlign: h === 'Jugador' ? 'left' : 'center',
                      fontWeight: 400,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
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

      <div
        style={{
          marginTop: '20px',
          padding: '14px 20px',
          background: 'rgba(17,13,30,0.6)',
          border: '1px solid rgba(200,153,42,0.12)',
          borderRadius: '6px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontFamily: FM, fontSize: '11px', color: '#4a3a5a', letterSpacing: '0.08em' }}>
          * Puntos = Suma de las últimas 10 partidas jugadas por cada jugador individualmente
        </p>
      </div>
    </div>
  );
}

function RankingRow({ jugador, index }) {
  const isTop3 = index < 3;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(200,153,42,0.08)',
        background: isTop3 ? 'rgba(200,153,42,0.03)' : 'transparent',
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.06)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = isTop3 ? 'rgba(200,153,42,0.03)' : 'transparent'; }}
    >
      <td style={{ padding: '16px', textAlign: 'center', width: '60px' }}>
        {index < 3 ? (
          <span style={{ fontSize: '22px' }}>{medals[index]}</span>
        ) : (
          <span style={{ fontFamily: FM, fontSize: '14px', color: 'rgba(200,153,42,0.5)' }}>#{jugador.posicion}</span>
        )}
      </td>

      <td style={{ padding: '16px' }}>
        <Link href={`/players/${jugador.id}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            {jugador.avatar ? (
              <img
                src={jugador.avatar}
                alt={jugador.nombre}
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(200,153,42,0.3)', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(100,50,180,0.2)', border: '1px solid rgba(200,153,42,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                👤
              </div>
            )}
            <div>
              <p style={{ fontFamily: FD, fontSize: '16px', letterSpacing: '0.06em', color: '#f0e8d6', lineHeight: 1 }}>{jugador.nombre}</p>
              <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', marginTop: '3px' }}>{jugador.id.slice(0, 12)}…</p>
            </div>
          </div>
        </Link>
      </td>

      <td style={{ padding: '16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FM, fontSize: '22px', fontWeight: 700, color: '#c8992a' }}>
          {jugador.puntos.toFixed(1)}
        </span>
      </td>

      <td style={{ padding: '16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FB, fontSize: '15px', color: '#f0e8d6', fontWeight: 600 }}>{jugador.partidas}</span>
      </td>

      <td style={{ padding: '16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FB, fontSize: '15px', color: '#f0e8d6', fontWeight: 600 }}>{jugador.victorias}</span>
      </td>

      <td style={{ padding: '16px', textAlign: 'center' }}>
        <span style={{ fontFamily: FB, fontSize: '15px', color: '#f0e8d6', fontWeight: 600 }}>{jugador.puntosPromedio.toFixed(1)}</span>
      </td>

      <td style={{ padding: '16px', textAlign: 'center' }}>
        <Link href={`/players/${jugador.id}`}>
          <button
            style={{ fontFamily: FD, fontSize: '13px', letterSpacing: '0.1em', padding: '6px 18px', background: 'rgba(200,153,42,0.08)', border: '1px solid rgba(200,153,42,0.3)', color: '#c8992a', borderRadius: '5px', cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.18)'; e.currentTarget.style.color = '#e8c547'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.08)'; e.currentTarget.style.color = '#c8992a'; }}
          >
            VER
          </button>
        </Link>
      </td>
    </tr>
  );
}

function SkeletonTable() {
  return (
    <div className="game-panel" style={{ overflow: 'hidden' }}>
      {[...Array(10)].map((_, i) => (
        <div key={i} className="animate-pulse" style={{ height: '68px', background: 'rgba(200,153,42,0.03)', borderBottom: '1px solid rgba(200,153,42,0.06)' }} />
      ))}
    </div>
  );
}
