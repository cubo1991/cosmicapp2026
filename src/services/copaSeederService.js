'use client';

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { rankingService } from '@/services/rankingService';

/**
 * Datos de la copa histórica LCE leídos del Excel.
 * patron: array de 10 posiciones (1 = jugó, 0 = no estuvo)
 * puntosTotales: suma de la columna "Total" del Excel
 *
 * Mapeo nombre Excel → Firebase (campo `name` del jugador):
 *   A. Baca        → Ale Baca
 *   Juan P. Videla → Juanpi
 *   Arrigo Zanab.  → Arrigo
 *   David L. Math. → David Lopez
 *   Gregorio Laz.  → Goyo
 *   A. Martínez    → A. Martinez  (puede no estar en Firebase)
 *   Juan M. Gómez  → JM
 *   Pedro Bernabeu → Pedro
 *   Diego Forni    → Diego
 *   Lázaro Jofré   → Lazaro
 */
const COPA_HISTORICA = [
  {
    nombre: 'Ale Baca',
    puntosTotales: 141.0,
    // jugó todas las primeras 10 partidas
    patron: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'Juanpi',
    puntosTotales: 118.5, // total sin la partida 1 que no jugó (125.5 - 7.0 de la P11)
    // no estuvo en partida 1; jugó P2-P10
    patron: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'Arrigo',
    puntosTotales: 116.8, // sin P11 (125.8 - 9.0)
    // no estuvo en P5; jugó el resto de P1-P10
    patron: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'David Lopez',
    puntosTotales: 110.0, // aprox sin P4 y sin P11
    // no estuvo en P4; jugó el resto de P1-P10
    patron: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'Goyo',
    puntosTotales: 157.7, // sin P4 y sin P11 (168.7 - 11.0)
    // no estuvo en P4; jugó el resto de P1-P10
    patron: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'JM',
    puntosTotales: 122.5, // sin P11 (139.5 - 17.0)
    // no estuvo en P8; jugó el resto de P1-P10
    patron: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1]
  },
  {
    nombre: 'Pedro',
    puntosTotales: 91.4, // P1+P2+P3+P6+P7+P8 aprox
    // solo jugó P1, P2, P3, P6, P7, P8
    patron: [1, 1, 1, 0, 0, 1, 1, 1, 0, 0]
  },
  {
    nombre: 'Diego',
    puntosTotales: 105.7, // sin P2, P6, P11
    // jugó P1, P3-P5, P7-P10
    patron: [1, 0, 1, 1, 1, 0, 1, 1, 1, 1]
  },
  {
    nombre: 'Lazaro',
    puntosTotales: 116.0, // sin P9
    // jugó P1-P8, P10
    patron: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1]
  },
  {
    nombre: 'A. Martinez',
    puntosTotales: 35.0,
    // solo jugó P2-P5
    patron: [0, 1, 1, 1, 1, 0, 0, 0, 0, 0]
  },
];

export const copaSeederService = {
  async sembrarCopaHistorica(onProgress = () => {}) {
    onProgress('Buscando jugadores en Firebase...');

    const playersSnap = await getDocs(collection(db, 'players'));
    const byName = {};
    playersSnap.docs.forEach(d => {
      byName[d.data().name] = d.id;
    });

    const noEncontrados = [];
    const validos = [];

    COPA_HISTORICA.forEach(j => {
      const playerId = byName[j.nombre];
      if (!playerId) {
        noEncontrados.push(j.nombre);
        onProgress(`⚠️ Jugador no encontrado en Firebase: "${j.nombre}"`);
      } else {
        validos.push({ ...j, playerId });
      }
    });

    if (validos.length === 0) {
      throw new Error('Ningún jugador del Excel fue encontrado en Firebase. Verificá los nombres.');
    }

    onProgress(`${validos.length} jugadores encontrados. Calculando puntajes...`);

    // Distribuir puntos por partida (proporcional, basado en promedio por partida jugada)
    const puntosParaMatches = Array.from({ length: 10 }, () => ({}));

    validos.forEach(j => {
      const participaciones = j.patron.filter(Boolean).length;
      const promedio = participaciones > 0
        ? parseFloat((j.puntosTotales / participaciones).toFixed(2))
        : 0;

      j.patron.forEach((jugo, idx) => {
        puntosParaMatches[idx][j.playerId] = {
          nombreJugador: j.nombre,
          participó: jugo === 1,
          coloniasInternas: 0,
          coloniasExternas: 0,
          esGanador: false,
          omitirEstadisticas: true,
          puntos: {
            colonias: 0,
            victoria: 0,
            total: jugo === 1 ? promedio : 0
          }
        };
      });
    });

    // Construir ranking final
    const ranking = {};
    validos.forEach(j => {
      const participaciones = j.patron.filter(Boolean).length;
      const promedio = participaciones > 0
        ? parseFloat((j.puntosTotales / participaciones).toFixed(2))
        : 0;

      const participacionesPorPosicion = {};
      const puntosPorPosicion = {};
      j.patron.forEach((jugo, idx) => {
        participacionesPorPosicion[idx + 1] = jugo === 1;
        if (jugo === 1) puntosPorPosicion[idx + 1] = promedio;
      });

      ranking[j.playerId] = {
        nombreJugador: j.nombre,
        puntosTotales: j.puntosTotales,
        participaciones,
        participacionesPorPosicion,
        puntosPorPosicion,
        posicion: 0
      };
    });

    // Asignar posiciones
    Object.entries(ranking)
      .sort((a, b) => b[1].puntosTotales - a[1].puntosTotales)
      .forEach(([id], i) => { ranking[id].posicion = i + 1; });

    const [ganadorId, ganadorData] = Object.entries(ranking)
      .sort((a, b) => b[1].puntosTotales - a[1].puntosTotales)[0];

    const ganador = {
      playerId: ganadorId,
      nombre: ganadorData.nombreJugador,
      puntosTotales: ganadorData.puntosTotales
    };

    onProgress(`Ganador determinado: ${ganador.nombre} con ${ganador.puntosTotales} pts`);

    // Crear documentos en Firestore con un batch
    const batch = writeBatch(db);
    const copaRef = doc(collection(db, 'copas'));
    const partidasArray = [];

    // Guardar matchIds por posición para vincular lastMatches después
    const matchIdsPorPosicion = [];

    for (let i = 0; i < 10; i++) {
      const matchRef = doc(collection(db, 'matches'));

      batch.set(matchRef, {
        nombre: `Copa Histórica LCE — Partida ${i + 1}`,
        estado: 'finalizada',
        omitirEstadisticas: true,
        asociarACopa: true,
        copId: copaRef.id,
        posicion: i + 1,
        jugadores: puntosParaMatches[i],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        fechaFinalizacion: serverTimestamp()
      });

      // Crear entradas en lastMatches para cada jugador que participó en esta partida
      Object.entries(puntosParaMatches[i]).forEach(([playerId, datos]) => {
        if (datos.participó) {
          const lastMatchRef = doc(db, 'players', playerId, 'lastMatches', matchRef.id);
          batch.set(lastMatchRef, {
            matchId: matchRef.id,
            puntos: datos.puntos.total,
            esGanador: false,
            participó: true,
            createdAt: serverTimestamp()
          });
        }
      });

      partidasArray.push({
        posicion: i + 1,
        matchId: matchRef.id,
        fechaJuego: new Date(),
        estado: 'cargada'
      });

      matchIdsPorPosicion.push(matchRef.id);
      onProgress(`Partida ${i + 1}/10 preparada`);
    }

    batch.set(copaRef, {
      nombre: 'Copa Histórica LCE',
      descripcion: 'Copa cargada desde el historial del Excel LCE. No modifica estadísticas individuales.',
      estado: 'finalizada',
      partidas: partidasArray,
      ranking,
      ganador,
      createdAt: serverTimestamp(),
      fechaFin: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await batch.commit();

    // Recalcular last10Score para cada jugador (después del commit, ya existen los lastMatches)
    onProgress('Recalculando last10Score de cada jugador...');
    await Promise.all(
      validos.map(j =>
        rankingService.actualizarLast10Score(j.playerId)
          .catch(e => onProgress(`⚠️ No se pudo calcular last10Score para ${j.nombre}: ${e.message}`))
      )
    );

    onProgress(`✅ Copa Histórica LCE creada correctamente (ID: ${copaRef.id})`);
    if (noEncontrados.length > 0) {
      onProgress(`⚠️ Jugadores no incluidos (no están en Firebase): ${noEncontrados.join(', ')}`);
    }

    return {
      copaId: copaRef.id,
      jugadoresIncluidos: validos.length,
      noEncontrados
    };
  },

  /** Devuelve el snapshot de datos para mostrar en la UI antes de ejecutar */
  getPreviewData() {
    return COPA_HISTORICA.map(j => ({
      nombre: j.nombre,
      puntosTotales: j.puntosTotales,
      participaciones: j.patron.filter(Boolean).length,
      patron: j.patron
    }));
  }
};
