'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '@/firebase/config';

/**
 * Sesión de Firebase Auth para toda la app.
 * Si nadie inició sesión, entra como anónimo: las Firestore rules exigen
 * auth.uid != null para leer/escribir, y la mayoría de las pantallas
 * (ranking, partidas, jugadores) son de uso público sin login.
 * El login con Google (ver firebase/auth.js) se usa solo para acceder a /admin.
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.error('Error iniciando sesión anónima:', err);
          setLoading(false);
        });
      }
    });

    return () => unsub();
  }, []);

  return {
    user,
    loading,
    isAnonymous: !!user?.isAnonymous,
  };
}
