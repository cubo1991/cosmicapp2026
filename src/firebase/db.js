import generarCodigo from "@/app/utils/generadorDeCodigo";
import { db } from "./config";
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
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
 * ANTES: 1 llamada × 50 docs = 50 reads
 * AHORA: 1 lectura directa = 1 read ✅
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
 * ✅ CREAR ALIEN - Con validación
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
 * ✅ VALIDAR PARTIDA
 */
function validateMatch(matchData) {
  if (!matchData || typeof matchData !== 'object') {
    throw new Error("Datos de partida inválidos");
  }

  if (!matchData.jugadores || !Array.isArray(matchData.jugadores)) {
    throw new Error("Partida debe tener array de jugadores");
  }

  if (matchData.jugadores.length === 0 || matchData.jugadores.length > 4) {
    throw new Error("Partida debe tener entre 1 y 4 jugadores");
  }

  matchData.jugadores.forEach((jugador, idx) => {
    if (!jugador.nombre || typeof jugador.nombre !== 'string') {
      throw new Error(`Jugador ${idx} debe tener nombre válido`);
    }
    if (!jugador.color || typeof jugador.color !== 'string') {
      throw new Error(`Jugador ${idx} debe tener color válido`);
    }
    if (!Array.isArray(jugador.aliens)) {
      throw new Error(`Jugador ${idx} debe tener aliens como array`);
    }
    if (jugador.aliens.length === 0) {
      throw new Error(`Jugador ${idx} debe tener al menos 1 alien asignado`);
    }
  });

  return true;
}

/**
 * ✅ CREAR PARTIDA - Con validación y timestamps
 */
export const addMatch = async (matchData) => {
  validateMatch(matchData);

  const codigo = generarCodigo();
  const now = serverTimestamp();

  try {
    await setDoc(doc(db, "partidas", codigo), {
      ...matchData,
      codigo,
      createdAt: now,
      updatedAt: now,
      status: "active",
    });

    if (isDev) console.log(`✓ Match ${codigo} created`);
    return codigo;
  } catch (error) {
    console.error("❌ Error creating match:", error.message);
    throw new Error("No pudimos crear la partida");
  }
};

/**
 * ✅ OBTENER PARTIDA POR ID - Con timeout y validación
 */
export const getMatchById = async (matchId, timeoutMs = 5000) => {
  if (!matchId || typeof matchId !== 'string' || matchId.trim().length === 0) {
    throw new Error("ID de partida inválido");
  }

  try {
    const docRef = doc(db, "partidas", matchId);

    // Race condition: si no responde en timeoutMs, falla
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: servidor no responde")), timeoutMs)
      ),
    ]);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (isDev) console.log(`✓ Match ${matchId} retrieved`);
      return { id: docSnap.id, ...data };
    }

    return null;
  } catch (error) {
    if (error.message.includes("Timeout")) {
      throw error;
    }
    console.error("❌ Error fetching match:", error.message);
    throw new Error("No pudimos cargar la partida");
  }
};

/**
 * ✅ OBTENER TODAS LAS PARTIDAS
 */
export const getMatches = async () => {
  try {
    const snapshot = await getDocs(collection(db, "partidas"));
    if (isDev) console.log(`✓ ${snapshot.size} matches fetched`);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("❌ Error fetching matches:", error.message);
    throw error;
  }
};
