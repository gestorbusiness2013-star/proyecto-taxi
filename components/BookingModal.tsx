'use client';

import { useState } from 'react';
import { X, CheckCircle, Car, ShieldCheck, MapPin, Users, DollarSign, AlertCircle, KeyRound } from 'lucide-react';
import type { Trip, Booking } from '@/lib/types';
import { bookSeats } from '@/lib/db';

interface BookingModalProps {
  trip: Trip;
  onClose: () => void;
  onBookingSuccess: (booking: Booking, trip: Trip) => void;
}

export default function BookingModal({
  trip,
  onClose,
  onBookingSuccess,
}: BookingModalProps) {
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [passengerName, setPassengerName] = useState('Carlos E. Mendoza');
  const [passengerPhone, setPassengerPhone] = useState('+584141234567');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo_usd' | 'pago_movil' | 'zelle'>('efectivo_usd');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const totalUsd = trip.pricePerSeat * selectedSeats;
  const totalBcv = totalUsd * 85; // Tasa referencial oficial BCV

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const booking = await bookSeats({
        tripId: trip.id,
        passenger: {
          id: 'passenger-carlos-1',
          name: passengerName,
          phone: passengerPhone,
        },
        seats: selectedSeats,
      });

      setConfirmedBooking(booking);
      setTimeout(() => {
        onBookingSuccess(booking, trip);
      }, 1500);
    } catch (err: unknown) {
      console.error('Booking error:', err);
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Error al procesar la reserva. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(trip.departureTime).toLocaleDateString('es-VE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Reserva Atómica en Tiempo Real
            </span>
            <h2 className="text-base font-bold text-white">
              {trip.origin} ➔ {trip.destination}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {confirmedBooking ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 animate-pulse">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">¡Reserva Confirmada!</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Se ha descontado tu cupo en tiempo real. Tu código de abordaje seguro es:
            </p>
            <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/15 px-4 py-2 text-lg font-black font-mono text-amber-400">
              <KeyRound className="h-5 w-5 text-amber-400" />
              <span>PIN: {confirmedBooking.boardingPin}</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Muestra este PIN al chofer {trip.driverName} al momento de abordar.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {errorMsg && (
              <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Trip summary */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs space-y-2">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-semibold text-white">Salida Programada:</span>
                <span className="text-amber-400 font-bold">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Chofer & Placa:</span>
                <span className="text-zinc-200">{trip.driverName} • Placa {trip.vehiclePlate}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Cupos Disponibles:</span>
                <span className="text-emerald-400 font-bold">{trip.availableSeats} de {trip.totalSeats} asientos</span>
              </div>
            </div>

            {/* Seat selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Cantidad de asientos ({trip.availableSeats} disponibles):
              </label>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(trip.availableSeats, 4) }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSelectedSeats(num)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition border ${
                      selectedSeats === num
                        ? 'border-amber-500 bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {num} {num === 1 ? 'Cupo' : 'Cupos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Passenger details */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Nombre del pasajero:
                </label>
                <input
                  type="text"
                  value={passengerName}
                  onChange={(e) => setPassengerName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Tu nombre y apellido"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Teléfono de contacto (WhatsApp):
                </label>
                <input
                  type="tel"
                  value={passengerPhone}
                  onChange={(e) => setPassengerPhone(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  placeholder="0412 / 0414 / 0424..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Método de pago al abordar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo_usd')}
                    className={`rounded-lg p-2 text-center text-[10px] font-bold border transition ${
                      paymentMethod === 'efectivo_usd'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    Efectivo USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pago_movil')}
                    className={`rounded-lg p-2 text-center text-[10px] font-bold border transition ${
                      paymentMethod === 'pago_movil'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    Pago Móvil (BCV)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('zelle')}
                    className={`rounded-lg p-2 text-center text-[10px] font-bold border transition ${
                      paymentMethod === 'zelle'
                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    Zelle
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Equipaje o notas adicionales (Opcional):
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Ej: 1 maleta mediana, bolso de mano"
                />
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-300">Total ({selectedSeats} cupo{selectedSeats > 1 ? 's' : ''}):</span>
                <div className="text-right">
                  <span className="text-base font-black text-amber-400">${totalUsd} USD</span>
                  <div className="text-[10px] text-zinc-400">Ref. Bs. {totalBcv.toLocaleString('es-VE')}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <span>Procesando...</span>
                ) : (
                  <span>Confirmar y Obtener PIN</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
