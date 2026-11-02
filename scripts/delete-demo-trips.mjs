import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function cleanDemoData() {
  console.log("Cleaning demo trips from Firestore...");
  const tripsSnap = await getDocs(collection(db, 'trips'));
  let deletedCount = 0;
  for (const docSnap of tripsSnap.docs) {
    const data = docSnap.data();
    // Identificar viajes de demostración
    const isDemo = docSnap.id.startsWith('trip-') || 
                   data.driverId?.includes('demo') || 
                   data.driverId?.includes('alejandro') ||
                   data.driverName?.includes('Alejandro') ||
                   data.driverName?.includes('Marcos Rivas') ||
                   data.driverName?.includes('Guillermo');
    if (isDemo) {
      await deleteDoc(doc(db, 'trips', docSnap.id));
      console.log(`Deleted demo trip: ${docSnap.id} (${data.origin} -> ${data.destination})`);
      deletedCount++;
    }
  }
  console.log(`Total demo trips deleted: ${deletedCount}`);

  // Limpiar también reservas demo
  const bookingsSnap = await getDocs(collection(db, 'bookings'));
  let deletedBookings = 0;
  for (const bSnap of bookingsSnap.docs) {
    if (bSnap.id.includes('initial') || bSnap.id.includes('demo') || bSnap.id.includes('carlos')) {
      await deleteDoc(doc(db, 'bookings', bSnap.id));
      console.log(`Deleted demo booking: ${bSnap.id}`);
      deletedBookings++;
    }
  }
  console.log(`Total demo bookings deleted: ${deletedBookings}`);

  // Limpiar usuarios demo de la colección users
  const usersSnap = await getDocs(collection(db, 'users'));
  let deletedUsers = 0;
  for (const uSnap of usersSnap.docs) {
    if (uSnap.id.includes('demo') || uSnap.id.includes('alejandro') || uSnap.id.includes('passenger-carlos')) {
      await deleteDoc(doc(db, 'users', uSnap.id));
      console.log(`Deleted demo user: ${uSnap.id}`);
      deletedUsers++;
    }
  }
  console.log(`Total demo users deleted: ${deletedUsers}`);
}

cleanDemoData().then(() => {
  console.log("Cleanup completed successfully!");
  process.exit(0);
}).catch(err => {
  console.error("Cleanup error:", err);
  process.exit(1);
});
