const admin = require('firebase-admin');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec";

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'valdens-chords-organizer'
});

const db = admin.firestore();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function smartMigrate() {
  console.log('--- STARTING SMART MIGRATION (TOP 50 BANGERS) ---');

  try {
    // 1. Fetch all songs from Apps Script
    console.log('Fetching song list from Apps Script...');
    const listResponse = await axios.get(`${APPS_SCRIPT_URL}?action=listSongs`);
    if (!listResponse.data.success) throw new Error('Failed to fetch list');
    
    const allSongs = listResponse.data.data;
    
    // 2. Filter for Bangers and take top 50
    const bangers = allSongs.filter(s => s.banger === 'Yes' || s.banger === 'true' || s.banger === true).slice(0, 50);
    console.log(`Found ${bangers.length} bangers to process.`);

    // 3. Clear existing songs to prevent duplicates during test
    console.log('Cleaning up existing songs collection...');
    const snapshot = await db.collection('songs').get();
    const deleteBatch = db.batch();
    snapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
    await deleteBatch.commit();

    // 4. Process each song with Re-scrape + Gemini Cleanup
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Helper for retry logic
    const callGeminiWithRetry = async (prompt, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          return response.text();
        } catch (e) {
          if ((e.message.includes('429') || e.message.includes('503')) && attempt < maxRetries) {
            const wait = Math.pow(2, attempt) * 10000; // 20s, 40s...
            console.warn(`  -> Gemini Busy/Quota (Attempt ${attempt}). Waiting ${wait/1000}s...`);
            await new Promise(r => setTimeout(r, wait));
            continue;
          }
          throw e;
        }
      }
    };

    for (let i = 0; i < bangers.length; i++) {
      const song = bangers[i];
      const songTitle = song.title || "Unknown Song";
      console.log(`[${i+1}/${bangers.length}] Processing: ${songTitle}`);

      try {
        let rawChords = "";
        
        // 1. Try Re-scrape first
        if (song.externalUrl && (song.externalUrl.includes('ultimate-guitar.com') || song.externalUrl.includes('e-chords.com'))) {
          console.log(`  -> Re-scraping: ${song.externalUrl}`);
          try {
            const scrapeResponse = await axios.post(APPS_SCRIPT_URL, JSON.stringify({ url: song.externalUrl }), {
              headers: { 'Content-Type': 'text/plain' },
              timeout: 20000
            });
            if (scrapeResponse.data.success) {
              rawChords = scrapeResponse.data.data.chords;
              console.log("  -> Scrape Success");
            } else {
              console.warn("  -> Scrape failed on server: " + scrapeResponse.data.error);
            }
          } catch (e) {
            console.warn("  -> Scrape request failed: " + e.message);
          }
        }

        // 2. Fallback to Google Doc
        if (!rawChords && song.localDocUrl) {
          console.log(`  -> Falling back to Google Doc: ${song.localDocUrl}`);
          const docIdMatch = song.localDocUrl.match(/[-\w]{25,}/);
          if (docIdMatch) {
            try {
              const docResponse = await axios.get(`${APPS_SCRIPT_URL}?action=getDoc&id=${docIdMatch[0]}`, { timeout: 20000 });
              if (docResponse.data.success && docResponse.data.data) {
                rawChords = docResponse.data.data;
                console.log("  -> Doc Read Success");
              } else {
                console.warn("  -> Doc read failed on server");
              }
            } catch (e) {
              console.warn("  -> Doc read request failed: " + e.message);
            }
          }
        }

        // 3. Process with Gemini if we have content
        if (rawChords && rawChords.length > 50) {
          console.log("  -> Gemini cleanup...");
          const prompt = `
            Clean and format this song's chords/lyrics for a mobile viewer.
            Song: ${songTitle} by ${song.artist}
            
            1. Keep chords aligned over lyrics.
            2. Remove all website UI, ads, and branding.
            3. Fix HTML artifacts.
            4. Return ONLY a JSON object: {"cleanChords": "...", "title": "...", "artist": "...", "genre": "...", "tags": []}

            TEXT:
            ${rawChords.substring(0, 3500)}
          `;

          const aiText = await callGeminiWithRetry(prompt);
          const aiJsonStr = aiText.replace(/```json|```/g, "").trim();
          
          let smartData;
          try {
            smartData = JSON.parse(aiJsonStr);
          } catch (e) {
            console.warn("  -> AI JSON parse failed, using raw AI text");
            smartData = { cleanChords: aiText };
          }

          await db.collection('songs').add({
            title: smartData.title || song.title || "Untitled",
            artist: smartData.artist || song.artist || "Unknown Artist",
            genre: smartData.genre || song.genre || "Unknown",
            tags: smartData.tags || [],
            externalUrl: song.externalUrl || "",
            localDocUrl: song.localDocUrl || "",
            parsedChords: smartData.cleanChords || rawChords,
            status: song.status || "Unrecorded",
            banger: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`  -> Saved: ${smartData.title || song.title}`);
        } else {
          console.log(`  -> Skipping ${songTitle}: No content found.`);
          // Save a placeholder so it at least exists in the library
          await db.collection('songs').add({
            title: song.title || "Unknown",
            artist: song.artist || "Unknown Artist",
            genre: song.genre || "Unknown",
            tags: [],
            externalUrl: song.externalUrl || "",
            localDocUrl: song.localDocUrl || "",
            parsedChords: "No content found during migration.",
            status: song.status || "Unrecorded",
            banger: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

      } catch (err) {
        console.error(`  !! Major error on ${songTitle}:`, err.message);
      }
      
      // Mandatory gap between songs to stay under free RPM
      await new Promise(r => setTimeout(r, 12000));
    }

    console.log('--- SMART MIGRATION COMPLETE ---');

  } catch (err) {
    console.error('Migration failed:', err);
  }
}

smartMigrate();
