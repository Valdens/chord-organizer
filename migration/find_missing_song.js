const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function findDistraction() {
  const snapshot = await db.collection('songs')
    .where('title', '>=', 'Distraction')
    .limit(20)
    .get();
    
  if (snapshot.empty) {
    console.log('No games matching "Distraction" prefix found.');
    // Try broader search
    const all = await db.collection('songs').get();
    const matches = all.docs.filter(d => (d.data().title || '').toLowerCase().includes('distraction'));
    console.log('Broad search found:', matches.length, 'matches');
    matches.forEach(d => console.log('ID:', d.id, 'Data:', JSON.stringify(d.data(), null, 2)));
  } else {
    snapshot.forEach(doc => {
      console.log('ID:', doc.id, 'Data:', JSON.stringify(doc.data(), null, 2));
    });
  }
  process.exit(0);
}

findDistraction();
