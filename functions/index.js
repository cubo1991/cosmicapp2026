const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializar Firebase Admin
admin.initializeApp();

/**
 * Cloud Function: Calcular Puntos de Partida
 * 
 * Se ejecuta cuando se finalizaa una partida
 * Calcula los puntos de cada jugador y actualiza rankings
 */
exports.calcularPuntosPartida = functions.https.onCall(async (data, context) => {
  try {
    const { matchId, jugadoresData } = data;

    if (!matchId || !jugadoresData) {
      throw new Error("Datos requeridos: matchId, jugadoresData");
    }

    // Validar que haya datos de jugadores
    const jugadores = Object.entries(jugadoresData);
    if (jugadores.length === 0) {
      throw new Error("No hay jugadores en la partida");
    }

    // Calcular puntos de victoria
    const totalJugadores = jugadores.length;
    const ganadores = jugadores.filter(([, j]) => j.esGanador).length;

    if (ganadores === 0) {
      throw new Error("Debe haber al menos un ganador");
    }

    const puntosVictoria = totalJugadores / ganadores;

    // Calcular puntos para cada jugador
    const resultados = {};
    let posicion = 1;

    // Ordenar por puntos de colonias
    const jugadoresOrdenados = jugadores
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

    // Actualizar partida
    const matchRef = admin.firestore().collection("matches").doc(matchId);
    const matchSnap = await matchRef.get();

    if (!matchSnap.exists) {
      throw new Error("Partida no encontrada");
    }

    const matchData = matchSnap.data();

    // Actualizar documento de partida
    await matchRef.update({
      jugadores: resultados,
      estado: "finalizada",
      fechaFinalizacion: admin.firestore.FieldValue.serverTimestamp()
    });

    // Actualizar rankings si la partida está en una copa
    if (matchData.copId) {
      await actualizarRankingCopa(matchData.copId, matchId, resultados);
    }

    // Actualizar rankings si la partida está en una liga
    if (matchData.ligaId) {
      await actualizarRankingLiga(matchData.ligaId, matchId, resultados);
    }

    // Actualizar estadísticas de jugadores
    for (const [playerId, datos] of Object.entries(resultados)) {
      await actualizarEstadisticasJugador(playerId, datos.puntos, datos.esGanador);
    }

    return {
      success: true,
      matchId,
      resultados,
      puntosVictoria
    };
  } catch (error) {
    console.error("Error en calcularPuntosPartida:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});

/**
 * Actualizar ranking de copa
 */
async function actualizarRankingCopa(copaId, matchId, jugadoresConPuntos) {
  try {
    const copaRef = admin.firestore().collection("copas").doc(copaId);
    const copaSnap = await copaRef.get();

    if (!copaSnap.exists) {
      console.warn("Copa no encontrada:", copaId);
      return;
    }

    const rankingActual = copaSnap.data().ranking || {};
    const rankingActualizado = { ...rankingActual };

    // Actualizar o crear entrada en ranking
    Object.entries(jugadoresConPuntos).forEach(([playerId, datosJugador]) => {
      if (!rankingActualizado[playerId]) {
        rankingActualizado[playerId] = {
          nombreJugador: datosJugador.nombre || `Jugador ${playerId}`,
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

    await copaRef.update({
      ranking: rankingOrdenado,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Ranking de copa ${copaId} actualizado`);
  } catch (error) {
    console.error("Error actualizando ranking de copa:", error);
  }
}

/**
 * Actualizar ranking de liga
 */
async function actualizarRankingLiga(ligaId, matchId, jugadoresConPuntos) {
  try {
    const ligaRef = admin.firestore().collection("ligas").doc(ligaId);
    const ligaSnap = await ligaRef.get();

    if (!ligaSnap.exists) {
      console.warn("Liga no encontrada:", ligaId);
      return;
    }

    const rankingActual = ligaSnap.data().ranking || {};
    const rankingActualizado = { ...rankingActual };

    // Actualizar o crear entrada en ranking
    Object.entries(jugadoresConPuntos).forEach(([playerId, datosJugador]) => {
      if (!rankingActualizado[playerId]) {
        rankingActualizado[playerId] = {
          nombreJugador: datosJugador.nombre || `Jugador ${playerId}`,
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

    await ligaRef.update({
      ranking: rankingOrdenado,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Ranking de liga ${ligaId} actualizado`);
  } catch (error) {
    console.error("Error actualizando ranking de liga:", error);
  }
}

/**
 * Actualizar estadísticas del jugador
 */
async function actualizarEstadisticasJugador(playerId, puntosPartida, esGanador) {
  try {
    const playerRef = admin.firestore().collection("players").doc(playerId);
    const playerSnap = await playerRef.get();

    if (!playerSnap.exists) {
      console.warn("Jugador no encontrado:", playerId);
      return;
    }

    const statsActuales = playerSnap.data().stats || {};
    const nuevasPartidas = (statsActuales.partidas || 0) + 1;
    const nuevasVictorias = (statsActuales.victorias || 0) + (esGanador ? 1 : 0);
    
    // Calcular nuevo promedio
    const puntosTotalActual = statsActuales.puntosPromedio * (nuevasPartidas - 1) || 0;
    const puntosTotalNuevo = puntosTotalActual + puntosPartida;
    const nuevoPuntoPromedio = puntosTotalNuevo / nuevasPartidas;

    await playerRef.update({
      "stats.partidas": nuevasPartidas,
      "stats.victorias": nuevasVictorias,
      "stats.puntosPromedio": nuevoPuntoPromedio,
      "stats.ultimaPartida": admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Estadísticas de jugador ${playerId} actualizadas`);
  } catch (error) {
    console.error("Error actualizando estadísticas:", error);
  }
}
