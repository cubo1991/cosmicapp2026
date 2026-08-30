'use client';

import {
  collection,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  arrayRemove
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/firebase/config';

/**
 * Servicio de Ligas
 * Gestión de ligas y sus miembros
 *
 * Crear una liga y agregar/unirse a miembros pasa por Cloud Functions (ver
 * docs/PLAN_MULTI_LIGA.md, Fase 4): el alta a una liga es manual, la hace un
 * admin (buscando el nombre) o la persona misma con un código de invitación.
 * Las reglas de Firestore bloquean `miembros`/`miembrosUid` para cualquiera
 * que no sea admin, así que no alcanza con escribir directo como antes.
 */
export const ligaService = {
  /**
   * Crear una nueva liga. Solo un admin puede hacerlo (lo valida la Cloud
   * Function); arranca sin miembros y con un código de invitación generado.
   */
  async crear(nombre, descripcion = '') {
    try {
      const crearLiga = httpsCallable(functions, 'crearLiga');
      const res: any = await crearLiga({ nombre, descripcion });
      return res.data;
    } catch (error) {
      console.error('Error creando liga:', error);
      throw error;
    }
  },

  /**
   * Agregar un jugador ya existente a una liga (alta manual por nombre).
   * Solo un admin puede hacerlo.
   */
  async agregarMiembroPorAdmin(ligaId, playerId) {
    try {
      const agregarMiembroALiga = httpsCallable(functions, 'agregarMiembroALiga');
      const res: any = await agregarMiembroALiga({ ligaId, playerId });
      return res.data;
    } catch (error) {
      console.error('Error agregando miembro a liga:', error);
      throw error;
    }
  },

  /**
   * La propia persona se une a una liga con el código de invitación, sobre su
   * jugador ya reclamado (cuenta no anónima).
   */
  async unirsePorCodigo(codigo, playerId) {
    try {
      const unirseALigaPorCodigo = httpsCallable(functions, 'unirseALigaPorCodigo');
      const res: any = await unirseALigaPorCodigo({ codigo, playerId });
      return res.data;
    } catch (error) {
      console.error('Error uniéndose a la liga:', error);
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
   * Obtener ranking de una liga
   *
   * @deprecated Este ranking embebido (`ligas.ranking`) es del sistema viejo,
   * paralelo al de copas, que nunca estuvo conectado a `finalizarPartida` (la
   * Cloud Function real). Ya nada lo escribe (Fase 6 de
   * docs/PLAN_MULTI_LIGA.md le sacó `agregarPartida`/`actualizarRanking`), así
   * que devuelve lo que haya quedado histórico o vacío. El ranking real por
   * liga vive en `players/{id}/ligaStats/{ligaId}`.
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
