import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const isDev = process.env.NODE_ENV === 'development';

/**
 * ✅ ALIENS - Lectura optimizada
 */
export const getAliens = async () => {
  try {
    const snapshot = await getDocs(collection(db, "alienList"));
    if (isDev) console.log(`✓ ${snapshot.size} aliens fetched`);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("❌ Error fetching aliens:", error.message);
    throw new Error("No pudimos cargar los aliens");
  }
};

/**
 * ✅ ALIEN POR ID - Optimizado con getDoc
 */
export const getAlienById = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error("ID de alien inválido");
  }

  try {
    const docRef = doc(db, "alienList", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      if (isDev) console.log(`✓ Alien ${id} fetched`);
      return { id: docSnap.id, ...docSnap.data() };
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching alien:", error.message);
    throw error;
  }
};

/**
 * ✅ CREAR ALIEN
 */
export const addAlien = async (alien) => {
  if (!alien || !alien.Nombre) {
    throw new Error("Alien debe tener al menos nombre");
  }

  try {
    const docRef = await addDoc(collection(db, "alienList"), {
      ...alien,
      createdAt: serverTimestamp(),
    });
    if (isDev) console.log(`✓ Alien ${alien.Nombre} created`);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error adding alien:", error.message);
    throw error;
  }
};

/**
 * ✅ OBTENER PARTIDA POR ID
 * Usado por JoinMatch.jsx (sistema antiguo de aliens)
 */
export const getMatchById = async (matchId) => {
  if (!matchId || typeof matchId !== 'string' || matchId.trim().length === 0) {
    throw new Error("ID de partida inválido");
  }

  try {
    const docRef = doc(db, "matches", matchId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      if (isDev) console.log(`✓ Match ${matchId} retrieved`);
      return { id: docSnap.id, ...docSnap.data() };
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching match:", error.message);
    throw error;
  }
};
