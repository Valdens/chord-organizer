const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function unjamChords(text) {
  if (!text) return "";
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

async function limboAudit() {
  const snapshot = await db.collection('songs').get();
  
  let count = 0;
  for (const doc of snapshot.docs) {
    const s = doc.data();
    if (s.aiCleaned === true) continue;
    if (s.aiProcessing === true) continue; 
    
    if (count < 10) {
      console.log(`--- AUDITING: ${s.title} ---`);
      console.log('ID:', doc.id);
      const raw = s.parsedChords || "";
      const clean = unjamChords(raw);
      
      const hasStructure = /\[(Intro|Verse|Chorus|Bridge|Solo|Outro)\]/i.test(clean);
      const noAds = !clean.toLowerCase().includes('ultimate-guitar') && !clean.toLowerCase().includes('advertisement');
      const isLongEnough = clean.length > 150;
      
      console.log(`hasStructure: ${hasStructure}`);
      console.log(`noAds: ${noAds}`);
      console.log(`isLongEnough: ${isLongEnough}`);
      console.log(`Summary: ${hasStructure && noAds && isLongEnough ? 'SHOULD PASS' : 'FAIL'}`);
      count++;
    }
  }
  process.exit(0);
}

limboAudit();
