const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function checkRecent() {
  console.log('Fetching last 10 updated songs...');
  const snapshot = await db.collection('songs')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();
    
  snapshot.forEach(doc => {
    const d = doc.data();
    console.log(`[${doc.id}] ${d.title} by ${d.artist} (Genre: ${d.genre}, Cleaned: ${d.aiCleaned})`);
  });
  process.exit(0);
}

checkRecent();
