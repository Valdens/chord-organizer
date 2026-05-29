const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function checkSong() {
  const id = 'is4DLQ9fXCL2zPaPs1rV';
  const doc = await db.collection('songs').doc(id).get();
  if (!doc.exists) {
    console.log('Song not found');
    process.exit(1);
  }
  const data = doc.data();
  console.log('--- SONG DATA ---');
  console.log('Title:', data.title);
  console.log('URL:', data.externalUrl);
  console.log('Parsed Length:', data.parsedChords ? data.parsedChords.length : 0);
  console.log('\n--- PARSED CHORDS (LAST 200 CHARS) ---');
  console.log(data.parsedChords ? data.parsedChords.slice(-200) : 'None');
  process.exit(0);
}

checkSong();
