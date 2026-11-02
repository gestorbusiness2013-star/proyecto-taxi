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
  Star,
  Volume2,
  VolumeX,
  Coins,
  AlertTriangle,
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
  listenReviews,
} from '@/lib/admin';
import type { Booking, Payment, Report, Trip, User, Review } from '@/lib/types';
import { listenBcvRate, DEFAULT_BCV_RATE } from '@/lib/bcv';
import {
  startEmergencyAlarm,
  stopEmergencyAlarm,
  setAlarmMuted,
  getAlarmMuted,
} from './audioAlert';
import OverviewSection from './sections/OverviewSection';
import RequestsSection from './sections/RequestsSection';
import UsersSection from './sections/UsersSection';
import TripsSection from './sections/TripsSection';
import BookingsSection from './sections/BookingsSection';
import FinanceSection from './sections/FinanceSection';
import ReportsSection from './sections/ReportsSection';
import ReviewsSection from './sections/ReviewsSection';

export type AdminTab =
  | 'resumen'
  | 'solicitudes'
  | 'usuarios'
  | 'viajes'
  | 'reservas'
  | 'finanzas'
  | 'reportes'
  | 'resenas';

export interface AdminData {
  users: User[];
  trips: Trip[];
  bookings: Booking[];
  payments: Payment[];
  reports: Report[];
  reviews: Review[];
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
    reviews: [],
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [bcvRate, setBcvRate] = useState<number>(DEFAULT_BCV_RATE);
  const [isMuted, setIsMuted] = useState(false);

  // Suscripciones en tiempo real a todas las colecciones
  useEffect(() => {
    setIsMuted(getAlarmMuted());
    const onError = (name: string) => (e: Error) => {
      console.warn(`[admin] listener ${name}:`, e);
      if (e.message.includes('permission') || (e as unknown as { code?: string })?.code === 'permission-denied') {
        setLoadError(
          `Firestore denegó la lectura en '${name}'. Debes copiar las reglas de 'firestore.rules' en Firebase Console (Firestore Database > Reglas) y pulsar 'Publicar'.`
        );
      } else {
        setLoadError(`${name}: ${e.message}`);
      }
    };
    const unsubs = [
      listenUsers((users) => setData((d) => ({ ...d, users })), onError('usuarios')),
      listenTrips((trips) => setData((d) => ({ ...d, trips })), onError('viajes')),
      listenBookings((bookings) => setData((d) => ({ ...d, bookings })), onError('reservas')),
      listenPayments((payments) => setData((d) => ({ ...d, payments })), onError('pagos')),
      listenReports((reports) => setData((d) => ({ ...d, reports })), onError('reportes')),
      listenReviews((reviews) => setData((d) => ({ ...d, reviews })), onError('resenas')),
      listenBcvRate((rate) => setBcvRate(rate.rate)),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const pendingDrivers = data.users.filter(
    (u) => u.role === 'driver' && accountStatus(u) === 'pending'
  ).length;
  const openReports = data.reports.filter((r) => r.status !== 'resolved').length;

  // Alarma sonora para emergencias S.O.S activas
  useEffect(() => {
    if (openReports > 0 && !isMuted) {
      startEmergencyAlarm();
    } else {
      stopEmergencyAlarm();
    }
  }, [openReports, isMuted]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    setAlarmMuted(next);
  };

  const nav: { id: AdminTab; label: string; icon: LucideIcon; badge?: number }[] = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'solicitudes', label: 'Solicitudes', icon: UserCheck, badge: pendingDrivers },
    { id: 'usuarios', label: 'Usuarios', icon: Users },
    { id: 'viajes', label: 'Viajes', icon: Route },
    { id: 'reservas', label: 'Reservas', icon: Ticket },
    { id: 'finanzas', label: 'Finanzas', icon: Wallet },
    { id: 'reportes', label: 'S.O.S', icon: Siren, badge: openReports },
    { id: 'resenas', label: 'Calidad', icon: Star },
  ];

  const adminEmail = firebaseUser?.email ?? 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] text-zinc-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-[#0B0F17]/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-md shadow-amber-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-xs sm:text-sm font-black tracking-wider text-white truncate">
                TAXI LIBRE <span className="text-amber-400">VENEZUELA</span>{' '}
                <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1 py-0.2 text-[9px] font-black text-amber-400">
                  ADMIN
                </span>
              </p>
              <p className="text-[10px] text-zinc-500 truncate max-w-[140px] sm:max-w-none">{adminEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Pill Tasa BCV */}
            <div className="hidden xs:flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-300">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>Bs. {bcvRate.toFixed(2)}</span>
            </div>

            {/* Silenciar/Activar Alarma SOS */}
            <button
              type="button"
              onClick={toggleMute}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition active:scale-95 ${
                isMuted
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-400'
                  : 'border-red-500/40 bg-red-950/40 text-red-300'
              }`}
              title={isMuted ? 'Activar sirena de emergencias' : 'Silenciar sirena'}
            >
              {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-red-400 animate-pulse" />}
              <span className="hidden sm:inline">{isMuted ? 'Mudo' : 'Sirena'}</span>
            </button>

            <Link
              href="/"
              className="hidden rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white sm:inline-block"
            >
              Ver app
            </Link>

            <button
              type="button"
              onClick={() => signOutAdmin()}
              className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-300 hover:text-white active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Navegación móvil ultra-smooth (scroll horizontal táctil) */}
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 pt-1 lg:hidden scrollbar-none no-scrollbar">
          {nav.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} compact />
          ))}
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 sm:px-4 py-4 sm:py-5">
        {/* Navegación lateral (escritorio) */}
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-1">
            {nav.map((item) => (
              <NavButton key={item.id} item={item} active={tab === item.id} onClick={() => setTab(item.id)} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16">
          {loadError && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{loadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setLoadError(null)}
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-red-400 hover:bg-red-900/50"
              >
                Cerrar ✕
              </button>
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
          {tab === 'resenas' && <ReviewsSection reviews={data.reviews} users={data.users} adminEmail={adminEmail} />}
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

