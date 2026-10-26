'use client';

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  where,
  setDoc,
  updateDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type { Booking, Trip, TripStatus, User, GeoLocation } from './types';

// ---------------------------------------------------------------------------
// Inicialización (lazy, para no romper el build si faltan variables de entorno)
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _db: Firestore | null = null;

/** Indica si las variables de entorno de Firebase están definidas. */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.projectId && firebaseConfig.apiKey);
}

/**
 * Ejecuta la creación de un listener de forma segura: si Firebase no está
 * configurado o falla la inicialización, notifica por onError y devuelve un
 * unsubscribe vacío en lugar de lanzar (lo que tumbaría toda la app en producción).
 */
function safeListen(
  create: () => Unsubscribe,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return create();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.warn('[db] Listener no iniciado:', error.message);
    onError?.(error);
    return () => {};
  }
}

export function getDb(): Firestore {
  if (_db) return _db;
  if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
    throw new Error(
      'Firebase no está configurado. Define las variables NEXT_PUBLIC_FIREBASE_* en .env.local (ver .env.example).'
    );
  }
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  _db = getFirestore(app);
  return _db;
}

export const COLLECTIONS = {
  users: 'users',
  trips: 'trips',
  bookings: 'bookings',
} as const;

// ---------------------------------------------------------------------------
// Errores de dominio
// ---------------------------------------------------------------------------

export type DbErrorCode =
  | 'TRIP_NOT_FOUND'
  | 'TRIP_NOT_BOOKABLE'
  | 'NOT_ENOUGH_SEATS'
  | 'INVALID_SEATS'
  | 'DRIVER_CANNOT_BOOK_OWN_TRIP'
  | 'INVALID_STATUS_TRANSITION'
  | 'NOT_TRIP_DRIVER'
  | 'INVALID_PIN'
  | 'BOOKING_NOT_ACTIVE'
  | 'PIN_GENERATION_FAILED';

export class DbError extends Error {
  constructor(public code: DbErrorCode, message: string) {
    super(message);
    this.name = 'DbError';
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** PIN de 4 dígitos ("0000"–"9999") con aleatoriedad criptográfica. */
export function generateBoardingPin(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 10000).toString().padStart(4, '0');
}

/** El ID del documento de reserva codifica el PIN → unicidad por viaje y lookup O(1). */
function bookingDocId(tripId: string, pin: string): string {
  return `${tripId}_${pin}`;
}

// ---------------------------------------------------------------------------
// 1. Listener en tiempo real de viajes disponibles
// ---------------------------------------------------------------------------

/**
 * Se suscribe a los viajes con el `status` indicado y `availableSeats > 0`.
 * Devuelve la función para cancelar la suscripción (úsala en el cleanup de useEffect).
 *
 * Requiere el índice compuesto (status ASC, availableSeats ASC) → ver firestore.indexes.json.
 */
export function getLiveTrips(
  status: Extract<TripStatus, 'scheduled' | 'in_route'>,
  onData: (trips: Trip[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return safeListen(() => {
    const q = query(
      collection(getDb(), COLLECTIONS.trips),
      where('status', '==', status),
      where('availableSeats', '>', 0)
    );

    return onSnapshot(
      q,
      (snap) => {
        const trips = snap.docs
          .map((d) => ({ ...(d.data() as Omit<Trip, 'id'>), id: d.id }))
          .sort((a, b) => a.departureTime.localeCompare(b.departureTime));
        onData(trips);
      },
      (err) => onError?.(err)
    );
  }, onError);
}

// ---------------------------------------------------------------------------
// 2. Reserva atómica de asientos
// ---------------------------------------------------------------------------

export interface BookSeatsInput {
  tripId: string;
  passenger: Pick<User, 'id' | 'name' | 'phone'>;
  seats: number;
}

const MAX_PIN_ATTEMPTS = 5;

/**
 * Descuenta `availableSeats` y crea la reserva con un PIN aleatorio de 4 dígitos,
 * todo dentro de una única transacción. Si dos pasajeros compiten por el último
 * asiento, Firestore reintenta la transacción y solo uno gana.
 */
export async function bookSeats({ tripId, passenger, seats }: BookSeatsInput): Promise<Booking> {
  if (!Number.isInteger(seats) || seats < 1) {
    throw new DbError('INVALID_SEATS', 'La cantidad de asientos debe ser un entero mayor a 0.');
  }

  const db = getDb();
  const tripRef = doc(db, COLLECTIONS.trips, tripId);

  return runTransaction(db, async (tx) => {
    // --- Lecturas (todas antes de cualquier escritura) ---
    const tripSnap = await tx.get(tripRef);
    if (!tripSnap.exists()) {
      throw new DbError('TRIP_NOT_FOUND', 'El viaje no existe.');
    }
    const trip = tripSnap.data() as Omit<Trip, 'id'>;

    if (trip.status !== 'scheduled' && trip.status !== 'in_route') {
      throw new DbError('TRIP_NOT_BOOKABLE', 'Este viaje ya no acepta reservas.');
    }
    if (trip.driverId === passenger.id) {
      throw new DbError('DRIVER_CANNOT_BOOK_OWN_TRIP', 'No puedes reservar en tu propio viaje.');
    }
    if (trip.availableSeats < seats) {
      throw new DbError(
        'NOT_ENOUGH_SEATS',
        `Solo quedan ${trip.availableSeats} asiento(s) disponible(s).`
      );
    }

    // Buscar un PIN libre para este viaje
    let pin: string | null = null;
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      const candidate = generateBoardingPin();
      const existing = await tx.get(doc(db, COLLECTIONS.bookings, bookingDocId(tripId, candidate)));
      if (!existing.exists()) {
        pin = candidate;
        break;
      }
    }
    if (!pin) {
      throw new DbError('PIN_GENERATION_FAILED', 'No se pudo generar un PIN único. Intenta de nuevo.');
    }

    // --- Escrituras ---
    const bookingId = bookingDocId(tripId, pin);
    const booking: Booking = {
      id: bookingId,
      tripId,
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      seatsBooked: seats,
      boardingPin: pin,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    tx.update(tripRef, { availableSeats: trip.availableSeats - seats });
    tx.set(doc(db, COLLECTIONS.bookings, bookingId), booking);

    return booking;
  });
}

// ---------------------------------------------------------------------------
// 3. Cambio de estado del viaje
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  scheduled: ['in_route', 'cancelled'],
  in_route: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/**
 * Avanza el estado del viaje: scheduled → in_route → completed
 * (o scheduled → cancelled). Solo el chofer del viaje puede hacerlo.
 */
export async function updateTripStatus(
  tripId: string,
  driverId: string,
  nextStatus: TripStatus
): Promise<void> {
  const db = getDb();
  const tripRef = doc(db, COLLECTIONS.trips, tripId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tripRef);
    if (!snap.exists()) {
      throw new DbError('TRIP_NOT_FOUND', 'El viaje no existe.');
    }
    const trip = snap.data() as Omit<Trip, 'id'>;

    if (trip.driverId !== driverId) {
      throw new DbError('NOT_TRIP_DRIVER', 'Solo el chofer de este viaje puede cambiar su estado.');
    }
    if (!canTransition(trip.status, nextStatus)) {
      throw new DbError(
        'INVALID_STATUS_TRANSITION',
        `No se puede pasar de "${trip.status}" a "${nextStatus}".`
      );
    }

    tx.update(tripRef, { status: nextStatus });
  });
}

// ---------------------------------------------------------------------------
// 4. Validación del PIN de abordaje (lado chofer)
// ---------------------------------------------------------------------------

/**
 * El chofer introduce el PIN que le muestra el pasajero. Si es válido, la reserva
 * pasa a `boarded` y se devuelve para mostrar nombre y asientos en pantalla.
 * Un PIN solo puede usarse una vez.
 */
export async function validateBoardingPin(
  tripId: string,
  driverId: string,
  pin: string
): Promise<Booking> {
  if (!/^\d{4}$/.test(pin)) {
    throw new DbError('INVALID_PIN', 'El PIN debe tener exactamente 4 dígitos.');
  }

  const db = getDb();
  const tripRef = doc(db, COLLECTIONS.trips, tripId);
  const bookingRef = doc(db, COLLECTIONS.bookings, bookingDocId(tripId, pin));

  return runTransaction(db, async (tx) => {
    const [tripSnap, bookingSnap] = await Promise.all([tx.get(tripRef), tx.get(bookingRef)]);

    if (!tripSnap.exists()) {
      throw new DbError('TRIP_NOT_FOUND', 'El viaje no existe.');
    }
    const trip = tripSnap.data() as Omit<Trip, 'id'>;

    if (trip.driverId !== driverId) {
      throw new DbError('NOT_TRIP_DRIVER', 'Solo el chofer de este viaje puede validar abordajes.');
    }
    if (trip.status !== 'scheduled' && trip.status !== 'in_route') {
      throw new DbError('TRIP_NOT_BOOKABLE', 'El viaje ya finalizó o fue cancelado.');
    }
    if (!bookingSnap.exists()) {
      throw new DbError('INVALID_PIN', 'PIN incorrecto para este viaje.');
    }

    const booking = { ...(bookingSnap.data() as Booking), id: bookingSnap.id };
    if (booking.status !== 'confirmed') {
      throw new DbError(
        'BOOKING_NOT_ACTIVE',
        booking.status === 'boarded'
          ? 'Este pasajero ya abordó.'
          : 'Esta reserva fue cancelada.'
      );
    }

    tx.update(bookingRef, { status: 'boarded' });
    return { ...booking, status: 'boarded' };
  });
}

// ---------------------------------------------------------------------------
// 5. Publicación de nuevo viaje (Chofer)
// ---------------------------------------------------------------------------

export async function publishTrip(
  tripData: Omit<Trip, 'id' | 'availableSeats' | 'status'> & { vehicleModel?: string }
): Promise<Trip> {
  const db = getDb();
  const tripRef = doc(collection(db, COLLECTIONS.trips));
  const newTrip: Trip = {
    ...tripData,
    id: tripRef.id,
    availableSeats: tripData.totalSeats,
    status: 'scheduled',
  };

  await setDoc(tripRef, newTrip);
  return newTrip;
}

// ---------------------------------------------------------------------------
// 6. Listeners para el Monitor del Chofer
// ---------------------------------------------------------------------------

/**
 * Escucha en tiempo real todos los viajes publicados por el chofer.
 */
export function getDriverTrips(
  driverId: string,
  onData: (trips: Trip[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return safeListen(() => {
    const q = query(
      collection(getDb(), COLLECTIONS.trips),
      where('driverId', '==', driverId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const trips = snap.docs
          .map((d) => ({ ...(d.data() as Omit<Trip, 'id'>), id: d.id }))
          .sort((a, b) => b.departureTime.localeCompare(a.departureTime));
        onData(trips);
      },
      (err) => onError?.(err)
    );
  }, onError);
}

/**
 * Escucha en tiempo real los pasajeros y reservas de un viaje específico.
 */
export function getTripBookings(
  tripId: string,
  onData: (bookings: Booking[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return safeListen(() => {
    const q = query(
      collection(getDb(), COLLECTIONS.bookings),
      where('tripId', '==', tripId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const bookings = snap.docs
          .map((d) => ({ ...(d.data() as Omit<Booking, 'id'>), id: d.id }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        onData(bookings);
      },
      (err) => onError?.(err)
    );
  }, onError);
}

// ---------------------------------------------------------------------------
// 7. Geolocalización en Tiempo Real del Conductor (Flightradar24 style)
// ---------------------------------------------------------------------------

/**
 * Actualiza las coordenadas geográficas, rumbo y velocidad del vehículo en Firestore.
 */
export async function updateTripLocation(
  tripId: string,
  location: GeoLocation
): Promise<void> {
  const db = getDb();
  const tripRef = doc(db, COLLECTIONS.trips, tripId);
  await updateDoc(tripRef, {
    currentLocation: {
      ...location,
      updatedAt: new Date().toISOString(),
    },
  });
}

/**
 * Escucha todos los viajes activos (scheduled o in_route) para el mapa en vivo.
 */
export function getAllActiveTrips(
  onData: (trips: Trip[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return safeListen(() => {
    const q = query(
      collection(getDb(), COLLECTIONS.trips),
      where('availableSeats', '>', 0)
    );

    return onSnapshot(
      q,
      (snap) => {
        const trips = snap.docs
          .map((d) => ({ ...(d.data() as Omit<Trip, 'id'>), id: d.id }))
          .filter((t) => t.status === 'scheduled' || t.status === 'in_route');
        onData(trips);
      },
      (err) => onError?.(err)
    );
  }, onError);
}


