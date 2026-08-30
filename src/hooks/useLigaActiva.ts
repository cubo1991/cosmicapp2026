'use client';

import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { ligaService } from '@/services/ligaService';

const KEY_LIGA_ACTIVA = 'cosmicapp_ligaActivaId';

/**
 * Liga "activa" del navegador: la que se usa al crear una partida y la que
 * se muestra por defecto. No depende de estar logueado — la web navega
 * anónima para el uso normal (ver useFirebaseAuth), así que esto es una
 * preferencia del dispositivo, no de una cuenta. Ver docs/PLAN_MULTI_LIGA.md
 * Fase 5.
 *
 * Mientras exista una sola liga (hoy), el selector ni se muestra: todo cae en
 * LIGA_POR_DEFECTO, igual que ya hacen las Cloud Functions.
 */
export const LIGA_POR_DEFECTO = 'liga1';

export function useLigaActiva() {
  const ligaActual = useStore((s) => s.ligaActual);
  const setLigaActual = useStore((s) => s.setLigaActual);
  const [ligasActivas, setLigasActivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const todas = await ligaService.obtenerTodas();
        const activas = todas.filter((l: any) => l.estado === 'activa');
        if (cancelado) return;
        setLigasActivas(activas);

        const guardada = typeof window !== 'undefined' ? localStorage.getItem(KEY_LIGA_ACTIVA) : null;
        const elegida =
          activas.find((l: any) => l.id === guardada) ||
          activas.find((l: any) => l.id === LIGA_POR_DEFECTO) ||
          activas[0] ||
          null;
        setLigaActual(elegida);
      } catch (err) {
        console.error('Error cargando ligas activas:', err);
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [setLigaActual]);

  const cambiarLiga = useCallback(
    (ligaId: string) => {
      const liga = ligasActivas.find((l) => l.id === ligaId) || null;
      setLigaActual(liga);
      if (typeof window !== 'undefined' && liga) {
        localStorage.setItem(KEY_LIGA_ACTIVA, liga.id);
      }
    },
    [ligasActivas, setLigaActual]
  );

  return {
    ligaActivaId: ligaActual?.id || LIGA_POR_DEFECTO,
    ligaActual,
    ligasActivas,
    loading,
    cambiarLiga,
    mostrarSelector: ligasActivas.length > 1,
  };
}
