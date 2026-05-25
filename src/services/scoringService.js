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
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { rankingService } from '@/services/rankingService';
import { activeCopaService } from '@/services/activeCopaService';

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
   * VERSIÓN MEJORADA: Diferencia jugadores que PARTICIPARON vs NO PARTICIPARON
   * 
   * Input: { 
   *   player1: { nombre, CI, CE, ganador, participó },
   *   player2: { nombre, CI, CE, ganador, participó }
   * }
   */
  procesarResultadosPartida(datosFormulario) {
    // PASO 1: Identificar participantes (tienen CI o CE > 0, o flag participó = true)
    const participantes = Object.entries(datosFormulario)
      .filter(([_, datos]) => {
        // Participa si: flag explícito O tiene colonias
        return datos.participó === true || (datos.CI || 0) > 0 || (datos.CE || 0) > 0;
      })
      .map(([id, datos]) => ({
        id,
        nombre: datos.nombre,
        CI: datos.CI || 0,
        CE: datos.CE || 0,
        ganador: datos.ganador || false,
        puntosColonias: ((datos.CI || 0) * 1) + ((datos.CE || 0) * 2)
      }));

    // Validación: debe haber al menos 1 participante
    if (participantes.length === 0) {
      throw new Error('Debe haber al menos 1 jugador participante');
    }

    // PASO 2: Contar ganadores ENTRE PARTICIPANTES
    const ganadores = participantes.filter(p => p.ganador).length;
    if (ganadores === 0) {
      throw new Error('Debe haber al menos un ganador');
    }

    // PASO 3: Calcular puntos victoria basado en participantes
    const puntosVictoria = participantes.length / ganadores;

    // PASO 4: Construir resultado final
    const resultados = {};

    // Agregar participantes con cálculo de puntos
    participantes.forEach((p) => {
      const puntosTotales = p.puntosColonias + (p.ganador ? puntosVictoria : 0);
      resultados[p.id] = {
        nombre: p.nombre,
        coloniasInternas: p.CI,
        coloniasExternas: p.CE,
        esGanador: p.ganador,
        participó: true,
        puntos: {
          colonias: p.puntosColonias,
          victoria: p.ganador ? puntosVictoria : 0,
          total: puntosTotales
        }
      };
    });

    // PASO 5: Agregar NO PARTICIPANTES (para auditoría y ranking posterior)
    Object.entries(datosFormulario).forEach(([id, datos]) => {
      if (!resultados[id]) {
        resultados[id] = {
          nombre: datos.nombre,
          coloniasInternas: 0,
          coloniasExternas: 0,
          esGanador: false,
          participó: false,
          puntos: {
            colonias: 0,
            victoria: 0,
            total: 0
          }
        };
      }
    });

    // Retornar con resumen
    return {
      resultados,
      resumen: {
        totalParticipantes: participantes.length,
        totalGanadores: ganadores,
        puntosVictoria: parseFloat(puntosVictoria.toFixed(2))
      }
    };
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
   * Actualizar ranking de copa CON CONTROL DE PARTICIPACIÓN Y AUDITORÍA
   * Usado por la nueva funcionalidad de "Sumar Puntos"
   * 
   * Parámetros:
   * - copaId: ID de la copa
   * - posicion: número de posición de la partida en la copa (1-10)
   * - matchId: ID de la partida
   * - jugadoresConPuntos: objeto con resultados de procesarResultadosPartida
   */
  async actualizarRankingCopaSeguro(copaId, posicion, matchId, jugadoresConPuntos) {
    try {
      const copaRef = doc(db, 'copas', copaId);
      const copaSnap = await getDoc(copaRef);
      
      if (!copaSnap.exists()) {
        throw new Error('Copa no encontrada');
      }
      
      const copa = copaSnap.data();
      const ranking = copa.ranking || {};
      
      // Validar que no haya duplicados en el historial de ediciones
      // (para detectar cambios no autorizados)
      const isEdicion = copa.partidas?.some(p => p.posicion === posicion && p.estado === 'cargada');
      
      // Actualizar ranking con lógica de PARTICIPACIÓN
      const jugadoresActualizados = { ...ranking };
      
      Object.entries(jugadoresConPuntos).forEach(([playerId, datos]) => {
        if (!jugadoresActualizados[playerId]) {
          jugadoresActualizados[playerId] = {
            nombreJugador: datos.nombre,
            puntosTotales: 0,
            participacionesPorPosicion: {},
            puntosPorPosicion: {},
            posicion: 0
          };
        }

        // Ensure puntosPorPosicion exists on players already in the ranking
        if (!jugadoresActualizados[playerId].puntosPorPosicion) {
          jugadoresActualizados[playerId].puntosPorPosicion = {};
        }

        // Registrar PARTICIPACIÓN en esta posición
        jugadoresActualizados[playerId].participacionesPorPosicion[posicion] = datos.participó;

        // Si es edición, restar los puntos que ya se habían sumado para esta posición
        if (isEdicion) {
          const puntosAnteriores = jugadoresActualizados[playerId].puntosPorPosicion[posicion] || 0;
          jugadoresActualizados[playerId].puntosTotales -= puntosAnteriores;
        }

        // Sumar puntos SOLO si participó, y registrar el valor por posición
        if (datos.participó) {
          jugadoresActualizados[playerId].puntosTotales += datos.puntos.total;
          jugadoresActualizados[playerId].puntosPorPosicion[posicion] = datos.puntos.total;
        } else {
          delete jugadoresActualizados[playerId].puntosPorPosicion[posicion];
        }
      });
      
      // Recalcular posiciones en el ranking
      const rankingOrdenado = Object.entries(jugadoresActualizados)
        .sort((a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
        .reduce((acc, [key, value], index) => {
          acc[key] = { ...value, posicion: index + 1 };
          return acc;
        }, {});
      
      // Actualizar estado de la partida en la copa
      const partidasActualizadas = (copa.partidas || []).map(p => 
        p.posicion === posicion 
          ? { ...p, estado: 'cargada', ultimaEdicion: new Date() }
          : p
      );
      
      // Realizar actualización
      await updateDoc(copaRef, {
        ranking: rankingOrdenado,
        partidas: partidasActualizadas,
        updatedAt: serverTimestamp()
      });

      // Cuando se finaliza la partida 10: cerrar copa y adjudicar ganador
      if (posicion === 10 && copa.estado === 'activa') {
        await activeCopaService._cerrarCopaConGanador(copaId, rankingOrdenado);
      }

      return rankingOrdenado;
    } catch (error) {
      console.error('Error actualizando ranking seguro de copa:', error);
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
   * Actualizar estadísticas del jugador tras una partida.
   * Actualiza `stats` (automatizado) y `estadisticas` (LCE histórico).
   * @param {string} playerId
   * @param {object} resultado - objeto resultado de procesarResultadosPartida para este jugador
   */
  async actualizarEstadisticasJugador(playerId, resultado) {
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerSnap = await getDoc(playerRef);

      if (!playerSnap.exists()) return;

      const puntosPartida = resultado.puntos?.total ?? 0;
      const esGanador = resultado.esGanador ?? false;
      const participo = resultado.participó !== false;
      const coloniasExternas = resultado.coloniasExternas ?? 0;

      // Actualizar stats — solo cuando participó, para mantener
      // stats.partidas sincronizado con estadisticas.jugadas
      const statsActuales = playerSnap.data().stats || {};
      const nuevasVictorias = (statsActuales.victorias || 0) + (esGanador ? 1 : 0);

      const updates = {
        'stats.victorias': nuevasVictorias,
        'stats.ultimaPartida': serverTimestamp()
      };

      if (participo) {
        const nuevasPartidas = (statsActuales.partidas || 0) + 1;
        const puntosTotales = (statsActuales.puntosPromedio || 0) * (nuevasPartidas - 1) + puntosPartida;
        const nuevoPuntoPromedio = puntosTotales / nuevasPartidas;

        updates['stats.partidas']      = nuevasPartidas;
        updates['stats.puntosPromedio'] = nuevoPuntoPromedio;
        updates['estadisticas.jugadas'] = increment(1);
        updates['estadisticas.colonias'] = increment(coloniasExternas);
        if (esGanador) {
          updates['estadisticas.victorias'] = increment(1);
        }
      }

      await updateDoc(playerRef, updates);

      return {
        partidas: updates['stats.partidas'] ?? statsActuales.partidas ?? 0,
        victorias: nuevasVictorias,
        puntosPromedio: updates['stats.puntosPromedio'] ?? statsActuales.puntosPromedio ?? 0
      };
    } catch (error) {
      console.error('Error actualizando estadísticas:', error);
      throw error;
    }
  },

  /**
   * FUNCIÓN INTEGRADA: Finalizar partida y actualizar copa automáticamente
   * 
   * Esta es la función que llamará JoinMatch al guardar puntos
   * Maneja:
   * 1. Procesar resultados (cálculo de puntos)
   * 2. Actualizar match
   * 3. Asegurar que la partida está en una copa
   * 4. Actualizar ranking de copa
   * 5. Detectar si copa está llena (10 partidas) para crear nueva
   * 
   * Input: {
   *   playerId: { nombre, CI, CE, ganador, participó }
   * }
   */
  async finalizarPartidaConCopa(matchId, resultadosJugadores) {
    try {
      // PASO 1: Procesar resultados (calcula puntos automáticamente)
      const { resultados, resumen } = this.procesarResultadosPartida(resultadosJugadores);

      // PASO 2: Obtener match actual
      const matchRef = doc(db, 'matches', matchId);
      const matchSnap = await getDoc(matchRef);

      if (!matchSnap.exists()) {
        throw new Error('Partida no encontrada');
      }

      const match = matchSnap.data();

      // PASO 3: Actualizar match con los resultados
      const ahora = typeof window !== 'undefined' ? window.location.hostname : 'server';
      await updateDoc(matchRef, {
        jugadores: resultados,
        resumen: resumen,
        estado: 'finalizada',
        auditoria: {
          cargadaPor: ahora,
          fechaCarga: serverTimestamp(),
          versionEsquema: '2.1'
        },
        updatedAt: serverTimestamp()
      });

      // PASO 4: Actualizar ranking de la copa (SOLO si la partida suma a copa)
      if (match.asociarACopa !== false && match.copId && match.posicion) {
        await this.actualizarRankingCopaSeguro(
          match.copId,
          match.posicion,
          matchId,
          resultados
        );

        // Marcar partida como cargada en la copa
        const copaRef = doc(db, 'copas', match.copId);
        const copaSnap = await getDoc(copaRef);

        if (copaSnap.exists()) {
          const copa = copaSnap.data();
          const partidasActualizadas = (copa.partidas || []).map(p =>
            p.matchId === matchId ? { ...p, estado: 'cargada' } : p
          );

          await updateDoc(copaRef, {
            partidas: partidasActualizadas,
            updatedAt: serverTimestamp()
          });
        }
      } else if (match.asociarACopa === false) {
        console.log('✓ Partida con visitantes: resultados guardados SIN actualizar copa');
      }

      // PASO 5: Actualizar stats individuales de jugadores registrados
      try {
        const jugadoresConPlayerId = Object.entries(resultadosJugadores)
          .filter(([_, datos]) => datos.playerId);

        if (jugadoresConPlayerId.length > 0) {
          const resultadosPorPlayerId = {};
          jugadoresConPlayerId.forEach(([_, datos]) => {
            const resultado = resultados[datos.playerId];
            if (resultado) resultadosPorPlayerId[datos.playerId] = resultado;
          });

          // Build alien map: playerId → [alienId, ...]
          // Aliens are stored in the match's jugadores array
          const alienesPorPlayer = {};
          const matchJugadores = match.jugadores || [];
          if (Array.isArray(matchJugadores)) {
            matchJugadores.forEach(j => {
              if (j.playerId && j.aliens?.length) {
                alienesPorPlayer[j.playerId] = j.aliens;
              }
            });
          }

          await rankingService.registrarPartidaPorJugador(
            matchId, resultadosPorPlayerId, new Date(), alienesPorPlayer
          );

          // Batch last10Score updates + stats sequentially (reads needed for avg calc)
          await Promise.all(
            Object.entries(resultadosPorPlayerId).map(([playerId, resultado]) =>
              Promise.all([
                rankingService.actualizarLast10Score(playerId),
                this.actualizarEstadisticasJugador(playerId, resultado)
              ])
            )
          );
        }
      } catch (statsError) {
        console.warn('⚠️ No se pudieron actualizar stats de jugadores:', statsError.message);
      }

      return {
        success: true,
        matchId: matchId,
        puntos: resultados,
        resumen: resumen,
        mensaje: '✓ Resultados guardados correctamente'
      };
    } catch (error) {
      console.error('Error finalizando partida con copa:', error);
      throw error;
    }
  }
};
