'use client';

import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { rankingService } from './rankingService';

/**
 * 🔄 Servicio de Carga Bulk de Partidas
 * Para migración de datos y carga manual desde otro sistema
 */
export const bulkMatchService = {
  /**
   * Cargar una partida manual y registrarla en el ranking
   * 
   * Parámetros:
   * - matchData: {
   *     nombre: string,
   *     fecha: Date,
   *     jugadores: { playerId: { nombre, puntos, esGanador } }
   *   }
   * 
   * Retorna: { success, matchId, mensaje }
   */
  async cargarPartidaManual(matchData: any) {
    try {
      const { nombre, fecha } = matchData;
      const jugadores: Record<string, any> = matchData.jugadores || {};

      // Validaciones más específicas
      if (!nombre || typeof nombre !== 'string' || nombre.trim() === '') {
        throw new Error('El nombre de la partida es requerido y no puede estar vacío');
      }

      if (!jugadores || typeof jugadores !== 'object') {
        throw new Error('Los datos de jugadores son requeridos');
      }

      const jugadoresKeys = Object.keys(jugadores);
      if (jugadoresKeys.length === 0) {
        throw new Error('Debe haber al menos un jugador en la partida');
      }

      // Validar que todos los jugadores tengan puntos
      const jugadoresInvalidos = Object.entries(jugadores).filter(
        ([playerId, datos]) => {
          if (!playerId || typeof playerId !== 'string' || playerId.trim() === '') {
            return true; // ID inválido
          }
          if (!datos.nombre || typeof datos.nombre !== 'string' || datos.nombre.trim() === '') {
            return true; // Nombre inválido
          }
          if (typeof datos.puntos !== 'number' || datos.puntos < 0) {
            return true; // Puntos inválidos
          }
          return false;
        }
      );

      if (jugadoresInvalidos.length > 0) {
        throw new Error(`Algunos jugadores tienen datos inválidos: ${jugadoresInvalidos.map(([id]) => id).join(', ')}`);
      }

      const batch = writeBatch(db);
      const matchId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fechaPartida = fecha || new Date();

      // PASO 1: Crear documento de partida
      const matchRef = doc(collection(db, 'matches'), matchId);
      batch.set(matchRef, {
        nombre,
        copId: null,
        ligaId: null,
        estado: 'finalizada',
        esManual: true, // Marcador para datos migrados
        fechaCreacion: fechaPartida,
        fechaFinalizacion: fechaPartida,
        jugadores: Object.entries(jugadores).reduce((acc, [playerId, datos]) => {
          acc[playerId] = {
            nombre: datos.nombre,
            coloniasInternas: datos.coloniasInternas || 0,
            coloniasExternas: datos.coloniasExternas || 0,
            esGanador: datos.esGanador || false,
            participó: true,
            puntos: {
              colonias: datos.puntosColonias || 0,
              victoria: (datos.esGanador ? datos.puntos : 0) - (datos.puntosColonias || 0),
              total: datos.puntos || 0
            }
          };
          return acc;
        }, {})
      });

      // PASO 2: Registrar partida para cada jugador
      Object.entries(jugadores).forEach(([playerId, datos]) => {
        const matchSubcolRef = doc(
          db,
          'players',
          playerId,
          'lastMatches',
          matchId
        );

        batch.set(matchSubcolRef, {
          matchId,
          puntos: datos.puntos || 0,
          esGanador: datos.esGanador || false,
          participó: true,
          esManual: true,
          createdAt: fechaPartida
        });
      });

      // PASO 3: Actualizar stats de jugadores
      for (const [playerId, datos] of Object.entries(jugadores)) {
        const playerRef = doc(db, 'players', playerId);
        const playerSnap = await getDoc(playerRef);

        if (playerSnap.exists()) {
          const statsActuales = playerSnap.data().stats || {};
          const nuevasPartidas = (statsActuales.partidas || 0) + 1;
          const nuevasVictorias = (statsActuales.victorias || 0) + (datos.esGanador ? 1 : 0);
          const puntosTotales = (statsActuales.puntosPromedio || 0) * (nuevasPartidas - 1) + (datos.puntos || 0);
          const nuevoPuntoPromedio = puntosTotales / nuevasPartidas;

          batch.update(playerRef, {
            'stats.partidas': nuevasPartidas,
            'stats.victorias': nuevasVictorias,
            'stats.puntosPromedio': parseFloat(nuevoPuntoPromedio.toFixed(2)),
            'stats.ultimaPartida': fechaPartida
          });
        }
      }

      await batch.commit();
      console.log(`✓ Partida manual ${matchId} registrada`);

      // PASO 4: Actualizar ranking global para cada jugador
      for (const playerId of Object.keys(jugadores)) {
        try {
          await rankingService.actualizarLast10Score(playerId);
        } catch (err) {
          console.warn(`⚠️ Error actualizando ranking para ${playerId}:`, err);
        }
      }

      return {
        success: true,
        matchId,
        mensaje: `Partida "${nombre}" cargada exitosamente`
      };
    } catch (error) {
      console.error('Error cargando partida manual:', error);
      throw error;
    }
  },

  /**
   * Cargar múltiples partidas desde CSV o array
   * 
   * Formato esperado:
   * {
   *   partidas: [
   *     {
   *       nombre: "Partida 1",
   *       fecha: "2026-04-20T10:00:00Z",
   *       jugadores: {
   *         "userId1": { nombre: "Juan", puntos: 8.5, esGanador: true },
   *         "userId2": { nombre: "María", puntos: 5.2, esGanador: false }
   *       }
   *     }
   *   ]
   * }
   */
  async cargarPartidas(data) {
    const { partidas } = data;

    if (!Array.isArray(partidas) || partidas.length === 0) {
      throw new Error('Debes proporcionar un array de partidas');
    }

    const resultados = {
      exitosas: 0,
      fallidas: 0,
      errores: [],
      matchIds: []
    };

    for (let i = 0; i < partidas.length; i++) {
      try {
        const resultado = await this.cargarPartidaManual(partidas[i]);
        resultados.exitosas++;
        resultados.matchIds.push(resultado.matchId);
      } catch (error) {
        resultados.fallidas++;
        resultados.errores.push({
          indice: i,
          nombre: partidas[i].nombre,
          error: error.message
        });
      }
    }

    return resultados;
  },

  /**
   * Parsear CSV y convertir a formato de partidas
   * Formato CSV esperado:
   * partida_nombre,fecha,jugador_id,jugador_nombre,puntos,es_ganador
   */
  parseCSV(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const partidasMap = new Map();

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });

      const {
        partida_nombre,
        fecha,
        jugador_id,
        jugador_nombre,
        puntos,
        es_ganador
      } = row;

      if (!partidasMap.has(partida_nombre)) {
        partidasMap.set(partida_nombre, {
          nombre: partida_nombre,
          fecha: new Date(fecha),
          jugadores: {}
        });
      }

      const partida = partidasMap.get(partida_nombre);
      partida.jugadores[jugador_id] = {
        nombre: jugador_nombre,
        puntos: parseFloat(puntos),
        esGanador: es_ganador === 'true' || es_ganador === '1' || es_ganador === 'sí'
      };
    }

    return Array.from(partidasMap.values());
  }
};
