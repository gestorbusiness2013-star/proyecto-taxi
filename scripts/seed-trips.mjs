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
  // Próximas Salidas (scheduled)
  {
    id: "trip-caracas-valencia-1",
    driverId: "driver-alejandro-1",
    driverName: "Alejandro Bastidas",
    driverPhone: "+584141234567",
    vehiclePlate: "AB123CD",
    vehicleModel: "Toyota Corolla 2018",
    origin: "Caracas",
    destination: "Valencia",
    departureTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 3,
    pricePerSeat: 15,
    status: "scheduled"
  },
  {
    id: "trip-caracas-maracay-1",
    driverId: "driver-marcos-2",
    driverName: "Marcos Rivas",
    driverPhone: "+584129876543",
    vehiclePlate: "AC987EF",
    vehicleModel: "Ford Explorer XLT",
    origin: "Caracas",
    destination: "Maracay",
    departureTime: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    totalSeats: 5,
    availableSeats: 4,
    pricePerSeat: 12,
    status: "scheduled"
  },
  {
    id: "trip-valencia-caracas-1",
    driverId: "driver-guillermo-3",
    driverName: "Guillermo Peña",
    driverPhone: "+584245556677",
    vehiclePlate: "AD456GH",
    vehicleModel: "Chevrolet Aveo LT",
    origin: "Valencia",
    destination: "Caracas",
    departureTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 15,
    status: "scheduled"
  },
  {
    id: "trip-caracas-puertolacruz-1",
    driverId: "driver-yorman-4",
    driverName: "Yorman Colmenares",
    driverPhone: "+584163332211",
    vehiclePlate: "AE789JK",
    vehicleModel: "Toyota Fortuner",
    origin: "Caracas",
    destination: "Puerto La Cruz",
    departureTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 3,
    pricePerSeat: 28,
    status: "scheduled"
  },
  {
    id: "trip-caracas-barquisimeto-1",
    driverId: "driver-oswaldo-5",
    driverName: "Oswaldo Mendoza",
    driverPhone: "+584149988776",
    vehiclePlate: "AF112LM",
    vehicleModel: "Chery Tiggo 4",
    origin: "Caracas",
    destination: "Barquisimeto",
    departureTime: new Date(Date.now() + 10 * 3600 * 1000).toISOString(),
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 25,
    status: "scheduled"
  },
  // En Carretera (in_route) con puestos vacíos
  {
    id: "trip-route-caracas-valencia-2",
    driverId: "driver-hector-6",
    driverName: "Héctor Rodríguez",
    driverPhone: "+584142345678",
    vehiclePlate: "AG345KL",
    vehicleModel: "Toyota Yaris Sedan",
    origin: "Caracas",
    destination: "Valencia",
    departureTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Salió hace 30m
    totalSeats: 4,
    availableSeats: 2,
    pricePerSeat: 15,
    status: "in_route"
  },
  {
    id: "trip-route-maracay-caracas-2",
    driverId: "driver-rafael-7",
    driverName: "Rafael Castillo",
    driverPhone: "+584126789012",
    vehiclePlate: "AH789MN",
    vehicleModel: "Chery Arauca",
    origin: "Maracay",
    destination: "Caracas",
    departureTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // Salió hace 45m
    totalSeats: 4,
    availableSeats: 1,
    pricePerSeat: 12,
    status: "in_route"
  }
];

async function seed() {
  console.log("Seeding trips with scheduled & in_route statuses into live Firestore...");
  for (const trip of SEED_TRIPS) {
    const { id, ...data } = trip;
    await setDoc(doc(db, "trips", id), { ...data, id });
    console.log(`✓ Seeded [${trip.status}] trip: ${trip.origin} ➔ ${trip.destination} (${trip.vehicleModel}) - Quedan ${trip.availableSeats} puestos`);
  }
  console.log("All trips seeded successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seeding error:", err);
  process.exit(1);
});
