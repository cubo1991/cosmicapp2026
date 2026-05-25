'use client';

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { rankingService } from '@/services/rankingService';

export const deleteMatchService = {

  /* ─────────────────────────────────────────────────────────────────
   * Eliminar partida ACTIVA (no jugada aún)
   * Solo borra el documento y libera el slot en la copa.
   * ───────────────────────────────────────────────────────────────── */
  async eliminarPartidaActiva(matchId) {
    if (!matchId) throw new Error('ID de partida inválido');

    const matchRef  = doc(db, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) throw new Error('Partida no encontrada');

    const match = matchSnap.data();
    if (match.estado === 'finalizada') {
      throw new Error('Usá "Anular partida" para eliminar partidas finalizadas.');
    }

    if (match.copId) {
      try {
        const copaRef  = doc(db, 'copas', match.copId);
        const copaSnap = await getDoc(copaRef);
        if (copaSnap.exists()) {
          const copa = copaSnap.data();
          await updateDoc(copaRef, {
            partidas: (copa.partidas || []).filter(p => p.matchId !== matchId),
          });
        }
      } catch (err) {
        console.warn('⚠️ No se pudo limpiar copa:', err.message);
      }
    }

    await deleteDoc(matchRef);
    return { ok: true };
  },

  /* ─────────────────────────────────────────────────────────────────
   * Anular partida FINALIZADA — rollback completo
   *
   * Revierte:
   *  1. Copa: quita puntos del ranking (usando puntosPorPosicion exacto)
   *           y libera el slot en copa.partidas
   *  2. Jugadores: deshace stats.partidas/victorias/puntosPromedio,
   *                estadisticas.jugadas/victorias,
   *                borra lastMatches/{matchId} y recalcula last10Score
   *  3. Borra el documento de la partida
   * ───────────────────────────────────────────────────────────────── */
  async anularPartidaFinalizada(matchId) {
    if (!matchId) throw new Error('ID de partida inválido');

    const matchRef  = doc(db, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) throw new Error('Partida no encontrada');

    const match = matchSnap.data();
    if (match.estado !== 'finalizada') {
      throw new Error('Esta partida no está finalizada. Usá "Eliminar" en su lugar.');
    }

    const posicion = match.posicion || null;
    const copId    = match.copId    || null;

    // ── 1. Rollback copa ──────────────────────────────────────────
    if (copId && posicion) {
      try {
        const copaRef  = doc(db, 'copas', copId);
        const copaSnap = await getDoc(copaRef);

        if (copaSnap.exists()) {
          const copa    = copaSnap.data();
          const ranking = copa.ranking || {};

          // Subtract exact points recorded per player for this position
          const rankingActualizado = Object.fromEntries(
            Object.entries(ranking).map(([pid, datos]) => {
              const puntosEstaPartida = datos.puntosPorPosicion?.[posicion] || 0;
              const nuevosTotales     = Math.max(0, (datos.puntosTotales || 0) - puntosEstaPartida);

              const nuevoPuntosPorPos        = { ...(datos.puntosPorPosicion || {}) };
              const nuevaParticipacionesPorPos = { ...(datos.participacionesPorPosicion || {}) };
              delete nuevoPuntosPorPos[posicion];
              delete nuevaParticipacionesPorPos[posicion];

              return [pid, {
                ...datos,
                puntosTotales:              nuevosTotales,
                puntosPorPosicion:          nuevoPuntosPorPos,
                participacionesPorPosicion: nuevaParticipacionesPorPos,
              }];
            })
          );

          // Re-sort positions
          const rankingOrdenado = Object.entries(rankingActualizado)
            .sort((a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
            .reduce((acc, [pid, datos], idx) => {
              acc[pid] = { ...datos, posicion: idx + 1 };
              return acc;
            }, {});

          // Remove match from partidas array & reopen copa if it was finalizada
          const partidasActualizadas = (copa.partidas || []).filter(
            p => p.matchId !== matchId
          );

          const copaUpdates = { ranking: rankingOrdenado, partidas: partidasActualizadas };
          // If the copa was closed because of this match (posicion 10), reopen it
          if (copa.estado === 'finalizada' && posicion === 10) {
            copaUpdates.estado = 'activa';
            copaUpdates.ganador = null;
          }

          await updateDoc(copaRef, copaUpdates);
        }
      } catch (err) {
        console.warn('⚠️ No se pudo revertir copa:', err.message);
      }
    }

    // ── 2. Rollback por jugador ───────────────────────────────────
    // match.jugadores is an object keyed by playerId after finalization
    const jugadoresObj = Array.isArray(match.jugadores)
      ? null
      : match.jugadores || {};

    const playerIds = Object.keys(jugadoresObj || {}).filter(Boolean);

    if (playerIds.length > 0) {
      // Process players sequentially to avoid write conflicts
      for (const playerId of playerIds) {
        try {
          const playerRef  = doc(db, 'players', playerId);
          const playerSnap = await getDoc(playerRef);
          if (!playerSnap.exists()) continue;

          const player      = playerSnap.data();
          const jugadorData = jugadoresObj[playerId] || {};
          const fueGanador  = jugadorData.esGanador    || false;
          const participo   = jugadorData.participó !== false;
          const ptsPartida  = jugadorData.puntos?.total || 0;

          const updates = {};

          if (participo) {
            // Reverse stats.partidas + puntosPromedio
            const oldPartidas = player.stats?.partidas || 0;
            if (oldPartidas > 0) {
              const newPartidas = oldPartidas - 1;
              updates['stats.partidas'] = newPartidas;

              if (newPartidas > 0) {
                const oldAvg     = player.stats?.puntosPromedio || 0;
                const totalPuntos = oldAvg * oldPartidas - ptsPartida;
                updates['stats.puntosPromedio'] = Math.max(0, totalPuntos / newPartidas);
              } else {
                updates['stats.puntosPromedio'] = 0;
              }
            }

            // Reverse estadisticas.jugadas
            const oldJugadas = player.estadisticas?.jugadas || 0;
            if (oldJugadas > 0) {
              updates['estadisticas.jugadas'] = oldJugadas - 1;
            }

            if (fueGanador) {
              const oldVictorias = player.estadisticas?.victorias || 0;
              if (oldVictorias > 0) {
                updates['estadisticas.victorias'] = oldVictorias - 1;
              }
            }
          }

          // Reverse stats.victorias (tracked separately, outside participo)
          if (fueGanador) {
            const oldStatsVic = player.stats?.victorias || 0;
            if (oldStatsVic > 0) {
              updates['stats.victorias'] = oldStatsVic - 1;
            }
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(playerRef, updates);
          }

          // Delete lastMatches entry for this match
          try {
            await deleteDoc(doc(db, 'players', playerId, 'lastMatches', matchId));
          } catch {}

          // Recalculate last10Score from remaining lastMatches
          await rankingService.actualizarLast10Score(playerId);

        } catch (err) {
          console.warn(`⚠️ No se pudo revertir stats de ${playerId}:`, err.message);
        }
      }
    }

    // ── 3. Delete match document ──────────────────────────────────
    await deleteDoc(matchRef);

    return { ok: true };
  },
};
