'use client';

import { useEffect, useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { rankingService } from '@/services/rankingService';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

/* ── Sparkline SVG ────────────────────────────────────────────────── */
function Sparkline({ data, width = 220, height = 48 }) {
  if (!data || data.length < 2) return null;

  const values  = data.map(d => d.puntos || 0);
  const max     = Math.max(...values, 1);
  const min     = Math.min(...values, 0);
  const range   = max - min || 1;
  const padding = 6;
  const W       = width  - padding * 2;
  const H       = height - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * W;
    const y = padding + H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  const lastX = padding + W;
  const lastY = padding + H - ((values[values.length - 1] - min) / range) * H;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke="rgba(200,153,42,0.5)" strokeWidth="1.5" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * W;
        const y = padding + H - ((v - min) / range) * H;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={i === values.length - 1 ? '#c8992a' : 'rgba(200,153,42,0.4)'} />;
      })}
      {/* Last value label */}
      <text x={lastX + 6} y={lastY + 4} fontFamily="monospace" fontSize="10" fill="#c8992a">
        {parseFloat(values[values.length - 1].toFixed(1))}
      </text>
    </svg>
  );
}

/* ── Racha calculation ─────────────────────────────────────────────── */
function calcularRacha(partidas) {
  if (!partidas || partidas.length === 0) return 0;
  const avg = partidas.reduce((s, p) => s + (p.puntos || 0), 0) / partidas.length;
  let racha = 0;
  for (let i = 0; i < partidas.length; i++) {
    if ((partidas[i].puntos || 0) >= avg) racha++;
    else break;
  }
  return racha;
}

export default function PlayerDetailPage() {
  const { id } = useParams();
  const { player, loading, error } = usePlayer(id);

  const [ultimas,       setUltimas]       = useState([]);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [rankingPos,    setRankingPos]    = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchStats = async () => {
      try {
        const [partidas, ranking] = await Promise.all([
          rankingService.obtenerUltimas10Partidas(id),
          rankingService.obtenerRankingGlobal(),
        ]);
        // Most recent first for racha, oldest first for sparkline
        const sorted = [...partidas].sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setUltimas(sorted);
        const pos = ranking.findIndex(j => j.id === id);
        setRankingPos(pos >= 0 ? pos + 1 : null);
      } catch (e) {
        console.warn('Error loading player stats:', e);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="text-center">
          <div className="animate-spin" style={{ fontSize: '32px', marginBottom: '12px' }}>🌌</div>
          <p style={{ fontFamily: FB, color: '#8a7a9a' }}>Cargando jugador...</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="game-panel" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ fontFamily: FD, fontSize: '24px', color: '#e63946', letterSpacing: '0.06em' }}>
            JUGADOR NO ENCONTRADO
          </p>
          <Link href="/players" style={{ fontFamily: FB, color: '#8a7a9a', fontSize: '13px', textDecoration: 'none', marginTop: '12px', display: 'block' }}>
            ← Volver a Jugadores
          </Link>
        </div>
      </div>
    );
  }

  // Stats helpers
  const partidas      = player.stats?.partidas || 0;
  const victorias     = player.stats?.victorias || 0;
  const promedio      = player.stats?.puntosPromedio || 0;
  const tasaVictoria  = partidas > 0 ? (victorias / partidas * 100).toFixed(0) : 0;
  const last10Score   = player.last10Score || 0;
  const copasGanadas  = player.estadisticas?.copas || 0;

  // Sorted oldest→newest for sparkline
  const sparklineData = [...ultimas].reverse();
  const racha = calcularRacha(ultimas); // most recent first

  return (
    <div style={{ minHeight: '100vh', padding: '48px 16px 80px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>

        {/* Back */}
        <Link href="/players"
          style={{ fontFamily: FB, color: '#8a7a9a', textDecoration: 'none', fontSize: '13px',
            display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px', transition: 'color 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0e8d6'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8a7a9a'; }}>
          ← Volver a Jugadores
        </Link>

        {/* Hero */}
        <div className="game-panel" style={{ padding: '32px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Avatar */}
            {player.photoURL || player.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.photoURL || player.avatar} alt={player.name}
                style={{ width: '88px', height: '88px', borderRadius: '50%', objectFit: 'cover',
                  border: '2px solid rgba(200,153,42,0.35)', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '88px', height: '88px', borderRadius: '50%',
                background: 'rgba(100,50,180,0.2)', border: '2px solid rgba(200,153,42,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', flexShrink: 0 }}>👤</div>
            )}

            {/* Name + badges */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: FD, fontSize: 'clamp(28px, 5vw, 42px)', letterSpacing: '0.06em',
                color: '#f0e8d6', lineHeight: 1, marginBottom: '8px' }}>
                {player.name}
              </h1>
              {player.email && (
                <p style={{ fontFamily: FM, fontSize: '11px', color: '#4a3a5a', letterSpacing: '0.06em', marginBottom: '10px' }}>
                  {player.email}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {rankingPos && (
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: rankingPos <= 3 ? 'rgba(200,153,42,0.1)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${rankingPos <= 3 ? 'rgba(200,153,42,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    fontFamily: FM, fontSize: '11px', letterSpacing: '0.1em',
                    color: rankingPos <= 3 ? '#c8992a' : '#8a7a9a',
                  }}>
                    {rankingPos === 1 ? '🥇' : rankingPos === 2 ? '🥈' : rankingPos === 3 ? '🥉' : '#'}{rankingPos} RANKING
                  </span>
                )}
                {racha >= 3 && (
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: 'rgba(38,198,195,0.08)', border: '1px solid rgba(38,198,195,0.25)',
                    fontFamily: FM, fontSize: '11px', letterSpacing: '0.1em', color: '#26c6c3',
                  }}>
                    🔥 {racha} RACHA
                  </span>
                )}
                {copasGanadas > 0 && (
                  <span style={{
                    padding: '4px 12px', borderRadius: '20px',
                    background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)',
                    fontFamily: FM, fontSize: '11px', letterSpacing: '0.1em', color: '#a855f7',
                  }}>
                    🏆 {copasGanadas} COPA{copasGanadas !== 1 ? 'S' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Last10 score */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <p style={{ fontFamily: FM, fontSize: '42px', fontWeight: 700, color: '#c8992a', lineHeight: 1,
                textShadow: '0 0 20px rgba(200,153,42,0.4)' }}>
                {parseFloat(last10Score.toFixed(1))}
              </p>
              <p style={{ fontFamily: FM, fontSize: '10px', letterSpacing: '0.12em', color: '#4a3a5a', marginTop: '4px' }}>
                ÚLT. 10 PARTIDAS
              </p>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px' }}
          className="sm:grid-cols-4">
          <StatCard label="PARTIDAS" value={partidas} icon="⚔️" />
          <StatCard label="VICTORIAS" value={victorias} icon="✓" color="#26c6c3" />
          <StatCard label="PROMEDIO" value={parseFloat(promedio.toFixed(1))} icon="📊" color="#a855f7" />
          <StatCard label="WIN RATE" value={`${tasaVictoria}%`} icon="🎯" color="#c8992a" />
        </div>

        {/* Sparkline card */}
        {!loadingStats && sparklineData.length >= 2 && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p className="cosmic-label" style={{ marginBottom: '4px' }}>ÚLTIMAS {sparklineData.length} PARTIDAS</p>
                <p style={{ fontFamily: FM, fontSize: '11px', color: '#4a3a5a' }}>
                  Más antiguas → más recientes
                </p>
              </div>
              {racha > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', letterSpacing: '0.1em' }}>RACHA ACTUAL</p>
                  <p style={{ fontFamily: FM, fontSize: '20px', fontWeight: 700, color: racha >= 3 ? '#26c6c3' : '#8a7a9a' }}>
                    {racha >= 3 ? '🔥 ' : ''}{racha} partidas sobre promedio
                  </p>
                </div>
              )}
            </div>

            {/* Sparkline */}
            <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              <Sparkline data={sparklineData} width={Math.max(260, sparklineData.length * 30)} height={56} />
            </div>

            {/* Match dots legend */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {sparklineData.map((p, i) => (
                <div key={i} style={{ textAlign: 'center', flexShrink: 0, minWidth: '28px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', margin: '0 auto 4px',
                    background: p.esGanador ? '#c8992a' : 'rgba(255,255,255,0.2)',
                  }} title={p.esGanador ? 'Victoria' : 'Derrota'} />
                  <p style={{ fontFamily: FM, fontSize: '9px', color: '#2a1a3a' }}>
                    {parseFloat((p.puntos || 0).toFixed(1))}
                  </p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: FM, fontSize: '9px', color: '#2a1a3a', marginTop: '6px', letterSpacing: '0.08em' }}>
              🟡 = victoria
            </p>
          </div>
        )}

        {/* LCE Historical stats */}
        {player.estadisticas && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <p className="cosmic-label" style={{ marginBottom: '16px' }}>ESTADÍSTICAS HISTÓRICAS LCE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <MiniStat label="Jugadas" value={player.estadisticas.jugadas || 0} />
              <MiniStat label="Victorias" value={player.estadisticas.victorias || 0} />
              <MiniStat label="Copas" value={player.estadisticas.copas || 0} />
              <MiniStat label="Colonias CE" value={player.estadisticas.colonias || 0} />
              <MiniStat label="Campanas" value={player.estadisticas.campanas || 0} />
              <MiniStat label="Podio copas" value={player.estadisticas.podioCopas || 0} />
            </div>
          </div>
        )}

        {/* Copas */}
        {player.copas && player.copas.length > 0 && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <p className="cosmic-label" style={{ marginBottom: '14px' }}>COPAS</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {player.copas.map(copaId => (
                <Link key={copaId} href={`/copas/${copaId}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(200,153,42,0.12)',
                    borderRadius: '6px', textDecoration: 'none', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,153,42,0.3)'; e.currentTarget.style.background = 'rgba(200,153,42,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,153,42,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
                  <span style={{ fontFamily: FB, fontSize: '13px', color: '#8a7a9a' }}>🏆 {copaId.slice(0, 12)}…</span>
                  <span style={{ fontFamily: FM, fontSize: '11px', color: '#4a3a5a', letterSpacing: '0.1em' }}>VER →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color = '#f0e8d6' }) {
  return (
    <div className="game-panel" style={{ padding: '20px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</p>
      <p style={{ fontFamily: FM, fontSize: '26px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>{value}</p>
      <p style={{ fontFamily: FM, fontSize: '9px', letterSpacing: '0.18em', color: '#4a3a5a' }}>{label}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p style={{ fontFamily: FM, fontSize: '18px', fontWeight: 700, color: '#f0e8d6', marginBottom: '3px' }}>{value}</p>
      <p style={{ fontFamily: FM, fontSize: '9px', letterSpacing: '0.12em', color: '#4a3a5a' }}>{label.toUpperCase()}</p>
    </div>
  );
}
