import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  limit,
  serverTimestamp,
} from "firebase/firestore";

const isDev = process.env.NODE_ENV === 'development';

// Documento de Firestore sin modelar todavía: id + campos sueltos.
// ponytail: any en los campos hasta que se definan modelos reales por colección.
export type FirestoreDoc = { id: string } & Record<string, any>;

/**
 * ✅ ALIENS - Lectura optimizada
 */
export const getAliens = async (): Promise<FirestoreDoc[]> => {
  try {
    const snapshot = await getDocs(collection(db, "alienList"));
    if (isDev) console.log(`✓ ${snapshot.size} aliens fetched`);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error: any) {
    console.error("❌ Error fetching aliens:", error.message);
    throw new Error("No pudimos cargar los aliens");
  }
};

/**
 * ✅ ALIEN POR ID - Optimizado con getDoc
 */
export const getAlienById = async (id: string): Promise<FirestoreDoc | null> => {
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
export const getMatchById = async (matchId): Promise<FirestoreDoc | null> => {
  if (!matchId || typeof matchId !== 'string' || matchId.trim().length === 0) {
    throw new Error("ID de partida inválido");
  }

  const cleanId = matchId.trim();

  try {
    // 1. Try direct document ID lookup (fast path — used by URLs with full ID)
    const docRef = doc(db, "matches", cleanId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      if (isDev) console.log(`✓ Match ${cleanId} retrieved by ID`);
      return { id: docSnap.id, ...docSnap.data() };
    }

    // 2. Fall back: look up by short code field (manual entry from share screen)
    const q = query(
      collection(db, "matches"),
      where("codigo", "==", cleanId.toUpperCase()),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      if (isDev) console.log(`✓ Match found by codigo: ${cleanId}`);
      return { id: d.id, ...d.data() };
    }

    return null;
  } catch (error) {
    console.error("❌ Error fetching match:", error.message);
    throw error;
  }
};
