import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = { projectId: "valdens-chords-organizer", appId: "1:1012770259800:web:aaba2efd50ed73d81b5b2d", apiKey: "AIzaSyAOL6jpiEJT2-QX4_G50sSSIHtUzVXkZtk" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, 'songs'));
  const songs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Requeue Attention
  const attention = songs.find(s => s.title?.toLowerCase().includes('attention'));
  if (attention) {
    await updateDoc(doc(db, 'songs', attention.id), { aiProcessing: true, aiCleaned: false });
    console.log("Re-queued Attention!");
  }
}
run();
