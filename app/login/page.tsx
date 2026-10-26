'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Car,
  Lock,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Sparkles,
  Phone,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { useAuth, DEMO_PASSENGER, DEMO_DRIVER } from '@/lib/auth';
import type { User } from '@/lib/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const redirectUrl = searchParams.get('redirect') || '/';
  const message =
    searchParams.get('message') ||
    'Inicia sesión para ver los detalles del vehículo y conductor';

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dni, setDni] = useState('');
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [error, setError] = useState<string | null>(null);

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!phone.trim()) {
      setError('Ingresa tu número de teléfono móvil.');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim().startsWith('+') ? phone.trim() : `+58${phone.replace(/\D/g, '')}`,
      dni: dni.trim() || 'V-00.000.000',
      role,
      isSubscribed: role === 'driver',
      vehicle:
        role === 'driver'
          ? {
              model: 'Sedán Interurbano',
              plate: 'ABC123D',
              color: 'Plata',
            }
          : undefined,
    };

    login(newUser);
    router.push(redirectUrl);
  };

  const handleQuickLogin = (demoUser: User) => {
    login(demoUser);
    router.push(redirectUrl);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-zinc-100 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/90 bg-[#0B0F17]/90 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-white">
              PROYECTO<span className="text-amber-400">TAXI</span>
            </span>
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-black text-amber-400">
              VE
            </span>
          </div>

          <div className="w-12" />
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-safe space-y-5">
        {/* Protected Access Banner / Alert */}
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-b from-amber-500/15 via-zinc-900 to-zinc-950 p-4 shadow-xl space-y-2">
          <div className="flex items-center gap-2.5 text-amber-400">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 ring-1 ring-amber-500/40">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90">
                Acceso a Detalles
              </span>
              <h2 className="text-sm font-black text-white">
                Autenticación Requerida
              </h2>
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed pl-0.5">
            {message}
          </p>
        </div>

        {/* Quick Demo Logins */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3 shadow-lg">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Acceso Rápido con 1 Clic</span>
            </span>
            <span className="text-[10px] text-zinc-500">Demostración</span>
          </div>

          <button
            type="button"
            onClick={() => handleQuickLogin(DEMO_PASSENGER)}
            className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 hover:border-amber-500/50 hover:bg-zinc-900 transition active:scale-98 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 font-black text-sm">
                CM
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Carlos E. Mendoza</span>
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.2 text-[9px] font-bold text-emerald-400">
                    Pasajero
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">0414-1234567 • C.I. V-21.432.890</p>
              </div>
            </div>
            <LogIn className="h-4 w-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={() => handleQuickLogin(DEMO_DRIVER)}
            className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 hover:border-emerald-500/50 hover:bg-zinc-900 transition active:scale-98 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 font-black text-sm">
                AB
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">Alejandro Bastidas</span>
                  <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 text-[9px] font-bold text-amber-400">
                    Conductor
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-mono">Toyota Corolla 2018 • Placa AB123CD</p>
              </div>
            </div>
            <LogIn className="h-4 w-4 text-emerald-400" />
          </button>
        </div>

        {/* Custom Registration/Login Form */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 space-y-3.5 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <UserCheck className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              O ingresa tus datos
            </h3>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleCustomLogin} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Nombre Completo:
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Teléfono Móvil:
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0414-0000000"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Cédula (C.I.):
                </label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="V-12.345.678"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                Rol:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('passenger')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    role === 'passenger'
                      ? 'border-amber-500 bg-amber-500 text-zinc-950'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  Pasajero
                </button>
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    role === 'driver'
                      ? 'border-emerald-500 bg-emerald-500 text-zinc-950'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                  }`}
                >
                  Conductor
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition mt-2"
            >
              <span>Continuar y Ver Vehículo</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0F17] text-zinc-100 flex items-center justify-center text-xs text-zinc-400">
          Cargando inicio de sesión...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
