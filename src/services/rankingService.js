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
   * Obtener ranking global de todos los jugadores
   * Retorna jugadores ordenados por last10Score (incluso con 1 sola partida)
   */
  async obtenerRankingGlobal() {
    try {
      const playersCollection = collection(db, 'players');
      const querySnapshot = await getDocs(playersCollection);
      
      // Filtrar solo jugadores que tienen al menos 1 partida registrada
      const jugadores = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          last10Score: doc.data().last10Score || 0
        }))
        .filter(j => j.last10Score > 0 || (j.stats?.partidas || 0) > 0) // Al menos 1 partida
        .sort((a, b) => (b.last10Score || 0) - (a.last10Score || 0))
        .slice(0, 100); // Top 100
      
      return jugadores.map((jugador, index) => ({
        posicion: index + 1,
        id: jugador.id,
        nombre: jugador.name || 'Sin nombre',
        avatar: jugador.avatar || null,
        puntos: jugador.last10Score || 0,
        partidas: jugador.stats?.partidas || 0,
        victorias: jugador.stats?.victorias || 0,
        puntosPromedio: jugador.stats?.puntosPromedio || 0
      }));
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
