const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function resetAll() {
  console.log('--- RESETTING SONG STATUSES ---');
  
  const snapshot = await db.collection('songs').get();
  console.log(`Analyzing ${snapshot.size} songs...`);

  const batchSize = 500;
  let count = 0;
  let chunks = [];
  
  // Collect docs that need resetting
  const docsToReset = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.aiProcessing || data.aiError || !data.aiCleaned) {
      docsToReset.push(doc.ref);
    }
  });

  console.log(`Found ${docsToReset.size || docsToReset.length} songs needing a fresh start.`);

  for (let i = 0; i < docsToReset.length; i += batchSize) {
    const chunk = docsToReset.slice(i, i + batchSize);
    const batch = db.batch();
    
    chunk.forEach(ref => {
      batch.update(ref, {
        aiProcessing: true, // Mark them for the worker to pick up
        aiError: null,
        workerBusy: false
      });
    });

    await batch.commit();
    count += chunk.length;
    console.log(`  -> Reset and Queued ${count} songs...`);
  }

  console.log('--- ALL ORPHANS RESET AND QUEUED FOR WORKER ---');
  process.exit(0);
}

resetAll();
