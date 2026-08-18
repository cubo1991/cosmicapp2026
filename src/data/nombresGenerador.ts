/**
 * Vocabulario temático de Cosmic Encounter para el generador de nombres
 * de partidas y copas (ver src/utils/generadorNombres.js).
 *
 * Los adjetivos están en forma masculina/invariante a propósito: en las
 * plantillas siempre se combinan con un nombre de alien (tratado como
 * sustantivo propio masculino, ej. "el Virus"), nunca con SUSTANTIVOS
 * directamente, para no generar errores de concordancia de género.
 *
 * CARTAS son nombres reales de cartas/mecánicas del juego (Cosmic Zap,
 * Card Zap, Emotion Control, Force Field, Ionic Gas, Mobius Tubes, Plague,
 * Quash, Solar Wind son artefactos/cartas cósmicas oficiales).
 */

export const ADJETIVOS = [
  'Cósmico', 'Ancestral', 'Voraz', 'Letal', 'Fulgurante', 'Errante',
  'Implacable', 'Silencioso', 'Vengativo', 'Temerario', 'Enigmático',
  'Infinito', 'Épico', 'Legendario', 'Supremo', 'Inexorable', 'Colosal',
  'Radiante', 'Sombrío', 'Cuántico', 'Primigenio', 'Fugaz',
];

export const SUSTANTIVOS = [
  'Invasión', 'Némesis', 'Colonia', 'Singularidad', 'Supernova', 'Eclipse',
  'Convergencia', 'Anomalía', 'Odisea', 'Génesis', 'Paradoja', 'Resonancia',
  'Tormenta', 'Vórtice',
];

export const CARTAS = [
  'Cosmic Zap', 'Card Zap', 'Emotion Control', 'Force Field', 'Ionic Gas',
  'Mobius Tubes', 'Plague', 'Quash', 'Solar Wind', 'Negociar', 'Morph',
  'Refuerzo',
];
