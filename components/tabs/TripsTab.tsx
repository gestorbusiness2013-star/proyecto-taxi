'use client';

import { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  ShieldCheck,
  Snowflake,
  Luggage,
  Users,
  ArrowRight,
  PlusCircle,
  Radio,
  RefreshCw,
} from 'lucide-react';
import type { Trip, Booking } from '@/lib/types';
import { getLiveTrips } from '@/lib/db';
import BookingModal from '../BookingModal';

interface TripsTabProps {
  onBookTripSuccess: (booking: Booking, trip: Trip) => void;
}

const CITIES = [
  'Todas las ciudades',
  'Caracas',
  'Valencia',
  'Maracay',
  'Barquisimeto',
  'Puerto La Cruz',
  'San Cristóbal',
];

export default function TripsTab({ onBookTripSuccess }: TripsTabProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrigin, setSelectedOrigin] = useState('Todas las ciudades');
  const [selectedDestination, setSelectedDestination] = useState('Todas las ciudades');
  const [selectedTripForModal, setSelectedTripForModal] = useState<Trip | null>(null);
  const [showDriverPublishNotice, setShowDriverPublishNotice] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Subscribe in real-time to Firestore live trips
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = getLiveTrips(
        'scheduled',
        (liveTrips) => {
          setTrips(liveTrips);
          setLoading(false);
          setIsLiveConnected(true);
        },
        (error) => {
          console.warn('Real-time listener notice:', error);
          setLoading(false);
        }
      );
    } catch (e) {
      console.warn('Firestore offline or credentials pending:', e);
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filter trips
  const filteredTrips = trips.filter((t) => {
    if (selectedOrigin !== 'Todas las ciudades' && t.origin !== selectedOrigin) {
      return false;
    }
    if (selectedDestination !== 'Todas las ciudades' && t.destination !== selectedDestination) {
      return false;
    }
    return t.availableSeats > 0;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Route Search Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-[#0B0F17] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400" />
            <h1 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Cartelera en Tiempo Real
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {isLiveConnected && (
              <span className="flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                <Radio className="h-2.5 w-2.5 animate-pulse" />
                <span>Sincronizado</span>
              </span>
            )}
            <span className="text-[10px] text-zinc-400">
              {filteredTrips.length} disponibles
            </span>
          </div>
        </div>

        {/* Origin and Destination Quick Selectors */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Origin */}
          <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-zinc-400 mb-1">
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span>Origen</span>
            </label>
            <select
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              {CITIES.map((c) => (
                <option key={`origin-${c}`} value={c} className="bg-zinc-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/70 p-2.5">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-zinc-400 mb-1">
              <MapPin className="h-3 w-3 text-amber-400" />
              <span>Destino</span>
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              {CITIES.map((c) => (
                <option key={`dest-${c}`} value={c} className="bg-zinc-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
          <span className="text-[11px] text-zinc-400">
            Descuento de cupos asegurado por transacción atómica
          </span>
          <button
            type="button"
            onClick={() => setShowDriverPublishNotice(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Publicar Ruta</span>
          </button>
        </div>
      </div>

      {/* Driver notice */}
      {showDriverPublishNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">¿Eres chofer con vehículo?</p>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              Publica tus rutas interurbanas y valida el PIN de 4 dígitos de cada pasajero directamente al abordar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDriverPublishNotice(false)}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Trips list */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-zinc-800 p-8 text-center text-zinc-400">
            <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-400 mb-2" />
            <p className="text-xs">Sincronizando viajes con Firestore en tiempo real...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">
              No hay viajes activos para esta ruta
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Selecciona &quot;Todas las ciudades&quot; para ver las rutas disponibles.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedOrigin('Todas las ciudades');
                setSelectedDestination('Todas las ciudades');
              }}
              className="mt-3 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-amber-400"
            >
              Ver todas las rutas
            </button>
          </div>
        ) : (
          filteredTrips.map((trip) => {
            const departureDate = new Date(trip.departureTime);
            const timeString = departureDate.toLocaleTimeString('es-VE', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const dateString = departureDate.toLocaleDateString('es-VE', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            });

            return (
              <article
                key={trip.id}
                className="group relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900 to-[#101725] p-4 shadow-lg transition-all duration-200 hover:border-zinc-700"
              >
                {/* Top Bar: Time, Date & Price */}
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-black text-amber-400">
                      <Clock className="h-3 w-3" />
                      {timeString}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400">
                      {dateString}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-white">${trip.pricePerSeat}</span>
                    <span className="text-[10px] text-zinc-400 font-medium ml-1">USD/asiento</span>
                  </div>
                </div>

                {/* Route Trajectory Visual */}
                <div className="my-3 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                      <span className="h-5 w-0.5 bg-zinc-700" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{trip.origin}</span>
                        <span className="text-[10px] text-emerald-400 font-medium">Origen</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-500/20" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{trip.destination}</span>
                        <span className="text-[10px] text-amber-400 font-medium">Destino</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Driver & Vehicle row */}
                <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-zinc-800/70">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-amber-500/30 text-amber-400 text-xs font-bold">
                      {trip.driverName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-zinc-200">{trip.driverName}</span>
                        <span title="Identidad Verificada">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                        <span className="font-mono text-zinc-300">Placa: {trip.vehiclePlate}</span>
                        <span>•</span>
                        <span>Tel: {trip.driverPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer: Seats & Action */}
                <div className="mt-3 flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    <span className="font-semibold text-amber-400">
                      {trip.availableSeats} {trip.availableSeats === 1 ? 'cupo' : 'cupos'}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      de {trip.totalSeats} libres
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedTripForModal(trip)}
                    className="flex items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition"
                  >
                    <span>Reservar</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Booking confirmation modal */}
      {selectedTripForModal && (
        <BookingModal
          trip={selectedTripForModal}
          onClose={() => setSelectedTripForModal(null)}
          onBookingSuccess={(booking, trip) => {
            setSelectedTripForModal(null);
            onBookTripSuccess(booking, trip);
          }}
        />
      )}
    </div>
  );
}
