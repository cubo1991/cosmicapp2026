/**
 * Prueba de la migración a Liga 1 contra el emulador de Firestore.
 *
 * No toca producción: usa el Admin SDK apuntado al emulador (variable
 * FIRESTORE_EMULATOR_HOST, que pone `firebase emulators:exec`).
 *
 *   npm run test:migrar-liga1
 */
const assert = require('node:assert/strict');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { ejecutarMigracion, LIGA_ID } = require('./migrar-liga1');

initializeApp({ projectId: 'cosmic-selector' });
const db = getFirestore();

async function limpiar() {
  for (const col of ['players', 'copas', 'matches', 'ligas']) {
    // eslint-disable-next-line no-await-in-loop
    const snap = await db.collection(col).get();
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

async function sembrar() {
  await db.collection('players').doc('ana').set({
    name: 'Ana',
    email: 'ana@ejemplo.com',
    uid: 'uid-ana',
    stats: { partidas: 5, victorias: 2, puntosPromedio: 7.4 },
    estadisticas: { jugadas: 5, victorias: 2, colonias: 10, copas: 1, podioCopas: 10 },
    last10Score: 40,
    last3Score: 15,
  });
  await db.collection('players').doc('ana').collection('lastMatches').doc('m1').set({
    matchId: 'm1',
    puntos: 9,
  });

  await db.collection('players').doc('beto').set({
    name: 'Beto', email: 'beto@ejemplo.com', stats: {}, estadisticas: {},
  });

  await db.collection('copas').doc('copa1').set({ nombre: 'Copa vieja', estado: 'finalizada' });
  await db.collection('matches').doc('match1').set({ nombre: 'Partida vieja', estado: 'finalizada', jugadores: [] });
}

const pruebas = [];
function prueba(nombre, fn) { pruebas.push({ nombre, fn }); }

prueba('dry run no escribe nada', async () => {
  await limpiar();
  await sembrar();
  const reporte = await ejecutarMigracion(db, { aplicar: false });
  assert.equal(reporte.jugadores, 2);
  const liga = await db.collection('ligas').doc(LIGA_ID).get();
  assert.equal(liga.exists, false, 'en dry-run no debe crear la liga');
});

prueba('crea liga1 con todos los jugadores como miembros', async () => {
  await limpiar();
  await sembrar();
  await ejecutarMigracion(db, { aplicar: true });
  const liga = (await db.collection('ligas').doc(LIGA_ID).get()).data();
  assert.deepEqual(new Set(liga.miembros), new Set(['ana', 'beto']));
  assert.deepEqual(liga.miembrosUid, ['uid-ana']);
  assert.equal(liga.estado, 'activa');
});

prueba('copia stats y estadisticas a ligaStats sin borrar los campos viejos', async () => {
  await limpiar();
  await sembrar();
  await ejecutarMigracion(db, { aplicar: true });

  const ligaStats = (await db.collection('players').doc('ana').collection('ligaStats').doc(LIGA_ID).get()).data();
  assert.equal(ligaStats.stats.partidas, 5);
  assert.equal(ligaStats.estadisticas.copas, 1);
  assert.equal(ligaStats.last10Score, 40);

  const ana = (await db.collection('players').doc('ana').get()).data();
  assert.equal(ana.stats.partidas, 5, 'el campo viejo sigue estando (se borra recién en la Fase 6)');
  assert.deepEqual(ana.ligas, [LIGA_ID]);
});

prueba('backfillea ligaId en copas, matches y lastMatches', async () => {
  await limpiar();
  await sembrar();
  await ejecutarMigracion(db, { aplicar: true });

  assert.equal((await db.collection('copas').doc('copa1').get()).data().ligaId, LIGA_ID);
  assert.equal((await db.collection('matches').doc('match1').get()).data().ligaId, LIGA_ID);
  assert.equal(
    (await db.collection('players').doc('ana').collection('lastMatches').doc('m1').get()).data().ligaId,
    LIGA_ID
  );
});

prueba('correrla dos veces es idempotente', async () => {
  await limpiar();
  await sembrar();
  await ejecutarMigracion(db, { aplicar: true });
  const reporte2 = await ejecutarMigracion(db, { aplicar: true });

  assert.equal(reporte2.ligaStatsCreados, 0, 'la segunda vez no debe recrear ligaStats');
  assert.equal(reporte2.copasActualizadas, 0);
  assert.equal(reporte2.matchesActualizados, 0);
  assert.equal(reporte2.lastMatchesActualizados, 0);

  const liga = (await db.collection('ligas').doc(LIGA_ID).get()).data();
  assert.deepEqual(new Set(liga.miembros), new Set(['ana', 'beto']), 'no debe duplicar miembros');
});

prueba('no pisa un ligaId que ya estaba puesto (datos de otra liga)', async () => {
  await limpiar();
  await db.collection('players').doc('cacho').set({ name: 'Cacho', email: 'cacho@ejemplo.com' });
  await db.collection('matches').doc('m-otra-liga').set({ nombre: 'De otra liga', ligaId: 'liga2' });

  await ejecutarMigracion(db, { aplicar: true });

  assert.equal((await db.collection('matches').doc('m-otra-liga').get()).data().ligaId, 'liga2');
});

(async () => {
  const fallos = [];
  for (const { nombre, fn } of pruebas) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await fn();
      console.log(`  OK    ${nombre}`);
    } catch (error) {
      fallos.push(nombre);
      console.error(`  FALLA ${nombre}`);
      console.error(`        ${error.message.split('\n')[0]}`);
    }
  }
  console.log(fallos.length === 0 ? `\n${pruebas.length} pruebas OK` : `\n${fallos.length} fallaron`);
  process.exit(fallos.length === 0 ? 0 : 1);
})();
