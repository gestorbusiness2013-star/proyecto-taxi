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
  ChevronDown,
  ArrowUpDown,
  Navigation,
  Star,
  Coins,
  Shield,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Trip, Booking } from '@/lib/types';
import { getLiveTrips, bookSeats } from '@/lib/db';
import { listenBcvRate, DEFAULT_BCV_RATE, formatBs } from '@/lib/bcv';
import { getMeetingPointsForCity } from '@/lib/meetingPoints';
import { buildWhatsAppLink, WhatsAppTemplates } from '@/lib/whatsapp';

// Leaflet depende de `window`: se carga solo en el cliente (sin SSR)
const LiveRouteMap = dynamic(() => import('@/components/LiveRouteMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950 text-amber-500 font-mono text-sm">
      Cargando mapa en vivo...
    </div>
  ),
});

export const VENEZUELA_CITIES = [
  'Caracas',
  'Valencia',
  'Maracay',
  'Barquisimeto',
  'Maracaibo',
  'Puerto La Cruz',
  'Puerto Ordaz',
  'San Félix',
  'Maturín',
  'Ciudad Bolívar',
  'El Tigre',
  'San Juan de los Morros',
  'Barinas',
  'Mérida',
  'San Cristóbal',
];

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
  const [bcvRate, setBcvRate] = useState<number>(DEFAULT_BCV_RATE);

  // Success Ticket Modal state
  const [confirmedBooking, setConfirmedBooking] = useState<{
    booking: Booking;
    trip: Trip;
  } | null>(null);

  // Subscribe to real-time BCV exchange rate
  useEffect(() => {
    const unsubBcv = listenBcvRate((rate) => {
      setBcvRate(rate.rate);
    });
    return () => unsubBcv();
  }, []);

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

  // Estados para selectores de ciudad y chips rápidos de corredor
  const [originCity, setOriginCity] = useState<string>('all');
  const [destinationCity, setDestinationCity] = useState<string>('all');
  const [quickRoute, setQuickRoute] = useState<string>('all');

  const handleOriginChange = (city: string) => {
    setOriginCity(city);
    setQuickRoute('custom');
  };

  const handleDestinationChange = (city: string) => {
    setDestinationCity(city);
    setQuickRoute('custom');
  };

  const handleSwapCities = () => {
    const temp = originCity;
    setOriginCity(destinationCity);
    setDestinationCity(temp);
    setQuickRoute('custom');
  };

  const handleQuickChip = (chipKey: string) => {
    setQuickRoute(chipKey);
    if (chipKey === 'all') {
      setOriginCity('all');
      setDestinationCity('all');
    } else if (chipKey === 'caracas-valencia') {
      setOriginCity('Caracas');
      setDestinationCity('Valencia');
    } else if (chipKey === 'puerto-ordaz-caracas') {
      setOriginCity('Puerto Ordaz');
      setDestinationCity('Caracas');
    } else if (chipKey === 'caracas-barquisimeto') {
      setOriginCity('Caracas');
      setDestinationCity('Barquisimeto');
    }
  };

  const currentTabTrips = activeTab === 'scheduled' ? scheduledTrips : inRouteTrips;
  const displayedTrips = currentTabTrips.filter((trip) => {
    // Filtro rápido de ruta
    if (quickRoute === 'caracas-valencia') {
      const matchArc =
        (trip.origin.toLowerCase().includes('caracas') || trip.destination.toLowerCase().includes('caracas')) &&
        (trip.origin.toLowerCase().includes('valencia') || trip.destination.toLowerCase().includes('valencia'));
      if (!matchArc) return false;
    } else if (quickRoute === 'puerto-ordaz-caracas') {
      const matchOriente =
        trip.origin.toLowerCase().includes('ordaz') || trip.destination.toLowerCase().includes('ordaz');
      if (!matchOriente) return false;
    } else if (quickRoute === 'caracas-barquisimeto') {
      const matchBqto =
        trip.origin.toLowerCase().includes('barquisimeto') || trip.destination.toLowerCase().includes('barquisimeto');
      if (!matchBqto) return false;
    }

    // Filtro de Origen
    if (originCity !== 'all') {
      if (!trip.origin.toLowerCase().includes(originCity.toLowerCase())) return false;
    }

    // Filtro de Destino
    if (destinationCity !== 'all') {
      if (!trip.destination.toLowerCase().includes(destinationCity.toLowerCase())) return false;
    }

    return true;
  });

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
    <div className="space-y-3 pb-24">
      {/* 1. Selector de Rol Claro: Pasajero vs Chofer */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-lg">
        <div className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-amber-500 text-zinc-950 font-black text-sm shadow-md shadow-amber-500/20">
          <Users className="h-4 w-4" />
          <span>Soy Pasajero</span>
        </div>
        <a
          href="/conductor"
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-zinc-400 hover:text-white font-bold text-sm transition active:scale-95 hover:bg-zinc-800/60"
        >
          <Car className="h-4 w-4 text-amber-400" />
          <span>Soy Chofer</span>
        </a>
      </div>

      {/* 2. Barra de Búsqueda de Rutas Compacta y Filtros */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-3 shadow-lg space-y-2.5">
        {/* Selector Origen y Destino */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block px-0.5 mb-1">
              Origen
            </span>
            <div className="relative">
              <select
                aria-label="Filtrar por ciudad de origen"
                value={originCity}
                onChange={(e) => handleOriginChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-950 py-2 pl-3 pr-7 text-xs sm:text-sm font-bold text-white focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las ciudades</option>
                {VENEZUELA_CITIES.map((c) => (
                  <option key={c} value={c} className="bg-zinc-950 text-white font-medium">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwapCities}
            title="Invertir ciudades"
            className="mt-4 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-zinc-800 text-zinc-300 hover:text-amber-400 transition active:scale-95"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block px-0.5 mb-1">
              Destino
            </span>
            <div className="relative">
              <select
                aria-label="Filtrar por ciudad de destino"
                value={destinationCity}
                onChange={(e) => handleDestinationChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-white/10 bg-zinc-950 py-2 pl-3 pr-7 text-xs sm:text-sm font-bold text-white focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las ciudades</option>
                {VENEZUELA_CITIES.map((c) => (
                  <option key={c} value={c} className="bg-zinc-950 text-white font-medium">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Pestañas de Estado + Botón Mapa */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
          <div className="flex gap-1.5 flex-1">
            <button
              type="button"
              onClick={() => { setActiveTab('scheduled'); setViewMode('list'); }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                viewMode === 'list' && activeTab === 'scheduled'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm shadow-amber-500/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Salidas ({scheduledTrips.length})</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('in_route'); setViewMode('list'); }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
                viewMode === 'list' && activeTab === 'in_route'
                  ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>En Ruta ({inRouteTrips.length})</span>
            </button>
          </div>

          {/* Botón Mapa */}
          <button
            type="button"
            onClick={() => handleToggleViewMode(viewMode === 'map' ? 'list' : 'map')}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 border shrink-0 ${
              viewMode === 'map'
                ? 'bg-amber-500 text-zinc-950 border-amber-500 font-black'
                : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
          >
            {viewMode === 'map' ? <List className="h-3.5 w-3.5" /> : <Map className="h-3.5 w-3.5 text-amber-400" />}
            <span>{viewMode === 'map' ? 'Lista' : 'Mapa'}</span>
          </button>
        </div>
      </div>

      {/* Renderizado condicional según modo de visualización */}
      {viewMode === 'map' ? (
        <LiveRouteMap
          onSelectTripToBook={(trip) => handleOpenBooking(trip)}
          originFilter={originCity}
          destinationFilter={destinationCity}
          selectedRouteFilter={quickRoute}
          onFilterChange={(newRoute) => setQuickRoute(newRoute)}
        />
      ) : (
        <>
          {/* Contador simple de viajes */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {activeTab === 'scheduled' ? 'Próximas Salidas Disponibles' : 'Vehículos en Carretera en Vivo'}
            </span>
            <span className="font-bold text-zinc-300">{displayedTrips.length} disponibles</span>
          </div>

          {/* 3. Tarjetas de Viaje Simplificadas */}
          <div className="space-y-2.5">
            {isLoading ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-400">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-amber-400 mb-2" />
                <p className="text-xs">Cargando viajes...</p>
              </div>
            ) : displayedTrips.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center bg-zinc-900/30">
                <Car className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm font-semibold text-zinc-300">
                  {activeTab === 'scheduled'
                    ? 'No hay salidas programadas para esta ruta'
                    : 'No hay vehículos en carretera en esta ruta'}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Prueba cambiando la ciudad de origen o destino en el selector arriba.
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
                const priceBcv = trip.pricePerSeat * bcvRate;

                return (
                  <article
                    key={trip.id}
                    onClick={() => handleOpenBooking(trip)}
                    className={`group rounded-2xl border p-3.5 sm:p-4 shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                      isEnRuta
                        ? 'border-emerald-500/40 bg-gradient-to-b from-zinc-900 via-zinc-900 to-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'border-white/10 hover:border-amber-400/40 bg-zinc-900/90'
                    }`}
                  >
                    {/* Fila 1: Ruta y Tarifa */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                            {trip.origin}
                          </span>
                          <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                            {trip.destination}
                          </span>
                        </div>

                        {/* Hora y Puestos libres */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {isEnRuta ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              En carretera
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-zinc-300 font-medium">
                              <Clock className="h-3.5 w-3.5 text-amber-400" />
                              Salida: <strong className="text-white font-bold">{timeString}</strong>
                            </span>
                          )}
                          <span className="text-zinc-600">•</span>
                          <span className={`text-xs font-bold ${trip.availableSeats === 1 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                            {trip.availableSeats} {trip.availableSeats === 1 ? 'puesto libre' : 'puestos libres'}
                          </span>
                        </div>
                      </div>

                      {/* Tarifa destacada dual */}
                      <div className="text-right shrink-0">
                        <div className="text-xl sm:text-2xl font-black text-white leading-none">
                          ${trip.pricePerSeat} <span className="text-xs text-zinc-400 font-normal">USD</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                          Bs. {formatBs(priceBcv)}
                        </div>
                      </div>
                    </div>

                    {/* Fila 2: Conductor y Botón Reservar */}
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-amber-400 font-black text-xs border border-white/10">
                          {trip.driverName.charAt(0)}
                        </div>
                        <div className="min-w-0 leading-tight">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                            <span className="truncate">{trip.driverName}</span>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[10px] text-amber-400 font-bold shrink-0">★ 4.9</span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {carModel} • <span className="font-mono text-zinc-300 font-semibold">{trip.vehiclePlate}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="shrink-0 flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 px-3.5 py-1.5 text-xs font-black shadow-md shadow-amber-500/20 transition active:scale-95"
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

          {/* 4. Banner informativo para Choferes */}
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 p-4 flex items-center justify-between gap-3 shadow-lg">
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Car className="h-4 w-4" />
                <span>¿Tienes vehículo?</span>
              </p>
              <p className="text-xs text-zinc-300 mt-1">
                Publica tus viajes interurbanos y llena los puestos vacíos en cada salida.
              </p>
            </div>
            <a
              href="/conductor"
              className="shrink-0 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-black text-zinc-950 transition active:scale-95 shadow-md shadow-amber-500/20 whitespace-nowrap"
            >
              Soy Chofer ➔
            </a>
          </div>
        </>
      )}

      {/* 3. Modal simple con botón 'Reservar Asiento' */}
      {selectedTrip && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-zinc-950 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
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
              {/* Trip details brief with subtle white border */}
              <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3.5 text-sm space-y-2">
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
                <label className="block text-sm font-bold text-zinc-200 mb-1.5">
                  Número de puestos a reservar:
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: Math.min(selectedTrip.availableSeats, 4) }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setSeatsToBook(n)}
                      className={`flex-1 rounded-xl py-2.5 text-sm font-black transition border ${
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
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Nombre del Pasajero:
                  </label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    WhatsApp de Contacto:
                  </label>
                  <input
                    type="tel"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-white focus:border-amber-500 focus:outline-none"
                    placeholder="0412 / 0414 / 0424..."
                  />
                </div>
              </div>

              {/* Total Price */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex justify-between items-center">
                <span className="text-sm font-bold text-zinc-200">Total a pagar al abordar:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-amber-400">
                    ${selectedTrip.pricePerSeat * seatsToBook} USD
                  </span>
                  <div className="text-xs text-amber-300 font-mono font-bold mt-0.5">
                    Ref. Bs. {formatBs(selectedTrip.pricePerSeat * seatsToBook * bcvRate)}
                  </div>
                </div>
              </div>

              {/* Botón 'Reservar Asiento' */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTrip(null)}
                  disabled={isBookingLoading}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 py-3 text-sm font-bold text-zinc-300 hover:bg-zinc-800 active:scale-95 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={isBookingLoading}
                  className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-black text-zinc-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300 overflow-y-auto">
          <div className="w-full max-w-sm rounded-3xl border border-amber-500/50 bg-gradient-to-b from-zinc-950 via-[#0B0F17] to-zinc-950 p-6 shadow-2xl text-center">
            {/* Header / Badge */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40 mb-3 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-emerald-400">
              Reserva Exitosa
            </span>

            <h3 className="text-2xl font-black text-white mt-2">
              Boleto Digital
            </h3>
            <p className="text-sm text-zinc-300 mt-1 font-medium">
              Ruta: <strong className="text-white">{confirmedBooking.trip.origin} ➔ {confirmedBooking.trip.destination}</strong>
            </p>

            {/* PIN de abordaje de 4 dígitos en números grandes */}
            <div className="my-5 rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 py-4 px-6 shadow-inner">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block mb-1">
                PIN de Abordaje Seguro
              </span>
              <div className="text-5xl font-black font-mono tracking-widest text-amber-400 drop-shadow-md">
                {confirmedBooking.booking.boardingPin}
              </div>
              <span className="text-xs text-zinc-300 font-medium block mt-1.5">
                Dicta o muestra este código al chofer al momento de subir
              </span>
            </div>

            {/* Trip details summary */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 text-sm text-left space-y-1.5 mb-5">
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
                <span className="text-emerald-400 font-black">
                  ${confirmedBooking.trip.pricePerSeat * confirmedBooking.booking.seatsBooked} USD
                  <span className="text-xs text-zinc-300 font-normal ml-1">
                    (Bs. {formatBs(confirmedBooking.trip.pricePerSeat * confirmedBooking.booking.seatsBooked * bcvRate)})
                  </span>
                </span>
              </div>
            </div>

            {/* Botón verde con enlace directo a WhatsApp (wa.me) con plantilla oficial */}
            <a
              href={buildWhatsAppLink(
                confirmedBooking.trip.driverPhone,
                WhatsAppTemplates.bookingConfirmation(
                  confirmedBooking.booking.passengerName,
                  confirmedBooking.trip.origin,
                  confirmedBooking.trip.destination,
                  confirmedBooking.booking.boardingPin,
                  confirmedBooking.trip.driverName,
                  confirmedBooking.booking.seatsBooked
                )
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] py-3.5 px-4 text-sm font-black text-zinc-950 shadow-xl shadow-[#25D366]/20 transition-transform active:scale-95"
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
