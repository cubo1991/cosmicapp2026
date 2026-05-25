'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { activeCopaService } from '@/services/activeCopaService';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/firebase/config';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function OrganizerPanel() {
  const [copaInfo,       setCopaInfo]       = useState(null);
  const [recentMatches,  setRecentMatches]  = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Copa activa info
        const info = await activeCopaService.obtenerInfoCopaActiva();
        setCopaInfo(info);

        // Últimas 3 partidas finalizadas — sort client-side to avoid composite index
        const finalizadasQ = query(
          collection(db, 'matches'),
          where('estado', '==', 'finalizada'),
          limit(30)
        );
        const finalizadasSnap = await getDocs(finalizadasQ);
        const finalizadas = finalizadasSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.fechaFinalizacion?.seconds || 0) - (a.fechaFinalizacion?.seconds || 0))
          .slice(0, 3);
        setRecentMatches(finalizadas);

        // Partidas activas pendientes de scoring — sort client-side
        const activasQ = query(
          collection(db, 'matches'),
          where('estado', '==', 'activa'),
          limit(30)
        );
        const activasSnap = await getDocs(activasQ);
        const activas = activasSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.fechaCreacion?.seconds || 0) - (a.fechaCreacion?.seconds || 0))
          .slice(0, 5);
        setPendingMatches(activas);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div className="animate-spin" style={{ fontSize: '32px', marginBottom: '12px' }}>🌌</div>
        <p style={{ fontFamily: FB, color: '#8a7a9a' }}>Cargando panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', background: 'rgba(230,57,70,0.08)',
        border: '1px solid rgba(230,57,70,0.25)', borderRadius: '8px', color: '#e63946', fontFamily: FB, fontSize: '13px' }}>
        Error: {error}
      </div>
    );
  }

  const cargadas  = copaInfo ? copaInfo.cantidadPartidas : 0;
  const pendientes = 10 - cargadas;
  const progreso  = (cargadas / 10) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Copa activa */}
      <div className="game-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <div>
            <p className="cosmic-label" style={{ marginBottom: '6px' }}>COPA ACTIVA</p>
            <h2 style={{ fontFamily: FD, fontSize: '28px', letterSpacing: '0.06em', color: '#f0e8d6', lineHeight: 1 }}>
              {copaInfo?.nombre || 'Sin copa activa'}
            </h2>
          </div>
          {copaInfo?.id && (
            <Link href={`/copas/${copaInfo.id}`}
              style={{ padding: '7px 18px', background: 'rgba(200,153,42,0.08)',
                border: '1px solid rgba(200,153,42,0.25)', borderRadius: '6px',
                color: '#c8992a', fontFamily: FD, fontSize: '14px', letterSpacing: '0.1em',
                textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.08)'; }}>
              VER COPA →
            </Link>
          )}
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', letterSpacing: '0.12em' }}>
              PROGRESO: {cargadas}/10 PARTIDAS
            </span>
            <span style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a' }}>
              {pendientes} pendientes
            </span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progreso}%`,
              background: progreso >= 80 ? '#26c6c3' : progreso >= 50 ? '#c8992a' : '#a855f7',
              borderRadius: '3px', transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <MiniCard label="Jugadas" value={cargadas} color="#26c6c3" />
          <MiniCard label="Pendientes" value={pendientes} color={pendientes > 5 ? '#a855f7' : '#c8992a'} />
          <MiniCard label="Próxima pos." value={copaInfo?.proximaPosicion || '—'} color="#f0e8d6" />
        </div>
      </div>

      {/* Pending matches */}
      {pendingMatches.length > 0 && (
        <div className="game-panel" style={{ padding: '24px' }}>
          <p className="cosmic-label" style={{ marginBottom: '14px' }}>
            PARTIDAS PENDIENTES DE SCORING ({pendingMatches.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pendingMatches.map(match => {
              const jugadores = Array.isArray(match.jugadores)
                ? match.jugadores
                : Object.values(match.jugadores || {});
              return (
                <div key={match.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
                  borderRadius: '8px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {jugadores.slice(0, 6).map((j, i) => (
                        <div key={i} style={{
                          width: '10px', height: '10px', borderRadius: '2px',
                          background: j.color || '#444', flexShrink: 0,
                        }} title={j.nombre} />
                      ))}
                    </div>
                    <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', marginTop: '4px', letterSpacing: '0.06em' }}>
                      {match.id.slice(0, 12)}…
                    </p>
                  </div>
                  <Link href={`/cargarPartida/${match.id}`}
                    style={{ padding: '5px 14px',
                      background: 'rgba(38,198,195,0.08)', border: '1px solid rgba(38,198,195,0.25)',
                      borderRadius: '5px', color: '#26c6c3', fontFamily: FD,
                      fontSize: '13px', letterSpacing: '0.1em', textDecoration: 'none',
                      whiteSpace: 'nowrap', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(38,198,195,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(38,198,195,0.08)'; }}>
                    CARGAR
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent loaded */}
      {recentMatches.length > 0 && (
        <div className="game-panel" style={{ padding: '24px' }}>
          <p className="cosmic-label" style={{ marginBottom: '14px' }}>ÚLTIMAS CARGADAS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentMatches.map(match => {
              const jugadores = Array.isArray(match.jugadores)
                ? match.jugadores
                : Object.values(match.jugadores || {});
              const ganador = jugadores.find(j => j.esGanador);
              const fecha = match.fechaFinalizacion
                ? new Date(match.fechaFinalizacion.seconds * 1000).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })
                : 'Sin fecha';
              return (
                <div key={match.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  background: 'rgba(38,198,195,0.03)', border: '1px solid rgba(38,198,195,0.1)',
                  borderRadius: '8px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {ganador && (
                      <p style={{ fontFamily: FB, fontSize: '13px', color: '#c8992a', lineHeight: 1, marginBottom: '3px' }}>
                        🏆 {ganador.nombre}
                      </p>
                    )}
                    <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a' }}>{fecha}</p>
                  </div>
                  <Link href={`/matches/${match.id}`}
                    style={{ padding: '5px 14px',
                      background: 'rgba(200,153,42,0.06)', border: '1px solid rgba(200,153,42,0.2)',
                      borderRadius: '5px', color: '#c8992a', fontFamily: FD,
                      fontSize: '13px', letterSpacing: '0.1em', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    VER
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="game-panel" style={{ padding: '24px' }}>
        <p className="cosmic-label" style={{ marginBottom: '14px' }}>ACCIONES RÁPIDAS</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          <QuickAction href="/nuevaPartida" label="NUEVA PARTIDA" icon="🚀" color="#a855f7" />
          <QuickAction href="/ranking" label="VER RANKING" icon="🏆" color="#c8992a" />
          {copaInfo?.id && (
            <QuickAction href={`/copas/${copaInfo.id}/sumarPuntos`} label="CARGAR PUNTOS" icon="📊" color="#26c6c3" />
          )}
          <QuickAction href="/players" label="JUGADORES" icon="👥" color="#f0e8d6" />
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 8px',
      background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p style={{ fontFamily: FM, fontSize: '22px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>{value}</p>
      <p style={{ fontFamily: FM, fontSize: '9px', letterSpacing: '0.15em', color: '#4a3a5a' }}>{label}</p>
    </div>
  );
}

function QuickAction({ href, label, icon, color }) {
  return (
    <Link href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 16px',
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '8px', textDecoration: 'none', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,153,42,0.25)'; e.currentTarget.style.background = 'rgba(200,153,42,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontFamily: FD, fontSize: '14px', letterSpacing: '0.1em', color }}>{label}</span>
    </Link>
  );
}
