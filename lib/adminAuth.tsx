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
import { doc, getDoc } from 'firebase/firestore';
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

async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(getDb(), COLLECTIONS.admins, uid));
    return snap.exists();
  } catch {
    return false;
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
      setIsAdmin(user ? await checkIsAdmin(user.uid) : false);
      setIsLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const auth = getAuth(getFirebaseApp());
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const admin = await checkIsAdmin(cred.user.uid);
      if (!admin) {
        await signOut(auth);
        throw Object.assign(new Error('not-admin'), { code: 'not-admin' });
      }
      setIsAdmin(true);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      const msg =
        code === 'not-admin'
          ? 'Esta cuenta no tiene permisos de administrador.'
          : AUTH_ERRORS[code] ?? 'No se pudo iniciar sesión. Intenta de nuevo.';
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

