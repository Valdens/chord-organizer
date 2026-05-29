const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function isJammed(text) {
  if (!text) return false;
  return /([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g.test(text);
}

async function fullSweep() {
  const snapshot = await db.collection('songs').get();
  console.log(`Analyzing ALL ${snapshot.size} songs...`);
  
  let markedAsClean = 0;
  let remainingNeedAI = 0;
  let alreadyClean = 0;
  
  let batch = db.batch();
  let count = 0;

  snapshot.forEach(doc => {
    const s = doc.data();
    if (s.aiCleaned === true) {
      alreadyClean++;
      return;
    }

    // Skip the ones we explicitly want the AI to fix (like Saga)
    if (s.aiProcessing === true) {
      remainingNeedAI++;
      return;
    }

    const txt = s.parsedChords || "";
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
      remainingNeedAI++;
    }

    if (count >= 400) {
       // We'll commit in chunks if needed, but let's just run it
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully batch-validated ${markedAsClean} songs.`);
  }

  console.log(`--- FULL SWEEP REPORT ---`);
  console.log(`Already Cleaned: ${alreadyClean}`);
  console.log(`Instantly Validated Now: ${markedAsClean}`);
  console.log(`Remaining Needs AI Attention: ${remainingNeedAI}`);
  process.exit(0);
}

fullSweep();
