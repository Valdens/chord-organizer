import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "valdens-chords-organizer",
  appId: "1:1012770259800:web:aaba2efd50ed73d81b5b2d",
  storageBucket: "valdens-chords-organizer.firebasestorage.app",
  apiKey: "AIzaSyAOL6jpiEJT2-QX4_G50sSSIHtUzVXkZtk",
  authDomain: "valdens-chords-organizer.firebaseapp.com",
  messagingSenderId: "1012770259800"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snapshot = await getDocs(collection(db, 'songs'));
  const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const unparsed = songs.filter(s => !s.parsedChords && s.externalUrl);
  console.log(`Found ${unparsed.length} orphans`);
  unparsed.forEach(s => {
    console.log(`- ${s.title || 'No Title'} (${s.externalUrl})`);
  });
  
  process.exit(0);
}

check();
