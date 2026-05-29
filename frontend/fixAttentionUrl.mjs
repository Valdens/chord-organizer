import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = { projectId: "valdens-chords-organizer", appId: "1:1012770259800:web:aaba2efd50ed73d81b5b2d", apiKey: "AIzaSyAOL6jpiEJT2-QX4_G50sSSIHtUzVXkZtk" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, 'songs'));
  const songs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  const attention = songs.find(s => s.title?.toLowerCase().includes('attention'));
  if (attention) {
    await updateDoc(doc(db, 'songs', attention.id), { 
        externalUrl: "https://tabs.ultimate-guitar.com/tab/charlie-puth/attention-chords-2101683",
        aiProcessing: true, 
        aiCleaned: false 
    });
    console.log("Updated Attention to UG URL and Queued.");
  }
  process.exit(0);
}
run();
