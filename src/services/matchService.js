'use client';

import { addMatch as addMatchToDB } from '@/firebase/db';
import { useStore } from '@/store/useStore';

/**
 * Lógica de negocio: Crear una partida
 * - Valida datos (en addMatchToDB)
 * - Guarda en Firebase
 * - Actualiza store global
 *
 * Beneficios:
 * - Separación: Firebase + Lógica de negocio + UI
 * - Testeable: Puedo testear esta función sin componentes
 * - Reutilizable: Otros componentes pueden usarlo
 */
export const createMatch = async (matchData) => {
  try {
    // 1. Firebase (ya hace validación)
    const codigo = await addMatchToDB(matchData);

    // 2. Actualizar store global
    useStore.getState().setCodigoPartida(codigo);

    // 3. Retornar código
    return codigo;
  } catch (error) {
    console.error("Error creating match:", error);
    // Re-throw para que el componente lo maneje
    throw error;
  }
};

/**
 * Próximas mejoras:
 * - Si tuvieras auth: export const createMatchAsUser = (userId, matchData)
 * - Si tuvieras analytics: trackMatchCreated(codigo)
 * - Si tuvieras caché: invalidateMatchCache()
 */
