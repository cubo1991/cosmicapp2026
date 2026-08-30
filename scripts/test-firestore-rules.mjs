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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
    await setDoc(doc(db, 'alienList/zombie'), { Nombre: 'Zombie' });

    // Una partida en curso y una copa activa, para probar los campos de resultado.
    await setDoc(doc(db, 'matches/partida'), {
      nombre: 'Partida de prueba',
      estado: 'activa',
      jugadores: {},
      alienesConfirmados: {},
    });
    await setDoc(doc(db, 'copas/copa'), {
      nombre: 'Copa de prueba',
      estado: 'activa',
      partidas: [],
      ranking: {},
    });

    // Una liga con David como miembro (uid real, de una cuenta de Google),
    // para probar pertenencia. UID_OTRO no es miembro de ninguna.
    await setDoc(doc(db, 'ligas/liga1'), {
      nombre: 'LCE',
      estado: 'activa',
      miembros: ['historico'],
      miembrosUid: [UID_GOOGLE],
    });
    await setDoc(doc(db, 'players/historico/ligaStats/liga1'), {
      stats: { partidas: 10 },
      estadisticas: { jugadas: 10 },
    });
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
    nombre: 'una sesion anonima ya no puede tocar estadisticas de nadie',
    esperado: 'denegado',
    accion: () =>
      updateDoc(doc(anonimo(), 'players/reclamado'), { 'estadisticas.jugadas': 366 }),
  },
  {
    // La web navega con sesion anonima: si esto se denegara, se romperian la
    // lista de aliens, el asignador aleatorio y el generador de nombres.
    nombre: 'la sesion anonima puede leer el catalogo de aliens',
    esperado: 'permitido',
    accion: () => getDoc(doc(anonimo(), 'alienList/zombie')),
  },
  {
    nombre: 'nadie que no sea admin puede escribir el catalogo de aliens',
    esperado: 'denegado',
    accion: () => setDoc(doc(conGoogle(), 'alienList/inventado'), { Nombre: 'Falso' }),
  },

  // ---- Campos de resultado: solo los escribe la Cloud Function ----
  {
    nombre: 'nadie puede inventarse los puntos de una partida',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'matches/partida'), {
      jugadores: { [UID_GOOGLE]: { puntos: { total: 9999 } } },
    }),
  },
  {
    nombre: 'nadie puede reescribir el ranking de una copa',
    esperado: 'denegado',
    accion: () => updateDoc(doc(anonimo(), 'copas/copa'), {
      ranking: { [UID_GOOGLE]: { puntosTotales: 9999 } },
    }),
  },
  {
    nombre: 'nadie puede adjudicarse una copa',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'copas/copa'), {
      ganador: { nombre: 'Yo', puntosTotales: 1 },
    }),
  },
  {
    nombre: 'nadie puede tocar sus stats ni su puntaje del ranking global',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'players/historico'), { last10Score: 9999 }),
  },
  {
    // Los flujos que siguen vivos en la web tienen que seguir andando: agregar
    // una partida al ciclo de la copa no toca el ranking.
    nombre: 'agregar una partida al ciclo de la copa sigue permitido',
    esperado: 'permitido',
    accion: () => updateDoc(doc(anonimo(), 'copas/copa'), {
      partidas: [{ posicion: 1, matchId: 'x', estado: 'pendiente' }],
    }),
  },
  {
    nombre: 'marcar el alien elegido en una partida sigue permitido',
    esperado: 'permitido',
    accion: () => updateDoc(doc(anonimo(), 'matches/partida'), {
      'alienesConfirmados.jugador1': 'alien-7',
    }),
  },
  {
    nombre: 'un jugador comun no puede inflarse las estadisticas historicas',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'players/historico'), {
      'estadisticas.copas': 99,
    }),
  },
  {
    // El panel admin edita a mano victorias especiales, campañas y pijones.
    nombre: 'un admin si puede editar estadisticas historicas',
    esperado: 'permitido',
    accion: () => updateDoc(doc(conGoogle(UID_ADMIN), 'players/historico'), {
      'estadisticas.victoriasEspeciales': 8,
    }),
  },
  {
    nombre: 'un admin si puede corregir los puntos de una partida',
    esperado: 'permitido',
    accion: () => updateDoc(doc(conGoogle(UID_ADMIN), 'matches/partida'), {
      resumen: { totalParticipantes: 3 },
    }),
  },

  // ---- Multi-liga (Fase 3): pertenencia y alta manual ----
  {
    // El alta a una liga la hace el admin (a mano o por invitación), no el
    // propio interesado.
    nombre: 'un jugador comun no puede agregarse solo a una liga',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'ligas/liga1'), {
      miembros: ['historico', 'intruso'],
      miembrosUid: [UID_GOOGLE, UID_OTRO],
    }),
  },
  {
    nombre: 'un admin si puede agregar un miembro a una liga',
    esperado: 'permitido',
    accion: () => updateDoc(doc(conGoogle(UID_ADMIN), 'ligas/liga1'), {
      miembros: ['historico', 'nuevo'],
      miembrosUid: [UID_GOOGLE, UID_OTRO],
    }),
  },
  {
    // Otros campos de la liga (nombre, descripcion, estado) siguen editables,
    // solo se cerró miembros/miembrosUid.
    nombre: 'editar el nombre de una liga sigue permitido',
    esperado: 'permitido',
    accion: () => updateDoc(doc(conGoogle(), 'ligas/liga1'), { nombre: 'LCE renombrada' }),
  },
  {
    nombre: 'un jugador comun no puede meterse solo a una liga tocando su propio campo `ligas`',
    esperado: 'denegado',
    accion: () => updateDoc(doc(conGoogle(), 'players/historico'), { ligas: ['liga1'] }),
  },
  {
    nombre: 'quien pertenece a la liga puede leer sus ligaStats',
    esperado: 'permitido',
    accion: () => getDoc(doc(conGoogle(), 'players/historico/ligaStats/liga1')),
  },
  {
    nombre: 'quien NO pertenece a la liga no puede leer sus ligaStats',
    esperado: 'denegado',
    accion: () => getDoc(doc(conGoogle(UID_OTRO), 'players/historico/ligaStats/liga1')),
  },
  {
    nombre: 'una sesion anonima no puede leer ligaStats ajenos',
    esperado: 'denegado',
    accion: () => getDoc(doc(anonimo(), 'players/historico/ligaStats/liga1')),
  },
  {
    nombre: 'nadie (ni siquiera un miembro) puede escribir ligaStats desde el cliente',
    esperado: 'denegado',
    accion: () => setDoc(doc(conGoogle(), 'players/historico/ligaStats/liga1'), { stats: { partidas: 999 } }),
  },
  {
    nombre: 'un admin si puede escribir ligaStats a mano',
    esperado: 'permitido',
    accion: () => setDoc(doc(conGoogle(UID_ADMIN), 'players/historico/ligaStats/liga1'), { stats: { partidas: 11 } }),
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
