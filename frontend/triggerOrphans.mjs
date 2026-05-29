import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "valdens-chords-organizer",
  appId: "1:1012770259800:web:aaba2efd50ed73d81b5b2d",
  apiKey: "AIzaSyAOL6jpiEJT2-QX4_G50sSSIHtUzVXkZtk"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, 'songs'));
  const songs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const unparsed = songs.filter(s => !s.aiCleaned && s.externalUrl);
  console.log(`Queuing ${unparsed.length} orphans for processing...`);
  for (const s of unparsed) {
    await updateDoc(doc(db, 'songs', s.id), { aiProcessing: true });
    console.log(`Queued: ${s.title}`);
  }
  process.exit(0);
}

run();
