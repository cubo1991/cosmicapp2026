'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { scoringService } from '@/services/scoringService';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

// ── Live calculation helpers ──────────────────────────────────────
function calcularTodosLosPuntos(puntos) {
  const participantes = Object.values(puntos).filter(p => p.participó);
  const nParticipantes = participantes.length;
  const nGanadores = participantes.filter(p => p.ganador).length;
  const ptsVictoria = nGanadores > 0 ? nParticipantes / nGanadores : 0;

  const resultado = {};
  Object.entries(puntos).forEach(([id, datos]) => {
    if (!datos.participó) {
      resultado[id] = { colonias: 0, victoria: 0, total: 0 };
    } else {
      const colonias = (datos.CI || 0) + (datos.CE || 0) * 2;
      const victoria = datos.ganador ? ptsVictoria : 0;
      resultado[id] = {
        colonias,
        victoria: parseFloat(victoria.toFixed(2)),
        total: parseFloat((colonias + victoria).toFixed(2)),
      };
    }
  });
  return { resultado, nParticipantes, nGanadores, ptsVictoria };
}

export default function CargaPuntosForm({ matchId, copaId, posicion, onSuccess }) {
  const [match,    setMatch]    = useState(null);
  const [puntos,   setPuntos]   = useState({});
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [enviando, setEnviando] = useState(false);
  const [step,     setStep]     = useState('form'); // 'form' | 'confirm'

  // ── Load match ─────────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        const matchSnap = await getDoc(doc(db, 'matches', matchId));
        if (!matchSnap.exists()) throw new Error('Partida no encontrada');
        const matchData = matchSnap.data();
        setMatch(matchData);

        // Build puntos initial state — include ALL jugadores (with or without playerId)
        const jugadoresList = Array.isArray(matchData.jugadores)
          ? matchData.jugadores.map(j => ({
              key:            j.playerId || j.color || j.nombre,
              playerId:       j.playerId || null,
              nombre:         j.nombre,
              color:          j.color,
              datosExistentes: null,
            }))
          : Object.entries(matchData.jugadores).map(([id, datos]) => ({
              key:            id,
              playerId:       id,
              nombre:         datos.nombre,
              color:          datos.color,
              datosExistentes: datos,
            }));

        const puntosIniciales = {};
        for (const j of jugadoresList) {
          const d = j.datosExistentes;
          puntosIniciales[j.key] = {
            nombre:   j.nombre,
            color:    j.color,
            playerId: j.playerId,
            CI:       d?.coloniasInternas ?? 0,
            CE:       d?.coloniasExternas ?? 0,
            ganador:  d?.esGanador ?? false,
            participó: d?.participó !== false,
          };
        }
        setPuntos(puntosIniciales);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    cargar();
  }, [matchId]);

  // ── Live calc ──────────────────────────────────────────────────
  const calc = useMemo(() => calcularTodosLosPuntos(puntos), [puntos]);

  // ── Handlers ──────────────────────────────────────────────────
  const setCI = (key, val) => setPuntos(p => ({
    ...p, [key]: { ...p[key], CI: Math.max(0, parseInt(val) || 0) }
  }));
  const setCE = (key, val) => setPuntos(p => ({
    ...p, [key]: { ...p[key], CE: Math.max(0, parseInt(val) || 0) }
  }));
  const toggleParticipa = (key) => setPuntos(p => ({
    ...p, [key]: {
      ...p[key],
      participó: !p[key].participó,
      ...(p[key].participó ? {} : { CI: 0, CE: 0, ganador: false }),
    }
  }));
  const toggleGanador = (key) => setPuntos(p => ({
    ...p, [key]: { ...p[key], ganador: p[key].participó ? !p[key].ganador : false }
  }));

  // ── Validate & advance to confirm ─────────────────────────────
  const goToConfirm = (e) => {
    e.preventDefault();
    setError('');
    if (calc.nGanadores === 0) {
      setError('Debe haber al menos un ganador antes de confirmar');
      return;
    }
    setStep('confirm');
  };

  // ── Final submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setEnviando(true);
    setError('');
    try {
      // Use the centralized service which handles match update, copa ranking,
      // auto-close at position 10, and player stats in one atomic flow.
      await scoringService.finalizarPartidaConCopa(matchId, puntos);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar los puntos');
      setStep('form');
    } finally {
      setEnviando(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div className="animate-spin" style={{ fontSize: '28px', marginBottom: '12px' }}>🌌</div>
        <p style={{ fontFamily: FB, color: '#8a7a9a' }}>Cargando jugadores...</p>
      </div>
    );
  }

  if (!match) return (
    <div style={{ padding: '24px', color: '#e63946', fontFamily: FB }}>Partida no encontrada</div>
  );

  const jugadoresKeys = Object.keys(puntos);

  // ── CONFIRM SCREEN ─────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p className="cosmic-label" style={{ marginBottom: '8px' }}>CONFIRMACIÓN</p>
          <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 5vw, 40px)', color: '#f0e8d6', letterSpacing: '0.06em', lineHeight: 1 }}>
            ¿TODO CORRECTO?
          </h2>
          <p style={{ fontFamily: FB, color: '#8a7a9a', fontSize: '13px', marginTop: '8px' }}>
            Partida #{posicion} · {calc.nParticipantes} participantes · {calc.nGanadores} ganador{calc.nGanadores !== 1 ? 'es' : ''}
          </p>
          <p style={{ fontFamily: FM, fontSize: '11px', color: '#4a3a5a', marginTop: '4px' }}>
            Victoria = {calc.nParticipantes}/{calc.nGanadores} = <span style={{ color: '#c8992a' }}>{parseFloat(calc.ptsVictoria.toFixed(2))} pts</span>
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)',
            borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
            color: '#e63946', fontFamily: FB, fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Summary cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {jugadoresKeys.map(key => {
            const d = puntos[key];
            const pts = calc.resultado[key];
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 18px',
                background: d.participó ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                border: `1px solid ${d.ganador ? 'rgba(200,153,42,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '8px',
                opacity: d.participó ? 1 : 0.45,
              }}>
                {d.color && (
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%',
                    background: d.color, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: FB, fontSize: '14px', fontWeight: 600, color: '#f0e8d6', lineHeight: 1 }}>
                    {d.ganador && <span style={{ color: '#c8992a', marginRight: '6px' }}>🏆</span>}
                    {d.nombre}
                  </p>
                  {d.participó && (
                    <p style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', marginTop: '3px' }}>
                      CI×{d.CI} + CE×{d.CE}{d.ganador ? ` + V(${parseFloat(calc.ptsVictoria.toFixed(2))})` : ''}
                    </p>
                  )}
                </div>
                <p style={{
                  fontFamily: FM, fontSize: d.participó ? '22px' : '14px',
                  fontWeight: 700, color: d.ganador ? '#c8992a' : d.participó ? '#f0e8d6' : '#2a1a3a',
                }}>
                  {d.participó ? parseFloat(pts?.total?.toFixed(1) || '0') : 'NO'}
                </p>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => { setStep('form'); setError(''); }}
            disabled={enviando}
            style={{ flex: 1, padding: '13px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', color: '#8a7a9a', fontFamily: FB, fontSize: '14px',
              cursor: 'pointer' }}>
            ← Corregir
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={enviando}
            style={{ flex: 2, padding: '13px',
              background: enviando ? 'rgba(38,198,195,0.05)' : 'linear-gradient(135deg, rgba(38,198,195,0.6), rgba(26,180,180,0.7))',
              border: '1px solid rgba(38,198,195,0.4)', borderRadius: '8px',
              color: '#f0e8d6', fontFamily: FD, fontSize: '20px', letterSpacing: '0.1em',
              cursor: enviando ? 'not-allowed' : 'pointer', transition: 'all 0.25s' }}>
            {enviando ? '⏳ GUARDANDO...' : 'CONFIRMAR ✓'}
          </button>
        </div>
      </div>
    );
  }

  // ── FORM SCREEN ────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p className="cosmic-label" style={{ marginBottom: '8px' }}>
          {posicion ? `PARTIDA #${posicion}` : 'CARGAR RESULTADOS'}
        </p>
        <h2 style={{ fontFamily: FD, fontSize: 'clamp(28px, 5vw, 40px)', color: '#f0e8d6', letterSpacing: '0.06em', lineHeight: 1 }}>
          CARGAR PUNTOS
        </h2>
        {match?.nombre && (
          <p style={{ fontFamily: FB, color: '#8a7a9a', fontSize: '13px', marginTop: '6px' }}>
            {match.nombre}
          </p>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)',
          borderRadius: '6px', padding: '10px 14px', marginBottom: '16px',
          color: '#e63946', fontFamily: FB, fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Victory preview bar */}
      {calc.nGanadores > 0 && (
        <div style={{ padding: '10px 16px', background: 'rgba(200,153,42,0.06)',
          border: '1px solid rgba(200,153,42,0.2)', borderRadius: '6px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FM, fontSize: '11px', color: '#4a3a5a', letterSpacing: '0.1em' }}>VICTORIA:</span>
          <span style={{ fontFamily: FM, fontSize: '14px', fontWeight: 700, color: '#c8992a' }}>
            {calc.nParticipantes} ÷ {calc.nGanadores} = {parseFloat(calc.ptsVictoria.toFixed(2))} pts
          </span>
        </div>
      )}

      <form onSubmit={goToConfirm}>
        {/* Player cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {jugadoresKeys.map(key => {
            const d = puntos[key];
            const pts = calc.resultado[key];
            return (
              <PlayerScoringCard
                key={key}
                keyId={key}
                data={d}
                ptsCalc={pts}
                disabled={false}
                onToggleParticipa={() => toggleParticipa(key)}
                onToggleGanador={() => toggleGanador(key)}
                onChangeCI={(v) => setCI(key, v)}
                onChangeCE={(v) => setCE(key, v)}
              />
            );
          })}
        </div>

        {/* Formula hint */}
        <div style={{ padding: '12px 16px', background: 'rgba(17,13,30,0.5)',
          border: '1px solid rgba(200,153,42,0.1)', borderRadius: '6px', marginBottom: '20px' }}>
          <p style={{ fontFamily: FM, fontSize: '10px', letterSpacing: '0.12em', color: '#4a3a5a' }}>
            FÓRMULA: CI×1 + CE×2 + Victoria(participantes÷ganadores)
          </p>
        </div>

        <button type="submit"
          disabled={calc.nGanadores === 0}
          style={{
            width: '100%', padding: '14px',
            background: calc.nGanadores > 0
              ? 'linear-gradient(135deg, rgba(168,85,247,0.65), rgba(139,92,246,0.8))'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${calc.nGanadores > 0 ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: '8px',
            color: calc.nGanadores > 0 ? '#f0e8d6' : '#2a1a3a',
            fontFamily: FD, fontSize: '20px', letterSpacing: '0.1em',
            cursor: calc.nGanadores > 0 ? 'pointer' : 'not-allowed',
            transition: 'all 0.25s',
          }}>
          {calc.nGanadores === 0 ? 'MARCA AL MENOS UN GANADOR' : 'REVISAR Y CONFIRMAR →'}
        </button>
      </form>
    </div>
  );
}

/* ── Player scoring card ─────────────────────────────────────────── */
function PlayerScoringCard({ keyId, data, ptsCalc, onToggleParticipa, onToggleGanador, onChangeCI, onChangeCE }) {
  const total = data.participó ? (ptsCalc?.total ?? 0) : null;

  return (
    <div style={{
      padding: '16px 18px',
      background: data.participó
        ? data.ganador ? 'rgba(200,153,42,0.05)' : 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.01)',
      border: `1px solid ${data.ganador ? 'rgba(200,153,42,0.25)' : data.participó ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}`,
      borderRadius: '10px',
      opacity: data.participó ? 1 : 0.5,
      transition: 'all 0.2s',
    }}>
      {/* Top row: name + color + participó + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: data.participó ? '14px' : 0 }}>
        {data.color && (
          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: data.color, flexShrink: 0 }} />
        )}
        <p style={{ flex: 1, fontFamily: FB, fontWeight: 600, fontSize: '15px', color: '#f0e8d6', lineHeight: 1 }}>
          {data.nombre}
        </p>

        {/* Participó toggle */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
          title="¿Participó en esta partida?">
          <input type="checkbox" checked={data.participó}
            onChange={onToggleParticipa} className="w-4 h-4 accent-teal-400" />
          <span style={{ fontFamily: FM, fontSize: '10px', color: '#4a3a5a', letterSpacing: '0.08em' }}>
            JUGÓ
          </span>
        </label>

        {/* Live total */}
        {data.participó && (
          <span style={{
            fontFamily: FM, fontSize: '20px', fontWeight: 700, minWidth: '44px', textAlign: 'right',
            color: data.ganador ? '#c8992a' : '#f0e8d6',
          }}>
            {parseFloat(total?.toFixed(1) || '0')}
          </span>
        )}
      </div>

      {/* CI / CE / Winner row */}
      {data.participó && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <SpinnerField label="CI" value={data.CI} onChange={onChangeCI} />
          <SpinnerField label="CE" value={data.CE} onChange={onChangeCE} />

          {/* Ganador */}
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px',
            background: data.ganador ? 'rgba(200,153,42,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${data.ganador ? 'rgba(200,153,42,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s',
            marginLeft: 'auto',
          }}>
            <input type="checkbox" checked={data.ganador}
              onChange={onToggleGanador}
              className="w-4 h-4 accent-yellow-400" />
            <span style={{ fontFamily: FM, fontSize: '11px', letterSpacing: '0.1em',
              color: data.ganador ? '#c8992a' : '#4a3a5a' }}>
              {data.ganador ? '🏆 GANÓ' : 'GANÓ'}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

/* ── Spinner field ────────────────────────────────────────────────── */
function SpinnerField({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontFamily: FM, fontSize: '9px', letterSpacing: '0.15em', color: '#4a3a5a' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
          style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px 0 0 4px',
            color: '#8a7a9a', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>
          −
        </button>
        <input
          type="number" min="0" value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: '36px', height: '28px', textAlign: 'center',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderLeft: 'none', borderRight: 'none',
            color: '#f0e8d6', fontFamily: FM, fontSize: '14px', outline: 'none' }}
        />
        <button type="button" onClick={() => onChange(value + 1)}
          style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0 4px 4px 0',
            color: '#8a7a9a', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>
          +
        </button>
      </div>
    </div>
  );
}
