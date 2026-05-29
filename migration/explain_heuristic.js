const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

function isJammed(text) {
  return /([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g.test(text);
}

async function explain() {
  const titles = ['Go Tell It On The Mountain', 'Vienna', "It's The Most Wonderful Time Of The Year"];
  const snapshot = await db.collection('songs').where('title', 'in', titles).get();
  
  snapshot.forEach(doc => {
    const s = doc.data();
    const txt = s.parsedChords || "";
    
    console.log(`--- EXPLAINING: ${s.title} ---`);
    console.log(`Length: ${txt.length} (Need > 200: ${txt.length > 200})`);
    console.log(`Has [Verse]: ${txt.includes('[Verse]')}`);
    console.log(`Has [Chorus]: ${txt.includes('[Chorus]')}`);
    console.log(`Has [Intro]: ${txt.includes('[Intro]')}`);
    const jammed = isJammed(txt);
    console.log(`Is Jammed: ${jammed} (Need false: ${!jammed})`);
    const hasAds = txt.toLowerCase().includes('ultimate-guitar') || txt.toLowerCase().includes('advertisement');
    console.log(`Has Ads: ${hasAds} (Need false: ${!hasAds})`);
  });
  process.exit(0);
}

explain();
