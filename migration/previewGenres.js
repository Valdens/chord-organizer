const admin = require('firebase-admin');
admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();

const mapping = {
  'Rock': ['metal', 'punk', 'rock', 'blues', 'progressive rock', 'hard rock', 'glam', 'roll', 'soft rock', 'new wave'],
  'Pop': ['pop', 'disco', 'funk', 'synth-pop', 'synthpop', 'dance', 'ballad'],
  'Soundtrack': ['soundtrack', 'musical', 'anime', 'theatre', 'show tune', 'score', 'tv', 'animation'],
  'Disney': ['disney'],
  'Video Games': ['video games', 'video game'],
  'Folk & Indie': ['folk', 'indie'],
  'Standards & Jazz': ['standards', 'jazz', 'oldies', 'traditional', 'vocal', 'big band', 'standard', 'standard', 'doo-wop'],
  'Soul, R&B & Hip-Hop': ['soul', 'r&b', 'hip-hop', 'hip hop', 'rap'],
  'Country': ['country'],
  'Comedy & Novelty': ['comedy', 'novelty', 'parody'],
  'Children': ['children'],
  'Christmas & Holiday': ['christmas', 'holiday'],
  'Electronic': ['electronic', 'edm', 'house'],
  'Religious & Patriotic': ['praise', 'patriotic', 'church', 'christian'],
};

function standardize(genreStr) {
  if (!genreStr) return 'Misc / Unknown';
  const g = genreStr.toLowerCase().trim();
  
  // High priority specific matches
  if (g.includes('disney')) return 'Disney';
  if (g.includes('video game')) return 'Video Games';
  
  for (const [master, keywords] of Object.entries(mapping)) {
    for (const kw of keywords) {
      if (g.includes(kw)) return master;
    }
  }
  return 'Misc / Unknown';
}

async function preview() {
  const snapshot = await db.collection('songs').get();
  const counts = {};
  const sampleData = {};

  snapshot.forEach(doc => {
    const d = doc.data();
    const original = d.genre || 'Unknown';
    const standardized = standardize(original);
    
    if (!counts[standardized]) {
        counts[standardized] = { total: 0, from: new Set() };
    }
    counts[standardized].total++;
    counts[standardized].from.add(original);
  });

  console.log('| Master Category | Count | Original Genres Captured |');
  console.log('| --- | --- | --- |');
  for (const [master, stats] of Object.entries(counts).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`| **${master}** | ${stats.total} | ${Array.from(stats.from).slice(0, 10).join(', ')}${stats.from.size > 10 ? '...' : ''} |`);
  }
  process.exit(0);
}

preview();
