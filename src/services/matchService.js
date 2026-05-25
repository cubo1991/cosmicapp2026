'use client';

import { addDoc, collection, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useStore } from '@/store/useStore';
import { activeCopaService } from './activeCopaService';

/**
 * Detect or reuse an existing session.
 * A session groups consecutive matches (within 4h) with ≥50% of the same players.
 * Returns a sessionId string.
 */
async function detectOrCreateSession(playerIds, existingSessionId = null) {
  // If caller passes a sessionId (revancha), reuse it directly
  if (existingSessionId) return existingSessionId;
  // If no playerIds, skip
  if (!playerIds || playerIds.length === 0) return `ses_${Date.now()}`;

  try {
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000); // 4 hours ago
    // Simple query — just get recent matches and filter client-side
    // orderBy alone on fechaCreacion needs no composite index
    const q = query(
      collection(db, 'matches'),
      orderBy('fechaCreacion', 'desc'),
      limit(15)
    );
    const snap = await getDocs(q);
    const pidSet = new Set(playerIds);
    for (const d of snap.docs) {
      const m = d.data();
      if (!m.sessionId || !m.fechaCreacion) continue;
      const mDate = m.fechaCreacion.toDate ? m.fechaCreacion.toDate() : new Date(m.fechaCreacion);
      if (mDate < cutoff) continue;
      const mPlayers = Array.isArray(m.jugadores)
        ? m.jugadores.map(j => j.playerId).filter(Boolean)
        : Object.keys(m.jugadores || {});
      const overlap = mPlayers.filter(p => pidSet.has(p)).length;
      const threshold = Math.ceil(Math.min(playerIds.length, mPlayers.length) * 0.5);
      if (overlap >= threshold) return m.sessionId;
    }
  } catch {
    // query failed — just create fresh session
  }
  return `ses_${Date.now()}`;
}

// 6-char uppercase code — avoids 0/O and 1/I confusion
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCodigoCorto = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

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

    const codigoCorto = generateCodigoCorto();

    // Detect or reuse session
    const playerIds = Array.isArray(matchData.jugadores)
      ? matchData.jugadores.map(j => j.playerId).filter(Boolean)
      : Object.keys(matchData.jugadores || {});
    const sessionId = await detectOrCreateSession(playerIds, matchData.sessionId || null);

    // Crear datos para Firestore
    const datosPartida = {
      nombre: matchData.nombre || 'Partida sin nombre',
      codigo: codigoCorto,           // Short human-readable code for sharing
      copId: null, // Se asignará automáticamente SI asociarACopa === true
      ligaId: matchData.ligaId || null,
      estado: 'activa',
      asociarACopa: matchData.asociarACopa !== false, // Default true
      sessionId,
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
    useStore.getState().setCodigoCorto(codigoCorto);

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
