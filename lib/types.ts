// Tipos de dominio de Proyecto Taxi.
// Las fechas se guardan como strings ISO 8601 para que se serialicen sin problemas
// entre Server Components, Client Components y Firestore.

export type UserRole = 'driver' | 'passenger';

export interface Vehicle {
  model: string;
  plate: string;
  color: string;
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
  /** Fecha/hora de salida en ISO 8601 */
  departureTime: string;
  totalSeats: number;
  availableSeats: number;
  /** Precio por asiento en USD */
  pricePerSeat: number;
  status: TripStatus;
  /** Coordenadas y rumbo en tiempo real (estilo Flightradar24) */
  currentLocation?: GeoLocation;
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
