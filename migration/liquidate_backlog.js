const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function unjamChords(text) {
  if (!text) return "";
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

async function liquidateBacklog() {
  const snapshot = await db.collection('songs').get();
  console.log(`Liquidating backlog for ${snapshot.size} songs...`);
  
  let clearedCount = 0;
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    const s = doc.data();
    if (s.aiCleaned === true) continue;
    if (s.aiProcessing === true) continue; // Keep Saga for Gemini

    const raw = s.parsedChords || "";
    if (raw.length < 50) continue; // Skip empty shells

    const clean = unjamChords(raw);
    
    batch.update(doc.ref, { 
      parsedChords: clean,
      aiCleaned: true, 
      aiProcessing: false,
      clearedBySweep: true
    });
    count++;
    clearedCount++;

    if (count >= 400) {
      await batch.commit();
      console.log(`Committed liquidation batch of ${count}...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`--- LIQUIDATION COMPLETE ---`);
  console.log(`Songs Instantly Cleared: ${clearedCount}`);
  process.exit(0);
}

liquidateBacklog();
