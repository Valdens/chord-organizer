const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function unjamChords(text) {
  if (!text) return "";
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

async function finalForceLiquidation() {
  const snapshot = await db.collection('songs').get();
  console.log(`Final Force Liquidation for ${snapshot.size} songs...`);
  
  let clearedCount = 0;
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const s = doc.data();
    if (doc.id === 'is4DLQ9fXCL2zPaPs1rV') {
      console.log('Skipping Saga Begins for AI processing...');
      continue; 
    }
    
    // If it's already cleaned, skip
    if (s.aiCleaned === true) continue;

    const raw = s.parsedChords || "";
    const clean = unjamChords(raw);
    
    batch.update(doc.ref, { 
      parsedChords: clean,
      aiCleaned: true, 
      aiProcessing: false,
      massLiquidated: true
    });
    count++;
    clearedCount++;

    if (count >= 450) {
      await batch.commit();
      console.log(`Committed chunk of ${count}...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`--- FINAL LIQUIDATION REPORT ---`);
  console.log(`Songs Instantly Formatted & Cleared: ${clearedCount}`);
  process.exit(0);
}

finalForceLiquidation();
