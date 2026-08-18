'use client';

import { useState, useEffect } from 'react';
import { getMatchById } from '@/firebase/db';
import { ErrorState } from '../../components/ErrorState';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function PartidaDetailPage() {
  const [match,   setMatch]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        setLoading(true);
        const partida = await getMatchById(id);
        if (!partida) {
          setError({ title: 'Partida no encontrada', message: `La partida "${id}" no existe o fue eliminada.`, action: { href: '/matches', label: 'Ver todas las partidas' } });
          return;
        }
        setMatch(partida);
      } catch {
        setError({ title: 'Error al cargar', message: 'No se pudo conectar con el servidor.', action: { href: '/matches', label: 'Volver a partidas' } });
      } finally { setLoading(false); }
    };
    if (id) fetchMatch();
  }, [id]);

  if (loading) return <LoadingOverlay message="Cargando partida..." />;
  if (error)   return <ErrorState {...error} />;
  if (!match)  return <ErrorState title="Partida vacía" message="No se pudieron cargar los detalles." action={{ href: '/matches', label: 'Volver' }} />;

  const jugadoresArray = Array.isArray(match.jugadores)
    ? match.jugadores
    : Object.values(match.jugadores || {});

  const finalizada = match.estado === 'finalizada';
  const fecha = match.fechaCreacion
    ? new Date(match.fechaCreacion.seconds * 1000).toLocaleDateString('es-AR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : null;

  return (
    <div style={{ minHeight: '100vh', padding: '48px 16px 80px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>

        {/* Back */}
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: FB,
            color: '#8a7a9a', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
            marginBottom: '28px', padding: 0, transition: 'color 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0e8d6'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8a7a9a'; }}>
          ← Volver
        </button>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p className="cosmic-label" style={{ marginBottom: '6px' }}>PARTIDA</p>
              <h1 style={{ fontFamily: FD, fontSize: 'clamp(28px, 6vw, 44px)', letterSpacing: '0.06em', color: '#f0e8d6', lineHeight: 1, marginBottom: '6px' }}>
                {match.nombre || `Partida ${id.slice(0, 8)}`}
              </h1>
              {fecha && <p style={{ fontFamily: FB, color: '#8a7a9a', fontSize: '13px' }}>{fecha}</p>}
            </div>
            <StatusBadge estado={match.estado} />
          </div>
        </div>

        {/* Meta info */}
        <div className="game-panel" style={{ padding: '20px 24px', marginBottom: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <MetaItem label="CÓDIGO" value={id.slice(0, 14)} mono />
            <MetaItem label="COPA" value={match.asociarACopa !== false ? '✓ Sí' : '✗ No'} />
            {match.copId && (
              <div>
                <p style={{ fontFamily: FM, fontSize: '9px', letterSpacing: '0.15em', color: '#4a3a5a', marginBottom: '4px' }}>COPA ID</p>
                <Link href={`/copas/${match.copId}`}
                  style={{ fontFamily: FM, fontSize: '12px', color: '#c8992a', textDecoration: 'none', letterSpacing: '0.06em' }}>
                  {match.copId.slice(0, 14)}… →
                </Link>
              </div>
            )}
            {match.posicion && <MetaItem label="POSICIÓN EN COPA" value={`#${match.posicion}`} color="#a855f7" />}
          </div>
        </div>

        {/* Players */}
        <div className="game-panel" style={{ padding: '24px', marginBottom: '20px' }}>
          <p className="cosmic-label" style={{ marginBottom: '16px' }}>
            JUGADORES ({jugadoresArray.length})
          </p>
          {jugadoresArray.length === 0 ? (
            <p style={{ fontFamily: FB, color: '#4a3a5a', fontSize: '13px' }}>Sin jugadores</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {jugadoresArray.map((jugador, idx) => (
                <PlayerRow key={idx} jugador={jugador} finalizada={finalizada} />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {!finalizada && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href={`/cargarPartida/${id}`} style={{ flex: 1, display: 'block' }}>
              <button style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, rgba(38,198,195,0.55), rgba(26,180,180,0.7))',
                border: '1px solid rgba(38,198,195,0.35)', borderRadius: '8px',
                color: '#f0e8d6', fontFamily: FD, fontSize: '18px', letterSpacing: '0.1em',
                cursor: 'pointer', transition: 'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.filter = ''; }}>
                📊 CARGAR PUNTOS
              </button>
            </Link>
          </div>
        )}

        {finalizada && (
          <div style={{
            padding: '16px 20px',
            background: 'rgba(38,198,195,0.06)', border: '1px solid rgba(38,198,195,0.2)',
            borderRadius: '8px', textAlign: 'center',
          }}>
            <p style={{ fontFamily: FM, fontSize: '12px', letterSpacing: '0.1em', color: '#26c6c3' }}>
              ✓ ESTA PARTIDA HA SIDO FINALIZADA
            </p>
            {match.fechaFinalizacion && (
              <p style={{ fontFamily: FB, fontSize: '12px', color: '#4a3a5a', marginTop: '4px' }}>
                {new Date(match.fechaFinalizacion.seconds * 1000).toLocaleString('es-AR')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ estado }) {
  const cfg = {
    finalizada: { bg: 'rgba(38,198,195,0.08)', border: 'rgba(38,198,195,0.25)', color: '#26c6c3', label: '✓ FINALIZADA' },
    activa:     { bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.25)', color: '#a855f7', label: '● ACTIVA' },
  }[estado] || { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', color: '#8a7a9a', label: estado?.toUpperCase() || 'DESCONOCIDO' };

  return (
    <span style={{ padding: '5px 14px', background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: '20px', fontFamily: FM, fontSize: '10px', letterSpacing: '0.15em', color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function MetaItem({ label, value, mono = false, color = '#f0e8d6' }) {
  return (
    <div>
      <p style={{ fontFamily: FM, fontSize: '9px', letterSpacing: '0.15em', color: '#4a3a5a', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontFamily: mono ? FM : FB, fontSize: mono ? '12px' : '14px', color, letterSpacing: mono ? '0.06em' : 0 }}>{value}</p>
    </div>
  );
}

function PlayerRow({ jugador, finalizada }) {
  const pts = jugador.puntos?.total ?? (
    typeof jugador.coloniasInternas !== 'undefined'
      ? (jugador.coloniasInternas || 0) + (jugador.coloniasExternas || 0) * 2
      : null
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
      background: jugador.esGanador ? 'rgba(200,153,42,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${jugador.esGanador ? 'rgba(200,153,42,0.2)' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '8px',
    }}>
      {jugador.color && (
        <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: jugador.color, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: FB, fontSize: '14px', fontWeight: 600, color: '#f0e8d6', lineHeight: 1 }}>
          {jugador.esGanador && <span style={{ color: '#c8992a', marginRight: '5px' }}>🏆</span>}
          {jugador.nombre}
        </p>
        <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', marginTop: '3px' }}>
          {jugador.playerId ? `ID: ${jugador.playerId.slice(0,10)}…` : '👤 Visitante'}
        </p>
      </div>
      {finalizada && pts !== null && (
        <span style={{ fontFamily: FM, fontSize: '18px', fontWeight: 700, color: jugador.esGanador ? '#c8992a' : '#8a7a9a' }}>
          {parseFloat(pts.toFixed(1))}
        </span>
      )}
      {jugador.aliens?.length > 0 && (
        <span style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a' }}>
          👽 {jugador.aliens.length}
        </span>
      )}
    </div>
  );
}
