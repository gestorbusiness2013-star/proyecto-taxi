// Tipos de dominio de Taxi Libre Venezuela.
// Las fechas se guardan como strings ISO 8601 para que se serialicen sin problemas
// entre Server Components, Client Components y Firestore.

export type UserRole = 'driver' | 'passenger';

/**
 * Estado de la cuenta, gestionado por el administrador.
 * - pending: chofer registrado esperando verificación de documentos.
 * - approved: cuenta activa.
 * - rejected: solicitud de chofer rechazada.
 * - suspended: cuenta bloqueada por la administración.
 * Si el campo no existe (cuentas antiguas) se considera `approved`.
 */
export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface Vehicle {
  model: string;
  plate: string;
  color: string;
}

/** Fotos y recaudos del chofer para verificación por la administración */
export interface DriverDocuments {
  /** Foto de la Cédula de Identidad (anverso/reverso) */
  idCardUrl?: string;
  /** Foto de la Licencia de Conducir (4ta o 5ta) */
  driverLicenseUrl?: string;
  /** Foto del Carnet de Circulación o Título del Carro */
  vehicleRegistrationUrl?: string;
  /** Foto frontal del Vehículo mostrando placa */
  vehiclePhotoUrl?: string;
  uploadedAt?: string;
  verified?: boolean;
  notes?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  /** Cédula de identidad, ej: "V-21432890" */
  dni: string;
  role: UserRole;
  /** Suscripción activa. Solo aplica a choferes. */
  isSubscribed?: boolean;
  /** Vehículo registrado. Solo aplica a choferes. */
  vehicle?: Vehicle;
  /** Documentos subidos para validación (choferes). */
  documents?: DriverDocuments;
  /** Promedio de estrellas del chofer (1.0 a 5.0). */
  ratingAverage?: number;
  /** Cantidad de calificaciones recibidas. */
  ratingCount?: number;
  /** Estado de la cuenta (lo modifica solo el administrador). */
  status?: AccountStatus;
  /** Motivo de rechazo o suspensión, visible para la administración. */
  statusReason?: string;
  /** Fecha de vencimiento de la suscripción mensual del chofer (ISO 8601). */
  subscriptionExpiresAt?: string;
  /** Fecha de registro (ISO 8601). */
  createdAt?: string;
}

export type TripStatus = 'scheduled' | 'in_route' | 'completed' | 'cancelled';

export interface GeoLocation {
  lat: number;
  lng: number;
  heading?: number; // 0-360 degrees
  speed?: number; // km/h
  updatedAt?: string;
}

export interface Trip {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  vehiclePlate: string;
  vehicleModel?: string;
  driverRating?: number;
  origin: string;
  destination: string;
  /** Punto de encuentro seguro de salida (ej. Plaza Venezuela) */
  meetingPointOrigin?: string;
  /** Punto de desembarque seguro de llegada (ej. Distribuidor San Blas) */
  meetingPointDestination?: string;
  /** Fecha/hora de salida en ISO 8601 */
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  /** Precio por asiento en USD */
  pricePerSeat: number;
  status: TripStatus;
  /** Coordenadas y rumbo en tiempo real (estilo Flightradar24) */
  currentLocation?: GeoLocation;
  /**
   * Moderación del administrador. Si es `rejected` el viaje se oculta a los
   * pasajeros. Ausente = visible (los viajes se publican sin revisión previa).
   */
  moderation?: 'approved' | 'rejected';
}

export type BookingStatus = 'confirmed' | 'boarded' | 'cancelled';

export interface Booking {
  id: string;
  tripId: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  seatsBooked: number;
  /** PIN de abordaje de 4 dígitos, ej: "0427" */
  boardingPin: string;
  status: BookingStatus;
  /** Fecha de creación en ISO 8601 */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Administración: pagos de suscripción y reportes
// ---------------------------------------------------------------------------

export type PaymentMethod = 'pago_movil' | 'zelle' | 'transferencia' | 'efectivo' | 'binance';

export type PaymentStatus = 'verified' | 'void';

/** Pago de la suscripción mensual de un chofer, registrado por el administrador. */
export interface Payment {
  id: string;
  driverId: string;
  driverName: string;
  /** Monto en USD */
  amount: number;
  method: PaymentMethod;
  /** Número de referencia bancaria / comprobante */
  reference: string;
  /** Cantidad de meses que cubre el pago */
  months: number;
  /** Nuevo vencimiento de la suscripción tras aplicar el pago (ISO 8601) */
  coversUntil: string;
  status: PaymentStatus;
  notes?: string;
  /** Email del administrador que registró el pago */
  recordedBy: string;
  createdAt: string;
}

export type ReportType = 'sos' | 'complaint' | 'dispute';
export type ReportStatus = 'open' | 'in_progress' | 'resolved';

/** Alerta S.O.S., queja o disputa enviada desde la app. */
export interface Report {
  id: string;
  type: ReportType;
  status: ReportStatus;
  message: string;
  reporterId?: string;
  reporterName?: string;
  reporterPhone?: string;
  tripId?: string;
  bookingId?: string;
  location?: { lat: number; lng: number };
  /** Nota interna del administrador al gestionar el reporte */
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Calificaciones y Reseñas de Conductores
// ---------------------------------------------------------------------------

export interface Review {
  id: string;
  tripId: string;
  driverId: string;
  driverName: string;
  passengerId: string;
  passengerName: string;
  /** Puntuación de 1 a 5 estrellas */
  rating: number;
  /** Comentario sobre el viaje */
  comment?: string;
  /** Etiquetas destacadas: 'Puntual', 'Buen aire acondicionado', 'Vehículo impecable', etc. */
  tags?: string[];
  /** Moderación de la reseña: 'approved' o 'hidden' */
  status?: 'approved' | 'hidden';
  createdAt: string;
}
