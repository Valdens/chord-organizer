const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

const mapping = [
  { master: 'Disney', keywords: ['disney'] },
  { master: 'Video Games', keywords: ['video game', 'video games'] },
  { master: 'Folk & Indie', keywords: ['folk', 'indie'] }, // Folk higher than Rock to catch Folk Rock
  { master: 'Rock', keywords: ['metal', 'punk', 'rock', 'blues', 'progressive', 'hard rock', 'glam', 'roll', 'soft rock', 'new wave'] },
  { master: 'Pop', keywords: ['pop', 'disco', 'funk', 'synth-pop', 'synthpop', 'dance', 'ballad'] },
  { master: 'Soundtrack', keywords: ['soundtrack', 'musical', 'anime', 'theatre', 'show tune', 'score', 'tv', 'animation'] },
  { master: 'Standards & Jazz', keywords: ['standards', 'jazz', 'oldies', 'traditional', 'vocal', 'big band', 'standard', 'doo-wop'] },
  { master: 'Soul, R&B & Hip-Hop', keywords: ['soul', 'r&b', 'hip-hop', 'hip hop', 'rap'] },
  { master: 'Country', keywords: ['country'] },
  { master: 'Comedy & Novelty', keywords: ['comedy', 'novelty', 'parody'] },
  { master: 'Children', keywords: ['children'] },
  { master: 'Christmas & Holiday', keywords: ['christmas', 'holiday'] },
  { master: 'Electronic', keywords: ['electronic', 'edm', 'house'] },
  { master: 'Religious & Patriotic', keywords: ['praise', 'patriotic', 'church', 'christian'] },
];

function standardize(genreStr) {
  if (!genreStr) return 'Misc / Unknown';
  const g = genreStr.toLowerCase().trim();
  
  for (const map of mapping) {
    for (const kw of map.keywords) {
      if (g.includes(kw)) return map.master;
    }
  }
  return 'Misc / Unknown';
}

async function migrate() {
  const snapshot = await db.collection('songs').get();
  console.log(`Starting migration for ${snapshot.size} songs...`);
  
  const batchLimit = 500;
  let batch = db.batch();
  let count = 0;
  let totalMigrated = 0;

  for (const doc of snapshot.docs) {
    const d = doc.data();
    const originalGenre = d.genre || 'Unknown';
    const newGenre = standardize(originalGenre);
    
    // Safety check: only update if it's different and not already cleaned
    // AND move original to tags if not present
    const currentTags = d.tags || [];
    let updatedTags = [...currentTags];
    if (originalGenre !== 'Unknown' && !updatedTags.includes(originalGenre)) {
        updatedTags.push(originalGenre);
    }

    if (newGenre !== originalGenre || JSON.stringify(updatedTags) !== JSON.stringify(currentTags)) {
        batch.update(doc.ref, {
            genre: newGenre,
            tags: updatedTags
        });
        count++;
        totalMigrated++;
    }

    if (count >= batchLimit) {
      await batch.commit();
      console.log(`Committed batch of ${count}...`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${count}...`);
  }

  console.log(`Total songs updated: ${totalMigrated}`);
  process.exit(0);
}

migrate();
