'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, ShieldCheck, AlertCircle, LogIn } from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuth';

export default function AdminLoginPage() {
  const router = useRouter();
  const { isAdmin, isLoading, error, signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAdmin) router.replace('/admin');
  }, [isAdmin, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/admin');
    } catch {
      // El mensaje ya queda en `error`
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] text-zinc-100">
      <header className="border-b border-zinc-800/90 pt-safe">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a la app</span>
          </Link>
          <span className="text-xs font-black tracking-wider text-white">
            PROYECTO<span className="text-amber-400">TAXI</span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/40">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-black text-white">Panel de Administración</h1>
              <p className="text-xs text-zinc-400">Acceso exclusivo para el equipo de operaciones</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Correo
              </span>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                placeholder="admin@proyectotaxi.com"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Contraseña
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"
                placeholder="••••••••"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-2.5 text-xs text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-95 disabled:opacity-60"
            >
              {submitting ? <Lock className="h-4 w-4 animate-pulse" /> : <LogIn className="h-4 w-4" />}
              <span>{submitting ? 'Verificando...' : 'Ingresar al panel'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

