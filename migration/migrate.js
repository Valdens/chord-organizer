const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin with the new project
admin.initializeApp({
  projectId: 'valdens-chords-organizer'
});

const db = admin.firestore();

async function migrate() {
  const webAppUrl = 'https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec';
  const url = `${webAppUrl}?action=listSongs`;

  console.log('Fetching songs from Apps Script API...');

  try {
    const response = await axios.get(url);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch songs from API');
    }

    const songs = response.data.data;
    if (!songs || songs.length === 0) {
      console.log('No data found in spreadsheet.');
      return;
    }

    console.log(`Found ${songs.length} songs. Starting migration to Firestore...`);

    // Firestore batch writes are limited to 500 operations
    const chunks = [];
    for (let i = 0; i < songs.length; i += 500) {
      chunks.push(songs.slice(i, i + 500));
    }

    for (let i = 0; i < chunks.length; i++) {
      const batch = db.batch();
      const chunk = chunks[i];

      chunk.forEach(song => {
        const songData = {
          title: song.title || 'Unknown Title',
          externalUrl: song.externalUrl || '',
          artist: song.artist || 'Unknown Artist',
          genre: song.genre || 'Unknown Genre',
          tags: song.tags ? String(song.tags).split(',').map(t => t.trim()) : [],
          status: song.status || 'Unrecorded',
          banger: song.banger === 'Yes' || song.banger === 'true' || song.banger === true,
          localDocUrl: song.localDocUrl || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        const docRef = db.collection('songs').doc();
        batch.set(docRef, songData);
      });

      await batch.commit();
      console.log(`Committed batch ${i + 1}/${chunks.length} (${chunk.length} songs)`);
    }

    console.log(`SUCCESS! Migrated ${songs.length} songs to Firestore.`);

  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.response) {
        console.error('API Response:', error.response.data);
    }
  }
}

migrate();
