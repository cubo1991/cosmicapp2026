'use client';

import { useState, useEffect, useCallback } from 'react';
import { playerService } from '@/services/playerService';

/**
 * Hook para gestionar jugadores
 */
export function usePlayer(playerId = null) {
  const [player, setPlayer] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(!!playerId);
  const [error, setError] = useState(null);

  // Si tenemos un playerId, suscribirse en tiempo real
  useEffect(() => {
    if (!playerId) return;
    
    const unsub = playerService.subscribeToPlayer(
      playerId,
      (data) => {
        setPlayer(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, [playerId]);

  const actualizar = useCallback(async (datos) => {
    try {
      setError(null);
      await playerService.actualizar(playerId, datos);
      return { success: true };
    } catch (err) {
      const message = err.message || 'Error actualizando jugador';
      setError(message);
      return { success: false, error: message };
    }
  }, [playerId]);

  return {
    player,
    loading,
    error,
    actualizar
  };
}

/**
 * Hook para lista de jugadores
 */
export function usePlayers() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = playerService.subscribeToAll(
      (data) => {
        setPlayers(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, []);

  const crear = useCallback(async (nombre, email, avatar = '') => {
    try {
      setError(null);
      const nuevoJugador = await playerService.crear(nombre, email, avatar);
      return { success: true, jugador: nuevoJugador };
    } catch (err) {
      const message = err.message || 'Error creando jugador';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  return {
    players,
    loading,
    error,
    crear
  };
}
