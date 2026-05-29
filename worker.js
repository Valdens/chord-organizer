const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// --- CONFIG ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec";

admin.initializeApp({ projectId: 'valdens-chords-organizer' });
const db = admin.firestore();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Use the exact strings from our 'listModels' test
const MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash-001',
  'gemini-2.5-flash-lite'
];

console.log('--- BIG BOY WORKER V12 (REGEX UN-JAMMER) STARTED ---');

let isProcessing = false;
let queue = [];

/**
 * HEURISTIC UN-JAMMER
 * Fixes "[Verse]CDebbie" -> "[Verse]\nC\nDebbie"
 * This runs BEFORE Gemini, so "Raw Mode" is actually usable.
 */
function unjamChords(text) {
  if (!text) return "";
  // Look for chords (A-G) jammed at the start of words or mid-sentence
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  // Fix specifically jammed Verse/Chorus markers
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

function standardizeGenre(genreStr) {
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

function cleanTitle(title) {
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

async function loadInitialQueue() {
  // Limit initial load to 50 songs to save quota and stay focused
  const snapshot = await db.collection('songs')
    .where('aiProcessing', '==', true)
    .limit(50)
    .get();
  snapshot.forEach(doc => { if (!queue.includes(doc.id)) queue.push(doc.id); });
  console.log(`Initial Queue: ${queue.length} songs (Limited to 50).`);
  processQueue();
}

let isInitialLoad = true;
db.collection('songs')
  .where('aiProcessing', '==', true)
  .limit(20) // Only listen to top 20 priority items to save quota
  .onSnapshot(snapshot => {
  if (isInitialLoad) {
    isInitialLoad = false;
    return; // Skip initial dump, loadInitialQueue handles this
  }
  snapshot.docChanges().forEach(change => {
    if (change.type === 'added' || change.type === 'modified') {
      const id = change.doc.id;
      // Strip it from current position if it exists
      if (queue.includes(id)) {
         queue = queue.filter(item => item !== id);
      }
      // Inject to the very front of the Array
      console.log(`[PRIORITY LIVE UPDATE] Pushing ${id} to front of worker queue!`);
      queue.unshift(id);
      processQueue();
    }
  });
}, err => {
  console.error("SNAPSHOT ERROR:", err.message);
});

async function localScrape(url) {
  let browser;
  try {
    console.log(`  -> Stealth Scrape: ${url}`);
    browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 3000));
    const content = await page.content();
    let rawContent = "";
    
    const ugAppRegex = /window\.UGAPP\.store\.page\s*=\s*(\{.*?\});/i;
    const ugAppMatch = content.match(ugAppRegex);
    if (ugAppMatch && ugAppMatch[1]) {
      try {
        const data = JSON.parse(ugAppMatch[1]);
        rawContent = data?.data?.tab_view?.wiki_tab?.content || "";
      } catch (e) {}
    }
    if (!rawContent) {
      const universalRegex = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/;
      const matches = content.match(universalRegex);
      if (matches && matches[1] && matches[1].length > 500) {
         rawContent = matches[1].replace(/\\r\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      }
    }
    if (!rawContent) {
      rawContent = await page.evaluate(() => {
        let longest = "";
        document.querySelectorAll('pre, .js-tab-content').forEach(el => {
          if (el.innerText.length > longest.length) longest = el.innerText;
        });
        if (longest.length > 50) return longest;
        
        return document.body ? document.body.innerText : "";
      });
    }
    await browser.close();
    return rawContent.trim();
  } catch (err) {
    if (browser) await browser.close();
    throw err;
  }
}

async function processSong(songId) {
  const docRef = db.collection('songs').doc(songId);
  const docSnap = await docRef.get();
  if (!docSnap.exists || !docSnap.data().aiProcessing) return;

  const song = docSnap.data();
  console.log(`\n[WORKER] Processing: ${song.title}`);

  try {
    let rawChords = "";
    if (song.externalUrl && !song.externalUrl.includes('google.com/document')) {
      try { rawChords = await localScrape(song.externalUrl); } catch (e) { console.warn("  -> Scrape failed:", e.message); }
    }
    if (!rawChords && song.localDocUrl) {
      console.log(`  -> Google Doc Fallback...`);
      const docIdMatch = song.localDocUrl.match(/[-\w]{25,}/);
      if (docIdMatch) {
        try {
          const res = await axios.get(`${APPS_SCRIPT_URL}?action=getDoc&id=${docIdMatch[0]}`, { timeout: 30000 });
          if (res.data.success) rawChords = res.data.data;
        } catch (e) {}
      }
    }
    
    let prompt = "";
    let unjammed = "";
    if (!rawChords || rawChords.length < 50) {
      console.warn("  !! Scrape yielded no content. Throwing error to prevent hallucination.");
      throw new Error("Local scrape failed completely.");
    } else {
      unjammed = unjamChords(rawChords);
      
      // --- HEURISTIC FAST-PATH ---
      // If it has markers, it's already un-jammed, and it's long enough, it's likely "Good Enough"
      const alreadyStructured = unjammed.includes('[Verse]') || unjammed.includes('[Chorus]');
      const noChangesNeeded = unjammed.trim() === rawChords.trim();
      const hasGarbage = unjammed.toLowerCase().includes('ultimate-guitar') || unjammed.toLowerCase().includes('advertisement');
      
      // Only skip AI if we already have valid title, artist, and genre (so we don't end up with raw URL titles or Unknown Artist)
      const hasValidMetadata = song.artist && 
                               song.artist !== "Unknown Artist" && 
                               song.genre && 
                               song.genre !== "Misc / Unknown" && 
                               song.genre !== "Unknown Genre" && 
                               song.title && 
                               !song.title.toLowerCase().includes("chords") &&
                               !song.title.toLowerCase().includes("-");

      if (alreadyStructured && noChangesNeeded && !hasGarbage && hasValidMetadata && !process.env.FORCE_AI) {
        console.log("  -> [FAST PATH] Song already structured with valid metadata. Skipping AI.");
        await docRef.update({
          parsedChords: unjammed,
          title: cleanTitle(song.title),
          genre: standardizeGenre(song.genre),
          aiProcessing: false,
          aiCleaned: true,
          aiError: null,
          fastPath: true
        });
        return;
      }

      console.log("  -> AI Cleanup (Stage 2)...");
      prompt = `Task: Professional music engraver. Align chords over lyrics. If the text contains messy website garbage or ads, extract ONLY the song lyrics and chords. Return JSON {"cleanChords": "...", "title": "...", "artist": "...", "genre": "...", "tags": []}. TEXT: ${unjammed.substring(0, 12000)}`;
    }
    
    let aiText = "";
    let success = false;
    let lastError = "";

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        aiText = await result.response.text();
        success = true;
        console.log(`     - SUCCESS with ${modelName}`);
        break;
      } catch (e) {
        lastError = e.message;
        if (e.message.includes('429') || e.message.includes('503')) {
           console.warn(`     - Model Busy (${modelName})...`);
           continue; 
        }
        console.warn(`     - FAILED ${modelName}: ${e.message.substring(0, 50)}...`);
      }
    }

    if (!success) {
      // If AI fails, we still save the UN-JAMMED text so the user can at least use the app!
      console.warn(`  !! AI FAILED. Saving un-jammed raw text as fallback.`);
      await docRef.update({
        parsedChords: unjammed,
        aiProcessing: false,
        aiError: "Quota exceeded. Saved un-jammed version. Try AI Clean again tomorrow!"
      });
      return;
    }

    let smartData;
    try {
      const jsonStr = aiText.replace(/```json|```/g, "").trim();
      smartData = JSON.parse(jsonStr);
    } catch (e) { smartData = { cleanChords: aiText }; }

    const originalTitle = song.title || "";
    const cleanAiTitle = cleanTitle(smartData.title || song.title);
    
    const updatedTags = (song.tags || []);
    // Preserve original title in tags if we're renaming it
    if (originalTitle && cleanAiTitle !== originalTitle && !updatedTags.includes(originalTitle)) {
        updatedTags.push(originalTitle);
    }
    // Preserve original genre in tags
    const originalGenre = smartData.genre || song.genre;
    if (originalGenre && !updatedTags.includes(originalGenre)) {
        updatedTags.push(originalGenre);
    }

    const masterGenre = standardizeGenre(originalGenre);

    await docRef.update({
      parsedChords: smartData.cleanChords || unjammed,
      title: cleanAiTitle,
      artist: smartData.artist || song.artist,
      genre: masterGenre,
      tags: updatedTags,
      aiProcessing: false,
      aiCleaned: true,
      aiError: null
    });
    console.log(`  -> DONE: ${song.title}`);

  } catch (err) {
    console.error(`  !! ERROR:`, err.message);
    await docRef.update({ aiProcessing: false, aiError: err.message });
  }
}

async function processQueue() {
  if (isProcessing) return;
  if (queue.length === 0) {
    // console.log('--- Queue Empty ---');
    return;
  }
  isProcessing = true;
  const songId = queue.shift();
  console.log(`[QUEUE] Processing next: ${songId} (Remaining: ${queue.length})`);
  await processSong(songId);
  console.log('--- COOLDOWN (45s) ---');
  await new Promise(r => setTimeout(r, 45000));
  isProcessing = false;
  processQueue();
}

loadInitialQueue();
