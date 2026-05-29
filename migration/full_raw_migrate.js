const admin = require('firebase-admin');
const axios = require('axios');

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec";

admin.initializeApp({
  projectId: 'valdens-chords-organizer'
});

const db = admin.firestore();

async function cleanAndMigrate() {
  console.log('--- CLEANING AND RE-MIGRATING ---');

  try {
    // 1. Clear existing songs
    const snapshot = await db.collection('songs').get();
    console.log(`Deleting ${snapshot.size} old songs...`);
    const deleteBatch = db.batch();
    snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();

    // 2. Fetch fresh list from proxy
    console.log('Fetching fresh list from Apps Script proxy...');
    const listResponse = await axios.get(`${APPS_SCRIPT_URL}?action=listSongs`);
    if (!listResponse.data.success) throw new Error('Failed to fetch list');
    
    const allSongs = listResponse.data.data;
    console.log(`Found ${allSongs.length} songs. Committing to Firestore...`);

    const batchSize = 100;
    for (let i = 0; i < allSongs.length; i += batchSize) {
      const chunk = allSongs.slice(i, i + batchSize);
      const writeBatch = db.batch();

      for (const song of chunk) {
        // Corrected Mapping
        // Based on log: row[0] is URL, row[1] is Title
        const songData = {
          title: song.externalUrl || 'Unknown Title',
          artist: song.artist || 'Unknown Artist',
          genre: song.genre || 'Unknown Genre',
          tags: song.tags ? String(song.tags).split(',').map(t => t.trim()) : [],
          status: song.status || 'Unrecorded',
          banger: String(song.banger).toLowerCase() === 'yes' || song.banger === true,
          externalUrl: song.title || '',
          localDocUrl: song.localDocUrl || '',
          parsedChords: '', 
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = db.collection('songs').doc();
        writeBatch.set(docRef, songData);
      }
      await writeBatch.commit();
      console.log(`  -> Committed batch ${Math.floor(i/batchSize) + 1}`);
    }

    console.log('--- RE-MIGRATION COMPLETE ---');

  } catch (err) {
    console.error('Migration failed:', err);
  }
}

cleanAndMigrate();
