import generarCodigo from "@/app/utils/generadorDeCodigo";
import { db } from "./config";
import { collection, addDoc, getDocs, setDoc } from "firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { setCodigoPartida } from "@/store/acciones";



export const addAlien = async (alien) => {
  const docRef = await addDoc(collection(db, "aliens"), alien);
  return docRef.id;
};

export const getAliens = async () => {
  const snapshot = await getDocs(collection(db, "alienList"));
  console.log("Fetched aliens:", snapshot);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getAlienByName = async (name) => {
  const snapshot = await getDocs(collection(db, "alienList"));
  const aliens = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return aliens.find(alien => alien.Nombre === name) || null;
}

export const addMatch = async (match) => {
  const codigo = generarCodigo();

  const docRef = doc(db, "partidas", codigo); 
  await setDoc(docRef, { ...match, codigo }); 
  setCodigoPartida(codigo);
  console.log("Match added with code:", codigo);
  return codigo;
};

export const getMatches = async () => {
  const snapshot = await getDocs(collection(db, "partidas"));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export const getMatchById = async (matchId) => {
  console.log("Fetching match with ID:", matchId);
  const docRef = doc(db, "partidas", matchId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
};

