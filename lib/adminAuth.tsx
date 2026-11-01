'use client';

// Sesión del administrador: Firebase Authentication (email/contraseña) +
// verificación de rol consultando el documento `admins/{uid}` en Firestore.
// El documento se crea manualmente desde la consola de Firebase (ver README).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS, getDb, getFirebaseApp, isFirebaseConfigured } from './db';

type AdminAuthState = {
  firebaseUser: FirebaseUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOutAdmin: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthState | null>(null);

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'El correo no es válido.',
  'auth/user-disabled': 'Esta cuenta fue deshabilitada.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisa tu internet.',
  'auth/operation-not-allowed':
    'El inicio de sesión con email no está habilitado en Firebase Authentication.',
};

interface AdminCheckResult {
  isAdmin: boolean;
  errorMessage?: string;
}

async function checkIsAdmin(user: FirebaseUser): Promise<AdminCheckResult> {
  try {
    const db = getDb();
    
    // 1. Verificación primaria: documento en /admins/{user.uid}
    const directDoc = await getDoc(doc(db, COLLECTIONS.admins, user.uid));
    if (directDoc.exists()) {
      return { isAdmin: true };
    }

    // 2. Verificación secundaria por si el documento fue nombrado con el correo
    if (user.email) {
      const emailDoc = await getDoc(doc(db, COLLECTIONS.admins, user.email.toLowerCase()));
      if (emailDoc.exists()) {
        return { isAdmin: true };
      }

      // 3. Verificación por consulta de campo email
      const q = query(
        collection(db, COLLECTIONS.admins),
        where('email', '==', user.email.toLowerCase())
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { isAdmin: true };
      }
    }

    return {
      isAdmin: false,
      errorMessage: `El usuario autenticado (UID: ${user.uid}) no está registrado en la colección 'admins'.`,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    const msg = (err as Error)?.message || '';
    if (code === 'permission-denied' || msg.includes('permission')) {
      return {
        isAdmin: false,
        errorMessage:
          'Firestore denegó el permiso para verificar /admins. Por favor asegúrate de haber pulsado "Publicar" en la pestaña Reglas de Firebase Console.',
      };
    }
    return {
      isAdmin: false,
      errorMessage: `Error verificando administrador: ${msg}`,
    };
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setError('Firebase no está configurado (variables NEXT_PUBLIC_FIREBASE_*).');
      setIsLoading(false);
      return;
    }
    const auth = getAuth(getFirebaseApp());
    return onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const res = await checkIsAdmin(user);
        setIsAdmin(res.isAdmin);
      } else {
        setIsAdmin(false);
      }
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const auth = getAuth(getFirebaseApp());
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const res = await checkIsAdmin(cred.user);
      if (!res.isAdmin) {
        await signOut(auth);
        throw new Error(res.errorMessage || 'Esta cuenta no tiene permisos de administrador.');
      }
      setIsAdmin(true);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      const customMsg = (err as Error)?.message;
      const msg = AUTH_ERRORS[code] || customMsg || 'No se pudo iniciar sesión. Intenta de nuevo.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const signOutAdmin = async () => {
    await signOut(getAuth(getFirebaseApp()));
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{ firebaseUser, isAdmin, isLoading, error, signIn, signOutAdmin }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth debe usarse dentro de <AdminAuthProvider>.');
  return ctx;
}

