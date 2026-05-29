const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function masterCleanup() {
  console.log('--- MASTER CLEANUP & AUDIT STARTED ---');
  
  const snapshot = await db.collection('songs').get();
  const songs = [];
  snapshot.forEach(doc => songs.push({ id: doc.id, ...doc.data() }));

  console.log(`Total songs in library: ${songs.length}`);

  const batchSize = 500;
  let batch = db.batch();
  let count = 0;
  
  let stats = {
    fixed: 0,
    fullyClean: 0,
    rawButUsable: 0,
    orphans: 0
  };

  for (const song of songs) {
    let needsUpdate = false;
    const updates = {};

    // 1. Clear error states and stuck processing
    if (song.aiError || song.aiProcessing || song.workerBusy) {
      updates.aiError = null;
      updates.aiProcessing = false;
      updates.workerBusy = false;
      needsUpdate = true;
      stats.fixed++;
    }

    // 2. Audit Status
    if (song.aiCleaned && song.parsedChords) {
      stats.fullyClean++;
    } else if (song.parsedChords && song.parsedChords.length > 50) {
      stats.rawButUsable++;
    } else {
      stats.orphans++;
    }

    if (needsUpdate) {
      batch.update(db.collection('songs').doc(song.id), updates);
      count++;
    }

    if (count >= batchSize) {
      await batch.commit();
      batch = db.batch();
      count = 0;
      console.log(`  -> Committed cleanup for ${stats.fixed} songs...`);
    }
  }

  if (count > 0) await batch.commit();

  console.log('\n--- FINAL AUDIT REPORT ---');
  console.log(`✅ Fully AI Cleaned:  ${stats.fullyClean}`);
  console.log(`📝 Raw (Un-jammed):   ${stats.rawButUsable}`);
  console.log(`❓ Orphans (No Text): ${stats.orphans}`);
  console.log(`🧹 Errors Cleared:    ${stats.fixed}`);
  console.log('---------------------------\n');
  
  if (stats.orphans > 0) {
    console.log(`Next Step: We should focus on the ${stats.orphans} orphans.`);
  } else {
    console.log("Next Step: The library is fully populated! You can now use 'Sync' tomorrow to turn those Raw songs into Clean ones.");
  }
  
  process.exit(0);
}

masterCleanup();
