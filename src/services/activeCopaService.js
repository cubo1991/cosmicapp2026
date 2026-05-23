'use client';

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '@/firebase/config';

export const activeCopaService = {
  /**
   * Obtener la copa ACTIVA actual.
   * Si no existe ninguna con estado 'activa', crea una nueva automáticamente.
   * Si existe pero ya tiene 10 partidas (sin haber sido cerrada por scoring), la cierra
   * con ganador y crea la siguiente.
   */
  async obtenerOCrearCopaActiva() {
    try {
      const q = query(collection(db, 'copas'), where('estado', '==', 'activa'));
      const snapshot = await getDocs(q);

      if (snapshot.docs.length > 0) {
        const copaDoc = snapshot.docs[0];
        const copa = copaDoc.data();
        const cantidadPartidas = (copa.partidas || []).length;

        if (cantidadPartidas < 10) {
          return { id: copaDoc.id, ...copa };
        }

        // Copa llena pero no cerrada aún (edge case): cerrarla y crear nueva
        await this._cerrarCopaConGanador(copaDoc.id, copa.ranking || {});
        return await this._crearNuevaCopa();
      }

      return await this._crearNuevaCopa();
    } catch (error) {
      console.error('Error en obtenerOCrearCopaActiva:', error);
      throw error;
    }
  },

  /**
   * Cierra la copa adjudicando el ganador al jugador con más puntos.
   * Llamado automáticamente cuando la partida 10 es finalizada (scoring),
   * o como fallback cuando se detecta una copa llena.
   */
  async _cerrarCopaConGanador(copaId, rankingActual) {
    try {
      const entries = Object.entries(rankingActual);
      let ganador = null;

      if (entries.length > 0) {
        const [ganadorId, ganadorDatos] = entries.sort(
          (a, b) => (b[1].puntosTotales || 0) - (a[1].puntosTotales || 0)
        )[0];

        ganador = {
          playerId: ganadorId,
          nombre: ganadorDatos.nombreJugador || 'Sin nombre',
          puntosTotales: ganadorDatos.puntosTotales || 0
        };
      }

      await updateDoc(doc(db, 'copas', copaId), {
        estado: 'finalizada',
        ganador,
        fechaFin: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Incrementar copas ganadas en estadisticas del ganador
      if (ganador?.playerId) {
        try {
          await updateDoc(doc(db, 'players', ganador.playerId), {
            'estadisticas.copas': increment(1),
            updatedAt: serverTimestamp()
          });
        } catch (e) {
          console.warn('No se pudo incrementar copas del ganador:', e.message);
        }
      }

      return ganador;
    } catch (error) {
      console.error('Error cerrando copa con ganador:', error);
      throw error;
    }
  },

  /**
   * Crea una nueva copa con nombre secuencial y el ranking pre-poblado
   * con TODOS los jugadores registrados en la base de datos (puntos en 0).
   */
  async _crearNuevaCopa() {
    try {
      // Número secuencial basado en copas existentes
      const todasCopas = await getDocs(collection(db, 'copas'));
      const numeroCopa = todasCopas.docs.length + 1;
      const nombre = `Copa #${numeroCopa}`;

      // Pre-poblar ranking con todos los jugadores registrados
      const playersSnap = await getDocs(collection(db, 'players'));
      const rankingInicial = {};
      playersSnap.docs.forEach(playerDoc => {
        rankingInicial[playerDoc.id] = {
          nombreJugador: playerDoc.data().name || 'Sin nombre',
          puntosTotales: 0,
          participacionesPorPosicion: {},
          posicion: 0
        };
      });

      const docRef = await addDoc(collection(db, 'copas'), {
        nombre,
        descripcion: 'Copa generada automáticamente',
        estado: 'activa',
        partidas: [],
        ranking: rankingInicial,
        ganador: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        id: docRef.id,
        nombre,
        estado: 'activa',
        partidas: [],
        ranking: rankingInicial,
        ganador: null
      };
    } catch (error) {
      console.error('Error creando nueva copa:', error);
      throw error;
    }
  },

  /**
   * @deprecated Usar _crearNuevaCopa
   */
  async _crearCopaDefecto() {
    return this._crearNuevaCopa();
  },

  /**
   * Valida si una copa puede recibir una nueva partida.
   */
  async puedAgregarPartida(copaId) {
    try {
      const copaSnap = await getDoc(doc(db, 'copas', copaId));

      if (!copaSnap.exists()) {
        throw new Error('Copa no encontrada');
      }

      const copa = copaSnap.data();
      const cantidadPartidas = (copa.partidas || []).length;

      if (cantidadPartidas >= 10) {
        return {
          puede: false,
          necesitaNuevaCopa: true,
          posicion: null,
          mensaje: 'Esta copa alcanzó 10 partidas.'
        };
      }

      return {
        puede: true,
        necesitaNuevaCopa: false,
        posicion: cantidadPartidas + 1,
        mensaje: `Posición ${cantidadPartidas + 1}`
      };
    } catch (error) {
      console.error('Error validando partida:', error);
      throw error;
    }
  },

  /**
   * Agrega una partida a la copa activa.
   * Si la copa está llena, la cierra con ganador y crea la siguiente.
   */
  async agregarPartidaAutomatica(matchId, fechaJuego = null) {
    try {
      let copaActiva = await this.obtenerOCrearCopaActiva();
      const validacion = await this.puedAgregarPartida(copaActiva.id);

      if (!validacion.puede) {
        // Fallback: copa llena, cerrar con ganador y abrir nueva
        const copaSnap = await getDoc(doc(db, 'copas', copaActiva.id));
        if (copaSnap.exists()) {
          await this._cerrarCopaConGanador(copaActiva.id, copaSnap.data().ranking || {});
        }
        copaActiva = await this._crearNuevaCopa();
        validacion.posicion = 1;
      }

      const copaRef = doc(db, 'copas', copaActiva.id);
      const partidasActuales = copaActiva.partidas || [];

      await updateDoc(copaRef, {
        partidas: [
          ...partidasActuales,
          {
            posicion: validacion.posicion,
            matchId,
            fechaJuego: fechaJuego || new Date(),
            estado: 'pendiente'
          }
        ],
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'matches', matchId), {
        copId: copaActiva.id,
        posicion: validacion.posicion,
        updatedAt: serverTimestamp()
      });

      return {
        exito: true,
        copaId: copaActiva.id,
        copaNombre: copaActiva.nombre,
        posicion: validacion.posicion,
        mensaje: `Partida agregada a ${copaActiva.nombre} (posición ${validacion.posicion})`
      };
    } catch (error) {
      console.error('Error agregando partida automática:', error);
      throw error;
    }
  },

  async obtenerInfoCopaActiva() {
    try {
      const copa = await this.obtenerOCrearCopaActiva();
      const cantidadPartidas = (copa.partidas || []).length;

      return {
        id: copa.id,
        nombre: copa.nombre,
        cantidadPartidas,
        proximaPosicion: cantidadPartidas + 1,
        llena: cantidadPartidas >= 10,
        estado: copa.estado
      };
    } catch (error) {
      console.error('Error obteniendo info copa activa:', error);
      throw error;
    }
  }
};
