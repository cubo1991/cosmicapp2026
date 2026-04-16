'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useStore } from '@/store/useStore';

/**
 * Crear una partida en Firestore
 * Soporta ambos formatos:
 * - Nuevo: { jugadores: { playerId: { coloniasInternas, coloniasExternas, ... } } }
 * - Antiguo: { jugadores: [{ nombre, color, aliens }] }
 */
export const createMatch = async (matchData) => {
  try {
    if (!matchData || !matchData.jugadores) {
      throw new Error('Datos de partida inválidos');
    }

    // Crear datos para Firestore
    const datosPartida = {
      nombre: matchData.nombre || 'Partida sin nombre',
      copId: matchData.copId || null,
      ligaId: matchData.ligaId || null,
      estado: 'activa',
      fechaCreacion: serverTimestamp(),
      fechaFinalizacion: null,
      jugadores: matchData.jugadores, // Puede ser array o object
    };

    // Agregar a Firestore
    const docRef = await addDoc(collection(db, 'matches'), datosPartida);

    // Actualizar store global
    useStore.getState().setCodigoPartida(docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('Error creando partida:', error);
    throw error;
  }
};

/**
 * Servicio de Matches - Gestión de partidas
 */
export const matchService = {
  // Las funcionalidades complejas están en los hooks (useCrearMatch, useMatch)
  // y en scoringService (para resultados y rankings)
};
