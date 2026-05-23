'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useStore } from '@/store/useStore';
import { activeCopaService } from './activeCopaService';

/**
 * Crear una partida en Firestore
 * AUTOMÁTICAMENTE:
 * 1. Crea la partida
 * 2. Si asociarACopa === true, la asigna a la copa activa
 * 
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
      copId: null, // Se asignará automáticamente SI asociarACopa === true
      ligaId: matchData.ligaId || null,
      estado: 'activa',
      asociarACopa: matchData.asociarACopa !== false, // Default true
      fechaCreacion: serverTimestamp(),
      fechaFinalizacion: null,
      jugadores: matchData.jugadores, // Puede ser array o object
    };

    // PASO 1: Agregar partida a Firestore
    const docRef = await addDoc(collection(db, 'matches'), datosPartida);

    // PASO 2: AUTOMÁTICAMENTE asignar a copa SOLO SI asociarACopa === true
    if (datosPartida.asociarACopa) {
      try {
        const resultadoCopa = await activeCopaService.agregarPartidaAutomatica(
          docRef.id,
          new Date()
        );
        console.log('✓ Partida agregada a copa:', resultadoCopa.copaNombre, `(pos ${resultadoCopa.posicion})`);
      } catch (error) {
        console.warn('⚠️ No se pudo asignar copa automáticamente:', error.message);
        // No lanzar error, la partida ya fue creada
      }
    } else {
      console.log('✓ Partida creada SIN suma a copa (visitantes)');
    }

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
