const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function diagnoseNeeds() {
  const snapshot = await db.collection('songs').get();
  
  let empty = 0;
  let messy = 0;
  let jammedCount = 0;
  let noStructureCount = 0;

  function isJammed(text) {
    return /([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g.test(text);
  }

  snapshot.forEach(doc => {
    const s = doc.data();
    if (s.aiCleaned === true) return;
    
    const txt = s.parsedChords || "";
    if (txt.length < 50) {
      empty++;
    } else {
      messy++;
      if (isJammed(txt)) jammedCount++;
      if (!txt.includes('[Verse]') && !txt.includes('[Chorus]')) noStructureCount++;
    }
  });

  console.log(`--- DIAGNOSTIC REPORT ---`);
  console.log(`Songs with NO data yet (Needs Scraping): ${empty}`);
  console.log(`Songs with MESSY data (Needs AI): ${messy}`);
  console.log(`  -> Specifically Jammed Chords: ${jammedCount}`);
  console.log(`  -> Specifically Missing [Verse] markers: ${noStructureCount}`);
  process.exit(0);
}

diagnoseNeeds();
