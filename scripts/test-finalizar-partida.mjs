/**
 * Prueba de la Cloud Function `finalizarPartida` contra los emuladores.
 *
 * Es la red de seguridad de la migracion: esta funcion concentra el calculo de
 * puntos, el ranking de la copa, el cierre de la copa a las 10 partidas y las
 * estadisticas historicas. Un error aca corrompe datos que no se recuperan.
 *
 *   npm run test:finalizar
 *
 * ponytail: script pelado con assert, igual que test-firestore-rules.mjs.
 */
import assert from 'node:assert/strict';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, collection, getDocs,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

const app = initializeApp({ projectId: 'cosmic-selector', apiKey: 'fake-para-emulador' });
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
connectFunctionsEmulator(functions, '127.0.0.1', 5001);

await signInAnonymously(auth);
const finalizarPartida = httpsCallable(functions, 'finalizarPartida');

const ANA = 'jugador-ana';
const BETO = 'jugador-beto';
const CACHO = 'jugador-cacho';

/** Deja la base con una copa activa y una partida en la posicion indicada. */
async function sembrar({ posicion, partidasPrevias = [] }) {
  for (const [id, nombre] of [[ANA, 'Ana'], [BETO, 'Beto'], [CACHO, 'Cacho']]) {
    await setDoc(doc(db, 'players', id), {
      name: nombre,
      email: `${nombre.toLowerCase()}@ejemplo.com`,
      stats: { partidas: 0, victorias: 0, puntosPromedio: 0 },
      estadisticas: { jugadas: 0, victorias: 0, colonias: 0, copas: 0, podioCopas: 0 },
    });
  }

  const partidas = [
    ...partidasPrevias,
    { posicion, matchId: 'partida-test', fechaJuego: new Date(), estado: 'pendiente' },
  ];

  await setDoc(doc(db, 'copas', 'copa-test'), {
    nombre: 'Copa de prueba',
    estado: 'activa',
    partidas,
    ranking: {},
  });

  await setDoc(doc(db, 'matches', 'partida-test'), {
    nombre: 'Partida de prueba',
    codigo: 'TEST01',
    estado: 'activa',
    copId: 'copa-test',
    posicion,
    asociarACopa: true,
    sessionId: 'ses-test',
    fechaCreacion: new Date(Date.now() - 90 * 60 * 1000), // 90 minutos atras
    jugadores: [],
  });
}

/** Ana gana con 3 internas y 2 externas; Beto juega y pierde; Cacho no jugo. */
const RESULTADO_TIPICO = {
  [ANA]: { nombre: 'Ana', playerId: ANA, CI: 3, CE: 2, ganador: true, 'participó': true },
  [BETO]: { nombre: 'Beto', playerId: BETO, CI: 1, CE: 1, ganador: false, 'participó': true },
  [CACHO]: { nombre: 'Cacho', playerId: CACHO, CI: 0, CE: 0, ganador: false, 'participó': false },
};

const pruebas = [];
const fallos = [];

function prueba(nombre, fn) { pruebas.push({ nombre, fn }); }

prueba('calcula los puntos con la formula de la liga', async () => {
  await sembrar({ posicion: 1 });
  await finalizarPartida({ matchId: 'partida-test', resultados: RESULTADO_TIPICO });

  const match = (await getDoc(doc(db, 'matches', 'partida-test'))).data();
  assert.equal(match.estado, 'finalizada');

  // Ana: colonias 3x1 + 2x2 = 7, victoria 2 participantes / 1 ganador = 2 -> 9
  assert.equal(match.jugadores[ANA].puntos.colonias, 7);
  assert.equal(match.jugadores[ANA].puntos.victoria, 2);
  assert.equal(match.jugadores[ANA].puntos.total, 9);

  // Beto: 1x1 + 1x2 = 3, sin victoria
  assert.equal(match.jugadores[BETO].puntos.total, 3);

  // Cacho queda registrado pero en cero
  assert.equal(match.jugadores[CACHO]['participó'], false);
  assert.equal(match.jugadores[CACHO].puntos.total, 0);

  assert.equal(match.resumen.totalParticipantes, 2);
  assert.equal(match.resumen.puntosVictoria, 2);
});

prueba('suma al ranking de la copa solo a quien participo', async () => {
  await sembrar({ posicion: 1 });
  await finalizarPartida({ matchId: 'partida-test', resultados: RESULTADO_TIPICO });

  const copa = (await getDoc(doc(db, 'copas', 'copa-test'))).data();
  assert.equal(copa.ranking[ANA].puntosTotales, 9);
  assert.equal(copa.ranking[BETO].puntosTotales, 3);
  assert.equal(copa.ranking[CACHO].puntosTotales, 0);
  assert.equal(copa.ranking[ANA].posicion, 1, 'Ana debe quedar primera');
  assert.equal(copa.partidas.find((p) => p.posicion === 1).estado, 'cargada');
});

prueba('recargar una partida corrige en vez de duplicar puntos', async () => {
  await sembrar({ posicion: 1 });
  await finalizarPartida({ matchId: 'partida-test', resultados: RESULTADO_TIPICO });
  // Se vuelve a cargar con menos colonias para Ana: 1x1 + 1x2 = 3, +2 victoria = 5
  await finalizarPartida({
    matchId: 'partida-test',
    resultados: {
      ...RESULTADO_TIPICO,
      [ANA]: { ...RESULTADO_TIPICO[ANA], CI: 1, CE: 1 },
    },
  });

  const copa = (await getDoc(doc(db, 'copas', 'copa-test'))).data();
  assert.equal(copa.ranking[ANA].puntosTotales, 5, 'no debe acumular las dos cargas');
});

prueba('cierra la copa y adjudica ganador en la partida 10', async () => {
  const previas = Array.from({ length: 9 }, (_, i) => ({
    posicion: i + 1, matchId: `vieja-${i}`, fechaJuego: new Date(), estado: 'cargada',
  }));
  await sembrar({ posicion: 10, partidasPrevias: previas });
  const res = await finalizarPartida({ matchId: 'partida-test', resultados: RESULTADO_TIPICO });

  const copa = (await getDoc(doc(db, 'copas', 'copa-test'))).data();
  assert.equal(copa.estado, 'finalizada', 'la copa tiene que cerrarse');
  assert.equal(copa.ganador.playerId, ANA);
  assert.equal(copa.ganador.puntosTotales, 9);
  assert.equal(res.data.copaCerrada.nombre, 'Ana');

  const ana = (await getDoc(doc(db, 'players', ANA))).data();
  assert.equal(ana.estadisticas.copas, 1, 'la ganadora suma una copa');
  assert.equal(ana.estadisticas.podioCopas, 10);
  const beto = (await getDoc(doc(db, 'players', BETO))).data();
  assert.equal(beto.estadisticas.podioCopas, 7);
  assert.equal(beto.estadisticas.copas, 0);
});

prueba('actualiza estadisticas historicas solo de quien jugo', async () => {
  await sembrar({ posicion: 1 });
  await finalizarPartida({ matchId: 'partida-test', resultados: RESULTADO_TIPICO });

  const ana = (await getDoc(doc(db, 'players', ANA))).data();
  assert.equal(ana.estadisticas.jugadas, 1);
  assert.equal(ana.estadisticas.victorias, 1);
  assert.equal(ana.estadisticas.colonias, 2, 'colonias cuenta las externas');
  assert.equal(ana.stats.partidas, 1);
  assert.equal(ana.stats.puntosPromedio, 9);

  const cacho = (await getDoc(doc(db, 'players', CACHO))).data();
  assert.equal(cacho.estadisticas.jugadas, 0, 'quien no jugo no suma partidas');
  assert.equal(cacho.stats.partidas, 0);
});

prueba('registra la partida para el ranking global', async () => {
  await sembrar({ posicion: 1 });
  await finalizarPartida({ matchId: 'partida-test', resultados: RESULTADO_TIPICO });

  const ana = (await getDoc(doc(db, 'players', ANA))).data();
  assert.equal(ana.last10Score, 9);
  assert.equal(ana.last3Score, 9);

  const sub = await getDocs(collection(db, 'players', ANA, 'lastMatches'));
  assert.equal(sub.size, 1);
  assert.equal(sub.docs[0].data().puntos, 9);
  assert.equal(sub.docs[0].data().cantJugadores, 2);

  const subCacho = await getDocs(collection(db, 'players', CACHO, 'lastMatches'));
  assert.equal(subCacho.size, 0, 'quien no jugo no entra al ranking global');
});

prueba('rechaza una partida sin ganador', async () => {
  await sembrar({ posicion: 1 });
  await assert.rejects(
    finalizarPartida({
      matchId: 'partida-test',
      resultados: {
        [ANA]: { nombre: 'Ana', playerId: ANA, CI: 1, CE: 0, ganador: false, 'participó': true },
      },
    }),
    /ganador/i
  );
});

prueba('no toca la copa si la partida es de visitantes', async () => {
  await sembrar({ posicion: 1 });
  await setDoc(doc(db, 'matches', 'partida-test'), {
    nombre: 'Con visitantes', estado: 'activa', copId: 'copa-test', posicion: 1,
    asociarACopa: false, fechaCreacion: new Date(), jugadores: [],
  });
  await finalizarPartida({
    matchId: 'partida-test',
    resultados: {
      visitante1: { nombre: 'Visitante rojo', playerId: null, CI: 2, CE: 1, ganador: true, 'participó': true },
      visitante2: { nombre: 'Visitante azul', playerId: null, CI: 1, CE: 0, ganador: false, 'participó': true },
    },
  });

  const copa = (await getDoc(doc(db, 'copas', 'copa-test'))).data();
  assert.deepEqual(copa.ranking, {}, 'la copa no se toca');
  const match = (await getDoc(doc(db, 'matches', 'partida-test'))).data();
  assert.equal(match.jugadores.visitante1.puntos.total, 6, '2x1 + 1x2 + 2/1 victoria');
});

for (const { nombre, fn } of pruebas) {
  try {
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
