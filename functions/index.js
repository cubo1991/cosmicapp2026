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
 *
 * Fase 2 de docs/PLAN_MULTI_LIGA.md: todo (copas, ranking, estadisticas,
 * avisos) esta acotado por `ligaId`, no mas un unico pozo global. Mientras los
 * clientes (Fase 5) no tengan selector de liga, lo que no manda `ligaId` cae
 * en LIGA_POR_DEFECTO para no romper nada de lo que ya funciona hoy.
 */
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
// API modular de firebase-admin v13: el viejo admin.firestore.FieldValue ya no existe.
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { procesarResultadosPartida } = require("./scoring");

initializeApp();
const db = getFirestore();

/** Un ciclo de copa son 10 partidas; al cargar la ultima se cierra. */
const PARTIDAS_POR_COPA = 10;

/**
 * Liga a la que cae todo lo que no trae `ligaId` explicito: partidas viejas
 * (de antes del multi-liga), o creadas por flujos de admin (carga masiva,
 * semillas) que todavia no lo mandan. Es la misma liga en la que la migracion
 * de la Fase 1 dejo todo el historico existente.
 */
const LIGA_POR_DEFECTO = "liga1";

/**
 * Tema de FCM legado: al que estan suscriptas las instalaciones de la app de
 * antes del multi-liga. Se sigue mandando ahi ademas del tema por liga
 * (`liga_<id>`) hasta que los clientes (Fase 5 del plan) se suscriban por liga
 * y se pueda dar de baja.
 */
const TEMA_LEGADO = "liga";

/** Manda un aviso a la liga (y al tema legado). Nunca tumba la operacion que lo disparo. */
async function avisar(titulo, cuerpo, ligaId) {
  // Firebase no tiene emulador de FCM: si esto corriera en el emulador de
  // Functions (tests, `npm run test:finalizar`), el mensaje saldria de
  // verdad hacia los telefonos reales suscriptos al topico de produccion.
  // El emulador de Functions siempre pone FUNCTIONS_EMULATOR=true.
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    logger.info(`[emulador] aviso NO enviado de verdad: "${titulo}" — ${cuerpo}`);
    return;
  }

  const temas = ligaId ? [`liga_${ligaId}`, TEMA_LEGADO] : [TEMA_LEGADO];
  await Promise.all(
    temas.map((topic) =>
      getMessaging()
        .send({
          topic,
          notification: { title: titulo, body: cuerpo },
          android: { priority: "high" },
        })
        .catch((e) => logger.warn(`No se pudo enviar el aviso "${titulo}" a ${topic}: ${e.message}`))
    )
  );
}

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
    const ligaId = match.ligaId || LIGA_POR_DEFECTO;

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
        match.copId, match.posicion, matchId, resultados, ligaId
      );
    }

    // PASO 5: estadisticas y ranking global de los jugadores registrados.
    await actualizarJugadores(matchId, match, resultadosCrudos, resultados, ligaId);

    if (copaCerrada) {
      await avisar("¡Copa cerrada!", `La ganó ${copaCerrada.nombre} con ${copaCerrada.puntosTotales} puntos.`, ligaId);
    } else {
      await avisar("Resultados cargados", `Ya están los puntos de ${match.nombre || "la partida"}.`, ligaId);
    }

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
 * Crea una partida y la asocia a la copa activa de su liga.
 *
 * Existe por lo mismo que finalizarPartida: crear no es solo escribir un
 * documento. Asigna la posicion dentro de la copa y, si la copa ya estaba
 * llena, la cierra adjudicando ganador y abre la siguiente. Ademas agrupa la
 * partida en una "sesion" con las de la misma noche. Todo eso vivia en el
 * cliente web y replicarlo en Kotlin habria sido otra fuente de verdad.
 */
exports.crearPartida = onCall(async (request) => {
  const { nombre, jugadores, asociarACopa = true, ligaId = null, sessionId = null } =
    request.data || {};

  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión");
  }
  if (!jugadores || (Array.isArray(jugadores) && jugadores.length === 0)) {
    throw new HttpsError("invalid-argument", "La partida necesita jugadores");
  }

  // Sin selector de liga en los clientes todavia (Fase 5 de docs/PLAN_MULTI_LIGA.md),
  // lo que no manda liga cae en la original: asi ningun cliente existente se
  // rompe el dia que se despliega esto.
  const liga = ligaId || LIGA_POR_DEFECTO;

  try {
    const playerIds = Array.isArray(jugadores)
      ? jugadores.map((j) => j.playerId).filter(Boolean)
      : Object.keys(jugadores);

    const sesion = await detectarOCrearSesion(playerIds, sessionId, liga);
    const conAliens = await repartirAliens(jugadores);

    const matchRef = await db.collection("matches").add({
      nombre: nombre || "Partida sin nombre",
      codigo: generarCodigo(),
      copId: null, // lo completa la asignacion a la copa
      ligaId: liga,
      estado: "activa",
      asociarACopa,
      sessionId: sesion,
      fechaCreacion: FieldValue.serverTimestamp(),
      fechaFinalizacion: null,
      jugadores: conAliens,
      creadaPor: request.auth.uid,
    });

    let copa = null;
    if (asociarACopa) {
      // Si falla la asignacion no se tira la partida: ya existe y se puede
      // asociar despues. Mismo criterio que tenia la web.
      try {
        copa = await agregarPartidaACopa(matchRef.id, liga);
      } catch (e) {
        logger.warn(`Partida ${matchRef.id} creada sin copa: ${e.message}`);
      }
    }

    const creada = await matchRef.get();

    await avisar(
      "Nueva partida",
      `${nombre || "Una partida"} arrancó con los aliens repartidos. Código ${creada.data().codigo}`,
      liga
    );

    return {
      success: true,
      matchId: matchRef.id,
      codigo: creada.data().codigo,
      sessionId: sesion,
      copa,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("Error creando partida", { error: error.message });
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Reparte dos aliens a cada jugador, sin repetir entre jugadores.
 *
 * La web ya los asigna en el cliente y los manda en el payload; si vienen, se
 * respetan. Android no los asignaba, asi que las partidas creadas desde el
 * telefono salian sin aliens. Al hacerlo aca, las dos plataformas reparten
 * igual y con el mismo criterio.
 */
const ALIENS_POR_JUGADOR = 2;

async function repartirAliens(jugadores) {
  // Solo tiene sentido con el formato lista, que es el que usa la creacion.
  if (!Array.isArray(jugadores)) return jugadores;
  if (jugadores.every((j) => j.aliens?.length)) return jugadores; // ya vienen asignados

  const catalogo = await db.collection("alienList").get();
  if (catalogo.empty) {
    logger.warn("No hay aliens en el catalogo: la partida se crea sin repartir");
    return jugadores;
  }

  const disponibles = catalogo.docs.map((d) => d.id);
  return jugadores.map((jugador) => {
    if (jugador.aliens?.length) return jugador;
    const suyos = [];
    for (let i = 0; i < ALIENS_POR_JUGADOR && disponibles.length > 0; i++) {
      const indice = Math.floor(Math.random() * disponibles.length);
      suyos.push(disponibles.splice(indice, 1)[0]);
    }
    return { ...jugador, aliens: suyos };
  });
}

// Alfabeto sin 0/O ni 1/I, para que el codigo se pueda dictar en voz alta.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generarCodigo = () =>
  Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");

/**
 * Agrupa partidas consecutivas de la misma liga en una sesion: si en las
 * ultimas 4 horas hubo una partida de esa liga con al menos la mitad de los
 * mismos jugadores, se reusa su sessionId. Sirve para reconocer "la juntada
 * del sabado" como una unidad, sin mezclar sesiones de ligas distintas.
 */
async function detectarOCrearSesion(playerIds, sessionIdExistente, ligaId) {
  if (sessionIdExistente) return sessionIdExistente; // revancha
  if (!playerIds || playerIds.length === 0) return `ses_${Date.now()}`;

  try {
    const corte = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const snap = await db.collection("matches")
      .where("ligaId", "==", ligaId)
      .orderBy("fechaCreacion", "desc")
      .limit(15)
      .get();

    const buscados = new Set(playerIds);
    for (const d of snap.docs) {
      const m = d.data();
      if (!m.sessionId || !m.fechaCreacion) continue;
      const fecha = m.fechaCreacion.toDate ? m.fechaCreacion.toDate() : new Date(m.fechaCreacion);
      if (fecha < corte) continue;

      const suyos = Array.isArray(m.jugadores)
        ? m.jugadores.map((j) => j.playerId).filter(Boolean)
        : Object.keys(m.jugadores || {});
      const enComun = suyos.filter((p) => buscados.has(p)).length;
      const umbral = Math.ceil(Math.min(playerIds.length, suyos.length) * 0.5);
      if (enComun >= umbral) return m.sessionId;
    }
  } catch (e) {
    logger.warn(`No se pudo detectar sesión: ${e.message}`);
  }
  return `ses_${Date.now()}`;
}

/** La copa en curso de esa liga. Si la que hay ya tiene 10 partidas, la cierra y abre otra. */
async function obtenerOCrearCopaActiva(ligaId) {
  const snap = await db.collection("copas")
    .where("ligaId", "==", ligaId)
    .where("estado", "==", "activa")
    .get();

  if (!snap.empty) {
    const copaDoc = snap.docs[0];
    const copa = copaDoc.data();
    if ((copa.partidas || []).length < PARTIDAS_POR_COPA) {
      return { id: copaDoc.id, ...copa };
    }
    // Copa llena que nunca se cerró: caso de borde heredado de la web.
    await cerrarCopaConGanador(copaDoc.id, copa.ranking || {}, ligaId);
    return crearNuevaCopa(ligaId);
  }
  return crearNuevaCopa(ligaId);
}

/** Abre la copa siguiente de la liga, con todos sus miembros en cero. */
async function crearNuevaCopa(ligaId) {
  const previas = await db.collection("copas").where("ligaId", "==", ligaId).get();
  const nombre = `Copa #${previas.size + 1}`;

  const ligaSnap = await db.collection("ligas").doc(ligaId).get();
  const miembros = ligaSnap.exists ? (ligaSnap.data().miembros || []) : [];
  const jugadoresLiga = await Promise.all(
    miembros.map((id) => db.collection("players").doc(id).get())
  );

  const rankingInicial = {};
  jugadoresLiga.forEach((p) => {
    if (!p.exists) return;
    rankingInicial[p.id] = {
      nombreJugador: p.data().name || "Sin nombre",
      puntosTotales: 0,
      participacionesPorPosicion: {},
      posicion: 0,
    };
  });

  const datos = {
    nombre,
    descripcion: "Copa generada automáticamente",
    estado: "activa",
    ligaId,
    partidas: [],
    ranking: rankingInicial,
    ganador: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection("copas").add(datos);
  logger.info(`Copa nueva creada para la liga ${ligaId}: ${nombre}`);
  return { id: ref.id, ...datos };
}

/** Reserva la siguiente posicion de la copa de la liga para esta partida. */
async function agregarPartidaACopa(matchId, ligaId) {
  const copa = await obtenerOCrearCopaActiva(ligaId);
  const partidas = copa.partidas || [];
  const posicion = partidas.length + 1;

  await db.collection("copas").doc(copa.id).update({
    partidas: [
      ...partidas,
      { posicion, matchId, fechaJuego: new Date(), estado: "pendiente" },
    ],
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection("matches").doc(matchId).update({
    copId: copa.id,
    posicion,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { copaId: copa.id, copaNombre: copa.nombre, posicion };
}

/**
 * Suma los puntos de la partida al ranking de la copa.
 *
 * Soporta reedicion: si la posicion ya estaba cargada, primero resta lo que
 * habia sumado antes, para que corregir una carga no infle el acumulado.
 *
 * Devuelve el ganador si esta carga cerro la copa, o null.
 */
async function actualizarRankingCopa(copaId, posicion, matchId, jugadoresConPuntos, ligaId) {
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
    return cerrarCopaConGanador(copaId, rankingOrdenado, ligaId);
  }
  return null;
}

/** Cierra la copa, adjudica el ganador y reasigna los puntos de podio. */
async function cerrarCopaConGanador(copaId, rankingActual, ligaId) {
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
  // tambien el 0 a los que quedaron fuera del podio. Se escribe en players
  // (para no romper lecturas viejas mientras haya una sola liga) y en
  // ligaStats/{ligaId} (fuente nueva, acotada a la liga — ver docs/PLAN_MULTI_LIGA.md).
  await Promise.all(
    ordenados.map(([playerId], idx) => {
      const estadisticas = { podioCopas: PODIO_PTS[idx] ?? 0 };
      if (idx === 0) estadisticas.copas = FieldValue.increment(1);
      const updates = { estadisticas, updatedAt: FieldValue.serverTimestamp() };

      const playerRef = db.collection("players").doc(playerId);
      return Promise.all([
        playerRef.set(updates, { merge: true })
          .catch((e) => logger.warn(`No se pudo actualizar podio de ${playerId}: ${e.message}`)),
        playerRef.collection("ligaStats").doc(ligaId).set(updates, { merge: true })
          .catch((e) => logger.warn(`No se pudo actualizar podio (ligaStats) de ${playerId}: ${e.message}`)),
      ]);
    })
  );

  logger.info(`Copa ${copaId} cerrada. Ganador: ${ganador?.nombre}`);
  return ganador;
}

/**
 * Registra la partida en la subcoleccion de cada jugador y actualiza sus
 * estadisticas y su last10Score, para esta liga.
 *
 * Los visitantes no tienen ficha en la base, asi que quedan afuera.
 */
async function actualizarJugadores(matchId, match, resultadosCrudos, resultados, ligaId) {
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

  // Subcoleccion lastMatches: es la fuente del ranking por liga.
  const batch = db.batch();
  Object.entries(porPlayerId).forEach(([playerId, datos]) => {
    if (datos["participó"] === false) return;
    batch.set(db.collection("players").doc(playerId).collection("lastMatches").doc(matchId), {
      matchId,
      ligaId,
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
        actualizarLast10Score(playerId, ligaId),
        actualizarEstadisticasJugador(playerId, ligaId, resultado),
      ])
    )
  );
}

/**
 * Suma de las ultimas 10 partidas DE ESTA LIGA; es lo que ordena el ranking.
 * Se escribe en players (para no romper lecturas viejas mientras haya una
 * sola liga) y en ligaStats/{ligaId} (fuente nueva, acotada a la liga).
 */
async function actualizarLast10Score(playerId, ligaId) {
  const snap = await db.collection("players").doc(playerId)
    .collection("lastMatches")
    .where("ligaId", "==", ligaId)
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const puntos = snap.docs.map((d) => d.data().puntos || 0);
  const last10Score = puntos.reduce((a, b) => a + b, 0);
  const last3Score = puntos.slice(0, 3).reduce((a, b) => a + b, 0);

  const datos = { last10Score, last3Score, last10ScoreUpdatedAt: FieldValue.serverTimestamp() };
  const playerRef = db.collection("players").doc(playerId);
  await Promise.all([
    playerRef.set(datos, { merge: true }),
    playerRef.collection("ligaStats").doc(ligaId).set(datos, { merge: true }),
  ]);
}

/**
 * Stats automaticas del jugador y sus estadisticas historicas, para esta liga.
 * Se aplican en players (raíz, legado) y en ligaStats/{ligaId} (fuente nueva).
 */
async function actualizarEstadisticasJugador(playerId, ligaId, resultado) {
  const playerRef = db.collection("players").doc(playerId);
  const playerSnap = await playerRef.get();
  if (!playerSnap.exists) return;

  await Promise.all([
    aplicarActualizacionStats(playerRef, resultado),
    aplicarActualizacionStats(playerRef.collection("ligaStats").doc(ligaId), resultado),
  ]);
}

/**
 * Aplica el incremento de stats/estadisticas de una partida sobre un doc puntual.
 *
 * Usa `set(..., {merge:true})` en vez de `update()` porque el doc de ligaStats
 * puede no existir todavia para un jugador nuevo en esta liga. Ojo: con
 * `merge:true` las claves con punto ("stats.victorias") NO se interpretan como
 * ruta anidada como en `update()` — hay que mandar objetos anidados de
 * verdad, que Firestore sí mergea recursivamente sin pisar el resto del mapa.
 */
async function aplicarActualizacionStats(ref, resultado) {
  const snap = await ref.get();
  const stats = (snap.exists && snap.data().stats) || {};

  const puntosPartida = resultado.puntos?.total ?? 0;
  const esGanador = resultado.esGanador ?? false;
  const participo = resultado["participó"] !== false;
  const coloniasExternas = resultado.coloniasExternas ?? 0;

  const updates = {
    stats: {
      victorias: (stats.victorias || 0) + (esGanador ? 1 : 0),
      ultimaPartida: FieldValue.serverTimestamp(),
    },
  };

  // stats.partidas se mantiene sincronizado con estadisticas.jugadas: ambos
  // suben solo cuando la persona efectivamente jugo.
  if (participo) {
    const nuevasPartidas = (stats.partidas || 0) + 1;
    const acumulado = (stats.puntosPromedio || 0) * (nuevasPartidas - 1) + puntosPartida;

    updates.stats.partidas = nuevasPartidas;
    updates.stats.puntosPromedio = acumulado / nuevasPartidas;
    updates.estadisticas = {
      jugadas: FieldValue.increment(1),
      colonias: FieldValue.increment(coloniasExternas),
    };
    if (esGanador) updates.estadisticas.victorias = FieldValue.increment(1);
  }

  await ref.set(updates, { merge: true });
}

// ============================================================
// Gestion de ligas — Fase 4 de docs/PLAN_MULTI_LIGA.md.
//
// El alta a una liga es manual: la hace un admin, buscando el nombre del
// jugador o compartiendo un codigo de invitacion. No hay alta publica
// auto-servicio (decision de producto, confirmada el 30/08/2026). Por eso
// `crearLiga` y `agregarMiembroALiga` son solo-admin, y `unirseALigaPorCodigo`
// exige que quien se une tenga cuenta real (no anonima) sobre su propio
// jugador ya reclamado.
// ============================================================

/** Mismo criterio que isAdmin() en firestore.rules: un doc en /admins/{uid}. */
async function esAdmin(uid) {
  const snap = await db.collection("admins").doc(uid).get();
  return snap.exists;
}

exports.crearLiga = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión");
  }
  if (!(await esAdmin(request.auth.uid))) {
    throw new HttpsError("permission-denied", "Solo un admin puede crear ligas");
  }

  const { nombre, descripcion = "" } = request.data || {};
  if (!nombre || !nombre.trim()) {
    throw new HttpsError("invalid-argument", "La liga necesita un nombre");
  }

  const datos = {
    nombre: nombre.trim(),
    descripcion,
    estado: "activa",
    miembros: [],
    miembrosUid: [],
    codigoInvitacion: generarCodigo(),
    creadaPor: request.auth.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection("ligas").add(datos);
  logger.info(`Liga creada: ${datos.nombre} (${ref.id})`);
  return { id: ref.id, ...datos };
});

/** Agrega un jugador existente a una liga. Solo admin: es el alta manual por nombre. */
exports.agregarMiembroALiga = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión");
  }
  if (!(await esAdmin(request.auth.uid))) {
    throw new HttpsError("permission-denied", "Solo un admin puede agregar miembros");
  }

  const { ligaId, playerId } = request.data || {};
  if (!ligaId || !playerId) {
    throw new HttpsError("invalid-argument", "Faltan ligaId o playerId");
  }

  const [ligaSnap, playerSnap] = await Promise.all([
    db.collection("ligas").doc(ligaId).get(),
    db.collection("players").doc(playerId).get(),
  ]);
  if (!ligaSnap.exists) throw new HttpsError("not-found", "Liga no encontrada");
  if (!playerSnap.exists) throw new HttpsError("not-found", "Jugador no encontrado");

  // El jugador puede no tener cuenta vinculada todavia (uid): igual entra a
  // la liga por playerId, y su uid se suma a miembrosUid el dia que reclame
  // su ficha (queda pendiente para esa vinculacion, no lo hace esta funcion).
  const jugadorUid = playerSnap.data().uid || null;

  await Promise.all([
    db.collection("ligas").doc(ligaId).update({
      miembros: FieldValue.arrayUnion(playerId),
      ...(jugadorUid ? { miembrosUid: FieldValue.arrayUnion(jugadorUid) } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    db.collection("players").doc(playerId).update({
      ligas: FieldValue.arrayUnion(ligaId),
    }),
  ]);

  logger.info(`Jugador ${playerId} agregado a la liga ${ligaId}`);
  return { success: true };
});

/**
 * Alta por invitacion: la persona ya tiene un jugador reclamado (uid propio) y
 * se suma ella misma con un codigo que le paso el admin. Exige cuenta real
 * (no anonima), el mismo requisito que reclamar un jugador.
 */
exports.unirseALigaPorCodigo = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Hay que iniciar sesión");
  }
  if (request.auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("failed-precondition", "Hay que entrar con una cuenta, no de forma anónima");
  }

  const { codigo, playerId } = request.data || {};
  if (!codigo || !playerId) {
    throw new HttpsError("invalid-argument", "Faltan codigo o playerId");
  }

  const playerSnap = await db.collection("players").doc(playerId).get();
  if (!playerSnap.exists) throw new HttpsError("not-found", "Jugador no encontrado");
  if (playerSnap.data().uid !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Ese jugador no es tuyo");
  }

  const ligaQuery = await db.collection("ligas")
    .where("codigoInvitacion", "==", codigo.trim().toUpperCase())
    .limit(1)
    .get();
  if (ligaQuery.empty) throw new HttpsError("not-found", "Código de invitación inválido");
  const ligaDoc = ligaQuery.docs[0];

  await Promise.all([
    ligaDoc.ref.update({
      miembros: FieldValue.arrayUnion(playerId),
      miembrosUid: FieldValue.arrayUnion(request.auth.uid),
      updatedAt: FieldValue.serverTimestamp(),
    }),
    db.collection("players").doc(playerId).update({
      ligas: FieldValue.arrayUnion(ligaDoc.id),
    }),
  ]);

  logger.info(`Jugador ${playerId} se unió a la liga ${ligaDoc.id} por invitación`);
  return { success: true, ligaId: ligaDoc.id, ligaNombre: ligaDoc.data().nombre };
});
