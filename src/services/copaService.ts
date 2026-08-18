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
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Servicio de Copas (Torneos)
 * Gestión de copas y sus rankings
 */
export const copaService = {
  /**
   * Crear una nueva copa
   */
  async crear(nombre: string, descripcion = '', fechaInicio: string | Date, fechaFin: string | Date, reglas: Record<string, any> = {}) {
    try {
      const docRef = await addDoc(collection(db, 'copas'), {
        nombre,
        descripcion,
        estado: 'planificada',
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        reglas: {
          cantidadRondas: reglas.cantidadRondas || 0,
          reglasAdicionales: reglas.reglasAdicionales || '',
          ...reglas
        },
        partidas: [],
        ranking: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, nombre, descripcion };
    } catch (error) {
      console.error('Error creando copa:', error);
      throw error;
    }
  },

  /**
   * Obtener todas las copas
   */
  async obtenerTodas() {
    try {
      const querySnapshot = await getDocs(collection(db, 'copas'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo copas:', error);
      throw error;
    }
  },

  /**
   * Obtener copa por ID
   */
  async obtenerPorId(copaId) {
    try {
      const docRef = doc(db, 'copas', copaId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo copa:', error);
      throw error;
    }
  },

  /**
   * Obtener copas activas
   */
  async obtenerActivas() {
    try {
      const q = query(collection(db, 'copas'), where('estado', '==', 'activa'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo copas activas:', error);
      throw error;
    }
  },

  /**
   * Agregar una partida a la copa CON VALIDACIONES
   * - Valida que no supere 10 partidas
   * - Asigna automáticamente la posición
   * - Requiere fecha de juego
   */
  async agregarPartida(copaId, matchId, fechaJuego) {
    try {
      const copaRef = doc(db, 'copas', copaId);
      const copaSnap = await getDoc(copaRef);
      
      if (!copaSnap.exists()) {
        throw new Error('Copa no encontrada');
      }
      
      const copa = copaSnap.data();
      const partidasActuales = copa.partidas || [];
      
      // Validar límite de 10 partidas
      if (partidasActuales.length >= 10) {
        throw new Error(`Esta copa ya tiene el máximo de 10 partidas`);
      }
      
      // Calcular posición automáticamente
      const nuevaPosicion = partidasActuales.length + 1;
      
      // Crear entrada de partida con posición
      const nuevaPartida = {
        posicion: nuevaPosicion,
        matchId: matchId,
        fechaJuego: fechaJuego ? new Date(fechaJuego) : serverTimestamp(),
        estado: 'pendiente' // pendiente | cargada | editada
      };
      
      // Actualizar copa
      await updateDoc(copaRef, {
        partidas: arrayUnion(nuevaPartida),
        updatedAt: serverTimestamp()
      });
      
      // También actualizar el match con la posición y copId si no lo tiene
      const matchRef = doc(db, 'matches', matchId);
      await updateDoc(matchRef, {
        posicion: nuevaPosicion,
        copId: copaId,
        fechaJuego: fechaJuego ? new Date(fechaJuego) : serverTimestamp()
      });
      
      return {
        posicion: nuevaPosicion,
        matchId: matchId
      };
    } catch (error) {
      console.error('Error agregando partida a copa:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de la copa
   */
  async actualizarEstado(copaId, nuevoEstado) {
    try {
      const docRef = doc(db, 'copas', copaId);
      await updateDoc(docRef, {
        estado: nuevoEstado,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error actualizando estado de copa:', error);
      throw error;
    }
  },

  /**
   * Obtener ranking de una copa
   */
  async obtenerRanking(copaId) {
    try {
      const docRef = doc(db, 'copas', copaId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const ranking: Record<string, any> = docSnap.data().ranking || {};
        // Ordenar por puntosSTTotal descendente
        const rankingOrdenado = Object.entries(ranking)
          .sort((a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0))
          .reduce((acc: Record<string, any>, [key, value], index) => {
            acc[key] = { ...value, posicion: index + 1 };
            return acc;
          }, {});
        
        return rankingOrdenado;
      }
      return {};
    } catch (error) {
      console.error('Error obteniendo ranking:', error);
      throw error;
    }
  },

  /**
   * Actualizar ranking de la copa (usada por Cloud Functions)
   */
  async actualizarRanking(copaId, ranking) {
    try {
      const docRef = doc(db, 'copas', copaId);
      await updateDoc(docRef, {
        ranking: ranking,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error actualizando ranking:', error);
      throw error;
    }
  },

  /**
   * Suscribirse a cambios en tiempo real de una copa
   */
  subscribeToCoupa(copaId, onData, onError) {
    try {
      return onSnapshot(
        doc(db, 'copas', copaId),
        (snapshot) => {
          if (snapshot.exists()) {
            onData({ id: snapshot.id, ...snapshot.data() });
          }
        },
        onError
      );
    } catch (error) {
      console.error('Error suscribiendo a copa:', error);
      throw error;
    }
  },

  /**
   * Obtener partidas de una copa
   */
  async obtenerPartidas(copaId) {
    try {
      const q = query(collection(db, 'matches'), where('copId', '==', copaId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo partidas de copa:', error);
      throw error;
    }
  }
};
