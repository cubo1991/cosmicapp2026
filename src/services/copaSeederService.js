'use client';

import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/firebase/config';

/**
 * Datos de la copa histórica LCE leídos del Excel (columna Total).
 * patron: array de 10 posiciones (1 = jugó, 0 = no estuvo)
 * puntosTotales: valor EXACTO de la columna "Total" del Excel para las 10 partidas de la copa
 *
 * Mapeo nombre Excel → Firebase (campo `name` del jugador):
 *   A. Baca        → Ale Baca
 *   Juan P. Videla → Juanpi
 *   Arrigo Zanab.  → Arrigo
 *   David L. Math. → David Lopez
 *   Gregorio Laz.  → Goyo
 *   A. Martínez    → A. Martinez
 *   Juan M. Gómez  → JM
 *   Pedro Bernabeu → Pedro
 *   Diego Forni    → Diego
 *   Lázaro Jofré   → Lazaro
 */
const COPA_HISTORICA = [
  {
    nombre: 'Ale Baca',
    puntosTotales: 141.0,
    patron: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'Juanpi',
    puntosTotales: 125.5,
    patron: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'Arrigo',
    puntosTotales: 125.8,
    patron: [1, 1, 1, 1, 0, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'David Lopez',
    puntosTotales: 134.7,
    patron: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'Goyo',
    puntosTotales: 168.7,
    patron: [1, 1, 1, 0, 1, 1, 1, 1, 1, 1]
  },
  {
    nombre: 'JM',
    puntosTotales: 139.5,
    patron: [1, 1, 1, 1, 1, 1, 1, 0, 1, 1]
  },
  {
    nombre: 'Pedro',
    puntosTotales: 127.0,
    patron: [1, 1, 1, 0, 0, 1, 1, 1, 0, 0]
  },
  {
    nombre: 'Diego',
    puntosTotales: 117.7,
    patron: [1, 0, 1, 1, 1, 0, 1, 1, 1, 1]
  },
  {
    nombre: 'Lazaro',
    puntosTotales: 129.0,
    patron: [1, 1, 1, 1, 1, 1, 1, 1, 0, 1]
  },
  {
    nombre: 'A. Martinez',
    puntosTotales: 35.0,
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

    // ── Limpiar lastMatches existentes para evitar contaminación ─────────
    onProgress('Limpiando partidas anteriores de los jugadores...');
    for (const j of validos) {
      const lastMatchesSnap = await getDocs(
        collection(db, 'players', j.playerId, 'lastMatches')
      );
      if (lastMatchesSnap.docs.length > 0) {
        const deleteBatch = writeBatch(db);
        lastMatchesSnap.docs.forEach(d => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
        onProgress(`🗑️ ${j.nombre}: ${lastMatchesSnap.docs.length} entradas previas eliminadas`);
      }
    }

    onProgress(`${validos.length} jugadores validados. Preparando datos...`);

    // Distribuir puntos por partida (promedio = puntosTotales / partidas jugadas)
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

    // Construir ranking de la copa
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

    onProgress(`Ganador: ${ganador.nombre} con ${ganador.puntosTotales} pts`);

    // ── Crear documentos en Firestore (copa + 10 matches + lastMatches) ──
    const batch = writeBatch(db);
    const copaRef = doc(collection(db, 'copas'));
    const partidasArray = [];

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
    onProgress('✅ Copa y partidas guardadas en Firestore');

    // ── Fijar last10Score directamente en cada jugador ───────────────────
    // Se asigna directamente el total del Excel en lugar de recalcular desde
    // la subcollección, evitando problemas de ordenamiento por serverTimestamp.
    onProgress('Actualizando last10Score en cada jugador...');
    await Promise.all(
      validos.map(j =>
        updateDoc(doc(db, 'players', j.playerId), {
          last10Score: j.puntosTotales,
          last10ScoreUpdatedAt: serverTimestamp()
        })
          .then(() => onProgress(`✓ ${j.nombre}: last10Score = ${j.puntosTotales}`))
          .catch(e => onProgress(`⚠️ No se pudo actualizar ${j.nombre}: ${e.message}`))
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

  /** Datos de previsualización para mostrar antes de ejecutar */
  getPreviewData() {
    return COPA_HISTORICA.map(j => ({
      nombre: j.nombre,
      puntosTotales: j.puntosTotales,
      participaciones: j.patron.filter(Boolean).length,
      patron: j.patron
    }));
  }
};
