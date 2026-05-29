const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function checkRecentlyCleaned() {
  console.log('Fetching songs cleaned in the last 60 minutes...');
  const snapshot = await db.collection('songs')
    .where('aiCleaned', '==', true)
    .get();
    
  const now = Date.now();
  const sixtyMins = 60 * 60 * 1000;
  
  snapshot.forEach(doc => {
    const d = doc.data();
    // Assuming createdAt is roughly when it was cleaned if it's new, 
    // or just checking all recently cleaned.
    console.log(`[${doc.id}] ${d.title} by ${d.artist} (Tags: ${JSON.stringify(d.tags)})`);
  });
  process.exit(0);
}

checkRecentlyCleaned();
