export function standardizeGenre(genreStr) {
  if (!genreStr) return 'Misc / Unknown';
  const g = genreStr.toLowerCase().trim();
  const mapping = [
    { master: 'Disney', keywords: ['disney'] },
    { master: 'Video Games', keywords: ['video game', 'video games'] },
    { master: 'Folk & Indie', keywords: ['folk', 'indie'] },
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
  for (const map of mapping) {
    for (const kw of map.keywords) {
      if (g.includes(kw)) return map.master;
    }
  }
  return 'Misc / Unknown';
}

export function cleanTitle(title) {
  if (!title) return title;
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s+\d{4,9}$/, '');
  const contractions = {
    '\\bShes\\b': "She's", '\\bHes\\b': "He's", '\\bIm\\b': "I'm", '\\bTheres\\b': "There's",
    '\\bDont\\b': "Don't", '\\bCant\\b': "Can't", '\\bWont\\b': "Won't", '\\bIsnt\\b': "Isn't",
    '\\bArent\\b': "Aren't", '\\bYoure\\b': "You're", '\\bTheyre\\b': "They're", '\\bWeve\\b': "We've",
    '\\bIve\\b': "I've", '\\bYouve\\b': "You've", '\\bId\\b': "I'd", '\\bAint\\b': "Ain't"
  };
  for (const [pattern, replacement] of Object.entries(contractions)) {
      cleaned = cleaned.replace(new RegExp(pattern, 'ig'), (match) => {
          if (match[0] === match[0].toLowerCase()) return replacement.toLowerCase();
          return replacement;
      });
  }
  cleaned = cleaned.replace(/\s+Chords$/i, '').replace(/\s+Tabs$/i, '');
  cleaned = cleaned.replace(/\s+Acoustic$/i, ' (Acoustic)');
  return cleaned.trim();
}
