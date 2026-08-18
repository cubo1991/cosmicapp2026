'use client';

import { useState, useEffect, useCallback } from 'react';
import { copaService } from '@/services/copaService';

/**
 * Hook para gestionar una copa específica
 */
export function useCopa(copaId) {
  const [copa, setCopa] = useState<Record<string, any> | null>(null);
  const [ranking, setRanking] = useState<Record<string, any>>({});
  const [partidas, setPartidas] = useState([]);
  const [loading, setLoading] = useState(!!copaId);
  const [error, setError] = useState(null);

  // Cargar copa
  useEffect(() => {
    if (!copaId) return;

    const obtenerCopa = async () => {
      try {
        setError(null);
        const datoCopa = await copaService.obtenerPorId(copaId);
        if (datoCopa) {
          setCopa(datoCopa);
          
          // Obtener ranking y partidas
          const rankingDatos = await copaService.obtenerRanking(copaId);
          setRanking(rankingDatos);
          
          const partidasDatos = await copaService.obtenerPartidas(copaId);
          setPartidas(partidasDatos);
        } else {
          setError('Copa no encontrada');
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    obtenerCopa();
  }, [copaId]);

  const actualizarEstado = useCallback(async (nuevoEstado) => {
    try {
      setError(null);
      await copaService.actualizarEstado(copaId, nuevoEstado);
      setCopa(prev => ({ ...prev, estado: nuevoEstado }));
      return { success: true };
    } catch (err) {
      const message = err.message || 'Error actualizando estado';
      setError(message);
      return { success: false, error: message };
    }
  }, [copaId]);

  return {
    copa,
    ranking,
    partidas,
    loading,
    error,
    actualizarEstado
  };
}

/**
 * Hook para lista de copas
 */
export function useCopas() {
  const [copas, setCopas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar copas
  useEffect(() => {
    const obtenerCopas = async () => {
      try {
        setError(null);
        const datosCopas = await copaService.obtenerTodas();
        setCopas(datosCopas);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    obtenerCopas();
  }, []);

  const crear = useCallback(async (nombre, descripcion, fechaInicio, fechaFin, reglas) => {
    try {
      setError(null);
      
      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre de la copa es requerido');
      }

      if (!fechaInicio || !fechaFin) {
        throw new Error('Fechas requeridas');
      }

      if (new Date(fechaInicio) >= new Date(fechaFin)) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      const nuevaCopa = await copaService.crear(nombre, descripcion, fechaInicio, fechaFin, reglas);
      setCopas(prev => [...prev, nuevaCopa]);
      
      return { success: true, copa: nuevaCopa };
    } catch (err) {
      const message = err.message || 'Error creando copa';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  return {
    copas,
    loading,
    error,
    crear
  };
}
