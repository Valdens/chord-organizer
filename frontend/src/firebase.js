import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAOL6jpiEJT2-QX4_G50sSSIHtUzVXkZtk",
  authDomain: "valdens-chords-organizer.firebaseapp.com",
  projectId: "valdens-chords-organizer",
  storageBucket: "valdens-chords-organizer.firebasestorage.app",
  messagingSenderId: "1012770259800",
  appId: "1:1012770259800:web:aaba2efd50ed73d81b5b2d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { app, db, auth, functions };
