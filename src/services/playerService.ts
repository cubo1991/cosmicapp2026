'use client';

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Servicio de Jugadores
 * CRUD completo para gestión de jugadores
 */
export const playerService = {
  /**
   * Crear un nuevo jugador
   */
  async crear(nombre, email, avatar = '') {
    try {
      const docRef = await addDoc(collection(db, 'players'), {
        name: nombre,
        email: email,
        avatar: avatar,
        createdAt: serverTimestamp(),
        stats: {
          partidas: 0,
          victorias: 0,
          puntosPromedio: 0,
          ultimaPartida: null
        },
        copas: [],
        ligas: []
      });
      return { id: docRef.id, nombre, email, avatar };
    } catch (error) {
      console.error('Error creando jugador:', error);
      throw error;
    }
  },

  /**
   * Obtener todos los jugadores
   */
  async obtenerTodos(): Promise<Record<string, any>[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'players'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo jugadores:', error);
      throw error;
    }
  },

  /**
   * Obtener jugador por ID
   */
  async obtenerPorId(playerId): Promise<Record<string, any> | null> {
    try {
      const docRef = doc(db, 'players', playerId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo jugador:', error);
      throw error;
    }
  },

  /**
   * Actualizar datos de jugador
   */
  async actualizar(playerId, datos) {
    try {
      const docRef = doc(db, 'players', playerId);
      await updateDoc(docRef, datos);
      return true;
    } catch (error) {
      console.error('Error actualizando jugador:', error);
      throw error;
    }
  },

  /**
   * Suscribirse a cambios en tiempo real de un jugador
   */
  subscribeToPlayer(playerId, onData: (data: any) => void, onError) {
    try {
      return onSnapshot(
        doc(db, 'players', playerId),
        (snapshot) => {
          if (snapshot.exists()) {
            onData({ id: snapshot.id, ...snapshot.data() });
          }
        },
        onError
      );
    } catch (error) {
      console.error('Error suscribiendo a jugador:', error);
      throw error;
    }
  },

  /**
   * Suscribirse a todos los jugadores
   */
  subscribeToAll(onData: (data: any[]) => void, onError) {
    try {
      return onSnapshot(
        collection(db, 'players'),
        (querySnapshot) => {
          const jugadores = querySnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }));
          onData(jugadores);
        },
        onError
      );
    } catch (error) {
      console.error('Error suscribiendo a jugadores:', error);
      throw error;
    }
  },

  /**
   * Verificar si el email ya existe
   */
  async emailExists(email) {
    try {
      const q = query(collection(db, 'players'), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.length > 0;
    } catch (error) {
      console.error('Error verificando email:', error);
      throw error;
    }
  },

  /**
   * Actualizar estadísticas de un jugador
   */
  async actualizarEstadisticas(playerId, partidas, victorias, puntosPromedio) {
    try {
      const docRef = doc(db, 'players', playerId);
      await updateDoc(docRef, {
        'stats.partidas': partidas,
        'stats.victorias': victorias,
        'stats.puntosPromedio': puntosPromedio,
        'stats.ultimaPartida': serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error actualizando estadísticas:', error);
      throw error;
    }
  }
};
