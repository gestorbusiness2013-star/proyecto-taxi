'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from './types';

// Usuario demo por defecto para pruebas rápidas
export const DEMO_PASSENGER: User = {
  id: 'passenger-carlos-1',
  name: 'Carlos E. Mendoza',
  phone: '+584141234567',
  dni: 'V-21.432.890',
  role: 'passenger',
};

export const DEMO_DRIVER: User = {
  id: 'driver-alejandro-1',
  name: 'Alejandro Bastidas',
  phone: '+584149876543',
  dni: 'V-18.945.321',
  role: 'driver',
  isSubscribed: true,
  vehicle: {
    model: 'Toyota Corolla 2018',
    plate: 'AB123CD',
    color: 'Plata',
  },
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

const AUTH_STORAGE_KEY = 'proyecto_taxi_auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (err) {
      console.warn('Error reading stored auth user:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } catch (err) {
      console.warn('Error saving auth user:', err);
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (err) {
      console.warn('Error removing auth user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
