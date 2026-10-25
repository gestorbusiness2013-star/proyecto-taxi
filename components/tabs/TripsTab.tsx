'use client';

import { useState } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Snowflake,
  Luggage,
  Users,
  ChevronRight,
  Filter,
  ArrowRight,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import BookingModal, { TripData } from '../BookingModal';

interface TripsTabProps {
  onBookTrip: (trip: TripData, seats: number, passengerName: string, notes: string) => void;
}

const INITIAL_TRIPS: TripData[] = [
  {
    id: 'trip-1',
    origin: 'Caracas',
    originDetail: 'Plaza Venezuela (Frente a Torre La Previsora)',
    destination: 'Valencia',
    destinationDetail: 'Redoma de Guaparo / C.C. Metrópolis',
    departureTime: '07:30 AM',
    date: 'Hoy',
    duration: '2h 15m',
    highway: 'Autopista Regional del Centro (ARC)',
    driverName: 'Alejandro Bastidas',
    driverRating: 4.96,
    driverTrips: 148,
    driverAvatar: 'AB',
    isVerified: true,
    vehicleModel: 'Toyota Corolla 2017',
    vehiclePlate: 'AB123CD',
    hasAC: true,
    hasTrunk: true,
    priceUsd: 15,
    priceBcv: 15 * 85, // reference rate
    availableSeats: 3,
    totalSeats: 4,
  },
  {
    id: 'trip-2',
    origin: 'Caracas',
    originDetail: 'Chacao (C.C. Sambil / Frente a estación Metro)',
    destination: 'Maracay',
    destinationDetail: 'Peaje de Palo Negro / Terminal Los Mangos',
    departureTime: '09:00 AM',
    date: 'Hoy',
    duration: '1h 35m',
    highway: 'Vía Autopista Regional del Centro',
    driverName: 'Marcos Rivas',
    driverRating: 4.88,
    driverTrips: 92,
    driverAvatar: 'MR',
    isVerified: true,
    vehicleModel: 'Ford Explorer XLT',
    vehiclePlate: 'AC987EF',
    hasAC: true,
    hasTrunk: true,
    priceUsd: 12,
    priceBcv: 12 * 85,
    availableSeats: 4,
    totalSeats: 5,
  },
  {
    id: 'trip-3',
    origin: 'Valencia',
    originDetail: 'Redoma de San Diego (Parada Farmatodo)',
    destination: 'Caracas',
    destinationDetail: 'La Bandera / Altamira',
    departureTime: '02:00 PM',
    date: 'Hoy',
    duration: '2h 20m',
    highway: 'Autopista Regional del Centro (Sentido CCS)',
    driverName: 'Guillermo Peña',
    driverRating: 4.92,
    driverTrips: 210,
    driverAvatar: 'GP',
    isVerified: true,
    vehicleModel: 'Chevrolet Aveo LT',
    vehiclePlate: 'AD456GH',
    hasAC: true,
    hasTrunk: true,
    priceUsd: 15,
    priceBcv: 15 * 85,
    availableSeats: 2,
    totalSeats: 4,
  },
  {
    id: 'trip-4',
    origin: 'Caracas',
    originDetail: 'La California Norte (Frente a C.C. Líder)',
    destination: 'Puerto La Cruz',
    destinationDetail: 'Terminal de Fertinitro / Paseo Colón',
    departureTime: '06:00 AM',
    date: 'Mañana',
    duration: '4h 30m',
    highway: 'Autopista Gran Mariscal de Ayacucho - Troncal 9',
    driverName: 'Yorman Colmenares',
    driverRating: 4.98,
    driverTrips: 340,
    driverAvatar: 'YC',
    isVerified: true,
    vehicleModel: 'Toyota Fortuner',
    vehiclePlate: 'AE789JK',
    hasAC: true,
    hasTrunk: true,
    priceUsd: 28,
    priceBcv: 28 * 85,
    availableSeats: 3,
    totalSeats: 4,
  },
  {
    id: 'trip-5',
    origin: 'Caracas',
    originDetail: 'Plaza Venezuela',
    destination: 'Barquisimeto',
    destinationDetail: 'Monumento El Obelisco / C.C. Las Trinitarias',
    departureTime: '08:00 AM',
    date: 'Mañana',
    duration: '4h 50m',
    highway: 'ARC vía Yaracuy / Cimarrón Andresote',
    driverName: 'Oswaldo Mendoza',
    driverRating: 4.95,
    driverTrips: 185,
    driverAvatar: 'OM',
    isVerified: true,
    vehicleModel: 'Chery Tiggo 4',
    vehiclePlate: 'AF112LM',
    hasAC: true,
    hasTrunk: true,
    priceUsd: 25,
    priceBcv: 25 * 85,
    availableSeats: 2,
    totalSeats: 4,
  },
];

const CITIES = [
  'Todas las ciudades',
  'Caracas',
  'Valencia',
  'Maracay',
  'Barquisimeto',
  'Puerto La Cruz',
  'San Cristóbal',
];

export default function TripsTab({ onBookTrip }: TripsTabProps) {
  const [selectedOrigin, setSelectedOrigin] = useState('Todas las ciudades');
  const [selectedDestination, setSelectedDestination] = useState('Todas las ciudades');
  const [dateFilter, setDateFilter] = useState<'Todos' | 'Hoy' | 'Mañana'>('Todos');
  const [selectedTripForModal, setSelectedTripForModal] = useState<TripData | null>(null);
  const [showDriverPublishNotice, setShowDriverPublishNotice] = useState(false);

  // Filter trips
  const filteredTrips = INITIAL_TRIPS.filter((t) => {
    if (selectedOrigin !== 'Todas las ciudades' && t.origin !== selectedOrigin) {
      return false;
    }
    if (selectedDestination !== 'Todas las ciudades' && t.destination !== selectedDestination) {
      return false;
    }
    if (dateFilter !== 'Todos' && t.date !== dateFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      {/* Route Search Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-[#0B0F17] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400" />
            <h1 className="text-xs font-black uppercase tracking-wider text-amber-400">
              Cartelera de Rutas Interurbanas
            </h1>
          </div>
          <span className="text-[10px] text-zinc-400">
            {filteredTrips.length} viajes disponibles
          </span>
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

        {/* Date Filter Pills */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex gap-1.5">
            {(['Todos', 'Hoy', 'Mañana'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDateFilter(d)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  dateFilter === d
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Driver publish shortcut */}
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

      {/* Driver publish modal/banner notification */}
      {showDriverPublishNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start justify-between gap-2">
          <div>
            <p className="font-bold">¿Tienes vehículo y viajas entre ciudades?</p>
            <p className="text-[11px] text-zinc-300 mt-0.5">
              Publica tus asientos libres en segundos para compartir gastos de gasolina y peajes. Ve a la pestaña{' '}
              <strong className="text-white">Perfil</strong> para activar tu modo conductor.
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
        {filteredTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
            <MapPin className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm font-semibold text-zinc-300">
              No hay viajes directos para esta combinación
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Prueba cambiando los filtros o publica una solicitud de viaje.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedOrigin('Todas las ciudades');
                setSelectedDestination('Todas las ciudades');
                setDateFilter('Todos');
              }}
              className="mt-3 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-amber-400"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          filteredTrips.map((trip) => (
            <article
              key={trip.id}
              className="group relative overflow-hidden rounded-2xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900 to-[#101725] p-4 shadow-lg transition-all duration-200 hover:border-zinc-700 active:scale-[0.99]"
            >
              {/* Top Bar of Card: Time, Date & Price */}
              <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-black text-amber-400">
                    <Clock className="h-3 w-3" />
                    {trip.departureTime}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    {trip.date} • {trip.duration}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-white">${trip.priceUsd}</span>
                  <span className="text-[10px] text-zinc-400 font-medium ml-1">USD/cupo</span>
                </div>
              </div>

              {/* Route Trajectory Visual */}
              <div className="my-3 space-y-2">
                {/* Origin */}
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <span className="h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20" />
                    <span className="h-5 w-0.5 bg-zinc-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{trip.origin}</span>
                      <span className="text-[10px] text-emerald-400 font-medium">Salida</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{trip.originDetail}</p>
                  </div>
                </div>

                {/* Destination */}
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <span className="h-3 w-3 rounded-full bg-amber-400 ring-4 ring-amber-500/20" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{trip.destination}</span>
                      <span className="text-[10px] text-amber-400 font-medium">Llegada</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{trip.destinationDetail}</p>
                  </div>
                </div>
              </div>

              {/* Highway Route Badge */}
              <div className="rounded-lg bg-zinc-950/60 px-2.5 py-1 text-[11px] text-zinc-400 flex items-center justify-between border border-zinc-800/60">
                <span className="truncate">🛣️ {trip.highway}</span>
                <span className="shrink-0 text-[10px] text-zinc-500 font-medium">Sin desvíos</span>
              </div>

              {/* Driver & Vehicle row */}
              <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-zinc-800/70">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 border border-amber-500/30 text-amber-400 text-xs font-bold">
                    {trip.driverAvatar}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-zinc-200">{trip.driverName}</span>
                      {trip.isVerified && (
                        <span title="Identidad Verificada">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                      <span className="text-amber-400 font-bold">★ {trip.driverRating}</span>
                      <span>•</span>
                      <span>{trip.vehicleModel}</span>
                    </div>
                  </div>
                </div>

                {/* Amenities pills: A/C, Trunk */}
                <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                  {trip.hasAC && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-sky-400" title="Aire Acondicionado">
                      <Snowflake className="inline h-3 w-3" /> A/C
                    </span>
                  )}
                  {trip.hasTrunk && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300" title="Maletero">
                      <Luggage className="inline h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Card Footer: Seats & Action */}
              <div className="mt-3 flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-semibold text-amber-400">
                    {trip.availableSeats} {trip.availableSeats === 1 ? 'cupo' : 'cupos'}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    de {trip.totalSeats} disponibles
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
          ))
        )}
      </div>

      {/* Booking confirmation modal */}
      {selectedTripForModal && (
        <BookingModal
          trip={selectedTripForModal}
          onClose={() => setSelectedTripForModal(null)}
          onConfirmBooking={(trip, seats, name, notes) => {
            onBookTrip(trip, seats, name, notes);
          }}
        />
      )}
    </div>
  );
}
