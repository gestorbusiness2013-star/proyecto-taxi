'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Car,
  AlertTriangle,
  CreditCard,
  MessageCircle,
  PlusCircle,
  Play,
  Flag,
  CheckCircle2,
  Users,
  KeyRound,
  ArrowLeft,
  Clock,
  MapPin,
  DollarSign,
  ShieldCheck,
  Phone,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Navigation,
  Compass,
} from 'lucide-react';
import type { User, Trip, Booking, TripStatus } from '@/lib/types';
import {
  publishTrip,
  getDriverTrips,
  getTripBookings,
  updateTripStatus,
  validateBoardingPin,
} from '@/lib/db';
import { useDriverLocation } from '@/hooks/useDriverLocation';

const DRIVER_USER: User = {
  id: 'driver-alejandro-1',
  name: 'Alejandro Bastidas',
  phone: '+584141234567',
  dni: 'V-18.945.321',
  role: 'driver',
  isSubscribed: true,
  vehicle: {
    model: 'Toyota Corolla 2018',
    plate: 'AB123CD',
    color: 'Plata',
  },
};

const COMMON_CITIES = [
  'Puerto Ordaz',
  'San Félix',
  'Caracas',
  'Maturín',
  'Puerto La Cruz',
  'Valencia',
  'Maracay',
  'Barquisimeto',
  'Ciudad Bolívar',
  'El Tigre',
];

export default function ConductorPage() {
  // 1. Estado del Usuario y Validación de Suscripción
  const [currentUser, setCurrentUser] = useState<User>(DRIVER_USER);

  // Lista de viajes del chofer en tiempo real
  const [driverTrips, setDriverTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [loadingTrips, setLoadingTrips] = useState(true);

  // Reservas del viaje seleccionado en tiempo real
  const [tripBookings, setTripBookings] = useState<Booking[]>([]);

  // 2. Estado del Formulario 'Publicar Nuevo Viaje'
  const [origin, setOrigin] = useState('Puerto Ordaz');
  const [customOrigin, setCustomOrigin] = useState('');
  const [destination, setDestination] = useState('Caracas');
  const [customDestination, setCustomDestination] = useState('');
  const [departureDateTime, setDepartureDateTime] = useState('');
  const [totalSeats, setTotalSeats] = useState(4);
  const [pricePerSeat, setPricePerSeat] = useState(25);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 3. Estado del Monitor y Validación de PIN
  const [pinInput, setPinInput] = useState('');
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [pinResult, setPinResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Inicializar fecha y hora por defecto (hoy + 3 horas)
  useEffect(() => {
    const defaultDate = new Date(Date.now() + 3 * 3600 * 1000);
    const tzOffset = defaultDate.getTimezoneOffset() * 60000;
    const localISOTime = new Date(defaultDate.getTime() - tzOffset).toISOString().slice(0, 16);
    setDepartureDateTime(localISOTime);
  }, []);

  // Escuchar viajes del chofer en tiempo real
  useEffect(() => {
    const unsub = getDriverTrips(
      currentUser.id,
      (trips) => {
        setDriverTrips(trips);
        setLoadingTrips(false);
        // Seleccionar por defecto el primer viaje activo (scheduled o in_route) si no hay uno seleccionado
        if (trips.length > 0 && !selectedTripId) {
          const active = trips.find((t) => t.status === 'in_route' || t.status === 'scheduled') || trips[0];
          setSelectedTripId(active.id);
        }
      },
      (err) => {
        console.warn('Error fetching driver trips:', err);
        setLoadingTrips(false);
      }
    );

    return () => unsub();
  }, [currentUser.id, selectedTripId]);

  // Escuchar reservas en tiempo real del viaje seleccionado en el monitor
  useEffect(() => {
    if (!selectedTripId) {
      setTripBookings([]);
      return;
    }

    const unsub = getTripBookings(
      selectedTripId,
      (bookings) => {
        setTripBookings(bookings);
      },
      (err) => {
        console.warn('Error fetching trip bookings:', err);
      }
    );

    return () => unsub();
  }, [selectedTripId]);

  const activeTrip = driverTrips.find((t) => t.id === selectedTripId) || driverTrips[0];

  // Geolocalización activa del conductor (Requisito 4): transmite coords en tiempo real a Firestore
  const isTripInRoute = activeTrip?.status === 'in_route';
  const {
    currentLocation: driverLiveLocation,
    isTracking: isGpsTracking,
    error: gpsError,
  } = useDriverLocation({
    tripId: activeTrip?.id,
    enabled: isTripInRoute,
  });

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  // Publicar Nuevo Viaje
  const handlePublishTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalOrigin = origin === 'Otro' ? customOrigin.trim() : origin;
    const finalDestination = destination === 'Otro' ? customDestination.trim() : destination;

    if (!finalOrigin || !finalDestination) {
      setPublishMessage({ type: 'error', text: 'Por favor indica el origen y destino.' });
      return;
    }

    if (!departureDateTime) {
      setPublishMessage({ type: 'error', text: 'Selecciona la fecha y hora de salida.' });
      return;
    }

    try {
      setIsPublishing(true);
      setPublishMessage(null);

      const newTrip = await publishTrip({
        driverId: currentUser.id,
        driverName: currentUser.name,
        driverPhone: currentUser.phone,
        vehiclePlate: currentUser.vehicle?.plate || 'AB123CD',
        vehicleModel: currentUser.vehicle?.model || 'Toyota Corolla 2018',
        origin: finalOrigin,
        destination: finalDestination,
        departureTime: new Date(departureDateTime).toISOString(),
        totalSeats: Number(totalSeats),
        pricePerSeat: Number(pricePerSeat),
      });

      setPublishMessage({
        type: 'success',
        text: `¡Viaje publicado con éxito! ${newTrip.origin} ➔ ${newTrip.destination} disponible en cartelera.`,
      });
      setSelectedTripId(newTrip.id);
    } catch (err: unknown) {
      setPublishMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al publicar viaje.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Cambiar estado de viaje (Iniciar Salida / Terminar Viaje)
  const handleChangeStatus = async (nextStatus: TripStatus) => {
    if (!activeTrip) return;
    try {
      setIsUpdatingStatus(true);
      setStatusMessage(null);
      await updateTripStatus(activeTrip.id, currentUser.id, nextStatus);
      setStatusMessage(`Estado actualizado a: ${nextStatus === 'in_route' ? 'EN RUTA' : 'COMPLETADO'}`);
    } catch (err: unknown) {
      setStatusMessage(err instanceof Error ? err.message : 'Error al cambiar estado.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Validar PIN de Abordaje ingresado por el chofer
  const handleValidatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;

    if (!/^\d{4}$/.test(pinInput)) {
      setPinResult({ type: 'error', text: 'El PIN debe ser un código de 4 dígitos numéricos.' });
      return;
    }

    try {
      setIsValidatingPin(true);
      setPinResult(null);

      const validatedBooking = await validateBoardingPin(activeTrip.id, currentUser.id, pinInput);

      setPinResult({
        type: 'success',
        text: `¡PIN Verificado! Pasajero ${validatedBooking.passengerName} ha abordado con éxito (${validatedBooking.seatsBooked} puesto(s)).`,
      });
      setPinInput('');
    } catch (err: unknown) {
      setPinResult({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al validar PIN.',
      });
    } finally {
      setIsValidatingPin(false);
    }
  };

  // Helper WhatsApp directo para el chofer
  const getPassengerWhatsAppLink = (passengerName: string, passengerPhone: string, origin: string, destination: string) => {
    let cleanPhone = passengerPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '58' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('58')) {
      cleanPhone = '58' + cleanPhone;
    }
    const msg = `Hola ${passengerName}, soy ${currentUser.name} tu chofer de Proyecto Taxi. Estoy preparando la salida de ${origin} a ${destination}. Por favor ten listo tu PIN de abordaje de 4 dígitos al subir.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const adminWhatsAppLink = `https://wa.me/584141234567?text=${encodeURIComponent(
    `Hola Administrador de Proyecto Taxi, deseo activar mi suscripción semanal como conductor (${currentUser.name}, C.I. ${currentUser.dni}, Placa: ${currentUser.vehicle?.plate}). Ya realicé el Pago Móvil. Adjunto el comprobante:`
  )}`;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-zinc-100 flex flex-col font-sans">
      {/* Header Superior del Conductor */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/90 bg-[#0B0F17]/90 backdrop-blur-md pt-safe">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Pasajeros</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-wider text-white">
              PANEL<span className="text-amber-400">CHOFER</span>
            </span>
            <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.2 text-[9px] font-black text-amber-400">
              VE
            </span>
          </div>

          {/* Toggle de suscripción para pruebas y demostración */}
          <button
            type="button"
            onClick={() => setCurrentUser({ ...currentUser, isSubscribed: !currentUser.isSubscribed })}
            className={`rounded-lg px-2 py-1 text-[10px] font-bold border transition ${
              currentUser.isSubscribed
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                : 'border-red-500/40 bg-red-950/40 text-red-300 animate-pulse'
            }`}
            title="Toca para simular suscripción activa/inactiva"
          >
            {currentUser.isSubscribed ? 'Suscrito' : 'Sin Pago'}
          </button>
        </div>
      </header>

      {/* Contenedor Principal Mobile-First */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-safe space-y-5">
        {/* REQUISITO 1: AVISO BLOQUEANTE SI user.isSubscribed === false */}
        {!currentUser.isSubscribed && (
          <div className="relative overflow-hidden rounded-3xl border-2 border-red-500/60 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 ring-2 ring-red-500/40 animate-pulse">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <div>
              <span className="rounded-full bg-red-500/20 border border-red-500/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-400">
                Acceso Bloqueado
              </span>
              <h2 className="text-xl font-black text-white mt-2">
                Suscripción Semanal Requerida
              </h2>
              <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                Para publicar rutas interurbanas y validar abordajes de pasajeros en carretera, debes estar al día con tu cuota de servicio.
              </p>
            </div>

            {/* Datos de Pago Móvil en Venezuela */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-amber-400 font-bold">
                <CreditCard className="h-4 w-4" />
                <span>Datos para Pago Móvil (Venezuela)</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">Banco:</span>
                <span className="font-semibold text-white">Banco de Venezuela (0102) / Banesco (0134)</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">Teléfono:</span>
                <span className="font-mono font-bold text-amber-400">0414-1234567</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span className="text-zinc-500">C.I. / RIF:</span>
                <span className="font-mono text-zinc-200">V-21.432.890</span>
              </div>
              <div className="flex justify-between text-zinc-300 pt-1 border-t border-zinc-900">
                <span className="text-zinc-500">Tarifa Semanal:</span>
                <span className="font-bold text-emerald-400">$5 USD (Ref. BCV)</span>
              </div>
            </div>

            {/* Botón WhatsApp Administrador */}
            <div className="space-y-2 pt-1">
              <a
                href={adminWhatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] py-3.5 px-4 text-xs font-black text-zinc-950 shadow-xl shadow-[#25D366]/20 transition-transform active:scale-95"
              >
                <MessageCircle className="h-4 w-4 fill-zinc-950" />
                <span>Contactar al Administrador por WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setCurrentUser({ ...currentUser, isSubscribed: true })}
                className="text-[11px] text-zinc-500 hover:text-amber-400 underline pt-1 block mx-auto"
              >
                [Simular Pago Aprobado para continuar pruebas]
              </button>
            </div>
          </div>
        )}

        {/* CONTENIDO PARA CHOFER SUSCRITO */}
        {currentUser.isSubscribed && (
          <>
            {/* Tarjeta de Resumen del Conductor */}
            <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-zinc-950 font-black text-base shadow-md shadow-amber-500/20">
                  AB
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold text-white">{currentUser.name}</h1>
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Car className="h-3 w-3 text-amber-400" />
                    <span>{currentUser.vehicle?.model}</span>
                    <span>•</span>
                    <span className="font-mono text-zinc-300">{currentUser.vehicle?.plate}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                  Suscripción Activa
                </span>
              </div>
            </div>

            {/* REQUISITO 2: FORMULARIO RÁPIDO 'PUBLICAR NUEVO VIAJE' */}
            <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-[#0B0F17] p-4 shadow-xl space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-amber-400" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Publicar Nuevo Viaje
                  </h2>
                </div>
                <span className="text-[10px] text-zinc-400">Rutas Interurbanas</span>
              </div>

              {publishMessage && (
                <div
                  className={`rounded-xl p-3 text-xs flex items-center gap-2 border ${
                    publishMessage.type === 'success'
                      ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                      : 'border-red-500/40 bg-red-950/40 text-red-300'
                  }`}
                >
                  {publishMessage.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <span>{publishMessage.text}</span>
                </div>
              )}

              <form onSubmit={handlePublishTrip} className="space-y-3">
                {/* Origen y Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-400" />
                      <span>Origen:</span>
                    </label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      {COMMON_CITIES.map((c) => (
                        <option key={`orig-${c}`} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="Otro">Otro origen...</option>
                    </select>
                    {origin === 'Otro' && (
                      <input
                        type="text"
                        placeholder="Escribe la ciudad de origen"
                        value={customOrigin}
                        onChange={(e) => setCustomOrigin(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-amber-400" />
                      <span>Destino:</span>
                    </label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                    >
                      {COMMON_CITIES.map((c) => (
                        <option key={`dest-${c}`} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="Otro">Otro destino...</option>
                    </select>
                    {destination === 'Otro' && (
                      <input
                        type="text"
                        placeholder="Escribe la ciudad de destino"
                        value={customDestination}
                        onChange={(e) => setCustomDestination(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Fecha y Hora de Salida */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    <span>Fecha y Hora de Salida:</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={departureDateTime}
                    onChange={(e) => setDepartureDateTime(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
                  />
                </div>

                {/* Puestos y Tarifa */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                      <Users className="h-3 w-3 text-amber-400" />
                      <span>Puestos (1 a 6):</span>
                    </label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setTotalSeats(num)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                            totalSeats === num
                              ? 'border-amber-500 bg-amber-500 text-zinc-950'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-400" />
                      <span>Tarifa por puesto:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={pricePerSeat}
                        onChange={(e) => setPricePerSeat(Number(e.target.value))}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-bold text-white focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-zinc-400 font-mono">
                        USD (Bs. {(pricePerSeat * 85).toLocaleString('es-VE')})
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPublishing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-black text-zinc-950 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>{isPublishing ? 'Publicando en Firestore...' : 'Publicar Nuevo Viaje'}</span>
                </button>
              </form>
            </section>

            {/* REQUISITO 3: MONITOR DE VIAJE ACTIVO */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    Monitor de Viaje Activo
                  </h2>
                </div>
                {driverTrips.length > 1 && (
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-zinc-300 focus:outline-none"
                  >
                    {driverTrips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.origin} ➔ {t.destination} ({t.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {loadingTrips ? (
                <div className="p-6 text-center text-zinc-400 text-xs">
                  <RefreshCw className="mx-auto h-5 w-5 animate-spin text-amber-400 mb-2" />
                  Cargando monitor de ruta...
                </div>
              ) : !activeTrip ? (
                <div className="p-6 text-center text-zinc-400 text-xs border border-dashed border-zinc-800 rounded-xl">
                  Aún no tienes viajes registrados. Publica uno arriba para empezar.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tarjeta del Viaje Monitoreado */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white">
                        {activeTrip.origin} ➔ {activeTrip.destination}
                      </span>
                      {activeTrip.status === 'in_route' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                          EN RUTA
                        </span>
                      ) : activeTrip.status === 'completed' ? (
                        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400">
                          COMPLETADO
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-black text-amber-400">
                          PROGRAMADO
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Puestos libres: <strong className="text-amber-400">{activeTrip.availableSeats}</strong> de {activeTrip.totalSeats}</span>
                      <span>Tarifa: <strong className="text-white">${activeTrip.pricePerSeat} USD</strong></span>
                    </div>

                    {/* Botones de Cambio de Estado: 'Iniciar Salida' y 'Terminar Viaje' */}
                    <div className="pt-2 border-t border-zinc-800 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleChangeStatus('in_route')}
                        disabled={isUpdatingStatus || activeTrip.status !== 'scheduled'}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 py-2.5 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-950/60 active:scale-95 transition disabled:opacity-40"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Iniciar Salida</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChangeStatus('completed')}
                        disabled={isUpdatingStatus || activeTrip.status !== 'in_route'}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-950/40 py-2.5 px-3 text-xs font-bold text-sky-400 hover:bg-sky-950/60 active:scale-95 transition disabled:opacity-40"
                      >
                        <Flag className="h-3.5 w-3.5" />
                        <span>Terminar Viaje</span>
                      </button>
                    </div>

                    {statusMessage && (
                      <p className="text-[11px] font-semibold text-emerald-400 text-center pt-1">
                        {statusMessage}
                      </p>
                    )}

                    {/* Transmisión GPS en Vivo (Requisito 4) */}
                    {isTripInRoute && (
                      <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 flex items-center justify-between text-xs animate-in fade-in">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </span>
                          <div>
                            <p className="font-bold text-emerald-400 flex items-center gap-1">
                              <Navigation className="h-3.5 w-3.5" />
                              <span>GPS en Carretera Transmitiendo</span>
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {driverLiveLocation
                                ? `Rumbo: ${driverLiveLocation.heading ?? 0}° • ${driverLiveLocation.speed ? `${driverLiveLocation.speed} km/h` : 'En ruta'}`
                                : 'Sincronizando satélites GPS...'}
                            </p>
                          </div>
                        </div>
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-400 font-mono">
                          LIVE
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Input Numérico para Validar PIN de 4 Dígitos */}
                  <div className="rounded-xl border border-amber-500/40 bg-zinc-900/90 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-amber-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                        Validar Abordaje por PIN
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Pide al pasajero el PIN de 4 dígitos generado en su boleto digital.
                    </p>

                    <form onSubmit={handleValidatePin} className="space-y-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="0000"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                          className="w-32 rounded-xl border border-zinc-700 bg-zinc-950 py-2 text-center text-xl font-black font-mono tracking-widest text-amber-400 focus:border-amber-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isValidatingPin || pinInput.length !== 4}
                          className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-400 py-2 text-xs font-black text-zinc-950 shadow-md shadow-amber-500/20 active:scale-95 transition disabled:opacity-50"
                        >
                          {isValidatingPin ? 'Validando...' : 'Validar Abordaje'}
                        </button>
                      </div>

                      {pinResult && (
                        <div
                          className={`rounded-xl p-2.5 text-xs flex items-center gap-2 border ${
                            pinResult.type === 'success'
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                              : 'border-red-500/40 bg-red-950/40 text-red-300'
                          }`}
                        >
                          {pinResult.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                          )}
                          <span>{pinResult.text}</span>
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Lista en Tiempo Real de Pasajeros Reservados */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-amber-400" />
                        <span>Pasajeros en este Viaje ({tripBookings.length})</span>
                      </span>
                      <span className="text-[10px] text-zinc-500">Actualización en vivo</span>
                    </div>

                    {tripBookings.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                        Esperando reservas de pasajeros en esta ruta...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tripBookings.map((b) => {
                          const isBoarded = b.status === 'boarded';
                          return (
                            <div
                              key={b.id}
                              className={`rounded-xl border p-3 flex items-center justify-between text-xs transition ${
                                isBoarded
                                  ? 'border-emerald-500/30 bg-emerald-950/20'
                                  : 'border-zinc-800 bg-zinc-900/60'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{b.passengerName}</span>
                                  {isBoarded ? (
                                    <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Abordado
                                    </span>
                                  ) : (
                                    <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-400">
                                      Por abordar
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {b.seatsBooked} puesto(s) • Tel: {b.passengerPhone}
                                </p>
                              </div>

                              {/* Botón de WhatsApp directo al pasajero */}
                              <a
                                href={getPassengerWhatsAppLink(
                                  b.passengerName,
                                  b.passengerPhone,
                                  activeTrip.origin,
                                  activeTrip.destination
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] px-3 py-1.5 text-xs font-bold text-zinc-950 shadow transition active:scale-95"
                              >
                                <MessageCircle className="h-3.5 w-3.5 fill-zinc-950" />
                                <span>WhatsApp</span>
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
