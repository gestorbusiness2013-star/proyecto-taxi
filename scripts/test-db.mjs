import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { bookSeats, validateBoardingPin, updateTripStatus, getLiveTrips } from '../lib/db.js';

console.log("Database helper functions ready for validation.");
