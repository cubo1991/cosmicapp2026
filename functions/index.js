/**
 * Cloud Functions de CosmicApp.
 *
 * `finalizarPartida` es la unica via por la que se cierran partidas: calcula
 * puntos, actualiza la copa, cierra la copa al llegar a la partida 10, y
 * actualiza estadisticas y ranking global.
 *
 * Existe para que web y Android no tengan cada una su propia copia de esta
 * logica. Es un port del scoringService de la web (ver docs/PLAN_APP_ANDROID.md,
 * seccion 2.2); el calculo puro vive en scoring.js con un test de paridad.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
// API modular de firebase-admin v13: el viejo admin.firestore.FieldValue ya no existe.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { procesarResultadosPartida } = require("./scoring");

initializeApp();
const db = getFirestore();

/** Un ciclo de copa son 10 partidas; al cargar la ultima se cierra. */
const PARTIDAS_POR_COPA = 10;

/** Puntos de podio de la ultima copa: no se acumulan, se reasignan. */
const PODIO_PTS = [10, 7, 5];

exports.finalizarPartida = onCall(async (request) => {
  const { matchId, resultados: resultadosCrudos } = request.data || {};

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión");
  }
  if (!matchId || !resultadosCrudos) {
    throw new HttpsError("invalid-argument", "Faltan matchId o resultados");
  }

  try {
    // PASO 1: calcular puntos.
    const { resultados, resumen } = procesarResultadosPartida(resultadosCrudos);

    // PASO 2: leer la partida.
    const matchRef = db.collection("matches").doc(matchId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists) {
      throw new HttpsError("not-found", "Partida no encontrada");
    }
    const match = matchSnap.data();

    if (match.estado === "finalizada" && !match.permitirRecarga) {
      logger.info(`Partida ${matchId} ya finalizada: se recargan resultados`);
    }

    // PASO 3: guardar resultados en la partida.
    await matchRef.update({
      jugadores: resultados,
      resumen,
      estado: "finalizada",
      fechaFinalizacion: FieldValue.serverTimestamp(),
      auditoria: {
        // En la web esto guardaba el hostname del navegador, que no identificaba
        // a nadie. Desde la function sabemos quien la llamo de verdad.
        cargadaPor: request.auth.uid,
        fechaCarga: FieldValue.serverTimestamp(),
        versionEsquema: "3.0",
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    // PASO 4: copa, salvo que la partida sea de visitantes.
    let copaCerrada = null;
    if (match.asociarACopa !== false && match.copId && match.posicion) {
      copaCerrada = await actualizarRankingCopa(
        match.copId, match.posicion, matchId, resultados
      );
    }

    // PASO 5: estadisticas y ranking global de los jugadores registrados.
    await actualizarJugadores(matchId, match, resultadosCrudos, resultados);

    return {
      success: true,
      matchId,
      puntos: resultados,
      resumen,
      copaCerrada,
      mensaje: "Resultados guardados correctamente",
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Error finalizando partida", { matchId, error: error.message });
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Suma los puntos de la partida al ranking de la copa.
 *
 * Soporta reedicion: si la posicion ya estaba cargada, primero resta lo que
 * habia sumado antes, para que corregir una carga no infle el acumulado.
 *
 * Devuelve el ganador si esta carga cerro la copa, o null.
 */
async function actualizarRankingCopa(copaId, posicion, matchId, jugadoresConPuntos) {
  const copaRef = db.collection("copas").doc(copaId);
  const copaSnap = await copaRef.get();
  if (!copaSnap.exists) throw new HttpsError("not-found", "Copa no encontrada");

  const copa = copaSnap.data();
  const ranking = { ...(copa.ranking || {}) };

  const esEdicion = (copa.partidas || []).some(
    (p) => p.posicion === posicion && p.estado === "cargada"
  );

  Object.entries(jugadoresConPuntos).forEach(([playerId, datos]) => {
    if (!ranking[playerId]) {
      ranking[playerId] = {
        nombreJugador: datos.nombre,
        puntosTotales: 0,
        participacionesPorPosicion: {},
        puntosPorPosicion: {},
        posicion: 0,
      };
    }
    if (!ranking[playerId].puntosPorPosicion) {
      ranking[playerId].puntosPorPosicion = {};
    }

    ranking[playerId].participacionesPorPosicion[posicion] = datos["participó"];

    if (esEdicion) {
      const previos = ranking[playerId].puntosPorPosicion[posicion] || 0;
      ranking[playerId].puntosTotales -= previos;
    }

    if (datos["participó"]) {
      ranking[playerId].puntosTotales += datos.puntos.total;
      ranking[playerId].puntosPorPosicion[posicion] = datos.puntos.total;
    } else {
      delete ranking[playerId].puntosPorPosicion[posicion];
    }
  });

  const rankingOrdenado = Object.entries(ranking)
    .sort((a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
    .reduce((acc, [key, value], index) => {
      acc[key] = { ...value, posicion: index + 1 };
      return acc;
    }, {});

  const partidasActualizadas = (copa.partidas || []).map((p) =>
    p.posicion === posicion
      ? { ...p, estado: "cargada", ultimaEdicion: new Date() }
      : p
  );

  await copaRef.update({
    ranking: rankingOrdenado,
    partidas: partidasActualizadas,
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (posicion === PARTIDAS_POR_COPA && copa.estado === "activa") {
    return cerrarCopaConGanador(copaId, rankingOrdenado);
  }
  return null;
}

/** Cierra la copa, adjudica el ganador y reasigna los puntos de podio. */
async function cerrarCopaConGanador(copaId, rankingActual) {
  const entries = Object.entries(rankingActual);
  const ordenados = entries.sort(
    (a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0)
  );

  let ganador = null;
  if (ordenados.length > 0) {
    const [ganadorId, datos] = ordenados[0];
    ganador = {
      playerId: ganadorId,
      nombre: datos.nombreJugador || "Sin nombre",
      puntosTotales: datos.puntosTotales || 0,
    };
  }

  await db.collection("copas").doc(copaId).update({
    estado: "finalizada",
    ganador,
    fechaFin: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // podioCopas refleja SOLO la ultima copa, no acumula: por eso se escribe
  // tambien el 0 a los que quedaron fuera del podio.
  await Promise.all(
    ordenados.map(([playerId], idx) => {
      const updates = {
        "estadisticas.podioCopas": PODIO_PTS[idx] ?? 0,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (idx === 0) updates["estadisticas.copas"] = FieldValue.increment(1);
      return db.collection("players").doc(playerId).update(updates)
        .catch((e) => logger.warn(`No se pudo actualizar podio de ${playerId}: ${e.message}`));
    })
  );

  logger.info(`Copa ${copaId} cerrada. Ganador: ${ganador?.nombre}`);
  return ganador;
}

/**
 * Registra la partida en la subcoleccion de cada jugador y actualiza sus
 * estadisticas y su last10Score.
 *
 * Los visitantes no tienen ficha en la base, asi que quedan afuera.
 */
async function actualizarJugadores(matchId, match, resultadosCrudos, resultados) {
  const conPlayerId = Object.values(resultadosCrudos).filter((d) => d.playerId);
  if (conPlayerId.length === 0) return;

  const porPlayerId = {};
  conPlayerId.forEach((datos) => {
    const resultado = resultados[datos.playerId];
    if (resultado) porPlayerId[datos.playerId] = resultado;
  });

  // Aliens elegidos al armar la partida (formato legacy con lista).
  const alienesPorPlayer = {};
  if (Array.isArray(match.jugadores)) {
    match.jugadores.forEach((j) => {
      if (j.playerId && j.aliens?.length) alienesPorPlayer[j.playerId] = j.aliens;
    });
  }

  const participantes = Object.values(porPlayerId).filter((r) => r["participó"] !== false);
  const ganadores = participantes.filter((r) => r.esGanador);

  const flags = [];
  if (ganadores.length > 1) flags.push("shared_victory");
  if (ganadores.some((r) => (r.coloniasExternas || 0) === 0)) flags.push("zero_ce_winner");

  let duracionMinutos = null;
  if (match.fechaCreacion) {
    const creada = match.fechaCreacion.toDate
      ? match.fechaCreacion.toDate()
      : new Date(match.fechaCreacion);
    duracionMinutos = Math.round((Date.now() - creada.getTime()) / 60000);
  }

  // Subcoleccion lastMatches: es la fuente del ranking global.
  const batch = db.batch();
  Object.entries(porPlayerId).forEach(([playerId, datos]) => {
    if (datos["participó"] === false) return;
    batch.set(db.collection("players").doc(playerId).collection("lastMatches").doc(matchId), {
      matchId,
      puntos: datos.puntos?.total || 0,
      esGanador: datos.esGanador || false,
      "participó": true,
      aliens: alienesPorPlayer[playerId] || [],
      alienJugado: (match.alienesConfirmados || {})[playerId] || null,
      cantJugadores: participantes.length,
      coloniasExternas: datos.coloniasExternas || 0,
      coloniasInternas: datos.coloniasInternas || 0,
      duracionMinutos,
      sessionId: match.sessionId || null,
      flags,
      createdAt: new Date(),
    });
  });
  await batch.commit();

  await Promise.all(
    Object.entries(porPlayerId).map(([playerId, resultado]) =>
      Promise.all([
        actualizarLast10Score(playerId),
        actualizarEstadisticasJugador(playerId, resultado),
      ])
    )
  );
}

/** Suma de las ultimas 10 partidas; es lo que ordena el ranking global. */
async function actualizarLast10Score(playerId) {
  const snap = await db.collection("players").doc(playerId)
    .collection("lastMatches")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const puntos = snap.docs.map((d) => d.data().puntos || 0);
  const last10Score = puntos.reduce((a, b) => a + b, 0);
  const last3Score = puntos.slice(0, 3).reduce((a, b) => a + b, 0);

  await db.collection("players").doc(playerId).update({
    last10Score,
    last3Score,
    last10ScoreUpdatedAt: FieldValue.serverTimestamp(),
  });
}

/** Stats automaticas del jugador y sus estadisticas historicas de la LCE. */
async function actualizarEstadisticasJugador(playerId, resultado) {
  const playerRef = db.collection("players").doc(playerId);
  const playerSnap = await playerRef.get();
  if (!playerSnap.exists) return;

  const puntosPartida = resultado.puntos?.total ?? 0;
  const esGanador = resultado.esGanador ?? false;
  const participo = resultado["participó"] !== false;
  const coloniasExternas = resultado.coloniasExternas ?? 0;

  const stats = playerSnap.data().stats || {};
  const updates = {
    "stats.victorias": (stats.victorias || 0) + (esGanador ? 1 : 0),
    "stats.ultimaPartida": FieldValue.serverTimestamp(),
  };

  // stats.partidas se mantiene sincronizado con estadisticas.jugadas: ambos
  // suben solo cuando la persona efectivamente jugo.
  if (participo) {
    const nuevasPartidas = (stats.partidas || 0) + 1;
    const acumulado = (stats.puntosPromedio || 0) * (nuevasPartidas - 1) + puntosPartida;

    updates["stats.partidas"] = nuevasPartidas;
    updates["stats.puntosPromedio"] = acumulado / nuevasPartidas;
    updates["estadisticas.jugadas"] = FieldValue.increment(1);
    updates["estadisticas.colonias"] = FieldValue.increment(coloniasExternas);
    if (esGanador) updates["estadisticas.victorias"] = FieldValue.increment(1);
  }

  await playerRef.update(updates);
}
