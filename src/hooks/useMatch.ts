'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { scoringService } from '@/services/scoringService';
import { copaService } from '@/services/copaService';
import { ligaService } from '@/services/ligaService';
import { rankingService } from '@/services/rankingService';

/**
 * Hook para gestionar una partida específica
 */
export function useMatch(matchId) {
  const [match, setMatch] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const obtenerMatch = async () => {
      if (!matchId) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        setError(null);
        const docRef = doc(db, 'matches', matchId);
        const docSnap = await getDoc(docRef);
        if (cancelled) return;

        if (docSnap.exists()) {
          setMatch({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Partida no encontrada');
        }
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    };

    obtenerMatch();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  /**
   * Finaliza la partida delegando en la Cloud Function, igual que el resto de
   * la app.
   *
   * Antes esta función tenía su propia copia del cálculo, con un bug: sumaba
   * `datos.puntos` al ranking de la copa cuando `puntos` es un objeto
   * `{colonias, victoria, total}`, lo que daba NaN. No explotaba porque el
   * único componente que la usaba (CargaResultados) no está montado en ninguna
   * pantalla. Se deja delegando para que no exista un segundo camino de
   * escritura que se saltee la función.
   */
  const finalizarPartida = useCallback(async (resultados) => {
    try {
      setError(null);
      const respuesta = await scoringService.finalizarPartidaConCopa(matchId, resultados);

      setMatch(prev => ({
        ...prev,
        estado: 'finalizada',
        jugadores: respuesta.puntos,
        resumen: respuesta.resumen
      }));

      return { success: true, puntos: respuesta.puntos };
    } catch (err) {
      const message = err.message || 'Error finalizando partida';
      setError(message);
      return { success: false, error: message };
    }
  }, [matchId]);

  return {
    match,
    loading,
    error,
    finalizarPartida
  };
}

/**
 * Hook para crear una nueva partida
 */
export function useCrearMatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const crear = useCallback(async (nombre, jugadores, copId = null, ligaId = null) => {
    try {
      setLoading(true);
      setError(null);

      if (!nombre || nombre.trim().length === 0) {
        throw new Error('El nombre de la partida es requerido');
      }

      if (!jugadores || jugadores.length < 2) {
        throw new Error('Mínimo 2 jugadores requeridos');
      }

      if (new Set(jugadores).size !== jugadores.length) {
        throw new Error('No se pueden repetir jugadores');
      }

      // Crear datos de jugadores
      const datosJugadores = {};
      jugadores.forEach(playerId => {
        datosJugadores[playerId] = {
          nombre: '',
          coloniasInternas: 0,
          coloniasExternas: 0,
          esGanador: false,
          puntos: 0,
          posicion: 0
        };
      });

      // Agregar a Firestore
      const docRef = await addDoc(collection(db, 'matches'), {
        nombre,
        copId: copId || null,
        ligaId: ligaId || null,
        estado: 'activa',
        fechaCreacion: serverTimestamp(),
        fechaFinalizacion: null,
        jugadores: datosJugadores
      });

      // Si está en una copa, agregarla
      if (copId) {
        await copaService.agregarPartida(copId, docRef.id);
      }

      // Si está en una liga, agregarla
      if (ligaId) {
        await ligaService.agregarPartida(ligaId, docRef.id);
      }

      setLoading(false);
      return { success: true, matchId: docRef.id };
    } catch (err) {
      const message = err.message || 'Error creando partida';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  }, []);

  return { crear, loading, error };
}
