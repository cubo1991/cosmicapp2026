'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useFirebaseAuth } from './useFirebaseAuth';

/**
 * Hook para gestionar acceso administrativo.
 * Admin real = usuario logueado con Google (no anónimo) cuyo uid tiene
 * un doc en la colección `admins` de Firestore. Ese doc solo se puede
 * crear a mano desde la consola de Firebase (ver firestore.rules:
 * admins/{uid} no permite writes desde el cliente).
 */
export function useAdminAccess() {
  const { user, loading: authLoading, isAnonymous } = useFirebaseAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const checkAdminDoc = async () => {
      if (!user || isAnonymous) {
        if (!cancelled) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'admins', user.uid));
        if (cancelled) return;
        setIsAdmin(snap.exists());
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err.message);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    checkAdminDoc();

    return () => {
      cancelled = true;
    };
  }, [user, isAnonymous, authLoading]);

  return {
    isAdmin,
    loading: authLoading || loading,
    error,
    user: isAnonymous ? null : user,
    checkPermission: (permission) => isAdmin,
    hasRole: (role) => isAdmin,
  };
}

/**
 * Hook para proteger componentes administrativos
 */
export function useProtectedAdmin() {
  const { isAdmin, loading, error, user } = useAdminAccess();

  return {
    isAdmin,
    loading,
    error,
    user,
    isAuthorized: isAdmin || loading,
  };
}
