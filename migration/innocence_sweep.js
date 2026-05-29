const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function unjamChords(text) {
  if (!text) return "";
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

async function innocenceSweep() {
  const snapshot = await db.collection('songs').get();
  console.log(`Performing Innocence Sweep on ${snapshot.size} songs...`);
  
  let markedAsClean = 0;
  let skipped = 0;
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const s = doc.data();
    if (s.aiCleaned === true) continue;
    if (s.aiProcessing === true) continue; // Keep Saga for Gemini

    const txt = s.parsedChords || "";
    const clean = unjamChords(txt);
    
    // LOOSE RULES: If it's long and not jammed, it's "Done"
    const isGoodLength = clean.length > 500;
    const notJammed = clean.trim() === txt.trim(); 
    const noAds = !clean.toLowerCase().includes('ultimate-guitar');

    if (isGoodLength && notJammed && noAds) {
      batch.update(doc.ref, { 
        aiCleaned: true, 
        aiProcessing: false,
        innocenceValidated: true
      });
      count++;
      markedAsClean++;
    } else {
      skipped++;
    }

    if (count >= 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`--- INNOCENCE SWEEP COMPLETE ---`);
  console.log(`Instantly Validated (Assuming Good Enough): ${markedAsClean}`);
  console.log(`Still Needs AI Attention (Truly messy or short): ${skipped}`);
  process.exit(0);
}

innocenceSweep();
