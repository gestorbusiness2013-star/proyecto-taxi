import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

async function cancelDemoTrips() {
  console.log("Cancelling demo trips in Firestore so they no longer appear in the app...");
  const tripsSnap = await getDocs(collection(db, 'trips'));
  let count = 0;
  for (const docSnap of tripsSnap.docs) {
    const data = docSnap.data();
    const isDemo = docSnap.id.startsWith('trip-') || 
                   data.driverId?.includes('demo') || 
                   data.driverId?.includes('alejandro') ||
                   data.driverName?.includes('Alejandro') ||
                   data.driverName?.includes('Marcos') ||
                   data.driverName?.includes('Guillermo');
    if (isDemo && (data.status === 'scheduled' || data.status === 'in_route')) {
      try {
        const nextStatus = data.status === 'scheduled' ? 'cancelled' : 'completed';
        await updateDoc(doc(db, 'trips', docSnap.id), { status: nextStatus });
        console.log(`Cancelled demo trip: ${docSnap.id} (${data.origin} -> ${data.destination})`);
        count++;
      } catch (e) {
        console.warn(`Could not cancel ${docSnap.id}:`, e.message);
      }
    }
  }
  console.log(`Done! ${count} demo trips cleared from active listing.`);
}

cancelDemoTrips().then(() => process.exit(0)).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
