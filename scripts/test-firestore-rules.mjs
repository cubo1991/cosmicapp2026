/**
 * Prueba de las reglas de vinculacion de cuenta (players.uid).
 *
 * Es el limite de seguridad del reclamo de jugador: si estas reglas estan mal,
 * cualquiera puede quedarse con el historial de otro. Se corre contra el
 * emulador de Firestore:
 *
 *   npm run test:rules
 *
 * ponytail: script pelado con assert, sin framework de tests. Si algun dia hay
 * varias suites, ahi si conviene un runner.
 */
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

const UID_GOOGLE = 'uid-de-david';
const UID_OTRO = 'uid-de-otra-persona';
const UID_ADMIN = 'uid-del-admin';

const env = await initializeTestEnvironment({
  projectId: 'reglas-cosmicapp',
  firestore: {
    rules: readFileSync('firestore.rules', 'utf8'),
    host: '127.0.0.1',
    port: 8080,
  },
});

/** Sesion de Google (no anonima), que es la que puede reclamar. */
const conGoogle = (uid = UID_GOOGLE) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'google.com' } }).firestore();

/** Sesion anonima: es la que usa la web para navegar sin login. */
const anonimo = () =>
  env.authenticatedContext('uid-anonimo', { firebase: { sign_in_provider: 'anonymous' } }).firestore();

async function sembrar() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    // Jugador historico: existe desde antes del login, nadie lo reclamo.
    await setDoc(doc(db, 'players/historico'), {
      name: 'David Lopez',
      email: 'david@ejemplo.com',
      estadisticas: { jugadas: 365, victorias: 112 },
    });
    // Jugador ya vinculado a otra cuenta.
    await setDoc(doc(db, 'players/reclamado'), {
      name: 'Pedro',
      email: 'pedro@ejemplo.com',
      uid: UID_OTRO,
    });
    // Un admin de verdad: su doc solo se crea a mano desde la consola.
    await setDoc(doc(db, `admins/${UID_ADMIN}`), { alta: true });
  });
}

const casos = [
  {
    nombre: 'una cuenta de Google reclama un jugador libre',
    esperado: 'permitido',
    accion: () => updateDoc(doc(conGoogle(), 'players/historico'), { uid: UID_GOOGLE }),
  },
  {
    nombre: 'una sesion anonima NO puede reclamar',
    esperado: 'denegado',
    accion: () => updateDoc(doc(anonimo(), 'players/historico'), { uid: 'uid-anonimo' }),
  },
  {
    nombre: 'no se puede reclamar un jugador que ya tiene dueño',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'players/reclamado'), { uid: UID_GOOGLE }),
  },
  {
    nombre: 'no se puede reclamar a nombre de otra cuenta',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'players/historico'), { uid: UID_OTRO }),
  },
  {
    nombre: 'no se puede aprovechar el reclamo para cambiar otro campo',
    esperado: 'denegado',
    accion: () =>
      updateDoc(doc(conGoogle(), 'players/historico'), { uid: UID_GOOGLE, name: 'Nombre robado' }),
  },
  {
    nombre: 'no se puede robar un jugador ya vinculado cambiandole el uid',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'players/reclamado'), { uid: UID_GOOGLE }),
  },
  {
    // Historia A2c del plan: alguien se vinculo al jugador equivocado y hay que
    // poder deshacerlo. Ademas prueba isAdmin(), que gobierna todos los borrados.
    nombre: 'un admin puede corregir una vinculacion equivocada',
    esperado: 'permitido',
    accion: () => updateDoc(doc(conGoogle(UID_ADMIN), 'players/reclamado'), { uid: UID_GOOGLE }),
  },
  {
    // El calculo de puntos actualiza stats de todos los jugadores de la partida,
    // no solo del propio: esto tiene que seguir funcionando.
    nombre: 'las escrituras normales de stats siguen permitidas',
    esperado: 'permitido',
    accion: () =>
      updateDoc(doc(anonimo(), 'players/reclamado'), { 'estadisticas.jugadas': 366 }),
  },
];

let fallaron = 0;

for (const caso of casos) {
  await sembrar();
  try {
    await (caso.esperado === 'permitido' ? assertSucceeds : assertFails)(caso.accion());
    console.log(`  OK   ${caso.nombre} (${caso.esperado})`);
  } catch (error) {
    fallaron++;
    console.error(`  FALLA ${caso.nombre} — se esperaba ${caso.esperado}`);
    console.error(`        ${error.message.split('\n')[0]}`);
  }
}

await env.cleanup();

console.log(fallaron === 0 ? `\n${casos.length} casos OK` : `\n${fallaron} caso(s) fallaron`);
process.exit(fallaron === 0 ? 0 : 1);
