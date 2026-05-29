const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function sampleMessy() {
  const snapshot = await db.collection('songs').get();
  
  let count = 0;
  snapshot.forEach(doc => {
    const s = doc.data();
    if (s.aiCleaned === true) return;
    
    const txt = s.parsedChords || "";
    if (txt.length > 50 && count < 3) {
      // It's in the messy/unfiltered group
      console.log(`--- SAMPLE ${count+1}: ${s.title} ---`);
      console.log(txt.substring(0, 300));
      console.log('--- END ---');
      count++;
    }
  });
  process.exit(0);
}

sampleMessy();
