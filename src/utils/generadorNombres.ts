'use client';

import { getAliens } from '@/firebase/db';
import { ADJETIVOS, SUSTANTIVOS, CARTAS } from '@/data/nombresGenerador';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Excluye variantes "(Alternate)" de la colección de aliens
async function alienAleatorio() {
  try {
    const aliens = await getAliens();
    const disponibles = aliens.filter(
      (a) => a.Nombre && !/alternat/i.test(a.Nombre),
    );
    if (disponibles.length === 0) return null;
    return pick(disponibles).Nombre;
  } catch {
    return null;
  }
}

const PLANTILLAS_PARTIDA = [
  (alien) => `${pick(ADJETIVOS)} ${alien}`,
  (alien) => `${alien} ${pick(ADJETIVOS)}`,
  (alien) => `La ${pick(SUSTANTIVOS)} de ${alien}`,
  (alien) => `${alien}: ${pick(CARTAS)}`,
];
const PLANTILLAS_PARTIDA_SIN_ALIEN = [
  () => `La ${pick(SUSTANTIVOS)}`,
  () => pick(CARTAS),
];

const PLANTILLAS_COPA = [
  (alien) => `Copa ${pick(ADJETIVOS)} ${alien}`,
  (alien) => `Copa ${pick(SUSTANTIVOS)} de ${alien}`,
  (alien) => `Copa ${alien}: ${pick(SUSTANTIVOS)}`,
];
const PLANTILLAS_COPA_SIN_ALIEN = [
  () => `Copa ${pick(SUSTANTIVOS)}`,
  () => `Copa ${pick(CARTAS)}`,
];

/**
 * Nombre aleatorio temático para una partida, ej. "Implacable Virus".
 * Usa un alien real de la colección (sin variantes alternativas) cuando
 * puede leerla; si no, cae a una plantilla sin alien.
 */
export async function generarNombrePartida() {
  const alien = await alienAleatorio();
  if (!alien) return pick(PLANTILLAS_PARTIDA_SIN_ALIEN)();
  return pick(PLANTILLAS_PARTIDA)(alien);
}

/** Igual que generarNombrePartida pero con formato de copa/torneo. */
export async function generarNombreCopa() {
  const alien = await alienAleatorio();
  if (!alien) return pick(PLANTILLAS_COPA_SIN_ALIEN)();
  return pick(PLANTILLAS_COPA)(alien);
}
