'use client';

import { useState, Suspense } from 'react';
import NavbarTop from '@/components/NavbarTop';
import BottomNav, { NavTab } from '@/components/BottomNav';
import PassengerView from '@/components/PassengerView';
import BookingsTab, { BookingWithTrip } from '@/components/tabs/BookingsTab';
import ProfileTab from '@/components/tabs/ProfileTab';
import NotificationsModal from '@/components/NotificationsModal';
import type { Trip, Booking } from '@/lib/types';

const INITIAL_BOOKINGS: BookingWithTrip[] = [];

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('viajes');
  const [bookings, setBookings] = useState<BookingWithTrip[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleBookingCreated = (booking: Booking, trip: Trip) => {
    const newEntry: BookingWithTrip = {
      booking,
      trip,
    };
    setBookings((prev) => [newEntry, ...prev]);
  };

  const handleBookingStatusChanged = (bookingId: string, newStatus: Booking['status']) => {
    setBookings((prev) =>
      prev.map((item) =>
        item.booking.id === bookingId
          ? { ...item, booking: { ...item.booking, status: newStatus } }
          : item
      )
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] text-zinc-100">
      {/* Barra de Navegación Superior Minimalista */}
      <NavbarTop onOpenNotifications={() => setIsNotificationsOpen(true)} />

      {/* Contenedor Principal Mobile-First */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-2 pb-safe">
        {/* Vista Principal del Pasajero: Próximas Salidas y En Carretera */}
        {currentTab === 'viajes' && (
          <Suspense
            fallback={
              <div className="p-8 text-center text-xs text-zinc-400">
                Cargando cartelera de rutas...
              </div>
            }
          >
            <PassengerView onBookingCreated={handleBookingCreated} />
          </Suspense>
        )}

        {/* Mis Reservas y Boletos */}
        {currentTab === 'reservas' && (
          <BookingsTab
            bookings={bookings}
            onOpenViajesTab={() => setCurrentTab('viajes')}
            onBookingStatusChanged={handleBookingStatusChanged}
          />
        )}

        {/* Perfil del Usuario y Modo Conductor */}
        {currentTab === 'perfil' && <ProfileTab />}
      </main>

      {/* Barra de Navegación Inferior Móvil */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        activeBookingsCount={bookings.filter((b) => b.booking.status === 'confirmed').length}
      />

      {/* Modal de Notificaciones */}
      {isNotificationsOpen && (
        <NotificationsModal onClose={() => setIsNotificationsOpen(false)} />
      )}
    </div>
  );
}
