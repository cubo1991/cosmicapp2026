import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * 🏆 Servicio de Ranking Global
 * Gestiona el cálculo y almacenamiento del ranking de jugadores
 * basado en las últimas 10 partidas
 */
export const rankingService = {
  /**
   * Registrar una partida completada para cada jugador
   * Se llama cuando se finaliza una partida
   * 
   * Parámetros:
   * - matchId: ID de la partida
   * - jugadoresConPuntos: { playerId: { nombre, puntos, esGanador, participó } }
   * - fechaPartida: timestamp o Date
   */
  async registrarPartidaPorJugador(matchId, jugadoresConPuntos, fechaPartida) {
    try {
      const batch = writeBatch(db);
      
      Object.entries(jugadoresConPuntos).forEach(([playerId, datos]) => {
        // Solo registrar si el jugador participó
        if (datos.participó !== false) {
          const matchSubcolRef = doc(
            db,
            'players',
            playerId,
            'lastMatches',
            matchId
          );
          
          batch.set(matchSubcolRef, {
            matchId,
            puntos: datos.puntos?.total || 0,
            esGanador: datos.esGanador || false,
            participó: datos.participó !== false,
            createdAt: fechaPartida || serverTimestamp()
          });
        }
      });
      
      await batch.commit();
      console.log('✓ Partidas registradas en subcolecciones');
    } catch (error) {
      console.error('Error registrando partidas por jugador:', error);
      throw error;
    }
  },

  /**
   * Recalcular y guardar last10Score para un jugador
   * Se ejecuta después de registrar una partida
   * 
   * OPTIMIZACIÓN: Solo suma las últimas 10 partidas
   */
  async actualizarLast10Score(playerId) {
    try {
      const q = query(
        collection(db, 'players', playerId, 'lastMatches'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      
      const last10Score = querySnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().puntos || 0);
      }, 0);
      
      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        last10Score,
        last10ScoreUpdatedAt: serverTimestamp()
      });
      
      console.log(`✓ ${playerId}: last10Score = ${last10Score}`);
      return last10Score;
    } catch (error) {
      console.error('Error actualizando last10Score:', error);
      throw error;
    }
  },

  /**
   * Obtener ranking global de todos los jugadores.
   * Agrega puntosTotales de cada jugador en TODAS las copas (activas y finalizadas).
   */
  async obtenerRankingGlobal() {
    try {
      const [copasSnap, playersSnap] = await Promise.all([
        getDocs(collection(db, 'copas')),
        getDocs(collection(db, 'players'))
      ]);

      // Índice de jugadores para enriquecer con nombre, avatar y estadisticas
      const playersById = {};
      playersSnap.docs.forEach(d => { playersById[d.id] = d.data(); });

      // Acumular puntos de copa por jugador
      const acumulado = {};
      copasSnap.docs.forEach(copaDoc => {
        const ranking = copaDoc.data().ranking || {};
        Object.entries(ranking).forEach(([playerId, datos]) => {
          if (!acumulado[playerId]) {
            acumulado[playerId] = { puntos: 0, partidas: 0 };
          }
          acumulado[playerId].puntos += datos.puntosTotales || 0;
          acumulado[playerId].partidas += datos.participaciones || 0;
        });
      });

      return Object.entries(acumulado)
        .filter(([_, d]) => d.puntos > 0)
        .sort((a, b) => b[1].puntos - a[1].puntos)
        .slice(0, 100)
        .map(([id, datos], i) => {
          const player = playersById[id] || {};
          const pts = parseFloat(datos.puntos.toFixed(1));
          return {
            posicion: i + 1,
            id,
            nombre: player.name || 'Sin nombre',
            avatar: player.photoURL || null,
            puntos: pts,
            partidas: datos.partidas,
            victorias: player.estadisticas?.copas || 0,
            podioCopas: player.estadisticas?.podioCopas || 0,
            puntosPromedio: datos.partidas > 0
              ? parseFloat((datos.puntos / datos.partidas).toFixed(1))
              : 0
          };
        });
    } catch (error) {
      console.error('Error obteniendo ranking global:', error);
      throw error;
    }
  },

  /**
   * Obtener detalles de últimas 10 partidas de un jugador
   * Útil para ver el historial
   */
  async obtenerUltimas10Partidas(playerId) {
    try {
      const q = query(
        collection(db, 'players', playerId, 'lastMatches'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo últimas partidas:', error);
      throw error;
    }
  }
};
