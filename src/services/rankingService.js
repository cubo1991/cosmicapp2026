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
  async registrarPartidaPorJugador(matchId, jugadoresConPuntos, fechaPartida, alienesPorPlayer = {}) {
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
            aliens: alienesPorPlayer[playerId] || [],
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
   * Ordena por last10Score: suma de las últimas 10 partidas jugadas por cada jugador,
   * independientemente de la copa en que cayeron.
   * Un jugador que dejó de jugar mantiene su puntaje de sus últimas 10 partidas.
   */
  async obtenerRankingGlobal() {
    try {
      const playersSnap = await getDocs(collection(db, 'players'));

      return playersSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(j => (j.last10Score || 0) > 0)
        .sort((a, b) => (b.last10Score || 0) - (a.last10Score || 0))
        .slice(0, 100)
        .map((j, i) => ({
          posicion: i + 1,
          id: j.id,
          nombre: j.name || 'Sin nombre',
          avatar: j.photoURL || null,
          puntos: parseFloat((j.last10Score || 0).toFixed(1)),
          partidas: j.estadisticas?.jugadas || j.stats?.partidas || 0,
          victorias: j.estadisticas?.copas || 0,
          podioCopas: j.estadisticas?.podioCopas || 0,
          puntosPromedio: j.stats?.puntosPromedio
            ? parseFloat(j.stats.puntosPromedio.toFixed(1))
            : 0
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
