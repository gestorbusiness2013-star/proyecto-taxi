import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCrHNjxSfsGQglM6vLf7oAJCicaKJE_O0w",
  authDomain: "proyecto-taxi-ve.firebaseapp.com",
  projectId: "proyecto-taxi-ve",
  storageBucket: "proyecto-taxi-ve.firebasestorage.app",
  messagingSenderId: "30356567916",
  appId: "1:30356567916:web:8978131b97a417bff36549"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SEED_TRIPS = [
  {
    id: "trip-caracas-valencia-1",
    driverId: "driver-alejandro-1",
    driverName: "Alejandro Bastidas",
    driverPhone: "+584141234567",
    vehiclePlate: "AB123CD",
    origin: "Caracas",
    destination: "Valencia",
    departureTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 4,
    pricePerSeat: 15,
    status: "scheduled"
  },
  {
    id: "trip-caracas-maracay-1",
    driverId: "driver-marcos-2",
    driverName: "Marcos Rivas",
    driverPhone: "+584129876543",
    vehiclePlate: "AC987EF",
    origin: "Caracas",
    destination: "Maracay",
    departureTime: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    totalSeats: 5,
    availableSeats: 5,
    pricePerSeat: 12,
    status: "scheduled"
  },
  {
    id: "trip-valencia-caracas-1",
    driverId: "driver-guillermo-3",
    driverName: "Guillermo Peña",
    driverPhone: "+584245556677",
    vehiclePlate: "AD456GH",
    origin: "Valencia",
    destination: "Caracas",
    departureTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 4,
    pricePerSeat: 15,
    status: "scheduled"
  },
  {
    id: "trip-caracas-puertolacruz-1",
    driverId: "driver-yorman-4",
    driverName: "Yorman Colmenares",
    driverPhone: "+584163332211",
    vehiclePlate: "AE789JK",
    origin: "Caracas",
    destination: "Puerto La Cruz",
    departureTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 4,
    pricePerSeat: 28,
    status: "scheduled"
  },
  {
    id: "trip-caracas-barquisimeto-1",
    driverId: "driver-oswaldo-5",
    driverName: "Oswaldo Mendoza",
    driverPhone: "+584149988776",
    vehiclePlate: "AF112LM",
    origin: "Caracas",
    destination: "Barquisimeto",
    departureTime: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 4,
    pricePerSeat: 25,
    status: "scheduled"
  }
];

async function seed() {
  console.log("Seeding trips into live Firestore database...");
  for (const trip of SEED_TRIPS) {
    const { id, ...data } = trip;
    await setDoc(doc(db, "trips", id), { ...data, id });
    console.log(`✓ Seeded trip: ${trip.origin} ➔ ${trip.destination} ($${trip.pricePerSeat})`);
  }
  console.log("All trips seeded successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
