'use client';

import { useState } from 'react';
import { EyeOff, Eye, Ban, MapPin, Users, DollarSign, Calendar, Car } from 'lucide-react';
import type { Booking, Trip, TripStatus } from '@/lib/types';
import { adminCancelTrip, setTripModeration } from '@/lib/admin';
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

export default function TripsSection({
  trips,
  bookings,
}: {
  trips: Trip[];
  bookings: Booking[];
}) {
  const [statusFilter, setStatusFilter] = useState<TripStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedTripDetails, setSelectedTripDetails] = useState<Trip | null>(null);
  const { busyId, message, run } = useAdminAction();

  const filtered = trips.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;

    if (query.trim()) {
      const q = query.toLowerCase();
      const matchOrigin = t.origin.toLowerCase().includes(q);
      const matchDest = t.destination.toLowerCase().includes(q);
      const matchDriver = t.driverName.toLowerCase().includes(q);
      const matchPlate = t.vehiclePlate.toLowerCase().includes(q);
      if (!matchOrigin && !matchDest && !matchDriver && !matchPlate) return false;
    }
    return true;
  });

  const handleToggleModeration = async (trip: Trip) => {
    const next = trip.moderation === 'rejected' ? 'approved' : 'rejected';
    await run(
      trip.id,
      () => setTripModeration(trip.id, next),
      next === 'rejected'
        ? `Viaje de ${trip.driverName} ocultado a los pasajeros.`
        : `Viaje de ${trip.driverName} aprobado y visible.`
    );
  };

  const handleCancelTrip = async (trip: Trip) => {
    if (!confirm(`¿Estás seguro de cancelar administrativamente el viaje de ${trip.driverName} (${trip.origin} ➔ ${trip.destination})?`)) {
      return;
    }
    await run(
      trip.id,
      () => adminCancelTrip(trip.id),
      `Viaje ${trip.id} cancelado por administración.`
    );
  };

  const getTripBookings = (tripId: string) => bookings.filter((b) => b.tripId === tripId);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Control de Viajes"
        subtitle="Monitoreo de rutas, estado en carretera y moderación de publicaciones"
        actions={
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por origen, destino, chofer..."
          />
        }
      />

      <ActionMessage message={message} />

      <FilterChips
        value={statusFilter}
        onChange={setStatusFilter}
        options={[
          { value: 'all', label: 'Todos los viajes', count: trips.length },
          { value: 'scheduled', label: 'Programados', count: trips.filter((t) => t.status === 'scheduled').length },
          { value: 'in_route', label: 'En Ruta', count: trips.filter((t) => t.status === 'in_route').length },
          { value: 'completed', label: 'Completados', count: trips.filter((t) => t.status === 'completed').length },
          { value: 'cancelled', label: 'Cancelados', count: trips.filter((t) => t.status === 'cancelled').length },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState text="No se encontraron viajes con los filtros seleccionados." />
      ) : (
        <Table head={['Ruta / Salida', 'Chofer / Auto', 'Puestos / Tarifa', 'Estado', 'Moderación', 'Acciones']}>
          {filtered.map((trip) => {
            const isBusy = busyId === trip.id;
            const tripBookingsList = getTripBookings(trip.id);
            const isHidden = trip.moderation === 'rejected';

            return (
              <tr key={trip.id} className="hover:bg-white/[0.02]">
                <td className="px-3 py-3">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>{trip.origin}</span>
                    <span className="text-amber-400 font-normal">➔</span>
                    <span>{trip.destination}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                    <Calendar className="h-3 w-3 text-zinc-500" />
                    <span>{fmtDateTime(trip.departureTime)}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="font-medium text-zinc-200">{trip.driverName}</div>
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                    <Car className="h-3 w-3 text-amber-500" />
                    <span>{trip.vehicleModel || 'Vehículo'} ({trip.vehiclePlate})</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-xs text-zinc-300">
                    <Users className="h-3 w-3 text-amber-400" />
                    <span>
                      {trip.totalSeats - trip.availableSeats} / {trip.totalSeats} ocupados
                    </span>
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    {usd(trip.pricePerSeat)} / puesto
                  </div>
                </td>
                <td className="px-3 py-3">
                  {trip.status === 'scheduled' && <Badge tone="sky">Programado</Badge>}
                  {trip.status === 'in_route' && <Badge tone="amber">En Ruta</Badge>}
                  {trip.status === 'completed' && <Badge tone="green">Completado</Badge>}
                  {trip.status === 'cancelled' && <Badge tone="red">Cancelado</Badge>}
                </td>
                <td className="px-3 py-3">
                  {isHidden ? (
                    <Badge tone="red">Oculto</Badge>
                  ) : (
                    <Badge tone="green">Visible</Badge>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTripDetails(trip)}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-bold text-zinc-300 hover:text-white"
                    >
                      Reservas ({tripBookingsList.length})
                    </button>

                    <ActionButton
                      tone={isHidden ? 'green' : 'amber'}
                      onClick={() => handleToggleModeration(trip)}
                      disabled={isBusy}
                    >
                      {isHidden ? (
                        <>
                          <Eye className="h-3 w-3" />
                          <span>Aprobar</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3" />
                          <span>Ocultar</span>
                        </>
                      )}
                    </ActionButton>

                    {trip.status !== 'cancelled' && trip.status !== 'completed' && (
                      <ActionButton
                        tone="red"
                        onClick={() => handleCancelTrip(trip)}
                        disabled={isBusy}
                      >
                        <Ban className="h-3 w-3" />
                        <span>Cancelar</span>
                      </ActionButton>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Modal para ver pasajeros de un viaje específico */}
      {selectedTripDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Reservas del Viaje: {selectedTripDetails.origin} ➔ {selectedTripDetails.destination}
                </h3>
                <p className="text-xs text-zinc-400">
                  Chofer: {selectedTripDetails.driverName} ({selectedTripDetails.driverPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripDetails(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {getTripBookings(selectedTripDetails.id).length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">Este viaje aún no tiene reservas.</p>
            ) : (
              <div className="space-y-2">
                {getTripBookings(selectedTripDetails.id).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-zinc-900/60 p-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{b.passengerName}</div>
                      <div className="text-zinc-400">{b.passengerPhone}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        PIN: <span className="text-amber-400 font-bold">{b.boardingPin}</span> · {b.seatsBooked} puesto(s)
                      </div>
                    </div>
                    <div>
                      {b.status === 'confirmed' && <Badge tone="sky">Confirmado</Badge>}
                      {b.status === 'boarded' && <Badge tone="green">Abordó</Badge>}
                      {b.status === 'cancelled' && <Badge tone="red">Cancelado</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
