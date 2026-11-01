'use client';

// Capa de datos del Panel de Administración.
// Todas las escrituras de este módulo requieren una sesión de Firebase Auth cuyo
// UID exista en la colección `admins` (validado en firestore.rules → isAdmin()).

import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { COLLECTIONS, DbError, getDb } from './db';
import type {
  AccountStatus,
  Booking,
  Payment,
  PaymentMethod,
  Report,
  ReportStatus,
  Trip,
  User,
  Review,
  DriverDocuments,
} from './types';

/** Cuota mensual sugerida de la suscripción de choferes (USD). */
export const DEFAULT_SUBSCRIPTION_FEE_USD = 10;

/** Días que cubre cada mes de suscripción. */
const DAYS_PER_MONTH = 30;
const DAY_MS = 24 * 3600 * 1000;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  binance: 'Binance / USDT',
};

// ---------------------------------------------------------------------------
// Listeners genéricos
// ---------------------------------------------------------------------------

function listenCollection<T extends { id: string }>(
  name: string,
  onData: (items: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  try {
    return onSnapshot(
      collection(getDb(), name),
      (snap) => onData(snap.docs.map((d) => ({ ...(d.data() as Omit<T, 'id'>), id: d.id }) as T)),
      (err) => onError?.(err)
    );
  } catch (err) {
    onError?.(err instanceof Error ? err : new Error(String(err)));
    return () => { };
  }
}

const byCreatedDesc = <T extends { createdAt?: string }>(a: T, b: T) =>
  (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

export function listenUsers(onData: (users: User[]) => void, onError?: (e: Error) => void) {
  return listenCollection<User>(COLLECTIONS.users, (u) => onData(u.sort(byCreatedDesc)), onError);
}

export function listenTrips(onData: (trips: Trip[]) => void, onError?: (e: Error) => void) {
  return listenCollection<Trip>(
    COLLECTIONS.trips,
    (t) => onData(t.sort((a, b) => b.departureTime.localeCompare(a.departureTime))),
    onError
  );
}

export function listenBookings(onData: (bookings: Booking[]) => void, onError?: (e: Error) => void) {
  return listenCollection<Booking>(COLLECTIONS.bookings, (b) => onData(b.sort(byCreatedDesc)), onError);
}

export function listenPayments(onData: (payments: Payment[]) => void, onError?: (e: Error) => void) {
  return listenCollection<Payment>(COLLECTIONS.payments, (p) => onData(p.sort(byCreatedDesc)), onError);
}

export function listenReports(onData: (reports: Report[]) => void, onError?: (e: Error) => void) {
  return listenCollection<Report>(COLLECTIONS.reports, (r) => onData(r.sort(byCreatedDesc)), onError);
}

// ---------------------------------------------------------------------------
// Helpers de dominio
// ---------------------------------------------------------------------------

/** Estado efectivo de la cuenta (las cuentas antiguas sin campo cuentan como aprobadas). */
export function accountStatus(user: User): AccountStatus {
  return user.status ?? 'approved';
}

export type SubscriptionState = 'active' | 'expiring' | 'expired' | 'none';

/** Estado de la suscripción de un chofer según su fecha de vencimiento. */
export function subscriptionState(user: User, now = Date.now()): SubscriptionState {
  if (!user.subscriptionExpiresAt) return user.isSubscribed ? 'active' : 'none';
  const expires = new Date(user.subscriptionExpiresAt).getTime();
  if (expires < now) return 'expired';
  if (expires - now < 7 * DAY_MS) return 'expiring';
  return 'active';
}

// ---------------------------------------------------------------------------
// Cuentas y solicitudes de choferes
// ---------------------------------------------------------------------------

export async function setUserStatus(
  userId: string,
  status: AccountStatus,
  reason?: string
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.users, userId), {
    status,
    statusReason: reason?.trim() || '',
  });
}

/** Desactiva manualmente la suscripción (ej. chofer moroso). */
export async function deactivateSubscription(userId: string): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.users, userId), { isSubscribed: false });
}

// ---------------------------------------------------------------------------
// Finanzas: pagos de suscripción
// ---------------------------------------------------------------------------

export interface RecordPaymentInput {
  driverId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  months: number;
  notes?: string;
  recordedBy: string;
}

/**
 * Registra un pago y extiende la suscripción del chofer en una sola transacción.
 * El nuevo vencimiento parte de la fecha mayor entre hoy y el vencimiento actual,
 * así un pago adelantado no pierde días.
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Payment> {
  if (!(input.amount > 0)) throw new Error('El monto debe ser mayor a 0.');
  if (!Number.isInteger(input.months) || input.months < 1 || input.months > 12) {
    throw new Error('Los meses deben estar entre 1 y 12.');
  }

  const db = getDb();
  const userRef = doc(db, COLLECTIONS.users, input.driverId);
  const paymentRef = doc(collection(db, COLLECTIONS.payments));

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('El chofer no existe.');
    const driver = snap.data() as User;

    const now = Date.now();
    const currentExpiry = driver.subscriptionExpiresAt
      ? new Date(driver.subscriptionExpiresAt).getTime()
      : 0;
    const base = Math.max(now, currentExpiry);
    const coversUntil = new Date(base + input.months * DAYS_PER_MONTH * DAY_MS).toISOString();

    const payment: Payment = {
      id: paymentRef.id,
      driverId: input.driverId,
      driverName: driver.name,
      amount: Math.round(input.amount * 100) / 100,
      method: input.method,
      reference: input.reference.trim(),
      months: input.months,
      coversUntil,
      status: 'verified',
      recordedBy: input.recordedBy,
      createdAt: new Date(now).toISOString(),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    };

    tx.set(paymentRef, payment);
    tx.update(userRef, { isSubscribed: true, subscriptionExpiresAt: coversUntil });
    return payment;
  });
}

/** Anula un pago (no lo borra, para conservar el historial contable). */
export async function voidPayment(paymentId: string, reason: string): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.payments, paymentId), {
    status: 'void',
    notes: `ANULADO: ${reason.trim() || 'sin motivo'}`,
  });
}

// ---------------------------------------------------------------------------
// Viajes
// ---------------------------------------------------------------------------

export async function setTripModeration(
  tripId: string,
  moderation: 'approved' | 'rejected'
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.trips, tripId), { moderation });
}

export async function adminCancelTrip(tripId: string): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.trips, tripId), { status: 'cancelled' });
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

/**
 * Cancela una reserva confirmada y devuelve los asientos al viaje
 * (si el viaje sigue activo), todo de forma atómica.
 */
export async function adminCancelBooking(bookingId: string): Promise<void> {
  const db = getDb();
  const bookingRef = doc(db, COLLECTIONS.bookings, bookingId);

  await runTransaction(db, async (tx) => {
    const bSnap = await tx.get(bookingRef);
    if (!bSnap.exists()) throw new Error('La reserva no existe.');
    const booking = bSnap.data() as Booking;
    if (booking.status !== 'confirmed') {
      throw new DbError('BOOKING_NOT_ACTIVE', 'Solo se pueden cancelar reservas confirmadas.');
    }

    const tripRef = doc(db, COLLECTIONS.trips, booking.tripId);
    const tSnap = await tx.get(tripRef);

    tx.update(bookingRef, { status: 'cancelled' });
    if (tSnap.exists()) {
      const trip = tSnap.data() as Trip;
      if (trip.status === 'scheduled' || trip.status === 'in_route') {
        tx.update(tripRef, {
          availableSeats: Math.min(trip.totalSeats, trip.availableSeats + booking.seatsBooked),
        });
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Reportes (S.O.S., quejas, disputas)
// ---------------------------------------------------------------------------

export async function updateReport(
  reportId: string,
  status: ReportStatus,
  adminNote?: string
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.reports, reportId), {
    status,
    updatedAt: new Date().toISOString(),
    ...(adminNote !== undefined ? { adminNote: adminNote.trim() } : {}),
  });
}

// ---------------------------------------------------------------------------
// Exportación contable
// ---------------------------------------------------------------------------

/** Genera un CSV (separado por `;` para Excel en español) con los pagos indicados. */
export function paymentsToCsv(payments: Payment[]): string {
  const header = ['Fecha', 'Chofer', 'Monto USD', 'Método', 'Referencia', 'Meses', 'Cubre hasta', 'Estado', 'Registrado por', 'Notas'];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = payments.map((p) =>
    [
      new Date(p.createdAt).toLocaleString('es-VE'),
      p.driverName,
      p.amount.toFixed(2).replace('.', ','),
      PAYMENT_METHOD_LABELS[p.method] ?? p.method,
      p.reference,
      p.months,
      new Date(p.coversUntil).toLocaleDateString('es-VE'),
      p.status === 'void' ? 'Anulado' : 'Verificado',
      p.recordedBy,
      p.notes ?? '',
    ]
      .map(esc)
      .join(';')
  );
  return '\uFEFF' + [header.map(esc).join(';'), ...rows].join('\n');
}


export function listenReviews(onData: (reviews: Review[]) => void, onError?: (e: Error) => void) {
  return listenCollection<Review>(COLLECTIONS.reviews, (r) => onData(r.sort(byCreatedDesc)), onError);
}

/** Moderar visibilidad de una reseña */
export async function setReviewStatus(
  reviewId: string,
  status: 'approved' | 'hidden'
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.reviews, reviewId), { status });
}

/** Exonerar y premiar a un chofer destacado con 1 mes gratis de membresía */
export async function rewardDriverFreeMonth(driverId: string, adminEmail: string): Promise<Payment> {
  return recordPayment({
    driverId,
    amount: 0,
    method: 'efectivo',
    reference: `BONO-PREMIO-${Date.now().toString().slice(-6)}`,
    months: 1,
    notes: 'Exoneración mensual por excelente calificación y desempeño del chofer.',
    recordedBy: adminEmail,
  });
}

/** Guardar documentos y recaudos de un chofer */
export async function updateDriverDocuments(
  driverId: string,
  documents: DriverDocuments
): Promise<void> {
  await updateDoc(doc(getDb(), COLLECTIONS.users, driverId), {
    documents: {
      ...documents,
      uploadedAt: new Date().toISOString(),
    },
  });
}
