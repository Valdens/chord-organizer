const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function rawDebug() {
  const title = 'Go Tell It On The Mountain';
  const snapshot = await db.collection('songs').where('title', '==', title).get();
  
  snapshot.forEach(doc => {
    const s = doc.data();
    console.log('--- RAW DEBUG ---');
    console.log('Title:', s.title);
    console.log('ParsedChords Type:', typeof s.parsedChords);
    console.log('Length:', s.parsedChords ? s.parsedChords.length : 'NULL');
    console.log('JSON Stringified Snippet:', JSON.stringify(s.parsedChords || "MISSING").substring(0, 100));
    
    const txt = s.parsedChords || "";
    const hasBrackets = /\[(Intro|Verse|Chorus|Bridge|Solo|Outro)\]/i.test(txt);
    console.log('Regex Match for [Chorus]:', hasBrackets);
  });
  process.exit(0);
}

rawDebug();
