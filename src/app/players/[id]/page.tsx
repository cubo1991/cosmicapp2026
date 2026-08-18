'use client';

import { useEffect, useState } from 'react';
import { usePlayer } from '@/hooks/usePlayer';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { rankingService } from '@/services/rankingService';
import { getAlienById } from '@/firebase/db';

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
  const W = width - padding * 2;
  const H = height - padding * 2;
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

/* ── Perfil Estelar computation ────────────────────────────────────── */
function computePerfilEstelar(matches) {
  const played = (matches || []).filter(m => m.participó !== false);
  if (played.length < 2) return null;
  const n = played.length;
  const avgPuntos = played.reduce((s, m) => s + (m.puntos || 0), 0) / n;
  const winRate   = played.filter(m => m.esGanador).length / n * 100;
  const avgCE     = played.reduce((s, m) => s + (m.coloniasExternas || 0), 0) / n;
  const avgCI     = played.reduce((s, m) => s + (m.coloniasInternas || 0), 0) / n;
  const variance  = played.reduce((s, m) => s + Math.pow((m.puntos || 0) - avgPuntos, 2), 0) / n;
  const cv        = avgPuntos > 0 ? Math.sqrt(variance) / avgPuntos : 1;
  return {
    Conquista:   Math.round(Math.min(100, (avgCE / 3) * 100)),
    Potencia:    Math.round(Math.min(100, (avgPuntos / 15) * 100)),
    Liderazgo:   Math.round(winRate),
    Consistencia:Math.round(Math.max(0, Math.min(100, (1 - cv) * 100))),
    Dominio:     Math.round(Math.min(100, (avgCI / 4) * 100)),
  };
}

/* ── Rendimiento por tamaño ────────────────────────────────────────── */
function computeRendimientoPorTamano(matches) {
  const groups: Record<string, any> = {};
  (matches || []).filter(m => m.participó !== false && m.cantJugadores >= 3).forEach(m => {
    const k = m.cantJugadores;
    if (!groups[k]) groups[k] = { total: 0, wins: 0, count: 0 };
    groups[k].total += m.puntos || 0;
    groups[k].wins  += m.esGanador ? 1 : 0;
    groups[k].count++;
  });
  return Object.entries(groups)
    .filter(([, g]) => g.count >= 1)
    .map(([k, g]) => ({
      cant:     parseInt(k),
      promedio: parseFloat((g.total / g.count).toFixed(1)),
      winRate:  parseFloat((g.wins / g.count * 100).toFixed(0)),
      count:    g.count,
    }))
    .sort((a, b) => a.cant - b.cant);
}

/* ── Alien stats computation ───────────────────────────────────────── */
function computeAlienStats(matches) {
  const groups: Record<string, any> = {};
  (matches || []).filter(m => m.participó !== false && m.alienJugado).forEach(m => {
    const k = m.alienJugado;
    if (!groups[k]) groups[k] = { total: 0, wins: 0, count: 0 };
    groups[k].total += m.puntos || 0;
    groups[k].wins  += m.esGanador ? 1 : 0;
    groups[k].count++;
  });
  return Object.entries(groups)
    .map(([alienId, g]) => ({
      alienId,
      promedio: parseFloat((g.total / g.count).toFixed(1)),
      winRate:  parseFloat((g.wins / g.count * 100).toFixed(0)),
      count:    g.count,
    }))
    .sort((a, b) => b.count - a.count);
}

/* ── Stat bar with hover tooltip ───────────────────────────────────── */
function StatBar({ label, value, color = '#c8992a', tooltip }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ marginBottom: '10px', position: 'relative', cursor: 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{
          fontFamily: FM, fontSize: '10px', letterSpacing: '0.12em',
          color: hovered ? '#f0e8d6' : '#8a7a9a', transition: 'color 0.15s',
        }}>
          {label}
        </span>
        <span style={{ fontFamily: FM, fontSize: '12px', fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: '3px', transition: 'width 0.6s ease' }} />
      </div>
      {/* Tooltip */}
      {hovered && tooltip && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
          zIndex: 20,
          background: '#1a1330',
          border: `1px solid ${color}44`,
          borderRadius: '6px',
          padding: '7px 11px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          <p style={{ fontFamily: FM, fontSize: '10px', color: '#8a7a9a', letterSpacing: '0.08em' }}>
            {tooltip}
          </p>
        </div>
      )}
    </div>
  );
}

export default function PlayerDetailPage() {
  const { id } = useParams();
  const { player, loading, error } = usePlayer(id);

  const [ultimas,       setUltimas]       = useState([]);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [rankingPos,    setRankingPos]    = useState(null);
  const [alienNames,    setAlienNames]    = useState({}); // { [alienId]: string }

  useEffect(() => {
    if (!id) return;
    const fetchStats = async () => {
      try {
        const [partidas, ranking] = await Promise.all([
          rankingService.obtenerUltimas10Partidas(id),
          rankingService.obtenerRankingGlobal(),
        ]);
        const sorted = [...partidas].sort((a, b) => {
          const ta = a.createdAt?.seconds || 0;
          const tb = b.createdAt?.seconds || 0;
          return tb - ta;
        });
        setUltimas(sorted);

        // Fetch alien names for alien stats
        const alienIds = [...new Set(sorted.map(m => m.alienJugado).filter(Boolean))];
        if (alienIds.length > 0) {
          const names = {};
          await Promise.all(alienIds.map(async (aId) => {
            try {
              const alien = await getAlienById(aId);
              if (alien) names[aId] = alien.Nombre || alien.nombre || aId;
            } catch {}
          }));
          setAlienNames(names);
        }

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

  const partidas      = player.estadisticas?.jugadas   || player.stats?.partidas  || 0;
  const victorias     = player.estadisticas?.victorias || player.stats?.victorias || 0;
  const promedio      = partidas > 0 && (player.stats?.puntosPromedio || 0) > 0
                          ? player.stats.puntosPromedio : 0;
  const tasaVictoria  = partidas > 0 ? (victorias / partidas * 100).toFixed(0) : 0;
  const last10Score   = player.last10Score || 0;
  const copasGanadas  = player.estadisticas?.copas || 0;

  const sparklineData   = [...ultimas].reverse();
  const racha           = calcularRacha(ultimas);
  const perfilEstelar   = computePerfilEstelar(ultimas);
  const rendPorTamano   = computeRendimientoPorTamano(ultimas);
  const alienStats      = computeAlienStats(ultimas);

  // Personal record (highest single-match score in last 10)
  const maxScore = ultimas.length > 0
    ? Math.max(...ultimas.map(m => m.puntos || 0))
    : null;

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
          <StatCard label="PARTIDAS"  value={partidas}                       icon="⚔️" />
          <StatCard label="VICTORIAS" value={victorias}                      icon="✓"  color="#26c6c3" />
          <StatCard label="PROMEDIO"  value={parseFloat(promedio.toFixed(1))} icon="📊" color="#a855f7" />
          <StatCard label="WIN RATE"  value={`${tasaVictoria}%`}             icon="🎯" color="#c8992a" />
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
              {maxScore !== null && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', letterSpacing: '0.1em' }}>RÉCORD PERSONAL</p>
                  <p style={{ fontFamily: FM, fontSize: '20px', fontWeight: 700, color: '#c8992a' }}>
                    {parseFloat(maxScore.toFixed(1))} pts
                  </p>
                </div>
              )}
            </div>

            <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
              <Sparkline data={sparklineData} width={Math.max(260, sparklineData.length * 30)} height={56} />
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
              {sparklineData.map((p, i) => {
                const hasShared  = p.flags?.includes('shared_victory');
                const hasZeroCE  = p.flags?.includes('zero_ce_winner');
                const dotTitle   = [
                  p.esGanador ? 'Victoria' : 'Derrota',
                  hasShared  ? '· Victoria compartida' : '',
                  hasZeroCE  ? '· Ganó sin CE' : '',
                ].filter(Boolean).join(' ');
                return (
                  <div key={i} style={{ textAlign: 'center', flexShrink: 0, minWidth: '28px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', margin: '0 auto 2px',
                      background: p.esGanador ? '#c8992a' : 'rgba(255,255,255,0.2)',
                      outline: hasShared ? '2px solid rgba(168,85,247,0.7)' : 'none',
                      outlineOffset: '2px',
                    }} title={dotTitle} />
                    {(hasShared || hasZeroCE) && (
                      <span style={{ fontSize: '8px', display: 'block', lineHeight: 1, marginBottom: '1px' }}>
                        {hasShared ? '🤝' : hasZeroCE ? '⚔️' : ''}
                      </span>
                    )}
                    <p style={{ fontFamily: FM, fontSize: '9px', color: '#2a1a3a' }}>
                      {parseFloat((p.puntos || 0).toFixed(1))}
                    </p>
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: FM, fontSize: '9px', color: '#2a1a3a', marginTop: '6px', letterSpacing: '0.08em' }}>
              🟡 = victoria · 🤝 = victoria compartida · ⚔️ = ganó sin CE
            </p>
          </div>
        )}

        {/* ── PERFIL ESTELAR ─────────────────────────────────────────── */}
        {!loadingStats && perfilEstelar && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p className="cosmic-label" style={{ marginBottom: '4px' }}>PERFIL ESTELAR</p>
                <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a' }}>Basado en últimas {ultimas.length} partidas</p>
              </div>
              {racha > 0 && (
                <span style={{ fontFamily: FM, fontSize: '11px', color: racha >= 3 ? '#26c6c3' : '#8a7a9a', letterSpacing: '0.1em' }}>
                  {racha >= 3 ? '🔥' : ''} {racha} sobre promedio
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>
              <div>
                <StatBar label="CONQUISTA"    value={perfilEstelar.Conquista}    color="#e63946" tooltip="Promedio de colonias externas (CE) por partida" />
                <StatBar label="POTENCIA"     value={perfilEstelar.Potencia}     color="#c8992a" tooltip="Promedio de puntos totales por partida" />
                <StatBar label="LIDERAZGO"    value={perfilEstelar.Liderazgo}    color="#26c6c3" tooltip="Porcentaje de victorias en las últimas 10 partidas" />
              </div>
              <div>
                <StatBar label="CONSISTENCIA" value={perfilEstelar.Consistencia} color="#a855f7" tooltip="Regularidad del rendimiento (100 = nunca varía)" />
                <StatBar label="DOMINIO"      value={perfilEstelar.Dominio}      color="#4a90d9" tooltip="Promedio de colonias internas (CI) por partida" />
              </div>
            </div>
          </div>
        )}

        {/* ── RENDIMIENTO POR TAMAÑO ─────────────────────────────────── */}
        {!loadingStats && rendPorTamano.length > 0 && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <p className="cosmic-label" style={{ marginBottom: '16px' }}>RENDIMIENTO POR CANTIDAD DE JUGADORES</p>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rendPorTamano.length, 4)}, 1fr)`, gap: '10px' }}>
              {rendPorTamano.map(r => (
                <div key={r.cant} style={{
                  textAlign: 'center', padding: '14px 10px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                }}>
                  <p style={{ fontFamily: FD, fontSize: '28px', color: '#f0e8d6', letterSpacing: '0.04em', lineHeight: 1, marginBottom: '4px' }}>
                    {r.cant}P
                  </p>
                  <p style={{ fontFamily: FM, fontSize: '18px', fontWeight: 700, color: '#c8992a', lineHeight: 1, marginBottom: '2px' }}>
                    {r.promedio}
                  </p>
                  <p style={{ fontFamily: FM, fontSize: '9px', color: '#4a3a5a', letterSpacing: '0.1em', marginBottom: '6px' }}>
                    PROMEDIO
                  </p>
                  <p style={{ fontFamily: FM, fontSize: '13px', color: '#26c6c3', fontWeight: 700 }}>
                    {r.winRate}%
                  </p>
                  <p style={{ fontFamily: FM, fontSize: '9px', color: '#4a3a5a', letterSpacing: '0.1em', marginBottom: '4px' }}>
                    WIN RATE
                  </p>
                  <p style={{ fontFamily: FM, fontSize: '9px', color: '#2a1a3a' }}>
                    {r.count} partida{r.count !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RENDIMIENTO POR ALIEN ──────────────────────────────────── */}
        {!loadingStats && alienStats.length > 0 && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <p className="cosmic-label" style={{ marginBottom: '4px' }}>RENDIMIENTO POR ALIEN</p>
            <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', marginBottom: '16px' }}>
              Partidas donde confirmaste tu alien con el botón
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {alienStats.map(a => (
                <div key={a.alienId} style={{
                  display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: FB, fontSize: '14px', fontWeight: 600, color: '#f0e8d6', lineHeight: 1 }}>
                      👽 {alienNames[a.alienId] || a.alienId}
                    </p>
                    <p style={{ fontFamily: FM, fontSize: '9px', color: '#4a3a5a', marginTop: '3px', letterSpacing: '0.1em' }}>
                      {a.count} partida{a.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ fontFamily: FM, fontSize: '18px', fontWeight: 700, color: '#c8992a', lineHeight: 1 }}>{a.promedio}</p>
                    <p style={{ fontFamily: FM, fontSize: '8px', color: '#4a3a5a', letterSpacing: '0.1em' }}>PROM</p>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <p style={{ fontFamily: FM, fontSize: '18px', fontWeight: 700, color: '#26c6c3', lineHeight: 1 }}>{a.winRate}%</p>
                    <p style={{ fontFamily: FM, fontSize: '8px', color: '#4a3a5a', letterSpacing: '0.1em' }}>WIN</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LCE Historical stats */}
        {player.estadisticas && (
          <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <p className="cosmic-label" style={{ marginBottom: '16px' }}>ESTADÍSTICAS HISTÓRICAS LCE</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <MiniStat label="Jugadas"    value={player.estadisticas.jugadas    || 0} />
              <MiniStat label="Victorias"  value={player.estadisticas.victorias  || 0} />
              <MiniStat label="Copas"      value={player.estadisticas.copas      || 0} />
              <MiniStat label="Colonias CE" value={player.estadisticas.colonias  || 0} />
              <MiniStat label="Campanas"   value={player.estadisticas.campanas   || 0} />
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
