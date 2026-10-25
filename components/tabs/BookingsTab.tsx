'use client';

import { useState } from 'react';
import {
  QrCode,
  CalendarCheck,
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Car,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { TripData } from '../BookingModal';

export interface UserBooking {
  id: string;
  trip: TripData;
  seats: number;
  passengerName: string;
  notes: string;
  bookingCode: string;
  status: 'confirmado' | 'en_camino' | 'completado';
  createdAt: string;
}

interface BookingsTabProps {
  bookings: UserBooking[];
  onOpenViajesTab: () => void;
}

export default function BookingsTab({ bookings, onOpenViajesTab }: BookingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'activas' | 'historial'>('activas');
  const [selectedQrBooking, setSelectedQrBooking] = useState<UserBooking | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const activeBookings = bookings.filter((b) => b.status !== 'completado');
  const completedBookings = bookings.filter((b) => b.status === 'completado');

  const handleShareTrip = (booking: UserBooking) => {
    const message = `🚕 Hola! Estoy viajando con Proyecto Taxi:
Ruta: ${booking.trip.origin} ➔ ${booking.trip.destination}
Salida: ${booking.trip.departureTime} (${booking.trip.date})
Vía: ${booking.trip.highway}
Vehículo: ${booking.trip.vehicleModel} (${booking.trip.vehiclePlate})
Conductor: ${booking.trip.driverName}
Punto de encuentro: ${booking.trip.originDetail}
Código de abordaje: ${booking.bookingCode}`;

    if (navigator.share) {
      navigator.share({
        title: 'Mi Viaje Seguro - Proyecto Taxi',
        text: message,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(message);
      setShareSuccess(booking.id);
      setTimeout(() => setShareSuccess(null), 3500);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Sub tabs: Activas vs Historial */}
      <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('activas')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeSubTab === 'activas'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Próximos Viajes ({activeBookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('historial')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeSubTab === 'historial'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Historial ({completedBookings.length})
        </button>
      </div>

      {activeSubTab === 'activas' && (
        <div className="space-y-4">
          {activeBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 mb-3">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h2 className="text-sm font-bold text-zinc-200">No tienes viajes reservados</h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Explora la cartelera de viajes interurbanos para reservar tu puesto con conductores verificados.
              </p>
              <button
                type="button"
                onClick={onOpenViajesTab}
                className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
              >
                Ver Cartelera de Viajes
              </button>
            </div>
          ) : (
            activeBookings.map((booking) => (
              <div
                key={booking.id}
                className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-[#0e1624] p-4 shadow-xl"
              >
                {/* Boarding Pass header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Boleto Digital Confirmado
                    </span>
                  </div>
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-400 border border-zinc-700">
                    {booking.bookingCode}
                  </span>
                </div>

                {/* Route Header */}
                <div className="my-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {booking.trip.origin} ➔ {booking.trip.destination}
                    </h3>
                    <p className="text-xs text-amber-400 font-semibold mt-0.5">
                      {booking.trip.departureTime} • {booking.trip.date} ({booking.trip.duration})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-xs font-black text-amber-400">
                      {booking.seats} {booking.seats === 1 ? 'Asiento' : 'Asientos'}
                    </span>
                  </div>
                </div>

                {/* Meeting Point Details */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3 text-xs space-y-1.5">
                  <div className="flex items-start gap-2 text-zinc-300">
                    <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Punto de encuentro:</span>
                      <p className="text-zinc-400 text-[11px] mt-0.5">{booking.trip.originDetail}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-zinc-300 pt-1 border-t border-zinc-900">
                    <Car className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Vehículo:</span>
                      <p className="text-zinc-400 text-[11px]">
                        {booking.trip.vehicleModel} • Placa:{' '}
                        <span className="font-mono text-zinc-200">{booking.trip.vehiclePlate}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Driver information & contact */}
                <div className="mt-3 flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-amber-400 text-xs font-bold border border-zinc-700">
                      {booking.trip.driverAvatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-white">
                        <span>{booking.trip.driverName}</span>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        ★ {booking.trip.driverRating} ({booking.trip.driverTrips} viajes)
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp contact & Boarding QR */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedQrBooking(booking)}
                      className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 active:scale-95"
                    >
                      <QrCode className="h-3.5 w-3.5 text-amber-400" />
                      <span>QR</span>
                    </button>
                    <a
                      href={`https://wa.me/584141234567?text=${encodeURIComponent(
                        `Hola ${booking.trip.driverName}, tengo reserva de viaje ${booking.bookingCode} de ${booking.trip.origin} a ${booking.trip.destination}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 active:scale-95"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* Highway Share for family peace of mind */}
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    Seguridad: comparte ruta con tus familiares
                  </span>
                  <button
                    type="button"
                    onClick={() => handleShareTrip(booking)}
                    className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 active:scale-95"
                  >
                    <Share2 className="h-3 w-3" />
                    <span>{shareSuccess === booking.id ? '¡Copiado!' : 'Compartir Ruta'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Historial de viajes tab */}
      {activeSubTab === 'historial' && (
        <div className="space-y-3">
          {completedBookings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-400">
              <p className="text-xs">No tienes viajes completados en tu historial aún.</p>
            </div>
          ) : (
            completedBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-xs space-y-2 opacity-90"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">
                    {b.trip.origin} ➔ {b.trip.destination}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">Completado</span>
                </div>
                <div className="flex justify-between text-zinc-400 text-[11px]">
                  <span>Conductor: {b.trip.driverName}</span>
                  <span className="text-amber-400 font-bold">${b.trip.priceUsd * b.seats} USD</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-zinc-800/60 text-[10px] text-emerald-400">
                  <span>★ Calificación dada: 5.0 Excelente</span>
                  <span>Recibo verificado</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* QR Boarding Pass Modal */}
      {selectedQrBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl border border-amber-500/40 bg-zinc-950 p-5 text-center shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Código de Abordaje
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Muestra este código al conductor antes de abordar en el punto de encuentro
            </p>

            {/* QR Mockup visual */}
            <div className="my-4 mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-white p-3 shadow-inner">
              <div className="grid grid-cols-6 grid-rows-6 gap-1.5 h-full w-full bg-zinc-950 p-2 rounded-lg">
                <div className="bg-white col-span-2 row-span-2 rounded-sm" />
                <div className="bg-white col-span-1 row-span-1" />
                <div className="bg-white col-span-1 row-span-2" />
                <div className="bg-white col-span-2 row-span-2 rounded-sm" />
                <div className="bg-white col-span-2 row-span-1" />
                <div className="bg-amber-400 col-span-2 row-span-2 rounded-sm" />
                <div className="bg-white col-span-2 row-span-2 rounded-sm" />
                <div className="bg-white col-span-1 row-span-1" />
                <div className="bg-white col-span-1 row-span-2" />
                <div className="bg-white col-span-2 row-span-1" />
              </div>
            </div>

            <div className="rounded-lg bg-zinc-900 p-2 font-mono text-sm font-black text-amber-400 border border-zinc-800">
              {selectedQrBooking.bookingCode}
            </div>

            <button
              type="button"
              onClick={() => setSelectedQrBooking(null)}
              className="mt-4 w-full rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
