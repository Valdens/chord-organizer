const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function findDistractionDeep() {
  console.log('Searching for ANY song containing "Distraction"...');
  const snapshot = await db.collection('songs').get();
  
  let found = false;
  snapshot.forEach(doc => {
    const data = doc.data();
    if ((data.title || '').toLowerCase().includes('distraction')) {
      console.log('--- FOUND MATCH ---');
      console.log('ID:', doc.id);
      console.log('Title:', data.title);
      console.log('Artist:', data.artist);
      console.log('Status:', data.status);
      console.log('Banger:', data.banger);
      console.log('Genre:', data.genre);
      console.log('aiCleaned:', data.aiCleaned);
      console.log('Full JSON:', JSON.stringify(data, null, 2));
      found = true;
    }
  });
  
  if (!found) console.log('No matches found for "Distraction" anywhere in songs collection.');
  process.exit(0);
}

findDistractionDeep();
