'use client';

import { useState, useEffect, useCallback } from 'react';
import { ligaService } from '@/services/ligaService';

/**
 * Hook para gestionar una liga específica
 */
export function useLiga(ligaId) {
  const [liga, setLiga] = useState<Record<string, any> | null>(null);
  const [ranking, setRanking] = useState<Record<string, any>>({});
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(!!ligaId);
  const [error, setError] = useState(null);

  // Cargar liga
  useEffect(() => {
    if (!ligaId) return;

    const obtenerLiga = async () => {
      try {
        setError(null);
        const datoLiga = await ligaService.obtenerPorId(ligaId);
        if (datoLiga) {
          setLiga(datoLiga);
          
          // Obtener ranking y partidas
          const rankingDatos = await ligaService.obtenerRanking(ligaId);
          setRanking(rankingDatos);
          
          const partidasDatos = await ligaService.obtenerPartidas(ligaId);
          setPartidas(partidasDatos);
        } else {
          setError('Liga no encontrada');
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    obtenerLiga();
  }, [ligaId]);

  const agregarMiembro = useCallback(async (playerId) => {
    try {
      setError(null);

      // Validar que no esté ya en la liga
      if (liga.miembros && liga.miembros.includes(playerId)) {
        throw new Error('Este jugador ya está en la liga');
      }

      // Alta manual por admin — ver docs/PLAN_MULTI_LIGA.md Fase 4.
      await ligaService.agregarMiembroPorAdmin(ligaId, playerId);
      setLiga(prev => ({
        ...prev,
        miembros: [...(prev.miembros || []), playerId]
      }));

      return { success: true };
    } catch (err) {
      const message = err.message || 'Error agregando miembro';
      setError(message);
      return { success: false, error: message };
    }
  }, [ligaId, liga]);

  const removerMiembro = useCallback(async (playerId) => {
    try {
      setError(null);
      await ligaService.removerMiembro(ligaId, playerId);
      setLiga(prev => ({
        ...prev,
        miembros: prev.miembros.filter(id => id !== playerId)
      }));
      
      return { success: true };
    } catch (err) {
      const message = err.message || 'Error removiendo miembro';
      setError(message);
      return { success: false, error: message };
    }
  }, [ligaId]);

  const actualizarEstado = useCallback(async (nuevoEstado) => {
    try {
      setError(null);
      await ligaService.actualizarEstado(ligaId, nuevoEstado);
      setLiga(prev => ({ ...prev, estado: nuevoEstado }));
      return { success: true };
    } catch (err) {
      const message = err.message || 'Error actualizando estado';
      setError(message);
      return { success: false, error: message };
    }
  }, [ligaId]);

  return {
    liga,
    ranking,
    partidas,
    loading,
    error,
    agregarMiembro,
    removerMiembro,
    actualizarEstado
  };
}

/**
 * Hook para lista de ligas
 */
export function useLigas() {
  const [ligas, setLigas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar ligas
  useEffect(() => {
    const obtenerLigas = async () => {
      try {
        setError(null);
        const datosLigas = await ligaService.obtenerTodas();
        setLigas(datosLigas);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    obtenerLigas();
  }, []);

  const crear = useCallback(async (nombre, descripcion) => {
    try {
      setError(null);

      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre de la liga es requerido');
      }

      // Solo un admin puede crear una liga — lo valida la Cloud Function.
      const nuevaLiga = await ligaService.crear(nombre, descripcion);
      setLigas(prev => [...prev, nuevaLiga]);

      return { success: true, liga: nuevaLiga };
    } catch (err) {
      const message = err.message || 'Error creando liga';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  return {
    ligas,
    loading,
    error,
    crear
  };
}
