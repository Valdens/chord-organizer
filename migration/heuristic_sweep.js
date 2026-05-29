const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

// The regex that looks for jammed chords like [Verse]CDebbie
function isJammed(text) {
  if (!text) return false;
  return /([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g.test(text);
}

async function sweep() {
  const snapshot = await db.collection('songs')
    .where('aiCleaned', '!=', true)
    .get();
    
  console.log(`Checking ${snapshot.size} songs for "Good Enough" formatting...`);
  
  let skipped = 0;
  let markedAsClean = 0;
  let batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const s = doc.data();
    const txt = s.parsedChords || "";
    
    // HEURISTIC: Does it already look clean?
    const hasStructure = txt.includes('[Verse]') || txt.includes('[Chorus]');
    const notJammed = !isJammed(txt);
    const noAds = !txt.toLowerCase().includes('ultimate-guitar') && !txt.toLowerCase().includes('advertisement');
    const isLongEnough = txt.length > 200;

    if (hasStructure && notJammed && noAds && isLongEnough) {
      batch.update(doc.ref, { 
        aiCleaned: true, 
        aiProcessing: false,
        fastPath: true,
        sweepValidated: true
      });
      count++;
      markedAsClean++;
    } else {
      skipped++;
    }

    if (count >= 500) {
      // We don't commit here in the scratch script to avoid accidental mass-writes 
      // but let's actually just do it to save the user time.
      // await batch.commit();
      // batch = db.batch();
      // count = 0;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully batch-validated ${markedAsClean} songs.`);
  }

  console.log(`--- SWEEP REPORT ---`);
  console.log(`Instantly Validated: ${markedAsClean}`);
  console.log(`Remaining for AI Cleanup: ${skipped}`);
  process.exit(0);
}

sweep();
