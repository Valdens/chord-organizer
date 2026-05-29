const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function manageSync() {
  console.log('--- FETCHING ORPHANS ---');
  // We check for songs that are not cleaned AND don't have enough content
  const snapshot = await db.collection('songs').get();
  
  const orphans = [];
  const toQueue = [];

  snapshot.forEach(doc => {
    const s = doc.data();
    const id = doc.id;
    const hasContent = s.parsedChords && s.parsedChords.length > 50;
    
    if (!hasContent) {
      orphans.push({ id, title: s.title, url: s.externalUrl });
    } else if (!s.aiCleaned) {
      toQueue.push(id);
    }
  });

  console.log(`\n--- ORPHAN REPORT (${orphans.length} Songs) ---`);
  orphans.forEach((s, i) => {
    console.log(`${i+1}. ${s.title} | URL: ${s.url}`);
  });

  console.log(`\n--- QUEUING ${toQueue.length} SONGS FOR AI CLEANUP ---`);
  
  const batchSize = 100;
  for (let i = 0; i < toQueue.length; i += batchSize) {
    const chunk = toQueue.slice(i, i + batchSize);
    const batch = db.batch();
    chunk.forEach(id => {
      batch.update(db.collection('songs').doc(id), { aiProcessing: true, aiError: null });
    });
    await batch.commit();
    console.log(`  -> Queued batch ${Math.floor(i/batchSize) + 1}...`);
  }

  console.log('SUCCESS. Restart worker.js now.');
  process.exit(0);
}

manageSync();
