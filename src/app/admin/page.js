'use client';

import { useState } from 'react';
import AdminEstadisticas from '@/components/admin/AdminEstadisticas';
import AdminJugadores from '@/components/admin/AdminJugadores';
import AdminPartidas from '@/components/admin/AdminPartidas';
import AdminCopas from '@/components/admin/AdminCopas';
import AdminLigas from '@/components/admin/AdminLigas';
import AdminCargarPartidas from '@/components/admin/AdminCargarPartidas';
import AdminGenerarPartidas from '@/components/admin/AdminGenerarPartidas';
import AdminEstadisticasLCE from '@/components/admin/AdminEstadisticasLCE';
import AdminSeedCopaHistorica from '@/components/admin/AdminSeedCopaHistorica';
import OrganizerPanel from '@/components/admin/OrganizerPanel';

const FD = "var(--font-display, 'Bebas Neue', Impact, sans-serif)";
const FB = "var(--font-body, 'Exo 2', sans-serif)";
const FM = "var(--font-mono, 'Space Mono', monospace)";

export default function AdminPage() {
  const [pestanaActiva, setPestanaActiva] = useState('organizador');

  const pestanas = [
    { id: 'organizador', nombre: '🎯 Organizador', icono: '🎯' },
    { id: 'estadisticas', nombre: '📊 Estadísticas', icono: '📊' },
    { id: 'jugadores', nombre: '👥 Jugadores', icono: '👥' },
    { id: 'partidas', nombre: '🎮 Partidas', icono: '🎮' },
    { id: 'copas', nombre: '🏆 Copas', icono: '🏆' },
    { id: 'ligas', nombre: '⚽ Ligas', icono: '⚽' },
    { id: 'cargarPartidas', nombre: '📥 Cargar Partidas', icono: '📥' },
    { id: 'generarPartidas', nombre: '🎲 Generar Prueba', icono: '🎲' },
    { id: 'estadisticasLCE', nombre: '📋 Liga LCE', icono: '📋' },
    { id: 'seedCopaHistorica', nombre: '🗂️ Copa Histórica', icono: '🗂️' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#09060f' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(200,153,42,0.08) 0%, rgba(17,13,30,0.95) 60%)',
        borderBottom: '1px solid rgba(200,153,42,0.12)',
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <p style={{ fontFamily: FM, fontSize: '10px', letterSpacing: '0.2em', color: '#4a3a5a', marginBottom: '8px' }}>
            PANEL DE CONTROL
          </p>
          <h1 style={{ fontFamily: FD, fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '0.06em', color: '#f0e8d6', lineHeight: 1 }}>
            ⚙️ ADMINISTRADOR
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 16px 80px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
          {pestanas.map(pestana => {
            const isActive = pestanaActiva === pestana.id;
            return (
              <button
                key={pestana.id}
                onClick={() => setPestanaActiva(pestana.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontFamily: FD,
                  fontSize: '13px',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: isActive
                    ? '1px solid rgba(200,153,42,0.4)'
                    : '1px solid rgba(255,255,255,0.07)',
                  background: isActive
                    ? 'rgba(200,153,42,0.12)'
                    : 'rgba(255,255,255,0.02)',
                  color: isActive ? '#c8992a' : '#4a3a5a',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = '#8a7a9a';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                    e.currentTarget.style.color = '#4a3a5a';
                  }
                }}
              >
                {pestana.nombre}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div>
          {pestanaActiva === 'organizador'      && <OrganizerPanel />}
          {pestanaActiva === 'estadisticas'     && <LegacyWrapper><AdminEstadisticas /></LegacyWrapper>}
          {pestanaActiva === 'jugadores'        && <LegacyWrapper><AdminJugadores /></LegacyWrapper>}
          {pestanaActiva === 'partidas'         && <LegacyWrapper><AdminPartidas /></LegacyWrapper>}
          {pestanaActiva === 'copas'            && <LegacyWrapper><AdminCopas /></LegacyWrapper>}
          {pestanaActiva === 'ligas'            && <LegacyWrapper><AdminLigas /></LegacyWrapper>}
          {pestanaActiva === 'cargarPartidas'   && <LegacyWrapper><AdminCargarPartidas /></LegacyWrapper>}
          {pestanaActiva === 'generarPartidas'  && <LegacyWrapper><AdminGenerarPartidas /></LegacyWrapper>}
          {pestanaActiva === 'estadisticasLCE'  && <LegacyWrapper><AdminEstadisticasLCE /></LegacyWrapper>}
          {pestanaActiva === 'seedCopaHistorica'&& <LegacyWrapper><AdminSeedCopaHistorica /></LegacyWrapper>}
        </div>
      </div>
    </div>
  );
}

/* Wrap legacy white-bg admin panels so they don't clash with the dark page */
function LegacyWrapper({ children }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '10px',
      padding: '24px',
      border: '1px solid rgba(200,153,42,0.1)',
    }}>
      {children}
    </div>
  );
}
