const express = require('express');
const admin = require('firebase-admin');
const { scrapeAndCleanChords } = require('./scraper-core');

const app = express();
app.use(express.json());

// Enable CORS for all cross-origin browser requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize Firebase Admin dynamically using credentials stored in environment variables
const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (saJson) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(saJson)),
    projectId: 'valdens-chords-organizer'
  });
} else {
  admin.initializeApp({ projectId: 'valdens-chords-organizer' });
}

const db = admin.firestore();
const SCRAPE_DO_TOKEN = process.env.SCRAPE_DO_TOKEN || "";
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec";

app.post('/clean', async (req, res) => {
  // --- JWT Authentication Gate ---
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[AUTH] Rejected: No Bearer token provided.');
    return res.status(401).json({ success: false, error: 'Unauthorized: missing auth token.' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Query user doc to check approval status
    const userDocSnap = await db.collection('users').doc(decodedToken.uid).get();
    if (!userDocSnap.exists) {
      console.warn(`[AUTH] Rejected: User document not found for ${decodedToken.email}`);
      return res.status(403).json({ success: false, error: 'Forbidden: User account is not registered.' });
    }

    const userData = userDocSnap.data();
    if (userData.status !== 'approved' && userData.role !== 'admin') {
      console.warn(`[AUTH] Rejected: User ${decodedToken.email} is pending approval (Status: ${userData.status})`);
      return res.status(403).json({ success: false, error: 'Forbidden: Your account is pending administrator approval.' });
    }

    console.log(`[AUTH] Authenticated & approved request from: ${decodedToken.email}`);
  } catch (authErr) {
    console.warn(`[AUTH] Rejected: Invalid token - ${authErr.message}`);
    return res.status(401).json({ success: false, error: 'Unauthorized: invalid or expired auth token.' });
  }
  // --- End Auth Gate ---

  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: "Missing document ID." });

  console.log(`[CLOUD SCRAPER] Starting clean for document: ${id}`);
  const docRef = db.collection('songs').doc(id);

  try {
    const docSnap = await docRef.get();
    if (!docSnap.exists) throw new Error("Document not found.");

    const song = docSnap.data();
    if (!song.externalUrl) throw new Error("No externalUrl provided in song document.");

    // Invoke the decoupled core scraper engine passing our secured credentials
    const cleanResult = await scrapeAndCleanChords({
      url: song.externalUrl,
      scrapeDoToken: SCRAPE_DO_TOKEN,
      geminiApiKey: process.env.GEMINI_API_KEY,
      appsScriptUrl: APPS_SCRIPT_URL
    });

    // Save outputs back to Firestore
    await docRef.update({
      parsedChords: cleanResult.cleanChords,
      title: cleanResult.title || song.title,
      artist: cleanResult.artist || song.artist,
      genre: cleanResult.genre || song.genre,
      tags: cleanResult.tags || [],
      aiProcessing: false,
      aiCleaned: true,
      aiError: null
    });

    console.log(`[SUCCESS] Completed cleanup for: ${cleanResult.title}`);
    res.json({ success: true, title: cleanResult.title });

  } catch (err) {
    console.error(`[ERROR] Processing failed:`, err.message);
    try {
      await docRef.update({ aiProcessing: false, aiError: err.message });
    } catch (dbErr) {
      console.error(`[ERROR] Failed to update Firestore with error status:`, dbErr.message);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Scraper container listening on port ${PORT}`));
