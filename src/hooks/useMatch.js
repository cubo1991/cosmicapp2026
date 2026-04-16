'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { scoringService } from '@/services/scoringService';
import { copaService } from '@/services/copaService';
import { ligaService } from '@/services/ligaService';

/**
 * Hook para gestionar una partida específica
 */
export function useMatch(matchId) {
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }
    
    const obtenerMatch = async () => {
      try {
        setError(null);
        const docRef = doc(db, 'matches', matchId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMatch({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Partida no encontrada');
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    obtenerMatch();
  }, [matchId]);

  const finalizarPartida = useCallback(async (resultados) => {
    try {
      setError(null);
      
      // Procesar resultados y calcular puntos
      const jugadoresConPuntos = scoringService.procesarResultadosPartida(resultados);
      
      // Actualizar partida
      const docRef = doc(db, 'matches', matchId);
      await updateDoc(docRef, {
        jugadores: jugadoresConPuntos,
        estado: 'finalizada',
        fechaFinalizacion: serverTimestamp()
      });

      // Actualizar rankings si es necesario
      if (match.copId) {
        await scoringService.actualizarRankingCopa(match.copId, match, jugadoresConPuntos);
      }
      
      if (match.ligaId) {
        await scoringService.actualizarRankingLiga(match.ligaId, match, jugadoresConPuntos);
      }

      // Actualizar estadísticas de jugadores
      for (const [playerId, datos] of Object.entries(jugadoresConPuntos)) {
        await scoringService.actualizarEstadisticasJugador(playerId, datos.puntos, datos.esGanador);
      }

      setMatch(prev => ({ ...prev, estado: 'finalizada', jugadores: jugadoresConPuntos }));
      
      return { success: true, puntos: jugadoresConPuntos };
    } catch (err) {
      const message = err.message || 'Error finalizando partida';
      setError(message);
      return { success: false, error: message };
    }
  }, [matchId, match]);

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
