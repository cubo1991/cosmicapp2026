/**
 * Migración de datos existentes a "Liga 1" — Fase 1 de docs/PLAN_MULTI_LIGA.md.
 *
 * Deja todo lo que ya existe (jugadores, copas, partidas, historial) marcado
 * como perteneciente a la liga original, sin la cual el resto del plan
 * multi-liga (Fases 2 en adelante) rompería los datos reales.
 *
 * No borra ni pisa nada de lo viejo: copia `stats`/`estadisticas`/
 * `last10Score`/`last3Score` a `players/{id}/ligaStats/liga1`, pero deja los
 * campos planos en `players` intactos (se borran recién en la Fase 6, después
 * de confirmar que todo lector ya usa la subcolección). Tampoco toca un
 * `ligaId` que ya esté puesto (por si ya hay datos de otra liga).
 *
 * Idempotente: correrla dos veces no duplica miembros ni recrea lo ya migrado,
 * así que si se corta a mitad de camino se puede volver a correr tal cual.
 *
 * Uso (desde la raíz del repo):
 *   node functions/scripts/migrar-liga1.js              # dry-run, no escribe nada
 *   node functions/scripts/migrar-liga1.js --apply       # escribe de verdad
 *
 * Contra el emulador, para probarla sin tocar producción:
 *   npm run test:migrar-liga1
 *
 * Contra producción: hace falta estar autenticado como alguien con permisos de
 * Admin SDK sobre el proyecto (`gcloud auth application-default login`, o
 * GOOGLE_APPLICATION_CREDENTIALS apuntando a una service account). Antes de
 * correr con --apply contra producción, hacer un export de Firestore
 * (`firebase firestore:export gs://<bucket>/backup-pre-liga1`).
 */
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const LIGA_ID = 'liga1';

// Mismo alfabeto que generarCodigo() en functions/index.js (sin 0/O ni 1/I).
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generarCodigo() {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function enGrupos(arr, tam) {
  const grupos = [];
  for (let i = 0; i < arr.length; i += tam) grupos.push(arr.slice(i, i + tam));
  return grupos;
}

/** Firestore permite hasta 500 escrituras por batch; se usa 400 de margen. */
async function aplicarEnLotes(db, cambios, aplicar) {
  if (!aplicar || cambios.length === 0) return;
  for (const grupo of enGrupos(cambios, 400)) {
    const batch = db.batch();
    grupo.forEach((c) => batch.set(c.ref, c.data, { merge: c.merge !== false }));
    await batch.commit();
  }
}

/**
 * @param {FirebaseFirestore.Firestore} db
 * @param {{ aplicar?: boolean }} opciones
 */
async function ejecutarMigracion(db, { aplicar = false } = {}) {
  const reporte = {
    liga1Creada: false,
    jugadores: 0,
    ligaStatsCreados: 0,
    ligaStatsYaExistian: 0,
    copasActualizadas: 0,
    matchesActualizados: 0,
    lastMatchesActualizados: 0,
  };

  const ligaRef = db.collection('ligas').doc(LIGA_ID);
  const ligaSnap = await ligaRef.get();
  const cambiosLiga = { updatedAt: FieldValue.serverTimestamp() };

  if (!ligaSnap.exists) {
    reporte.liga1Creada = true;
    Object.assign(cambiosLiga, {
      nombre: 'LCE',
      descripcion: 'Liga original, migrada automáticamente al pasar a multi-liga',
      estado: 'activa',
      miembros: [],
      miembrosUid: [],
      codigoInvitacion: generarCodigo(),
      creadaPor: 'migracion-liga1',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  // ---- players: liga1 como miembro de todos, y copia de stats a ligaStats ----
  const playersSnap = await db.collection('players').get();
  const miembros = [];
  const miembrosUid = [];
  const cambiosPlayers = [];

  for (const doc of playersSnap.docs) {
    const data = doc.data();
    reporte.jugadores++;
    miembros.push(doc.id);
    if (data.uid) miembrosUid.push(data.uid);

    cambiosPlayers.push({ ref: doc.ref, data: { ligas: FieldValue.arrayUnion(LIGA_ID) } });

    const ligaStatsRef = doc.ref.collection('ligaStats').doc(LIGA_ID);
    // eslint-disable-next-line no-await-in-loop -- volumen chico (jugadores de una liga de amigos)
    const ligaStatsSnap = await ligaStatsRef.get();
    if (ligaStatsSnap.exists) {
      reporte.ligaStatsYaExistian++;
      continue;
    }
    reporte.ligaStatsCreados++;
    cambiosPlayers.push({
      ref: ligaStatsRef,
      merge: false,
      data: {
        stats: data.stats || { partidas: 0, victorias: 0, puntosPromedio: 0, ultimaPartida: null },
        estadisticas: data.estadisticas || {},
        last10Score: data.last10Score || 0,
        last3Score: data.last3Score || 0,
        migradoDesde: 'players (raíz)',
        migradoAt: FieldValue.serverTimestamp(),
      },
    });
  }

  if (miembros.length > 0) cambiosLiga.miembros = FieldValue.arrayUnion(...miembros);
  if (miembrosUid.length > 0) cambiosLiga.miembrosUid = FieldValue.arrayUnion(...miembrosUid);

  // ---- copas y matches sin ligaId: se asumen de la liga original ----
  const copasSnap = await db.collection('copas').get();
  const cambiosCopas = [];
  copasSnap.docs.forEach((doc) => {
    if (doc.data().ligaId) return;
    reporte.copasActualizadas++;
    cambiosCopas.push({ ref: doc.ref, data: { ligaId: LIGA_ID } });
  });

  const matchesSnap = await db.collection('matches').get();
  const cambiosMatches = [];
  matchesSnap.docs.forEach((doc) => {
    if (doc.data().ligaId) return;
    reporte.matchesActualizados++;
    cambiosMatches.push({ ref: doc.ref, data: { ligaId: LIGA_ID } });
  });

  // ---- lastMatches de todos los jugadores (collection group, sin recorrer uno por uno) ----
  const lastMatchesSnap = await db.collectionGroup('lastMatches').get();
  const cambiosLastMatches = [];
  lastMatchesSnap.docs.forEach((doc) => {
    if (doc.data().ligaId) return;
    reporte.lastMatchesActualizados++;
    cambiosLastMatches.push({ ref: doc.ref, data: { ligaId: LIGA_ID } });
  });

  await aplicarEnLotes(db, [{ ref: ligaRef, data: cambiosLiga }], aplicar);
  await aplicarEnLotes(db, cambiosPlayers, aplicar);
  await aplicarEnLotes(db, cambiosCopas, aplicar);
  await aplicarEnLotes(db, cambiosMatches, aplicar);
  await aplicarEnLotes(db, cambiosLastMatches, aplicar);

  return reporte;
}

if (require.main === module) {
  const { initializeApp } = require('firebase-admin/app');
  const aplicar = process.argv.includes('--apply');

  initializeApp();
  const db = getFirestore();

  ejecutarMigracion(db, { aplicar })
    .then((reporte) => {
      console.log(aplicar ? '=== Migración aplicada ===' : '=== DRY RUN (nada escrito; usar --apply para aplicar de verdad) ===');
      console.log(reporte);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error en la migración:', error);
      process.exit(1);
    });
}

module.exports = { ejecutarMigracion, LIGA_ID };
