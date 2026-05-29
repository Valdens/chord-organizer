const { GoogleGenerativeAI } = require('@google/generative-ai');

function cleanTitle(title) {
  if (!title) return "";
  let cleaned = title.trim();
  cleaned = cleaned.replace(/\s+\d{4,9}$/, '');
  cleaned = cleaned.replace(/\s+Chords$/i, '').replace(/\s+Tabs$/i, '');
  return cleaned.trim();
}

function standardizeGenre(genreStr) {
  if (!genreStr) return 'Misc / Unknown';
  return genreStr.trim();
}

function unjamChords(text) {
  if (!text) return "";
  let cleaned = text.replace(/([a-z\]\)])([A-G][#b]?(m|maj|min|dim|aug|sus|add|[2-9])?)/g, "$1 $2");
  cleaned = cleaned.replace(/\]([A-G])/g, "]\n$1");
  return cleaned;
}

/**
 * Modular Standalone Scraping & AI Core Engine.
 * Decoupled from Express and Firestore database architectures.
 * 
 * @param {Object} params
 * @param {string} params.url - The original Ultimate Guitar or Google Doc link.
 * @param {string} params.scrapeDoToken - API Token for Scrape.do residential proxy.
 * @param {string} params.geminiApiKey - API Key for Google Gemini.
 * @param {string} params.appsScriptUrl - URL proxy for Google Doc reading.
 * @returns {Promise<Object>} Standardized metadata and clean aligned chords.
 */
async function scrapeAndCleanChords({ url, scrapeDoToken, geminiApiKey, appsScriptUrl, appsScriptSecret }) {
  if (!url) throw new Error("No URL provided.");
  if (!geminiApiKey) throw new Error("Missing Gemini API Key.");

  let rawContent = "";
  let html = "";

  // Strategy 1: Google Doc integration via Apps Script getDoc action
  if (url.includes("docs.google.com")) {
    console.log(`[CORE ENGINE] Google Doc detected: ${url}`);
    const docIdMatch = url.match(/[-\w]{25,}/);
    if (docIdMatch) {
      if (!appsScriptUrl) throw new Error("Missing Apps Script URL for Google Doc fetch.");
      console.log(`[CORE ENGINE] Fetching Google Doc text via Apps Script proxy: ${docIdMatch[0]}`);
      let proxyUrl = `${appsScriptUrl}?action=getDoc&id=${docIdMatch[0]}`;
      if (appsScriptSecret) {
        proxyUrl += `&secret=${appsScriptSecret}`;
      }
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Google Doc fetch failed! Status: ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        rawContent = result.data;
        console.log(`[CORE ENGINE] Google Doc text fetched successfully. Length: ${rawContent.length} characters.`);
      } else {
        throw new Error(result.error || "Failed to extract text from Google Doc.");
      }
    } else {
      throw new Error("Could not extract Google Doc ID from URL.");
    }
  } else {
    // Strategy 2: Fetch raw HTML via Scrape.do proxy (guarantees Cloudflare bypass using residential IPs)
    if (!scrapeDoToken) throw new Error("Missing Scrape.do token for Ultimate Guitar proxy fetch.");
    console.log(`[CORE ENGINE] Fetching raw HTML via Scrape.do: ${url}`);
    const proxyUrl = `https://api.scrape.do?token=${scrapeDoToken}&url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`Scrape.do HTTP error! Status: ${response.status}`);
    
    html = await response.text();
    if (!html || html.length < 500) throw new Error("Fetched HTML is too short or empty.");

    console.log(`[CORE ENGINE] Successfully fetched HTML. Length: ${html.length} characters.`);

    // Extract structured JSON data block from Ultimate Guitar page if present (Fast Path)
    const ugAppRegex = /window\.UGAPP\.store\.page\s*=\s*(\{.*?\});/i;
    const ugAppMatch = html.match(ugAppRegex);
    if (ugAppMatch && ugAppMatch[1]) {
      try {
        const data = JSON.parse(ugAppMatch[1]);
        rawContent = data?.data?.tab_view?.wiki_tab?.content || "";
        console.log("[CORE ENGINE] Strategy 2.1 (UG JSON Store) succeeded.");
      } catch (e) {
        console.warn("[CORE ENGINE] UG JSON Store parse failed:", e.message);
      }
    }

    if (!rawContent) {
      const universalRegex = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/;
      const matches = html.match(universalRegex);
      if (matches && matches[1] && matches[1].length > 500) {
         rawContent = matches[1].replace(/\\r\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
         console.log("[CORE ENGINE] Strategy 2.2 (Universal Content Matcher) succeeded.");
      }
    }
  }

  // Stage 2: Clean and format chords using Gemini Flash API (with robust model fallback)
  const MODELS = [
    'gemini-flash-latest',
    'gemini-2.0-flash-001',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash'
  ];

  let prompt = "";
  if (rawContent && rawContent.length > 50) {
    const unjammed = unjamChords(rawContent);
    prompt = `Task: Professional music engraver. Align chords over lyrics. If the text contains messy website garbage or ads, extract ONLY the song lyrics and chords. Return JSON {"cleanChords": "...", "title": "...", "artist": "...", "genre": "...", "tags": []}. TEXT: ${unjammed.substring(0, 12000)}`;
  } else {
    // Universal Fallback: If we couldn't isolate the chords block, pass the entire HTML page to Gemini Flash!
    console.log("[CORE ENGINE] Strategy 3 (Universal HTML Extraction) active.");
    prompt = `Task: You are a professional music scraper and engraver. You are provided with the raw HTML of a song chord page. Extract the song's chords and lyrics, align the chords correctly over the lyrics, and return a clean JSON object containing {"cleanChords": "...", "title": "...", "artist": "...", "genre": "...", "tags": []}. Here is the HTML: ${html.substring(0, 50000)}`;
  }

  let aiText = "";
  let success = false;
  let lastError = "";
  const genAI = new GoogleGenerativeAI(geminiApiKey);

  for (const modelName of MODELS) {
    try {
      console.log(`[CORE ENGINE] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      aiText = await result.response.text();
      success = true;
      console.log(`[CORE ENGINE] SUCCESS with model: ${modelName}`);
      break;
    } catch (e) {
      lastError = e.message;
      console.warn(`[CORE ENGINE] FAILED ${modelName}: ${e.message.substring(0, 80)}...`);
    }
  }

  if (!success) {
    throw new Error(`Gemini AI clean failed. Last error: ${lastError}`);
  }

  // Parse result and standardize outputs
  try {
    const cleanJson = JSON.parse(aiText.replace(/```json|```/g, "").trim());
    return {
      title: cleanTitle(cleanJson.title),
      artist: cleanJson.artist || "Unknown Artist",
      genre: standardizeGenre(cleanJson.genre),
      cleanChords: cleanJson.cleanChords,
      tags: Array.isArray(cleanJson.tags) ? cleanJson.tags : []
    };
  } catch (e) {
    console.error("[CORE ENGINE] AI Response was not valid JSON:", aiText);
    throw new Error("Failed to parse cleaned metadata JSON from AI response.");
  }
}

module.exports = {
  scrapeAndCleanChords,
  unjamChords,
  cleanTitle,
  standardizeGenre
};
