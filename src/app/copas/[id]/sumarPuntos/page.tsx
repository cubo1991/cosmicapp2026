'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useCopa } from '@/hooks/useCopa';
import CargaPuntosForm from '@/components/forms/CargaPuntosForm';
import Link from 'next/link';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function SumarPuntosPage() {
  const params   = useParams();
  const copaId   = params.id;
  const { copa, partidas, loading, error } = useCopa(copaId);
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div className="text-center">
          <div className="animate-spin" style={{ fontSize: '32px', marginBottom: '16px' }}>🌌</div>
          <p style={{ fontFamily: FB, color: '#8a7a9a' }}>Cargando copa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', borderRadius: '8px', padding: '24px', color: '#e63946', fontFamily: FB }}>
          ❌ {error}
        </div>
      </div>
    );
  }

  if (!copa) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ fontFamily: FB, color: '#8a7a9a' }}>Copa no encontrada</p>
      </div>
    );
  }

  // All matches sorted by position (all of them, no slice)
  const todasPartidas = [...(partidas || [])]
    .sort((a, b) => (a.posicion || 0) - (b.posicion || 0));

  if (selectedMatch) {
    return (
      <div style={{ minHeight: '100vh', padding: '48px 16px', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button onClick={() => setSelectedMatch(null)}
            style={{ fontFamily: FB, color: '#8a7a9a', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f0e8d6'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#8a7a9a'; }}>
            ← Volver al listado
          </button>
          <CargaPuntosForm
            matchId={selectedMatch.matchId}
            copaId={copaId}
            posicion={selectedMatch.posicion}
            onSuccess={() => setSelectedMatch(null)}
          />
        </div>
      </div>
    );
  }

  const cargadas  = todasPartidas.filter(p => p.estado === 'cargada').length;
  const pendientes = todasPartidas.filter(p => p.estado !== 'cargada').length;

  return (
    <div style={{ minHeight: '100vh', padding: '48px 16px 80px', position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Back */}
        <Link href={`/copas/${copaId}`}
          style={{ fontFamily: FB, color: '#8a7a9a', textDecoration: 'none', fontSize: '14px',
            display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px',
            transition: 'color 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f0e8d6'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#8a7a9a'; }}>
          ← Volver a Copa
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <p className="cosmic-label" style={{ marginBottom: '8px' }}>REGISTRO DE RESULTADOS</p>
          <h1 style={{ fontFamily: FD, fontSize: 'clamp(32px, 6vw, 52px)', color: '#f0e8d6', letterSpacing: '0.06em', lineHeight: 1, marginBottom: '8px' }}>
            📊 SUMAR PUNTOS
          </h1>
          <p style={{ fontFamily: FB, color: '#8a7a9a', fontSize: '14px' }}>{copa.nombre}</p>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          <StatCard label="TOTAL" value={todasPartidas.length} color="#c8992a" />
          <StatCard label="CARGADAS" value={cargadas} color="#26c6c3" />
          <StatCard label="PENDIENTES" value={pendientes} color={pendientes > 0 ? '#a855f7' : '#4a3a5a'} />
        </div>

        {/* Matches table */}
        <div className="game-panel" style={{ overflow: 'hidden' }}>
          {todasPartidas.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontFamily: FB, color: '#4a3a5a', fontSize: '15px' }}>
                No hay partidas en esta copa aún
              </p>
              <p style={{ fontFamily: FB, color: '#2a1a3a', fontSize: '13px', marginTop: '6px' }}>
                Crea una partida para comenzar
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(200,153,42,0.15)', background: 'rgba(200,153,42,0.03)' }}>
                    {['Pos', 'Fecha', 'Estado', 'Acción'].map((h, i) => (
                      <th key={i} style={{
                        fontFamily: FM, fontSize: '10px', letterSpacing: '0.2em', color: '#4a3a5a',
                        padding: '14px 16px', textAlign: i === 0 ? 'center' : i === 3 ? 'center' : 'left',
                        fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todasPartidas.map((partida) => (
                    <MatchRow key={partida.matchId} partida={partida} onSelect={setSelectedMatch} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hint */}
        {todasPartidas.length > 0 && (
          <div style={{
            marginTop: '16px', padding: '12px 18px',
            background: 'rgba(17,13,30,0.5)', border: '1px solid rgba(200,153,42,0.1)',
            borderRadius: '6px',
          }}>
            <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', letterSpacing: '0.08em' }}>
              💡 Las partidas ya cargadas pueden editarse. Los cambios recalculan el ranking de la copa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="game-panel" style={{ padding: '16px', textAlign: 'center' }}>
      <p style={{ fontFamily: FM, fontSize: '28px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>{value}</p>
      <p style={{ fontFamily: FM, fontSize: '10px', letterSpacing: '0.2em', color: '#4a3a5a' }}>{label}</p>
    </div>
  );
}

function MatchRow({ partida, onSelect }) {
  const cargada = partida.estado === 'cargada';
  const fecha = partida.fechaJuego
    ? new Date(partida.fechaJuego).toLocaleDateString('es-AR', {
        weekday: 'short', day: 'numeric', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Sin fecha';

  return (
    <tr
      style={{ borderBottom: '1px solid rgba(200,153,42,0.06)', transition: 'background 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,153,42,0.04)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      onClick={() => onSelect(partida)}>
      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '32px', height: '32px', borderRadius: '50%',
          background: cargada ? 'rgba(38,198,195,0.1)' : 'rgba(168,85,247,0.1)',
          border: `1px solid ${cargada ? 'rgba(38,198,195,0.25)' : 'rgba(168,85,247,0.25)'}`,
          fontFamily: FM, fontSize: '13px', fontWeight: 700,
          color: cargada ? '#26c6c3' : '#a855f7',
        }}>
          {partida.posicion}
        </span>
      </td>
      <td style={{ padding: '14px 16px', fontFamily: FB, fontSize: '13px', color: '#8a7a9a' }}>
        {fecha}
      </td>
      <td style={{ padding: '14px 16px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '5px',
          padding: '4px 10px', borderRadius: '20px',
          background: cargada ? 'rgba(38,198,195,0.08)' : 'rgba(255,185,0,0.08)',
          border: `1px solid ${cargada ? 'rgba(38,198,195,0.2)' : 'rgba(255,185,0,0.2)'}`,
          fontFamily: FM, fontSize: '10px', letterSpacing: '0.1em',
          color: cargada ? '#26c6c3' : '#ffb900',
        }}>
          {cargada ? '✓ CARGADA' : '⏳ PENDIENTE'}
        </span>
      </td>
      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
        <button
          onClick={e => { e.stopPropagation(); onSelect(partida); }}
          style={{
            padding: '6px 18px',
            background: cargada ? 'rgba(200,153,42,0.08)' : 'rgba(38,198,195,0.08)',
            border: `1px solid ${cargada ? 'rgba(200,153,42,0.3)' : 'rgba(38,198,195,0.3)'}`,
            borderRadius: '5px',
            color: cargada ? '#c8992a' : '#26c6c3',
            fontFamily: FD, fontSize: '13px', letterSpacing: '0.1em',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = ''; }}>
          {cargada ? 'EDITAR' : 'CARGAR'}
        </button>
      </td>
    </tr>
  );
}
