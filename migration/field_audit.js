const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

async function fieldAudit() {
  const snapshot = await db.collection('songs').get();
  
  let aiProcessingTrue = 0;
  let aiCleanedTrue = 0;
  let bothFalse = 0;
  let missingBoth = 0;

  snapshot.forEach(doc => {
    const s = doc.data();
    if (s.aiProcessing === true) aiProcessingTrue++;
    if (s.aiCleaned === true) aiCleanedTrue++;
    if (s.aiProcessing !== true && s.aiCleaned !== true) {
      bothFalse++;
    }
  });

  console.log(`--- FIELD AUDIT ---`);
  console.log(`Total Songs: ${snapshot.size}`);
  console.log(`aiProcessing === true: ${aiProcessingTrue}`);
  console.log(`aiCleaned === true: ${aiCleanedTrue}`);
  console.log(`Neither is true: ${bothFalse}`);
  process.exit(0);
}

fieldAudit();
