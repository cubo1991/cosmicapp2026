/**
 * Prueba de las Cloud Functions de gestion de ligas (Fase 4 del multi-liga)
 * contra los emuladores: crearLiga, agregarMiembroALiga, unirseALigaPorCodigo.
 *
 *   npm run test:gestion-ligas
 *
 * A diferencia de test-finalizar-partida.mjs, estas functions distinguen
 * admin / dueño de un jugador / sesion anonima, asi que hace falta mas de una
 * identidad real. Cada una es su propia app de Firebase (mismo truco que usa
 * la propia app para manejar varias sesiones), logueada por email/password
 * contra el emulador de Auth — no importa el metodo, solo que no sea anonimo.
 *
 * ponytail: script pelado con assert, igual que el resto de scripts/test-*.
 */
import assert from 'node:assert/strict';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInAnonymously, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

let contadorApps = 0;
async function nuevaSesion() {
  const app = initializeApp({ projectId: 'cosmic-selector', apiKey: 'fake-para-emulador' }, `sesion-${contadorApps++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return { auth, functions };
}

/** Cuenta real (no anonima): alcanza con email/password, el requisito es solo "no anonimo". */
async function cuentaReal(email) {
  const sesion = await nuevaSesion();
  const cred = await createUserWithEmailAndPassword(sesion.auth, email, 'password123');
  return { ...sesion, uid: cred.user.uid };
}

async function cuentaAnonima() {
  const sesion = await nuevaSesion();
  await signInAnonymously(sesion.auth);
  return sesion;
}

const llamar = (sesion, nombreFn, data) => httpsCallable(sesion.functions, nombreFn)(data);

// Sesion aparte, solo para leer Firestore y verificar los asserts.
const appLectura = initializeApp({ projectId: 'cosmic-selector', apiKey: 'fake-para-emulador' }, 'lectura');
const db = getFirestore(appLectura);
connectFirestoreEmulator(db, '127.0.0.1', 8080);
const authLectura = getAuth(appLectura);
connectAuthEmulator(authLectura, 'http://127.0.0.1:9099', { disableWarnings: true });
await signInAnonymously(authLectura);

const entornoSinReglas = await initializeTestEnvironment({
  projectId: 'cosmic-selector',
  firestore: { rules: 'service cloud.firestore { match /databases/{d}/documents { match /{p=**} { allow read, write: if true; } } }', host: '127.0.0.1', port: 8080 },
});
const sinReglas = (fn) => entornoSinReglas.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

// Identidades creadas una sola vez: los uids no cambian entre pruebas, lo que
// se resetea en cada `sembrar()` es el estado de Firestore.
const admin = await cuentaReal('admin@gestion-test.com');
const ana = await cuentaReal('ana@gestion-test.com');
const beto = await cuentaReal('beto@gestion-test.com');
const anonimo = await cuentaAnonima();

const ANA = 'jugador-ana-gestion';
const BETO = 'jugador-beto-gestion';
const CACHO = 'jugador-cacho-gestion'; // sin uid, todavia no reclamado

async function sembrar() {
  await sinReglas(async (db) => {
    await setDoc(doc(db, 'admins', admin.uid), { alta: true });
    await setDoc(doc(db, 'players', ANA), { name: 'Ana', email: 'ana@ejemplo.com', uid: ana.uid });
    await setDoc(doc(db, 'players', BETO), { name: 'Beto', email: 'beto@ejemplo.com', uid: beto.uid });
    await setDoc(doc(db, 'players', CACHO), { name: 'Cacho', email: 'cacho@ejemplo.com' });
    await setDoc(doc(db, 'ligas', 'liga-test'), {
      nombre: 'Liga de prueba',
      estado: 'activa',
      miembros: [],
      miembrosUid: [],
      codigoInvitacion: 'ABC123',
    });
  });
}

const pruebas = [];
const fallos = [];
function prueba(nombre, fn) { pruebas.push({ nombre, fn }); }

// ---- crearLiga ----

prueba('un admin puede crear una liga', async () => {
  await sembrar();
  const res = await llamar(admin, 'crearLiga', { nombre: 'Liga Nueva', descripcion: 'test' });
  assert.equal(res.data.nombre, 'Liga Nueva');
  assert.deepEqual(res.data.miembros, []);
  assert.match(res.data.codigoInvitacion, /^[A-Z2-9]{6}$/);

  const liga = (await getDoc(doc(db, 'ligas', res.data.id))).data();
  assert.equal(liga.creadaPor, admin.uid);
});

prueba('un jugador comun no puede crear una liga', async () => {
  await sembrar();
  await assert.rejects(llamar(ana, 'crearLiga', { nombre: 'Liga Trucha' }), /admin/i);
});

prueba('crear una liga sin nombre falla', async () => {
  await sembrar();
  await assert.rejects(llamar(admin, 'crearLiga', {}), /nombre/i);
});

// ---- agregarMiembroALiga ----

prueba('un admin puede agregar un jugador con cuenta vinculada', async () => {
  await sembrar();
  await llamar(admin, 'agregarMiembroALiga', { ligaId: 'liga-test', playerId: ANA });

  const liga = (await getDoc(doc(db, 'ligas', 'liga-test'))).data();
  assert.deepEqual(liga.miembros, [ANA]);
  assert.deepEqual(liga.miembrosUid, [ana.uid]);

  const jugador = (await getDoc(doc(db, 'players', ANA))).data();
  assert.deepEqual(jugador.ligas, ['liga-test']);
});

prueba('agregar un jugador sin cuenta vinculada no rompe (no entra a miembrosUid)', async () => {
  await sembrar();
  await llamar(admin, 'agregarMiembroALiga', { ligaId: 'liga-test', playerId: CACHO });

  const liga = (await getDoc(doc(db, 'ligas', 'liga-test'))).data();
  assert.deepEqual(liga.miembros, [CACHO]);
  assert.deepEqual(liga.miembrosUid, [], 'sin uid no hay nada que sumar a miembrosUid');
});

prueba('agregar el mismo jugador dos veces no lo duplica', async () => {
  await sembrar();
  await llamar(admin, 'agregarMiembroALiga', { ligaId: 'liga-test', playerId: ANA });
  await llamar(admin, 'agregarMiembroALiga', { ligaId: 'liga-test', playerId: ANA });

  const liga = (await getDoc(doc(db, 'ligas', 'liga-test'))).data();
  assert.deepEqual(liga.miembros, [ANA]);
});

prueba('un jugador comun no puede agregar miembros', async () => {
  await sembrar();
  await assert.rejects(
    llamar(beto, 'agregarMiembroALiga', { ligaId: 'liga-test', playerId: ANA }),
    /admin/i
  );
});

prueba('agregar a una liga inexistente falla', async () => {
  await sembrar();
  await assert.rejects(
    llamar(admin, 'agregarMiembroALiga', { ligaId: 'no-existe', playerId: ANA }),
    /no encontrada/i
  );
});

// ---- unirseALigaPorCodigo ----

prueba('el dueño de un jugador reclamado se une con el codigo', async () => {
  await sembrar();
  const res = await llamar(ana, 'unirseALigaPorCodigo', { codigo: 'ABC123', playerId: ANA });
  assert.equal(res.data.ligaId, 'liga-test');

  const liga = (await getDoc(doc(db, 'ligas', 'liga-test'))).data();
  assert.deepEqual(liga.miembros, [ANA]);
  assert.deepEqual(liga.miembrosUid, [ana.uid]);
});

prueba('el codigo no distingue mayusculas/minusculas', async () => {
  await sembrar();
  const res = await llamar(ana, 'unirseALigaPorCodigo', { codigo: 'abc123', playerId: ANA });
  assert.equal(res.data.ligaId, 'liga-test');
});

prueba('no te podes unir usando el jugador de otra persona', async () => {
  await sembrar();
  await assert.rejects(
    llamar(beto, 'unirseALigaPorCodigo', { codigo: 'ABC123', playerId: ANA }),
    /no es tuyo/i
  );
});

prueba('un codigo invalido se rechaza', async () => {
  await sembrar();
  await assert.rejects(
    llamar(ana, 'unirseALigaPorCodigo', { codigo: 'ZZZZZZ', playerId: ANA }),
    /inv[aá]lid/i
  );
});

prueba('una sesion anonima no puede unirse por codigo', async () => {
  await sembrar();
  await assert.rejects(
    llamar(anonimo, 'unirseALigaPorCodigo', { codigo: 'ABC123', playerId: ANA }),
    /an[oó]nima/i
  );
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
