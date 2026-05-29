const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function unjamChords(text) {
  if (!text) return "";
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

async function turboSweep() {
  const snapshot = await db.collection('songs').get();
  console.log(`Turbo-Sweeping ${snapshot.size} songs...`);
  
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

    const raw = s.parsedChords || "";
    const clean = unjamChords(raw);
    
    // Check if it's now high quality
    const hasStructure = /\[(Intro|Verse|Chorus|Bridge|Solo|Outro|Pre-Chorus|Verse\s*\d|Chorus\s*\d)\]/i.test(clean);
    const noAds = !clean.toLowerCase().includes('ultimate-guitar') && !clean.toLowerCase().includes('advertisement');
    const isLongEnough = clean.length > 150;

    if (hasStructure && noAds && isLongEnough) {
      batch.update(doc.ref, { 
        parsedChords: clean,
        aiCleaned: true, 
        aiProcessing: false,
        turboSwept: true
      });
      count++;
      markedAsClean++;
    } else {
      remainingNeedAI++;
    }

    if (count >= 400) {
       await batch.commit();
       console.log(`Committed batch of ${count}...`);
       batch = db.batch();
       count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully turbo-validated ${markedAsClean} songs.`);
  }

  console.log(`--- TURBO SWEEP REPORT ---`);
  console.log(`Already Cleaned: ${alreadyClean}`);
  console.log(`Instantly Repaired & Validated: ${markedAsClean}`);
  console.log(`Remaining TRULY Messy (Needs AI): ${remainingNeedAI}`);
  process.exit(0);
}

turboSweep();
