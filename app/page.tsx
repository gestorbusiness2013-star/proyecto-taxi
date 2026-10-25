'use client';

import { useState } from 'react';
import NavbarTop from '@/components/NavbarTop';
import BottomNav, { NavTab } from '@/components/BottomNav';
import TripsTab from '@/components/tabs/TripsTab';
import BookingsTab, { UserBooking } from '@/components/tabs/BookingsTab';
import ProfileTab from '@/components/tabs/ProfileTab';
import NotificationsModal from '@/components/NotificationsModal';
import { TripData } from '@/components/BookingModal';

const INITIAL_BOOKINGS: UserBooking[] = [
  {
    id: 'booking-seed-1',
    trip: {
      id: 'trip-seed',
      origin: 'Caracas',
      originDetail: 'Plaza Venezuela (Frente a Torre La Previsora)',
      destination: 'Valencia',
      destinationDetail: 'Redoma de Guaparo / C.C. Metrópolis',
      departureTime: '05:30 PM',
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
      priceBcv: 15 * 85,
      availableSeats: 2,
      totalSeats: 4,
    },
    seats: 1,
    passengerName: 'Carlos E. Mendoza',
    notes: 'Bolso de mano y morral',
    bookingCode: 'TAX-VE-8492',
    status: 'confirmado',
    createdAt: '2026-10-25',
  },
];

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>('viajes');
  const [bookings, setBookings] = useState<UserBooking[]>(INITIAL_BOOKINGS);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const handleBookTrip = (
    trip: TripData,
    seats: number,
    passengerName: string,
    notes: string
  ) => {
    const newBooking: UserBooking = {
      id: `booking-${Date.now()}`,
      trip,
      seats,
      passengerName,
      notes,
      bookingCode: `TAX-VE-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'confirmado',
      createdAt: new Date().toISOString(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    // Switch to Reservas tab automatically so the passenger sees their boarding pass
    setCurrentTab('reservas');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F17] text-zinc-100">
      {/* Minimalist Top Navigation Bar */}
      <NavbarTop onOpenNotifications={() => setIsNotificationsOpen(true)} />

      {/* Main Container - Mobile-First centered container */}
      <main className="mx-auto w-full max-w-md flex-1 px-4 pt-3 pb-safe">
        {currentTab === 'viajes' && (
          <TripsTab onBookTrip={handleBookTrip} />
        )}

        {currentTab === 'reservas' && (
          <BookingsTab
            bookings={bookings}
            onOpenViajesTab={() => setCurrentTab('viajes')}
          />
        )}

        {currentTab === 'perfil' && <ProfileTab />}
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        activeBookingsCount={bookings.filter((b) => b.status !== 'completado').length}
      />

      {/* Notifications Modal */}
      {isNotificationsOpen && (
        <NotificationsModal onClose={() => setIsNotificationsOpen(false)} />
      )}
    </div>
  );
}
