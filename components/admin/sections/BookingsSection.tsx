'use client';

import { useState } from 'react';
import { Ban, KeyRound, Phone, MessageCircle, MapPin, Users, Calendar } from 'lucide-react';
import type { Booking, Trip } from '@/lib/types';
import { adminCancelBooking } from '@/lib/admin';
import { WhatsAppTemplates, buildWhatsAppLink } from '@/lib/whatsapp';
import {
  ActionButton,
  Badge,
  EmptyState,
  FilterChips,
  SearchInput,
  SectionHeader,
  Table,
  fmtDateTime,
  usd,
} from '../ui';
import { ActionMessage, useAdminAction } from '../useAdminAction';

export default function BookingsSection({
  bookings,
  trips,
}: {
  bookings: Booking[];
  trips: Trip[];
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'boarded' | 'cancelled'>('all');
  const [query, setQuery] = useState('');
  const { busyId, message, run } = useAdminAction();

  const tripsById = new Map(trips.map((t) => [t.id, t]));

  const filtered = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const matchName = b.passengerName.toLowerCase().includes(q);
      const matchPhone = b.passengerPhone.toLowerCase().includes(q);
      const matchPin = b.boardingPin.includes(q);
      const trip = tripsById.get(b.tripId);
      const matchOrigin = trip?.origin.toLowerCase().includes(q);
      const matchDest = trip?.destination.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchPin && !matchOrigin && !matchDest) return false;
    }
    return true;
  });

  const handleCancelBooking = async (b: Booking) => {
    if (!confirm(`¿Estás seguro de cancelar la reserva de ${b.passengerName} (PIN ${b.boardingPin})? Los ${b.seatsBooked} puesto(s) se devolverán al viaje.`)) {
      return;
    }
    await run(
      b.id,
      () => adminCancelBooking(b.id),
      `Reserva ${b.id} cancelada. Puestos devueltos al viaje.`
    );
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Control de Reservas y Boletos"
        subtitle="Supervisión de puestos apartados, PINs de abordaje y resolución de disputas"
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por pasajero, PIN, teléfono..."
          />
        }
      />

      <ActionMessage message={message} />

      <FilterChips
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'all', label: 'Todas las reservas', count: bookings.length },
          { value: 'confirmed', label: 'Confirmadas', count: bookings.filter((b) => b.status === 'confirmed').length },
          { value: 'boarded', label: 'Abordadas', count: bookings.filter((b) => b.status === 'boarded').length },
          { value: 'cancelled', label: 'Canceladas', count: bookings.filter((b) => b.status === 'cancelled').length },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState text="No se encontraron reservas con los filtros seleccionados." />
      ) : (
        <Table head={['Pasajero / Contacto', 'Ruta del Viaje', 'PIN / Puestos', 'Fecha Reserva', 'Estado', 'Acciones']}>
          {filtered.map((b) => {
            const isBusy = busyId === b.id;
            const trip = tripsById.get(b.tripId);
            const cleanPhone = b.passengerPhone.replace(/\D/g, '');

            return (
              <tr key={b.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-3">
                  <div className="font-bold text-white">{b.passengerName}</div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-300">
                    <span className="font-mono">{b.passengerPhone}</span>
                    <a
                      href={buildWhatsAppLink(
                        b.passengerPhone,
                        WhatsAppTemplates.bookingConfirmation(
                          b.passengerName,
                          trip?.origin || 'Origen',
                          trip?.destination || 'Destino',
                          b.boardingPin,
                          trip?.driverName || 'Conductor',
                          b.seatsBooked
                        )
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300"
                      title="Enviar boleto y PIN por WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </td>
                <td className="px-3 py-3">
                  {trip ? (
                    <div>
                      <div className="font-medium text-white flex items-center gap-1">
                        <span>{trip.origin}</span>
                        <span className="text-amber-400 font-normal">➔</span>
                        <span>{trip.destination}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Chofer: {trip.driverName} ({trip.vehiclePlate})
                      </div>
                    </div>
                  ) : (
                    <span className="text-zinc-500 font-mono text-[11px]">Viaje ID: {b.tripId}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 font-mono text-sm font-black text-amber-400">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>{b.boardingPin}</span>
                  </div>
                  <div className="text-[11px] text-zinc-300">
                    {b.seatsBooked} puesto(s) {trip ? `· ${usd(trip.pricePerSeat * b.seatsBooked)}` : ''}
                  </div>
                </td>
                <td className="px-3 py-3 text-zinc-400 text-xs">
                  {fmtDateTime(b.createdAt)}
                </td>
                <td className="px-3 py-3">
                  {b.status === 'confirmed' && <Badge tone="sky">Confirmada</Badge>}
                  {b.status === 'boarded' && <Badge tone="green">Abordó</Badge>}
                  {b.status === 'cancelled' && <Badge tone="red">Cancelada</Badge>}
                </td>
                <td className="px-3 py-3">
                  {b.status === 'confirmed' && (
                    <ActionButton
                      tone="red"
                      onClick={() => handleCancelBooking(b)}
                      disabled={isBusy}
                    >
                      <Ban className="h-3 w-3" />
                      <span>Cancelar</span>
                    </ActionButton>
                  )}
                </td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

