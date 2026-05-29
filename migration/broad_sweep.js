const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function isJammed(text) {
  if (!text) return false;
  return /([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g.test(text);
}

async function broadSweep() {
  const snapshot = await db.collection('songs').get();
  console.log(`Analyzing ALL ${snapshot.size} songs with Relaxed Rules...`);
  
  let markedAsClean = 0;
  let remainingNeedAI = 0;
  let alreadyClean = 0;
  
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const s = doc.data();
    if (s.aiCleaned === true) {
      alreadyClean++;
      continue;
    }

    if (s.aiProcessing === true) {
      remainingNeedAI++;
      continue;
    }

    const txt = s.parsedChords || "";
    
    // BROAD STRUCTURE CHECK
    const hasBrackets = /\[(Intro|Verse|Chorus|Bridge|Solo|Outro|Pre-Chorus|Verse\s*\d|Chorus\s*\d)\]/i.test(txt);
    const hasPlainHeaders = /\n(Verse|Chorus|Bridge|Chorus\s*\d|Verse\s*\d)\s*[:\n]/i.test(txt);
    
    const notJammed = !isJammed(txt);
    const noAds = !txt.toLowerCase().includes('ultimate-guitar') && !txt.toLowerCase().includes('advertisement');
    const isLongEnough = txt.length > 150;

    if ((hasBrackets || hasPlainHeaders) && notJammed && noAds && isLongEnough) {
      batch.update(doc.ref, { 
        aiCleaned: true, 
        aiProcessing: false,
        sweepValidated: true
      });
      count++;
      markedAsClean++;
    } else {
      remainingNeedAI++;
    }

    if (count >= 450) {
       await batch.commit();
       console.log(`Committed chunk of ${count}...`);
       batch = db.batch();
       count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully batch-validated ${markedAsClean} songs total.`);
  }

  console.log(`--- BROAD SWEEP REPORT ---`);
  console.log(`Already Cleaned: ${alreadyClean}`);
  console.log(`Instantly Validated Now: ${markedAsClean}`);
  console.log(`Remaining Needs AI Attention: ${remainingNeedAI}`);
  process.exit(0);
}

broadSweep();
