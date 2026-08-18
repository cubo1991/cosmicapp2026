import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp,
  query,
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
  async registrarPartidaPorJugador(matchId: string, jugadoresConPuntos: Record<string, any>, fechaPartida: any, alienesPorPlayer: Record<string, any> = {}, extraMeta: Record<string, any> = {}) {
    try {
      const batch = writeBatch(db);

      Object.entries(jugadoresConPuntos).forEach(([playerId, datos]: [string, any]) => {
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
            puntos:      datos.puntos?.total || 0,
            esGanador:   datos.esGanador || false,
            participó:   datos.participó !== false,
            aliens:      alienesPorPlayer[playerId] || [],
            alienJugado: extraMeta.alienJugadoPorPlayer?.[playerId] || null,
            cantJugadores: extraMeta.cantJugadores || null,
            coloniasExternas: datos.coloniasExternas || 0,
            coloniasInternas: datos.coloniasInternas || 0,
            duracionMinutos: extraMeta.duracionMinutos || null,
            sessionId: extraMeta.sessionId || null,
            flags: extraMeta.flags || [],
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
      const docs = querySnapshot.docs;

      const last10Score = docs.reduce((sum, d) => sum + (d.data().puntos || 0), 0);
      // last3Score: sum of most recent 3 matches (already sorted desc)
      const last3Score  = docs.slice(0, 3).reduce((sum, d) => sum + (d.data().puntos || 0), 0);

      const playerRef = doc(db, 'players', playerId);
      await updateDoc(playerRef, {
        last10Score,
        last3Score,
        last10ScoreUpdatedAt: serverTimestamp()
      });

      console.log(`✓ ${playerId}: last10Score = ${last10Score}, last3Score = ${last3Score}`);
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
        .map((d): Record<string, any> => ({ id: d.id, ...d.data() }))
        .filter(j => (j.last10Score || 0) > 0)
        .sort((a, b) => (b.last10Score || 0) - (a.last10Score || 0))
        .slice(0, 100)
        .map((j, i) => {
          const last10 = j.last10Score || 0;
          const last3  = j.last3Score  || 0;
          // Forma: compare last3 avg to last10 avg
          // last3 has 3 matches, last10 has up to 10
          const avg10 = last10 / 10;
          const avg3  = last3  / 3;
          let forma = 'neutral';
          if (avg10 > 0) {
            if (avg3 > avg10 * 1.1)       forma = 'up';
            else if (avg3 < avg10 * 0.9)  forma = 'down';
          }
          return {
            posicion: i + 1,
            id: j.id,
            nombre: j.name || 'Sin nombre',
            avatar: j.photoURL || null,
            puntos: parseFloat(last10.toFixed(1)),
            last3Score: parseFloat(last3.toFixed(1)),
            forma,
            partidas: j.estadisticas?.jugadas || j.stats?.partidas || 0,
            victorias: j.estadisticas?.copas || 0,
            podioCopas: j.estadisticas?.podioCopas || 0,
            puntosPromedio: j.stats?.puntosPromedio
              ? parseFloat(j.stats.puntosPromedio.toFixed(1))
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
