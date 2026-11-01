'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Route,
  Ticket,
  Wallet,
  Siren,
  LogOut,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '@/lib/adminAuth';
import {
  accountStatus,
  listenBookings,
  listenPayments,
  listenReports,
  listenTrips,
  listenUsers,
} from '@/lib/admin';
import type { Booking, Payment, Report, Trip, User } from '@/lib/types';
import OverviewSection from './sections/OverviewSection';
import RequestsSection from './sections/RequestsSection';
import UsersSection from './sections/UsersSection';
import TripsSection from './sections/TripsSection';
import BookingsSection from './sections/BookingsSection';
import FinanceSection from './sections/FinanceSection';
import ReportsSection from './sections/ReportsSection';

export type AdminTab =
  | 'resumen'
  | 'solicitudes'
  | 'usuarios'
  | 'viajes'
  | 'reservas'
  | 'finanzas'
  | 'reportes';

export interface AdminData {
  users: User[];
  trips: Trip[];
  bookings: Booking[];
  payments: Payment[];
  reports: Report[];
}

export default function AdminDashboard() {
  const { firebaseUser, signOutAdmin } = useAdminAuth();
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [data, setData] = useState<AdminData>({
    users: [],
    trips: [],
    bookings: [],
    payments: [],
    reports: [],
  });
  const [loadError, setLoadError] = useState<string | null>(null);

  // Suscripciones en tiempo real a todas las colecciones
  useEffect(() => {
    const onError = (e: Error) => {
      console.warn('[admin] listener:', e);
      setLoadError(
        e.message.includes('permission')
          ? 'Firestore rechazó la lectura. Publica las nuevas firestore.rules (firebase deploy --only firestore:rules).'
          : e.message
      );
    };
    const unsubs = [
      listenUsers((users) => setData((d) => ({ ...d, users })), onError),
      listenTrips((trips) => setData((d) => ({ ...d, trips })), onError),
      listenBookings((bookings) => setData((d) => ({ ...d, bookings })), onError),
      listenPayments((payments) => setData((d) => ({ ...d, payments })), onError),
      listenReports((reports) => setData((d) => ({ ...d, reports })), onError),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const pendingDrivers = data.users.filter(
    (u) => u.role === 'driver' && accountStatus(u) === 'pending'
  ).length;
  const openReports = data.reports.filter((r) => r.status !== 'resolved').length;

  const nav: { id: AdminTab; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'solicitudes', label: 'Solicitudes', icon: UserCheck, badge: pendingDrivers },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'viajes', label: 'Viajes', icon: Route },
    { id: 'reservas', label: 'Reservas', icon: Ticket },
    { id: 'finanzas', label: 'Finanzas', icon: Wallet },
    { id: 'reportes', label: 'Reportes', icon: Siren, badge: openReports },
  ];

  const adminEmail = firebaseUser?.email ?? 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] text-zinc-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-[#0B0F17]/90 pt-safe backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black tracking-wider text-white">
                PROYECTO<span className="text-amber-400">TAXI</span>{' '}
                <span className="text-[10px] font-bold text-zinc-400">ADMIN</span>
              </p>
              <p className="text-[10px] text-zinc-500">{adminEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white sm:inline-block"
            >
              Ver app
            </Link>
            <button
              type="button"
              onClick={() => signOutAdmin()}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Navegación móvil (scroll horizontal) */}
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
          {nav.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} compact />
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-5">
        {/* Navegación lateral (escritorio) */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {nav.map((item) => (
              <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-10">
          {loadError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
              {loadError}
            </div>
          )}

          {tab === 'resumen' && <OverviewSection data={data} onNavigate={setTab} />}
          {tab === 'solicitudes' && <RequestsSection users={data.users} />}
          {tab === 'usuarios' && <UsersSection users={data.users} />}
          {tab === 'viajes' && <TripsSection trips={data.trips} bookings={data.bookings} />}
          {tab === 'reservas' && <BookingsSection bookings={data.bookings} trips={data.trips} />}
          {tab === 'finanzas' && (
            <FinanceSection users={data.users} payments={data.payments} adminEmail={adminEmail} />
          )}
          {tab === 'reportes' && <ReportsSection reports={data.reports} />}
        </main>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
  compact,
}: {
  item: { label: string; icon: LucideIcon; badge?: number };
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-xl border text-left font-bold transition ${compact ? 'px-2.5 py-1.5 text-[11px]' : 'w-full px-3 py-2.5 text-xs'
        } ${active
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
          : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
        }`}
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1">{item.label}</span>
      {!!item.badge && (
        <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-zinc-950">
          {item.badge}
        </span>
      )}
    </button>
  );
}

