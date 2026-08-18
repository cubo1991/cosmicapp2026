'use client';

import { useFirebaseAuth } from '@/hooks/useFirebaseAuth';

/**
 * Monta la sesión de Firebase Auth (anónima por defecto) apenas carga la app,
 * para que cualquier pantalla pueda leer/escribir en Firestore sin esperar
 * a que cada hook la dispare por su cuenta. No renderiza nada.
 */
export default function AuthBootstrap() {
  useFirebaseAuth();
  return null;
}
