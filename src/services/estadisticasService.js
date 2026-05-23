'use client';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';

// Datos históricos del Excel LCE — snapshot inicial
// Clave = nombre exacto del jugador en Firebase (campo 'name')
const DATOS_EXCEL = {
  'David Lopez': { jugadas: 365, victorias: 112, colonias: 1384, victoriasEspeciales: 7,  campanas: 0, copas: 9,  ataqueSolitario: 194, defensaSolitaria: 115, pijon: 2, podioCopas: 0  },
  'JM':          { jugadas: 221, victorias: 58,  colonias: 680,  victoriasEspeciales: 4,  campanas: 1, copas: 2,  ataqueSolitario: 124, defensaSolitaria: 158, pijon: 0, podioCopas: 0  },
  'Arrigo':      { jugadas: 239, victorias: 102, colonias: 932,  victoriasEspeciales: 2,  campanas: 3, copas: 7,  ataqueSolitario: 124, defensaSolitaria: 165, pijon: 3, podioCopas: 0  },
  'Goyo':        { jugadas: 244, victorias: 71,  colonias: 945,  victoriasEspeciales: 3,  campanas: 1, copas: 3,  ataqueSolitario: 97,  defensaSolitaria: 0,   pijon: 0, podioCopas: 10 },
  'Pedro':       { jugadas: 364, victorias: 122, colonias: 1412, victoriasEspeciales: 5,  campanas: 4, copas: 11, ataqueSolitario: 493, defensaSolitaria: 0,   pijon: 5, podioCopas: 0  },
  'Ale Baca':    { jugadas: 101, victorias: 41,  colonias: 387,  victoriasEspeciales: 0,  campanas: 0, copas: 1,  ataqueSolitario: 0,   defensaSolitaria: 0,   pijon: 0, podioCopas: 0  },
  'Juanpi':      { jugadas: 116, victorias: 33,  colonias: 324,  victoriasEspeciales: 2,  campanas: 0, copas: 0,  ataqueSolitario: 0,   defensaSolitaria: 0,   pijon: 0, podioCopas: 5  },
  'Lazaro':      { jugadas: 50,  victorias: 9,   colonias: 185,  victoriasEspeciales: 1,  campanas: 0, copas: 0,  ataqueSolitario: 0,   defensaSolitaria: 0,   pijon: 0, podioCopas: 0  },
  'Diego':       { jugadas: 26,  victorias: 7,   colonias: 84,   victoriasEspeciales: 1,  campanas: 0, copas: 0,  ataqueSolitario: 0,   defensaSolitaria: 0,   pijon: 0, podioCopas: 0  },
};

export const CAMPOS_EDITABLES = [
  { key: 'jugadas',             label: 'Jugadas' },
  { key: 'victorias',           label: 'Victorias' },
  { key: 'colonias',            label: 'Colonias' },
  { key: 'victoriasEspeciales', label: 'Victorias especiales' },
  { key: 'campanas',            label: 'Campañas' },
  { key: 'copas',               label: 'Copas ganadas' },
  { key: 'podioCopas',          label: 'Podio copas (pts)' },
  { key: 'ataqueSolitario',     label: 'Ataque solitario' },
  { key: 'defensaSolitaria',    label: 'Defensa solitaria' },
  { key: 'pijon',               label: 'Pijón' },
];

export const estadisticasVacias = () => ({
  jugadas: 0, victorias: 0, colonias: 0,
  victoriasEspeciales: 0, campanas: 0, copas: 0, podioCopas: 0,
  ataqueSolitario: 0, defensaSolitaria: 0, pijon: 0
});

export const estadisticasService = {
  /**
   * Actualiza las estadísticas de un jugador en Firestore.
   */
  async actualizarEstadisticas(playerId, estadisticas) {
    await updateDoc(doc(db, 'players', playerId), {
      estadisticas,
      updatedAt: serverTimestamp()
    });
  },

  /**
   * Guarda un snapshot de las estadísticas actuales de todos los jugadores.
   * Nombre del snapshot: 'baseline' (o el que se pase).
   */
  async guardarSnapshot(nombre = 'baseline') {
    const playersSnap = await getDocs(collection(db, 'players'));
    const snapshotData = {};

    playersSnap.docs.forEach(playerDoc => {
      snapshotData[playerDoc.id] = {
        nombre: playerDoc.data().name,
        estadisticas: playerDoc.data().estadisticas || estadisticasVacias()
      };
    });

    await setDoc(doc(db, 'snapshots', nombre), {
      data: snapshotData,
      savedAt: serverTimestamp(),
      descripcion: `Snapshot guardado el ${new Date().toLocaleString('es-AR')}`
    });

    return snapshotData;
  },

  /**
   * Restaura las estadísticas de todos los jugadores desde el snapshot 'baseline'.
   */
  async restaurarSnapshot(nombre = 'baseline') {
    const snapshotSnap = await getDoc(doc(db, 'snapshots', nombre));
    if (!snapshotSnap.exists()) {
      throw new Error('No hay snapshot guardado. Primero sembrá los datos iniciales.');
    }

    const snapshot = snapshotSnap.data();
    const batch = writeBatch(db);

    Object.entries(snapshot.data).forEach(([playerId, datos]) => {
      batch.update(doc(db, 'players', playerId), {
        estadisticas: datos.estadisticas,
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();
    return Object.keys(snapshot.data).length;
  },

  /**
   * Lee el snapshot sin restaurar (para mostrar la fecha en la UI).
   */
  async leerInfoSnapshot(nombre = 'baseline') {
    const snapshotSnap = await getDoc(doc(db, 'snapshots', nombre));
    if (!snapshotSnap.exists()) return null;
    const d = snapshotSnap.data();
    return {
      jugadores: Object.keys(d.data || {}).length,
      descripcion: d.descripcion || '',
      savedAt: d.savedAt
    };
  },

  /**
   * Siembra los datos del Excel como estadísticas de los jugadores
   * y los guarda como snapshot baseline.
   * Sólo actualiza jugadores cuyo 'name' está en DATOS_EXCEL.
   */
  async sembrarDatosIniciales() {
    const playersSnap = await getDocs(collection(db, 'players'));
    const batch = writeBatch(db);
    const snapshotData = {};
    let actualizados = 0;

    playersSnap.docs.forEach(playerDoc => {
      const nombre = playerDoc.data().name;
      const estadisticas = DATOS_EXCEL[nombre] ?? estadisticasVacias();

      batch.update(doc(db, 'players', playerDoc.id), {
        estadisticas,
        updatedAt: serverTimestamp()
      });

      snapshotData[playerDoc.id] = { nombre, estadisticas };
      if (DATOS_EXCEL[nombre]) actualizados++;
    });

    await batch.commit();

    await setDoc(doc(db, 'snapshots', 'baseline'), {
      data: snapshotData,
      savedAt: serverTimestamp(),
      descripcion: 'Datos iniciales del Excel LCE'
    });

    return { total: playersSnap.docs.length, actualizados };
  }
};
