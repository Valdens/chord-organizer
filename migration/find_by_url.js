const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function findByUrl() {
  const url = "https://tabs.ultimate-guitar.com/tab/the-avett-brothers/distraction-74-chords-425839";
  console.log(`Searching for URL: ${url}`);
  
  const snapshot = await db.collection('songs')
    .where('externalUrl', '==', url)
    .get();
    
  if (snapshot.empty) {
    console.log('No song found with that exact externalUrl.');
  } else {
    snapshot.forEach(doc => {
      console.log('--- FOUND ---');
      console.log('ID:', doc.id);
      console.log('Data:', JSON.stringify(doc.data(), null, 2));
    });
  }
  process.exit(0);
}

findByUrl();
