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
  arrayRemove
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Servicio de Ligas
 * Gestión de ligas y sus miembros
 */
export const ligaService = {
  /**
   * Crear una nueva liga
   */
  async crear(nombre, descripcion = '', creador) {
    try {
      const docRef = await addDoc(collection(db, 'ligas'), {
        nombre,
        descripcion,
        estado: 'activa',
        creador,
        fechaInicio: serverTimestamp(),
        fechaFin: null,
        miembros: [creador],
        partidas: [],
        ranking: {
          [creador]: {
            nombreJugador: '',
            puntosTotales: 0,
            partidas: 0,
            posicion: 1,
            promedio: 0
          }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, nombre, descripcion };
    } catch (error) {
      console.error('Error creando liga:', error);
      throw error;
    }
  },

  /**
   * Obtener todas las ligas
   */
  async obtenerTodas(): Promise<Record<string, any>[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'ligas'));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo ligas:', error);
      throw error;
    }
  },

  /**
   * Obtener liga por ID
   */
  async obtenerPorId(ligaId): Promise<Record<string, any> | null> {
    try {
      const docRef = doc(db, 'ligas', ligaId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo liga:', error);
      throw error;
    }
  },

  /**
   * Obtener ligas de un jugador
   */
  async obtenerDelJugador(playerId) {
    try {
      const q = query(collection(db, 'ligas'), where('miembros', 'array-contains', playerId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo ligas del jugador:', error);
      throw error;
    }
  },

  /**
   * Agregar miembro a la liga
   */
  async agregarMiembro(ligaId, playerId, nombreJugador) {
    try {
      const docRef = doc(db, 'ligas', ligaId);
      await updateDoc(docRef, {
        miembros: arrayUnion(playerId),
        [`ranking.${playerId}`]: {
          nombreJugador,
          puntosTotales: 0,
          partidas: 0,
          posicion: 0,
          promedio: 0
        },
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error agregando miembro a liga:', error);
      throw error;
    }
  },

  /**
   * Remover miembro de la liga
   */
  async removerMiembro(ligaId, playerId) {
    try {
      const docRef = doc(db, 'ligas', ligaId);
      await updateDoc(docRef, {
        miembros: arrayRemove(playerId),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error removiendo miembro de liga:', error);
      throw error;
    }
  },

  /**
   * Agregar partida a la liga
   */
  async agregarPartida(ligaId, matchId) {
    try {
      const docRef = doc(db, 'ligas', ligaId);
      await updateDoc(docRef, {
        partidas: arrayUnion(matchId),
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error agregando partida a liga:', error);
      throw error;
    }
  },

  /**
   * Obtener ranking de una liga
   */
  async obtenerRanking(ligaId) {
    try {
      const docRef = doc(db, 'ligas', ligaId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const ranking: Record<string, any> = docSnap.data().ranking || {};
        // Ordenar por puntosTotales descendente
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
   * Actualizar ranking de la liga (usada por Cloud Functions)
   */
  async actualizarRanking(ligaId, ranking) {
    try {
      const docRef = doc(db, 'ligas', ligaId);
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
   * Suscribirse a cambios en tiempo real de una liga
   */
  subscribeToLiga(ligaId, onData: (data: any) => void, onError) {
    try {
      return onSnapshot(
        doc(db, 'ligas', ligaId),
        (snapshot) => {
          if (snapshot.exists()) {
            onData({ id: snapshot.id, ...snapshot.data() });
          }
        },
        onError
      );
    } catch (error) {
      console.error('Error suscribiendo a liga:', error);
      throw error;
    }
  },

  /**
   * Obtener partidas de una liga
   */
  async obtenerPartidas(ligaId) {
    try {
      const q = query(collection(db, 'matches'), where('ligaId', '==', ligaId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error obteniendo partidas de liga:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado de la liga
   */
  async actualizarEstado(ligaId, nuevoEstado) {
    try {
      const docRef = doc(db, 'ligas', ligaId);
      const updateData: Record<string, any> = {
        estado: nuevoEstado,
        updatedAt: serverTimestamp()
      };
      
      if (nuevoEstado === 'finalizada') {
        updateData.fechaFin = serverTimestamp();
      }
      
      await updateDoc(docRef, updateData);
      return true;
    } catch (error) {
      console.error('Error actualizando estado de liga:', error);
      throw error;
    }
  }
};
