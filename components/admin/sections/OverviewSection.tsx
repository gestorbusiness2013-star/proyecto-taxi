'use client';

import {
  UserCheck,
  Car,
  Users,
  Wallet,
  AlertTriangle,
  Route,
  Ticket,
  Siren,
  CalendarClock,
} from 'lucide-react';
import { accountStatus, subscriptionState } from '@/lib/admin';
import type { AdminData, AdminTab } from '../AdminDashboard';
import { Badge, SectionHeader, StatCard, fmtDateTime, usd } from '../ui';

export default function OverviewSection({
  data,
  onNavigate,
}: {
  data: AdminData;
  onNavigate: (tab: AdminTab) => void;
}) {
  const { users, trips, bookings, payments, reports } = data;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = now.toISOString().slice(0, 10);

  const drivers = users.filter((u) => u.role === 'driver');
  const passengers = users.filter((u) => u.role === 'passenger');
  const pendingDrivers = drivers.filter((u) => accountStatus(u) === 'pending');
  const activeDrivers = drivers.filter((u) => accountStatus(u) === 'approved');
  const subscribed = activeDrivers.filter((u) => ['active', 'expiring'].includes(subscriptionState(u)));
  const expiring = activeDrivers.filter((u) => subscriptionState(u) === 'expiring');
  const expired = activeDrivers.filter((u) => subscriptionState(u) === 'expired');

  const verified = payments.filter((p) => p.status === 'verified');
  const monthIncome = verified
    .filter((p) => p.createdAt.startsWith(monthKey))
    .reduce((s, p) => s + p.amount, 0);
  const totalIncome = verified.reduce((s, p) => s + p.amount, 0);

  const activeTrips = trips.filter((t) => t.status === 'scheduled' || t.status === 'in_route');
  const inRoute = trips.filter((t) => t.status === 'in_route');
  const bookingsToday = bookings.filter((b) => b.createdAt.startsWith(todayKey));
  const openReports = reports.filter((r) => r.status !== 'resolved');
  const openSos = openReports.filter((r) => r.type === 'sos');

  // Volumen bruto de viajes (informativo: el cobro de la plataforma es por suscripción)
  const tripsById = new Map(trips.map((t) => [t.id, t]));
  const grossVolume = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((s, b) => s + (tripsById.get(b.tripId)?.pricePerSeat ?? 0) * b.seatsBooked, 0);

  // Actividad reciente combinada
  const activity = [
    ...users.slice(0, 8).map((u) => ({
      at: u.createdAt ?? '',
      text: `${u.role === 'driver' ? 'Chofer' : 'Pasajero'} registrado: ${u.name}`,
      tone: 'sky' as const,
    })),
    ...payments.slice(0, 8).map((p) => ({
      at: p.createdAt,
      text: `Pago ${usd(p.amount)} de ${p.driverName}${p.status === 'void' ? ' (anulado)' : ''}`,
      tone: 'green' as const,
    })),
    ...reports.slice(0, 8).map((r) => ({
      at: r.createdAt,
      text: `${r.type === 'sos' ? 'S.O.S.' : r.type === 'complaint' ? 'Queja' : 'Disputa'}: ${r.message.slice(0, 60)}`,
      tone: r.type === 'sos' ? ('red' as const) : ('amber' as const),
    })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <SectionHeader title="Resumen general" subtitle="Datos en tiempo real de toda la plataforma" />

      {openSos.length > 0 && (
        <button
          type="button"
          onClick={() => onNavigate('reportes')}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-500/60 bg-red-950/50 p-4 text-left"
        >
          <Siren className="h-6 w-6 animate-pulse text-red-400" />
          <div>
            <p className="text-sm font-black text-red-300">
              {openSos.length} alerta(s) S.O.S. sin resolver
            </p>
            <p className="text-xs text-red-300/80">Toca para atenderlas de inmediato</p>
          </div>
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UserCheck}
          label="Solicitudes pendientes"
          value={pendingDrivers.length}
          hint="Choferes por verificar"
          tone={pendingDrivers.length ? 'amber' : 'zinc'}
          onClick={() => onNavigate('solicitudes')}
        />
        <StatCard
          icon={Wallet}
          label="Ingresos del mes"
          value={usd(monthIncome)}
          hint={`Histórico: ${usd(totalIncome)}`}
          tone="emerald"
          onClick={() => onNavigate('finanzas')}
        />
        <StatCard
          icon={Car}
          label="Choferes suscritos"
          value={`${subscribed.length}/${activeDrivers.length}`}
          hint={`${expiring.length} por vencer · ${expired.length} vencidos`}
          tone="sky"
          onClick={() => onNavigate('finanzas')}
        />
        <StatCard
          icon={AlertTriangle}
          label="Reportes abiertos"
          value={openReports.length}
          hint={`${openSos.length} S.O.S.`}
          tone={openReports.length ? 'red' : 'zinc'}
          onClick={() => onNavigate('reportes')}
        />
        <StatCard
          icon={Route}
          label="Viajes activos"
          value={activeTrips.length}
          hint={`${inRoute.length} en carretera ahora`}
          onClick={() => onNavigate('viajes')}
        />
        <StatCard
          icon={Ticket}
          label="Reservas de hoy"
          value={bookingsToday.length}
          hint={`${bookings.length} en total`}
          onClick={() => onNavigate('reservas')}
        />
        <StatCard
          icon={Users}
          label="Usuarios"
          value={users.length}
          hint={`${passengers.length} pasajeros · ${drivers.length} choferes`}
          tone="zinc"
          onClick={() => onNavigate('usuarios')}
        />
        <StatCard
          icon={CalendarClock}
          label="Volumen de viajes"
          value={usd(grossVolume)}
          hint="Pagado a choferes (no es ingreso)"
          tone="zinc"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
          <h3 className="mb-3 text-sm font-bold text-white">Actividad reciente</h3>
          {activity.length === 0 ? (
            <p className="text-xs text-zinc-500">Aún no hay actividad registrada.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-zinc-300">{a.text}</span>
                  <Badge tone={a.tone}>{fmtDateTime(a.at)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4">
          <h3 className="mb-3 text-sm font-bold text-white">Suscripciones que requieren cobro</h3>
          {expiring.length + expired.length === 0 ? (
            <p className="text-xs text-zinc-500">Todas las suscripciones están al día.</p>
          ) : (
            <ul className="space-y-2">
              {[...expired, ...expiring].slice(0, 10).map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-300">
                    {u.name} <span className="text-zinc-500">· {u.phone}</span>
                  </span>
                  <Badge tone={subscriptionState(u) === 'expired' ? 'red' : 'amber'}>
                    {subscriptionState(u) === 'expired' ? 'Vencida' : 'Por vencer'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

