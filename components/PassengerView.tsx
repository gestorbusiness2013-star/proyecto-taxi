'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Clock,
  Car,
  Users,
  ShieldCheck,
  ArrowRight,
  Radio,
  RefreshCw,
  MessageCircle,
  X,
  CheckCircle2,
  KeyRound,
  MapPin,
  Sparkles,
  List,
  Map,
} from 'lucide-react';
import type { Trip, Booking } from '@/lib/types';
import { getLiveTrips, bookSeats } from '@/lib/db';
import LiveRouteMap from '@/components/LiveRouteMap';

type PassengerTopTab = 'scheduled' | 'in_route';
type ViewMode = 'list' | 'map';

interface PassengerViewProps {
  onBookingCreated?: (booking: Booking, trip: Trip) => void;
}

export default function PassengerView({ onBookingCreated }: PassengerViewProps) {
  // Top Tabs: 'Próximas Salidas' (scheduled) y 'En Carretera' (in_route)
  const [activeTab, setActiveTab] = useState<PassengerTopTab>('scheduled');

  // Real-time trips state
  const [scheduledTrips, setScheduledTrips] = useState<Trip[]>([]);
  const [inRouteTrips, setInRouteTrips] = useState<Trip[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingInRoute, setLoadingInRoute] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  // Reservation & Digital Ticket Modals state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [passengerName, setPassengerName] = useState('Carlos E. Mendoza');
  const [passengerPhone, setPassengerPhone] = useState('+584141234567');
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Success Ticket Modal state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    booking: Booking;
    trip: Trip;
  } | null>(null);

  // Subscribe to real-time scheduled trips
  useEffect(() => {
    const unsubScheduled = getLiveTrips(
      'scheduled',
      (trips) => {
        setScheduledTrips(trips);
        setLoadingScheduled(false);
        setIsLiveConnected(true);
      },
      (err) => {
        console.warn('Realtime listener scheduled:', err);
        setLoadingScheduled(false);
      }
    );

    const unsubInRoute = getLiveTrips(
      'in_route',
      (trips) => {
        setInRouteTrips(trips);
        setLoadingInRoute(false);
        setIsLiveConnected(true);
      },
      (err) => {
        console.warn('Realtime listener in_route:', err);
        setLoadingInRoute(false);
      }
    );

    return () => {
      unsubScheduled();
      unsubInRoute();
    };
  }, []);

  const displayedTrips = activeTab === 'scheduled' ? scheduledTrips : inRouteTrips;
  const isLoading = activeTab === 'scheduled' ? loadingScheduled : loadingInRoute;

  // 1. Selector de vista (View Toggle): 'Lista' vs 'Mapa en vivo'
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const searchParams = useSearchParams();

  // Cargar preferencia guardada en el estado local
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('proyecto_taxi_view_mode') as ViewMode | null;
      if (savedMode === 'list' || savedMode === 'map') {
        setViewMode(savedMode);
      }
    } catch (e) {
      console.warn('Error reading viewMode from localStorage:', e);
    }
  }, []);

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('proyecto_taxi_view_mode', mode);
    } catch (e) {
      console.warn('Error saving viewMode to localStorage:', e);
    }
  };

  // Reanudar reserva de viaje diferida tras login (?tripId=...)
  useEffect(() => {
    const tripIdParam = searchParams.get('tripId');
    if (tripIdParam) {
      const allTrips = [...scheduledTrips, ...inRouteTrips];
      const match = allTrips.find((t) => t.id === tripIdParam);
      if (match) {
        setSelectedTrip(match);
      }
    }
  }, [searchParams, scheduledTrips, inRouteTrips]);

  // Handle open simple booking modal
  const handleOpenBooking = (trip: Trip) => {
    setSelectedTrip(trip);
    setSeatsToBook(1);
    setBookingError(null);
  };

  // Confirm reservation
  const handleConfirmBooking = async () => {
    if (!selectedTrip) return;
    try {
      setIsBookingLoading(true);
      setBookingError(null);

      const booking = await bookSeats({
        tripId: selectedTrip.id,
        passenger: {
          id: 'passenger-carlos-1',
          name: passengerName,
          phone: passengerPhone,
        },
        seats: seatsToBook,
      });

      // Show digital ticket success screen
      setConfirmedBooking({
        booking,
        trip: selectedTrip,
      });
      onBookingCreated?.(booking, selectedTrip);
      setSelectedTrip(null);
    } catch (err: unknown) {
      console.error('Error booking seat:', err);
      setBookingError(err instanceof Error ? err.message : 'Error al reservar asiento.');
    } finally {
      setIsBookingLoading(false);
    }
  };

  // Build clean WhatsApp link
  const getWhatsAppLink = (choferName: string, choferPhone: string, origin: string, destination: string, pin: string) => {
    // Clean phone number (digits only, ensure Venezuela prefix 58)
    let cleanPhone = choferPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('58')) {
      cleanPhone = '58' + cleanPhone;
    }

    const message = `Hola ${choferName}, acabo de reservar 1 puesto en la app para la ruta ${origin} - ${destination}. Mi PIN de abordaje es ${pin}`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="space-y-4 pb-24">
      {/* 1. Selector de vista (View Toggle) en la cabecera: 'Lista' y 'Mapa en vivo' */}
      <div className="sticky top-14 z-30 -mx-4 px-4 pt-1 pb-2 bg-[#0B0F17]/95 backdrop-blur-md border-b border-zinc-800/80 space-y-2">
        {/* Conmutador de Vistas: Lista vs Mapa en vivo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-wider text-white">
              CARTELERA<span className="text-amber-400">VE</span>
            </span>
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-black text-amber-400">
              VENEZUELA
            </span>
          </div>

          {/* Botones del Conmutador de Vistas */}
          <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-md">
            <button
              type="button"
              onClick={() => handleToggleViewMode('list')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleViewMode('map')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              <span>Mapa en vivo</span>
            </button>
          </div>
        </div>

        {/* Pestañas 'Próximas Salidas' / 'En Carretera' solo en modo Lista */}
        {viewMode === 'list' && (
          <div className="flex rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-lg">
            {/* Tab 1: Próximas Salidas */}
            <button
              type="button"
              onClick={() => setActiveTab('scheduled')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Próximas Salidas</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  activeTab === 'scheduled'
                    ? 'bg-zinc-950 text-amber-400'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {scheduledTrips.length}
              </span>
            </button>

            {/* Tab 2: En Carretera */}
            <button
              type="button"
              onClick={() => setActiveTab('in_route')}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                activeTab === 'in_route'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>En Carretera</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  activeTab === 'in_route'
                    ? 'bg-zinc-950 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-300'
                }`}
              >
                {inRouteTrips.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Renderizado condicional según modo de visualización */}
      {viewMode === 'map' ? (
        <LiveRouteMap onSelectTripToBook={(trip) => handleOpenBooking(trip)} />
      ) : (
        <>
          {/* Sync Status Banner */}
          <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
            <div className="flex items-center gap-1.5">
              {isLiveConnected ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <Radio className="h-3 w-3 animate-pulse" />
                  <span>Red Nacional en Vivo</span>
                </span>
              ) : (
                <span>Conectando con Firestore...</span>
              )}
            </div>
            <span>{displayedTrips.length} viajes con puestos disponibles</span>
          </div>

          {/* 2. Tarjetas de Viaje */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-400">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-400 mb-2" />
                <p className="text-xs">Cargando viajes interurbanos...</p>
              </div>
            ) : displayedTrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                <Car className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm font-semibold text-zinc-300">
                  {activeTab === 'scheduled'
                    ? 'No hay salidas programadas en este momento'
                    : 'No hay vehículos en carretera con puestos vacíos'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Las rutas se actualizan en tiempo real tan pronto un chofer inicia recorrido.
                </p>
              </div>
            ) : (
          displayedTrips.map((trip) => {
            const isEnRuta = trip.status === 'in_route';
            const departureDate = new Date(trip.departureTime);
            const timeString = departureDate.toLocaleTimeString('es-VE', {
              hour: '2-digit',
              minute: '2-digit',
            });
            const carModel = trip.vehicleModel || 'Sedán Confort';
            const priceBcv = trip.pricePerSeat * 85;

            return (
              <article
                key={trip.id}
                onClick={() => handleOpenBooking(trip)}
                className={`group relative overflow-hidden rounded-2xl border p-4 shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.99] ${
                  isEnRuta
                    ? 'border-emerald-500/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-emerald-950/20 hover:border-emerald-400/60'
                    : 'border-zinc-800/90 bg-gradient-to-b from-zinc-900 to-[#101725] hover:border-amber-500/50'
                }`}
              >
                {/* Header: Hora / Badge En Ruta & Tarifa por Puesto */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  {/* Hora de salida o Badge animado en verde si está 'EN RUTA' */}
                  <div>
                    {isEnRuta ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-400">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="tracking-wider">EN RUTA</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Salida: {timeString}</span>
                      </div>
                    )}
                  </div>

                  {/* Tarifa por puesto */}
                  <div className="text-right">
                    <span className="text-lg font-black text-white">
                      ${trip.pricePerSeat}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium ml-1">
                      USD / puesto
                    </span>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Ref. Bs. {priceBcv.toLocaleString('es-VE')}
                    </div>
                  </div>
                </div>

                {/* Origen y Destino Destacados */}
                <div className="my-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                      <span className="text-base font-extrabold text-white tracking-wide">
                        {trip.origin}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-zinc-500 mx-2" />
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-white tracking-wide">
                        {trip.destination}
                      </span>
                      <span className="flex h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-500/20" />
                    </div>
                  </div>
                </div>

                {/* Nombre del conductor y modelo del carro */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-amber-400 font-bold text-xs border border-zinc-700">
                      {trip.driverName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-200">
                          {trip.driverName}
                        </span>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                      <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                        <Car className="h-3 w-3 text-amber-400" />
                        <span>{carModel}</span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-mono text-zinc-300">Placa {trip.vehiclePlate}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contador visual de puestos libres & Botón Reservar */}
                <div className="mt-3.5 flex items-center justify-between pt-2">
                  {/* Contador visual de puestos libres */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black ${
                        trip.availableSeats === 1
                          ? 'border border-red-500/40 bg-red-950/40 text-red-400 animate-pulse'
                          : 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {trip.availableSeats === 1
                          ? '¡Último puesto!'
                          : `Quedan ${trip.availableSeats} puestos`}
                      </span>
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      (de {trip.totalSeats})
                    </span>
                  </div>

                  {/* Botón de acción */}
                  <span className="flex items-center gap-1 rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 group-hover:bg-amber-400 transition">
                    <span>Reservar</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  )}

      {/* 3. Modal simple con botón 'Reservar Asiento' */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  {selectedTrip.status === 'in_route' ? 'Viaje en Carretera' : 'Próxima Salida'}
                </span>
                <h3 className="text-base font-bold text-white">
                  {selectedTrip.origin} ➔ {selectedTrip.destination}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingError && (
              <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
                {bookingError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              {/* Trip details brief */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-xs space-y-2">
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Conductor:</span>
                  <span className="font-bold text-white">{selectedTrip.driverName}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Vehículo:</span>
                  <span className="text-zinc-200">{selectedTrip.vehicleModel || 'Sedán'} ({selectedTrip.vehiclePlate})</span>
                </div>
                <div className="flex justify-between items-center text-zinc-300">
                  <span>Disponibilidad:</span>
                  <span className="font-bold text-emerald-400">Quedan {selectedTrip.availableSeats} puestos libres</span>
                </div>
              </div>

              {/* Seat Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Número de puestos a reservar:
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(selectedTrip.availableSeats, 4) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSeatsToBook(n)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition border ${
                        seatsToBook === n
                          ? 'border-amber-500 bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      {n} {n === 1 ? 'Puesto' : 'Puestos'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passenger Info */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Nombre del Pasajero:
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    WhatsApp de Contacto:
                  </label>
                  <input
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    placeholder="0412 / 0414 / 0424..."
                  />
                </div>
              </div>

              {/* Total Price */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex justify-between items-center text-xs">
                <span className="text-zinc-300">Total a pagar al abordar:</span>
                <div className="text-right">
                  <span className="text-base font-black text-amber-400">
                    ${selectedTrip.pricePerSeat * seatsToBook} USD
                  </span>
                  <div className="text-[10px] text-zinc-400">
                    Ref. Bs. {(selectedTrip.pricePerSeat * seatsToBook * 85).toLocaleString('es-VE')}
                  </div>
                </div>
              </div>

              {/* Botón 'Reservar Asiento' */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrip(null)}
                  disabled={isBookingLoading}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={isBookingLoading}
                  className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isBookingLoading ? (
                    <span>Procesando reserva...</span>
                  ) : (
                    <span>Reservar Asiento</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Pantalla/Modal de éxito con el 'Boleto Digital' */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/50 bg-gradient-to-b from-zinc-950 via-[#0B0F17] to-zinc-950 p-6 shadow-2xl text-center">
            {/* Header / Badge */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 mb-3 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
              Reserva Exitosa
            </span>

            <h3 className="text-xl font-black text-white mt-2">
              Boleto Digital
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ruta: <strong className="text-white">{confirmedBooking.trip.origin} ➔ {confirmedBooking.trip.destination}</strong>
            </p>

            {/* PIN de abordaje de 4 dígitos en números grandes */}
            <div className="my-5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 py-4 px-6 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                PIN de Abordaje
              </span>
              <div className="text-5xl font-black font-mono tracking-widest text-amber-400 drop-shadow-md">
                {confirmedBooking.booking.boardingPin}
              </div>
              <span className="text-[11px] text-zinc-400 block mt-1">
                Dicta o muestra este código al chofer al momento de subir
              </span>
            </div>

            {/* Trip details summary */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-left space-y-1 mb-5">
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-400">Chofer:</span>
                <span className="font-bold text-white">{confirmedBooking.trip.driverName}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-400">Vehículo:</span>
                <span>{confirmedBooking.trip.vehicleModel || 'Carro'} ({confirmedBooking.trip.vehiclePlate})</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-400">Puestos:</span>
                <span className="text-amber-400 font-bold">{confirmedBooking.booking.seatsBooked} puesto(s)</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-400">Total a pagar:</span>
                <span className="text-emerald-400 font-bold">${confirmedBooking.trip.pricePerSeat * confirmedBooking.booking.seatsBooked} USD</span>
              </div>
            </div>

            {/* Botón verde con enlace directo a WhatsApp (wa.me) */}
            <a
              href={getWhatsAppLink(
                confirmedBooking.trip.driverName,
                confirmedBooking.trip.driverPhone,
                confirmedBooking.trip.origin,
                confirmedBooking.trip.destination,
                confirmedBooking.booking.boardingPin
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] py-3 px-4 text-xs font-black text-zinc-950 shadow-xl shadow-[#25D366]/20 transition-transform active:scale-95"
            >
              <MessageCircle className="h-4 w-4 fill-zinc-950" />
              <span>Avisar al Chofer por WhatsApp</span>
            </a>

            {/* Botón cerrar */}
            <button
              type="button"
              onClick={() => setConfirmedBooking(null)}
              className="mt-3 w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              Cerrar Boleto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
