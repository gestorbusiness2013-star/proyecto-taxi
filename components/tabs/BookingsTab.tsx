'use client';

import { useState } from 'react';
import {
  QrCode,
  CalendarCheck,
  MapPin,
  MessageCircle,
  Share2,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Car,
  KeyRound,
  ShieldAlert,
  Play,
  Flag,
  AlertCircle,
} from 'lucide-react';
import type { Booking, Trip, TripStatus } from '@/lib/types';
import { validateBoardingPin, updateTripStatus } from '@/lib/db';

export interface BookingWithTrip {
  booking: Booking;
  trip?: Trip;
}

interface BookingsTabProps {
  bookings: BookingWithTrip[];
  onOpenViajesTab: () => void;
  onBookingStatusChanged?: (bookingId: string, newStatus: Booking['status']) => void;
}

export default function BookingsTab({
  bookings,
  onOpenViajesTab,
  onBookingStatusChanged,
}: BookingsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pasajero' | 'chofer'>('pasajero');
  const [selectedQrBooking, setSelectedQrBooking] = useState<BookingWithTrip | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Driver Validation Form State
  const [driverTripId, setDriverTripId] = useState('trip-caracas-valencia-1');
  const [driverPinInput, setDriverPinInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [pinValidationResult, setPinValidationResult] = useState<{
    success: boolean;
    message: string;
    booking?: Booking;
  } | null>(null);

  // Driver Trip Status State
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleShareTrip = (item: BookingWithTrip) => {
    const { booking, trip } = item;
    const origin = trip?.origin || 'Caracas';
    const dest = trip?.destination || 'Valencia';
    const message = `🚕 Hola! Estoy viajando con Proyecto Taxi:
Ruta: ${origin} ➔ ${dest}
Asientos reservados: ${booking.seatsBooked}
PIN de abordaje de 4 dígitos: ${booking.boardingPin}
Estado: ${booking.status.toUpperCase()}`;

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

  const handleValidatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(driverPinInput)) {
      setPinValidationResult({
        success: false,
        message: 'El PIN debe contener exactamente 4 dígitos.',
      });
      return;
    }

    try {
      setValidating(true);
      setPinValidationResult(null);

      // Validate PIN using helper from lib/db.ts
      const validatedBooking = await validateBoardingPin(
        driverTripId,
        'driver-alejandro-1', // ID del chofer autenticado
        driverPinInput
      );

      setPinValidationResult({
        success: true,
        message: `¡PIN verificado con éxito! Pasajero ${validatedBooking.passengerName} ha abordado (${validatedBooking.seatsBooked} asientos).`,
        booking: validatedBooking,
      });
      setDriverPinInput('');
      onBookingStatusChanged?.(validatedBooking.id, 'boarded');
    } catch (err: unknown) {
      setPinValidationResult({
        success: false,
        message: err instanceof Error ? err.message : 'Error al validar PIN.',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleAdvanceStatus = async (nextStatus: TripStatus) => {
    try {
      setUpdatingStatus(true);
      setStatusMessage(null);
      await updateTripStatus(driverTripId, 'driver-alejandro-1', nextStatus);
      setStatusMessage(`Estado del viaje actualizado a: ${nextStatus.toUpperCase()}`);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Error al actualizar estado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Sub tabs: Vista Pasajero vs Panel Chofer */}
      <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('pasajero')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeSubTab === 'pasajero'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Mis Billetes ({bookings.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('chofer')}
          className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
            activeSubTab === 'chofer'
              ? 'bg-amber-500 text-zinc-950 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Panel Chofer (Validar PIN)
        </button>
      </div>

      {/* PESTAÑA PASAJERO: Ver billetes y PIN */}
      {activeSubTab === 'pasajero' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
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
            bookings.map((item) => {
              const { booking, trip } = item;
              const origin = trip?.origin || 'Caracas';
              const destination = trip?.destination || 'Valencia';
              const isBoarded = booking.status === 'boarded';

              return (
                <div
                  key={booking.id}
                  className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-[#0e1624] p-4 shadow-xl"
                >
                  {/* Boarding Pass header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-2.5 w-2.5 rounded-full ${
                          isBoarded ? 'bg-sky-400' : 'bg-emerald-400 animate-pulse'
                        }`}
                      />
                      <span
                        className={`text-xs font-bold uppercase tracking-wider ${
                          isBoarded ? 'text-sky-400' : 'text-emerald-400'
                        }`}
                      >
                        {isBoarded ? 'ABORDADO' : 'CONFIRMADO'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/15 px-2.5 py-1 text-xs font-black font-mono text-amber-400">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>PIN: {booking.boardingPin}</span>
                    </div>
                  </div>

                  {/* Route Header */}
                  <div className="my-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {origin} ➔ {destination}
                      </h3>
                      <p className="text-xs text-amber-400 font-semibold mt-0.5">
                        Pasajero: {booking.passengerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-xs font-black text-amber-400">
                        {booking.seatsBooked} {booking.seatsBooked === 1 ? 'Asiento' : 'Asientos'}
                      </span>
                    </div>
                  </div>

                  {/* Actions & QR trigger */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setSelectedQrBooking(item)}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 active:scale-95"
                    >
                      <QrCode className="h-3.5 w-3.5 text-amber-400" />
                      <span>Ver Código QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareTrip(item)}
                      className="flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 active:scale-95"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>{shareSuccess === booking.id ? '¡Copiado!' : 'Compartir'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PESTAÑA CHOFER: Validar PIN de Abordaje y Cambiar Estado de Viaje */}
      {activeSubTab === 'chofer' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-500/40 bg-zinc-950 p-4 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
              <KeyRound className="h-5 w-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Validación de PIN de Abordaje
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Introduce el PIN de 4 dígitos que te muestre el pasajero al subir al carro.
                </p>
              </div>
            </div>

            <form onSubmit={handleValidatePin} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  ID de tu viaje en curso:
                </label>
                <select
                  value={driverTripId}
                  onChange={(e) => setDriverTripId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="trip-caracas-valencia-1">Caracas ➔ Valencia (Alejandro Bastidas)</option>
                  <option value="trip-caracas-maracay-1">Caracas ➔ Maracay (Marcos Rivas)</option>
                  <option value="trip-valencia-caracas-1">Valencia ➔ Caracas (Guillermo Peña)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  PIN de abordaje (4 dígitos):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={driverPinInput}
                  onChange={(e) => setDriverPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 0427"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-center text-lg font-black font-mono tracking-widest text-amber-400 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {pinValidationResult && (
                <div
                  className={`rounded-xl p-3 text-xs flex items-start gap-2 border ${
                    pinValidationResult.success
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-red-500/40 bg-red-950/40 text-red-300'
                  }`}
                >
                  {pinValidationResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <span>{pinValidationResult.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={validating || driverPinInput.length !== 4}
                className="w-full rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50"
              >
                {validating ? 'Validando en Firestore...' : 'Validar PIN y Autorizar Abordaje'}
              </button>
            </form>
          </div>

          {/* Estado del Viaje (Transición de Estado) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Control de Estado del Viaje (Chofer)
            </h4>
            <p className="text-[11px] text-zinc-400">
              Actualiza el estado de tu viaje interurbano en Firestore:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleAdvanceStatus('in_route')}
                disabled={updatingStatus}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 py-2 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-950/50 active:scale-95 transition"
              >
                <Play className="h-3.5 w-3.5" />
                <span>En Carretera (in_route)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAdvanceStatus('completed')}
                disabled={updatingStatus}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/30 py-2 px-3 text-xs font-bold text-sky-400 hover:bg-sky-950/50 active:scale-95 transition"
              >
                <Flag className="h-3.5 w-3.5" />
                <span>Finalizado (completed)</span>
              </button>
            </div>

            {statusMessage && (
              <p className="text-[11px] font-semibold text-amber-300 mt-1">
                {statusMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal QR con PIN visible */}
      {selectedQrBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs rounded-2xl border border-amber-500/40 bg-zinc-950 p-5 text-center shadow-2xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Boleto y PIN de Abordaje
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Muestra este código o dicta tu PIN de 4 dígitos al chofer
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

            <div className="rounded-xl bg-amber-500/15 p-2.5 font-mono text-base font-black text-amber-400 border border-amber-500/30">
              PIN: {selectedQrBooking.booking.boardingPin}
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
