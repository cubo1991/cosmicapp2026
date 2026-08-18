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
   * Obtener el jugador vinculado a una cuenta de Firebase Auth.
   * Devuelve null si esa cuenta todavía no reclamó ningún jugador.
   */
  async obtenerPorUid(uid): Promise<Record<string, any> | null> {
    try {
      const q = query(collection(db, 'players'), where('uid', '==', uid));
      const querySnapshot = await getDocs(q);
      const encontrado = querySnapshot.docs[0];
      return encontrado ? { id: encontrado.id, ...encontrado.data() } : null;
    } catch (error) {
      console.error('Error obteniendo jugador por uid:', error);
      throw error;
    }
  },

  /**
   * Jugadores que todavía nadie reclamó, para que quien entra por primera vez
   * elija cuál es el suyo.
   *
   * ponytail: filtra en el cliente porque Firestore no sabe consultar por campo
   * ausente. Con una liga de decenas de jugadores es gratis; si algún día son
   * miles, hay que escribir `uid: null` al crear y consultar por ese valor.
   */
  async obtenerSinVincular(): Promise<Record<string, any>[]> {
    try {
      const todos = await this.obtenerTodos();
      return todos.filter(jugador => !jugador.uid);
    } catch (error) {
      console.error('Error obteniendo jugadores sin vincular:', error);
      throw error;
    }
  },

  /**
   * Vincular un jugador existente con una cuenta de Firebase Auth.
   *
   * No fusiona documentos: el jugador histórico simplemente gana una cuenta, así
   * que su historial de partidas, copas y estadísticas queda intacto.
   *
   * Las reglas de Firestore rechazan el reclamo si el jugador ya tiene `uid`, si
   * quien reclama es anónimo, o si intenta cambiar otro campo en la misma
   * escritura. Esta comprobación previa solo sirve para dar un error entendible.
   */
  async vincularConCuenta(playerId, uid) {
    try {
      if (!uid) throw new Error('Se necesita una cuenta para vincular');

      const jugador = await this.obtenerPorId(playerId);
      if (!jugador) throw new Error('El jugador no existe');
      if (jugador.uid) throw new Error('Ese jugador ya fue reclamado por otra cuenta');

      const yaVinculado = await this.obtenerPorUid(uid);
      if (yaVinculado) throw new Error(`Tu cuenta ya está vinculada a ${yaVinculado.name}`);

      await updateDoc(doc(db, 'players', playerId), { uid });
      return true;
    } catch (error) {
      console.error('Error vinculando jugador con cuenta:', error);
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
