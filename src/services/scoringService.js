'use client';

import {
  collection,
  doc,
  updateDoc,
  getDocs,
  query,
  where,
  getDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Servicio de Cálculo de Puntos y Scoring
 * Lógica centralizada para cálculo de puntos
 */
export const scoringService = {
  /**
   * Calcular puntos para un jugador en una partida
   * 
   * Fórmula:
   * - Puntos Colonias = (internas × 1) + (externas × 2)
   * - Puntos Victoria = (total jugadores) / (cantidad ganadores)
   * - Puntos Totales = Puntos Colonias + Puntos Victoria (si es ganador)
   */
  calcularPuntosJugador(coloniasInternas, coloniasExternas, esGanador, puntosVictoria) {
    const puntosColonias = (coloniasInternas * 1) + (coloniasExternas * 2);
    const puntosTotales = puntosColonias + (esGanador ? puntosVictoria : 0);
    
    return {
      puntosColonias,
      puntosVictoria: esGanador ? puntosVictoria : 0,
      puntosTotales
    };
  },

  /**
   * Calcular puntos de victoria
   * Fórmula: totalJugadores / cantidadGanadores
   */
  calcularPuntosVictoria(totalJugadores, cantidadGanadores) {
    if (cantidadGanadores === 0) {
      throw new Error('Debe haber al menos un ganador');
    }
    return totalJugadores / cantidadGanadores;
  },

  /**
   * Procesar resultados de una partida completa
   * Retorna objeto con puntos calculados para cada jugador
   */
  procesarResultadosPartida(jugadoresData) {
    const totalJugadores = Object.keys(jugadoresData).length;
    const ganadores = Object.values(jugadoresData).filter(j => j.esGanador).length;
    
    if (ganadores === 0) {
      throw new Error('Debe haber al menos un ganador');
    }
    
    const puntosVictoria = this.calcularPuntosVictoria(totalJugadores, ganadores);
    
    const resultados = {};
    let posicion = 1;
    
    // Ordenar por puntos de "colonias" primero
    const jugadoresOrdenados = Object.entries(jugadoresData)
      .map(([id, jugador]) => ({
        id,
        ...jugador,
        puntosColonias: (jugador.coloniasInternas * 1) + (jugador.coloniasExternas * 2)
      }))
      .sort((a, b) => b.puntosColonias - a.puntosColonias);
    
    jugadoresOrdenados.forEach(jugador => {
      const { puntosColonias } = jugador;
      const puntosTotales = puntosColonias + (jugador.esGanador ? puntosVictoria : 0);
      
      resultados[jugador.id] = {
        ...jugador,
        puntos: puntosTotales,
        posicion: posicion++,
        puntosDesglose: {
          colonias: puntosColonias,
          victoria: jugador.esGanador ? puntosVictoria : 0,
          total: puntosTotales
        }
      };
    });
    
    return resultados;
  },

  /**
   * Actualizar puntos en Firestore
   * NOTA: En producción, esto debería ser una Cloud Function
   */
  async actualizarPuntosPartida(matchId, jugadoresConPuntos) {
    try {
      const docRef = doc(db, 'matches', matchId);
      await updateDoc(docRef, {
        jugadores: jugadoresConPuntos,
        estado: 'finalizada',
        fechaFinalizacion: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error actualizando puntos de partida:', error);
      throw error;
    }
  },

  /**
   * Actualizar ranking de una copa con los puntos de la partida
   */
  async actualizarRankingCopa(copaId, matchData, jugadoresConPuntos) {
    try {
      const copaRef = doc(db, 'copas', copaId);
      const copaSnap = await getDoc(copaRef);
      
      if (!copaSnap.exists()) {
        throw new Error('Copa no encontrada');
      }
      
      const rankingActual = copaSnap.data().ranking || {};
      const rankingActualizado = { ...rankingActual };
      
      // Actualizar o crear entrada en ranking para cada jugador
      Object.entries(jugadoresConPuntos).forEach(([playerId, datosJugador]) => {
        if (!rankingActualizado[playerId]) {
          rankingActualizado[playerId] = {
            nombreJugador: datosJugador.nombre,
            puntosTotales: 0,
            participaciones: 0,
            posicion: 0,
            historial: []
          };
        }
        
        rankingActualizado[playerId].puntosTotales += datosJugador.puntos;
        rankingActualizado[playerId].participaciones += 1;
        rankingActualizado[playerId].historial.push({
          matchId,
          puntos: datosJugador.puntos,
          fecha: new Date().toISOString()
        });
      });
      
      // Recalcular posiciones
      const rankingOrdenado = Object.entries(rankingActualizado)
        .sort((a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
        .reduce((acc, [key, value], index) => {
          acc[key] = { ...value, posicion: index + 1 };
          return acc;
        }, {});
      
      await updateDoc(copaRef, {
        ranking: rankingOrdenado,
        updatedAt: serverTimestamp()
      });
      
      return rankingOrdenado;
    } catch (error) {
      console.error('Error actualizando ranking de copa:', error);
      throw error;
    }
  },

  /**
   * Actualizar ranking de una liga con los puntos de la partida
   */
  async actualizarRankingLiga(ligaId, matchData, jugadoresConPuntos) {
    try {
      const ligaRef = doc(db, 'ligas', ligaId);
      const ligaSnap = await getDoc(ligaRef);
      
      if (!ligaSnap.exists()) {
        throw new Error('Liga no encontrada');
      }
      
      const rankingActual = ligaSnap.data().ranking || {};
      const rankingActualizado = { ...rankingActual };
      
      // Actualizar o crear entrada en ranking para cada jugador
      Object.entries(jugadoresConPuntos).forEach(([playerId, datosJugador]) => {
        if (!rankingActualizado[playerId]) {
          rankingActualizado[playerId] = {
            nombreJugador: datosJugador.nombre,
            puntosTotales: 0,
            partidas: 0,
            posicion: 0,
            promedio: 0
          };
        }
        
        rankingActualizado[playerId].puntosTotales += datosJugador.puntos;
        rankingActualizado[playerId].partidas += 1;
        rankingActualizado[playerId].promedio = 
          rankingActualizado[playerId].puntosTotales / rankingActualizado[playerId].partidas;
      });
      
      // Recalcular posiciones
      const rankingOrdenado = Object.entries(rankingActualizado)
        .sort((a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
        .reduce((acc, [key, value], index) => {
          acc[key] = { ...value, posicion: index + 1 };
          return acc;
        }, {});
      
      await updateDoc(ligaRef, {
        ranking: rankingOrdenado,
        updatedAt: serverTimestamp()
      });
      
      return rankingOrdenado;
    } catch (error) {
      console.error('Error actualizando ranking de liga:', error);
      throw error;
    }
  },

  /**
   * Actualizar estadísticas del jugador
   */
  async actualizarEstadisticasJugador(playerId, puntosPartida, esGanador) {
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerSnap = await getDoc(playerRef);
      
      if (!playerSnap.exists()) {
        throw new Error('Jugador no encontrado');
      }
      
      const statsActuales = playerSnap.data().stats || {};
      const nuevasPartidas = (statsActuales.partidas || 0) + 1;
      const nuevasVictorias = (statsActuales.victorias || 0) + (esGanador ? 1 : 0);
      const puntosTotales = (statsActuales.puntosPromedio || 0) * (nuevasPartidas - 1) + puntosPartida;
      const nuevoPuntoPromedio = puntosTotales / nuevasPartidas;
      
      await updateDoc(playerRef, {
        'stats.partidas': nuevasPartidas,
        'stats.victorias': nuevasVictorias,
        'stats.puntosPromedio': nuevoPuntoPromedio,
        'stats.ultimaPartida': serverTimestamp()
      });
      
      return {
        partidas: nuevasPartidas,
        victorias: nuevasVictorias,
        puntosPromedio: nuevoPuntoPromedio
      };
    } catch (error) {
      console.error('Error actualizando estadísticas:', error);
      throw error;
    }
  }
};
