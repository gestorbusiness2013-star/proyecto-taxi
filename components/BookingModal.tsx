'use client';

import { useState } from 'react';
import { X, CheckCircle, Car, ShieldCheck, MapPin, Users, DollarSign, AlertCircle } from 'lucide-react';

export interface TripData {
  id: string;
  origin: string;
  originDetail: string;
  destination: string;
  destinationDetail: string;
  departureTime: string;
  date: string;
  duration: string;
  highway: string;
  driverName: string;
  driverRating: number;
  driverTrips: number;
  driverAvatar: string;
  isVerified: boolean;
  vehicleModel: string;
  vehiclePlate: string;
  hasAC: boolean;
  hasTrunk: boolean;
  priceUsd: number;
  priceBcv: number;
  availableSeats: number;
  totalSeats: number;
}

interface BookingModalProps {
  trip: TripData;
  onClose: () => void;
  onConfirmBooking: (trip: TripData, seats: number, passengerName: string, notes: string) => void;
}

export default function BookingModal({
  trip,
  onClose,
  onConfirmBooking,
}: BookingModalProps) {
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [passengerName, setPassengerName] = useState('Carlos E. Mendoza');
  const [passengerPhone, setPassengerPhone] = useState('0414-1234567');
  const [paymentMethod, setPaymentMethod] = useState<'pago_movil' | 'efectivo_usd' | 'zelle'>('efectivo_usd');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const totalUsd = trip.priceUsd * selectedSeats;
  const totalBcv = trip.priceBcv * selectedSeats;

  const handleConfirm = () => {
    setIsSuccess(true);
    setTimeout(() => {
      onConfirmBooking(trip, selectedSeats, passengerName, notes);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              Reserva de Asiento Inmediata
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

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 animate-pulse">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">¡Reserva Confirmada!</h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto">
              Tu asiento ha sido reservado. Se ha generado tu billete digital y código de abordaje en{' '}
              <strong className="text-amber-400">Mis Reservas</strong>.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Trip brief summary card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs space-y-2">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="font-semibold text-white">Horario de Salida:</span>
                <span className="text-amber-400 font-bold">{trip.departureTime} ({trip.date})</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Punto de Encuentro:</span>
                <span className="text-zinc-200 text-right">{trip.originDetail}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Vehículo & Conductor:</span>
                <span className="text-zinc-200">{trip.driverName} • {trip.vehicleModel}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-400">
                <span>Ruta Vial:</span>
                <span className="text-emerald-400 font-medium">{trip.highway}</span>
              </div>
            </div>

            {/* Seat selection */}
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
                  Equipaje o notas (Opcional):
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
                <span className="text-zinc-300">Total a pagar ({selectedSeats} cupo{selectedSeats > 1 ? 's' : ''}):</span>
                <div className="text-right">
                  <span className="text-base font-black text-amber-400">${totalUsd} USD</span>
                  <div className="text-[10px] text-zinc-400">Ref. Bs. {totalBcv.toLocaleString('es-VE')}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
              >
                Confirmar Asiento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
