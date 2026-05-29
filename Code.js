/**
 * Reads the text content of a Google Doc.
 */
function getDocContent(idOrUrl) {
  try {
    const idMatch = idOrUrl.match(/[-\w]{25,}/);
    if (!idMatch) return "";
    const doc = DocumentApp.openById(idMatch[0]);
    return doc.getBody().getText();
  } catch (e) {
    console.error("Failed to read doc: " + e.message);
    return "";
  }
}

/**
 * WEB APP API ENTRY POINT
 */
function doGet(e) {
  const action = e.parameter.action;

  if (action === "listSongs") {
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: listSongs()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "getDoc") {
    const id = e.parameter.id;
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: getDocContent(id)
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === "debugHtml") {
    const url = e.parameter.url;
    const ua = e.parameter.ua || "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const html = UrlFetchApp.fetch(url, {
      'muteHttpExceptions': true,
      'headers': {
        'User-Agent': ua
      }
    }).getContentText();
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.TEXT);
  }

  if (action === "scrapeChords") {
    const url = e.parameter.url;
    try {
      const chords = scrapeChords(url);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: chords
      })).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: err.message
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  return ContentService.createTextOutput("Valdens Chord Organizer API Active. Params: " + JSON.stringify(e.parameter)).setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Allows the new Firebase app to use Apps Script as a proxy to bypass UG blocks and classify songs with Gemini.
 */
function doPost(e) {
  const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY') || "";

  try {
    const params = JSON.parse(e.postData.contents);
    const url = params.url;
    const textToClean = params.text;

    let rawChords = textToClean || "";

    // 1. Scrape if URL is provided and we don't have text yet
    if (url && !rawChords) {
      try {
        rawChords = scrapeChords(url);
      } catch (scrapeErr) {
        console.warn("Scrape failed, checking for local doc fallback...");
        // Fallback: If we can find the song in the spreadsheet to get its Doc ID
        // Or if the URL itself is a Google Doc
        if (url.includes("docs.google.com")) {
          rawChords = getDocContent(url);
        } else {
          // We might not have the doc URL here easily without a lookup
          // But let's assume if it fails, we throw and let the frontend handle the next step
          throw scrapeErr;
        }
      }
    }

    if (!rawChords) {
      const htmlSnippet = scrapeChords(url, true); // I'll modify scrapeChords to take a 'debug' flag
      throw new Error("Could not find chord content. HTML Snippet: " + htmlSnippet.substring(0, 1000));
    }

    // 2. Use Gemini to extract metadata & CLEAN
    const smartData = extractAndClean(rawChords, GEMINI_API_KEY);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: {
        chords: smartData.cleanChords,
        title: smartData.title,
        artist: smartData.artist,
        genre: smartData.genre,
        tags: smartData.tags
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Uses Gemini API to extract song metadata and CLEAN/ALIGN chords.
 * Includes retry logic for 503/429 errors.
 */
function extractAndClean(text, apiKey) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=" + apiKey;

  console.log("Starting extractAndClean with Gemini 1.5 Flash (Latest). Text length: " + text.length);

  const prompt = `
    Task: Act as a professional music engraver. Clean and format the following song chords/lyrics for a mobile view.
    
    Instructions:
    1. Keep chords aligned EXACTLY over the lyrics.
    2. Use ONLY spaces for alignment (no tabs).
    3. Remove all website UI, ads, branding, and redundant text.
    4. Fix weird character artifacts.
    5. Return ONLY a valid JSON object with these keys: 
       "cleanChords" (string), "title" (string), "artist" (string), "genre" (string), "tags" (array).

    TEXT:
    ` + text.substring(0, 3500);

  const payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  let response;
  let result;
  let success = false;
  let retries = 0;
  let lastError = "";

  while (!success && retries < 5) {
    try {
      response = UrlFetchApp.fetch(url, options);
      const code = response.getResponseCode();
      const body = response.getContentText();

      if (code === 200) {
        result = JSON.parse(body);
        success = true;
      } else if (code === 503 || code === 429) {
        retries++;
        lastError = "Gemini busy/quota (Code " + code + "): " + body;
        console.warn(lastError + ". Retry " + retries + "...");
        Utilities.sleep(Math.pow(2, retries) * 3000); // 6s, 12s, 24s...
      } else {
        throw new Error("Gemini API Error (" + code + "): " + body);
      }
    } catch (e) {
      lastError = e.message;
      retries++;
      Utilities.sleep(2000);
    }
  }

  if (!success) throw new Error("Gemini API failed after " + retries + " retries. Last error: " + lastError);

  const aiText = result.candidates[0].content.parts[0].text;
  let jsonStr = aiText.replace(/\\\`json|\\\`/g, "").trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.warn("AI returned non-JSON text. Attempting recovery...");
    return {
      cleanChords: aiText,
      title: "Extracted Song",
      artist: "Unknown",
      genre: "Misc",
      tags: []
    };
  }
}

/**
 * Returns all songs from the 'Recorded' sheet for migration.
 */
function listSongs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetName);
  const data = sheet.getDataRange().getValues();

  const songs = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    songs.push({
      externalUrl: row[0],
      title: row[1],
      artist: row[2],
      genre: row[3],
      tags: row[4],
      status: row[5],
      banger: row[6],
      localDocUrl: row[7]
    });
  }
  return songs;
}

/**
 * CONFIGURATION
 * Adjust these values to match your specific Google Sheet structure.
 */
const CONFIG = {
  sheetName: "Recorded",           // The name of the tab in your sheet
  urlColumnName: "External URL",   // The header name for the external link (Ultimate Guitar)
  localLinkColumn: "Local Doc",  // The header name where we will save the new Google Doc link
  statusColumn: "Import Status", // The header name for tracking success/failure
  targetFolderId: "1GZQhlS3uWYAWMa4K3tUSYz5fJkGdErbw" // ID of the Drive folder to store docs
};

/**
 * MAIN FUNCTION
 * Run this to process the backlog and new entries.
 */
function processChordQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Map headers to column indices
  const urlCol = headers.indexOf(CONFIG.urlColumnName);
  const localCol = headers.indexOf(CONFIG.localLinkColumn);
  const statusCol = headers.indexOf(CONFIG.statusColumn);

  if (urlCol === -1 || localCol === -1) {
    SpreadsheetApp.getUi().alert("Could not find required columns. Check CONFIG names.");
    return;
  }

  // Iterate through rows (skipping header)
  // We use a counter to stop after 5 minutes to avoid Google Timeouts
  const startTime = new Date().getTime();

  for (let i = 1; i < data.length; i++) {
    // Check if we are approaching the 6-minute execution limit
    if (new Date().getTime() - startTime > 300000) {
      console.log("Time limit approaching. Stopping execution.");
      break;
    }

    const row = data[i];
    let sourceUrl = row[urlCol];
    const currentLocalLink = row[localCol];
    const currentStatus = statusCol > -1 ? row[statusCol] : "";

    // CONDITIONS TO RUN:
    // 1. We have a source URL
    // 2. We do NOT have a local link yet
    // 3. We haven't tried and failed (optional, depends on preference)
    if (sourceUrl && !currentLocalLink && currentStatus !== "Error") {

      try {
        console.log(`Processing Row ${i + 1}: ${sourceUrl}`);

        // SPECIAL HANDLER: GOOGLE DOCS
        if (sourceUrl.includes("docs.google.com")) {
          const docUrl = copyExistingGoogleDoc(row[0] || "Unknown Song", sourceUrl);
          sheet.getRange(i + 1, localCol + 1).setValue(docUrl);
          if (statusCol > -1) sheet.getRange(i + 1, statusCol + 1).setValue("Success (Copied)");
          continue;
        }

        // SPECIAL HANDLER: ULTIMATE GUITAR PRINT REDIRECT
        // Transform print URLs into ID-based URLs to access the main JSON data
        if (sourceUrl.includes("ultimate-guitar.com") && sourceUrl.includes("/print")) {
          const idMatch = sourceUrl.match(/id=(\d+)/);
          if (idMatch && idMatch[1]) {
            // Construct canonical URL which redirects to the main page
            sourceUrl = `https://tabs.ultimate-guitar.com/tab/${idMatch[1]}`;
            console.log(`   -> Converted Print URL to: ${sourceUrl}`);
          }
        } else if (sourceUrl.includes("ultimate-guitar.com")) {
          // Clean standard URLs
          sourceUrl = sourceUrl.split('?')[0];
        }

        // SPECIAL HANDLER: E-CHORDS MOBILE CLEANUP
        if (sourceUrl.includes("m.e-chords.com")) {
          sourceUrl = sourceUrl.replace("m.e-chords.com", "www.e-chords.com");
        }

        // 1. Fetch the content
        const chordData = scrapeChords(sourceUrl);

        // Check for empty data before creating doc
        if (!chordData || chordData.trim().length < 50) {
          throw new Error("Scraped content was empty or too short");
        }

        // 2. Create the Google Doc
        const songTitle = row[0] || "Unknown Song";
        const docUrl = createGoogleDoc(songTitle, chordData, sourceUrl);

        // 3. Update the Sheet
        sheet.getRange(i + 1, localCol + 1).setValue(docUrl);
        if (statusCol > -1) sheet.getRange(i + 1, statusCol + 1).setValue("Success");

        // Sleep briefly to be nice to the API
        Utilities.sleep(1000);

      } catch (e) {
        console.error(`Error on row ${i + 1}: ${e.message}`);
        if (statusCol > -1) sheet.getRange(i + 1, statusCol + 1).setValue("Error: " + e.message);
      }
    }
  }
}

/**
 * SCRAPER ENGINE V5
 * Includes "Tag Balancer" for nested container extraction.
 */
function scrapeChords(url, returnRawHtmlIfFailed) {
  try {
    const params = {
      'muteHttpExceptions': true,
      'headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    const html = UrlFetchApp.fetch(url, params).getContentText();
    console.log("Fetched HTML. Length: " + html.length);
    let rawContent = "";

    // --- STRATEGY 1: ULTIMATE GUITAR "JS-STORE" ---
    // Note: Sometimes the data-content is escaped differently or the class name changes slightly
    const jsonMatch = html.match(/class="js-store"\s+data-content="([^"]+)"/) ||
      html.match(/data-content="([^"]+)"/);

    if (jsonMatch && jsonMatch[1]) {
      try {
        console.log("Found JS-STORE match. Attempting decode...");
        const decodedJson = decodeHtmlEntities(jsonMatch[1]);
        const data = JSON.parse(decodedJson);
        if (data?.store?.page?.data?.tab_view?.wiki_tab?.content) {
          rawContent = data.store.page.data.tab_view.wiki_tab.content;
          console.log("Success with Strategy 1");
        }
      } catch (e) { console.warn("UG JSON parse failed: " + e.message); }
    }

    // --- STRATEGY 2: ULTIMATE GUITAR "BACKING STORE" ---
    if (!rawContent && url.includes("ultimate-guitar.com")) {
      console.log("Attempting Strategy 2 (Wiki Tab Regex)...");
      const ugRegex = /"wiki_tab"\s*:\s*\{\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"/;
      const ugMatch = html.match(ugRegex);
      if (ugMatch && ugMatch[1]) {
        let clean = ugMatch[1].replace(/\\r\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        rawContent = clean;
        console.log("Success with Strategy 2");
      }
    }

    // --- STRATEGY 2.7: UGAPP STORE SEARCH ---
    if (!rawContent && url.includes("ultimate-guitar.com")) {
      console.log("Attempting Strategy 2.7 (UGAPP Store Search)...");
      const ugAppRegex = /window\.UGAPP\.store\.page\s*=\s*(\{.*?\});/i;
      const ugAppMatch = html.match(ugAppRegex);
      if (ugAppMatch && ugAppMatch[1]) {
        try {
          const data = JSON.parse(ugAppMatch[1]);
          if (data?.data?.tab_view?.wiki_tab?.content) {
            rawContent = data.data.tab_view.wiki_tab.content;
            console.log("Success with Strategy 2.7");
          }
        } catch (e) { console.warn("UGAPP JSON parse failed"); }
      }
    }

    // --- STRATEGY 2.8: UNIVERSAL JSON SEARCH ---
    if (!rawContent && url.includes("ultimate-guitar.com")) {
      console.log("Attempting Strategy 2.8 (Universal JSON Search)...");
      // This regex looks for any large quoted string following "content":
      const universalRegex = /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/;
      const matches = html.match(universalRegex);
      if (matches && matches[1] && matches[1].length > 500) {
        rawContent = matches[1].replace(/\\r\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        console.log("Success with Strategy 2.8");
      }
    }

    // --- STRATEGY 3: COMMON CONTAINER SEARCH ---
    if (!rawContent) {
      console.log("Attempting Strategy 3 (Common Containers)...");
      // Use regex to find the most likely container content
      const containerRegex = /<(?:div|pre)[^>]*(?:class|id)="(?:js-tab-content|tab-content|chord-content|song-body)"[^>]*>([\s\S]*?)<\/\1>/i;
      const containerMatch = html.match(containerRegex);
      if (containerMatch && containerMatch[1]) {
        rawContent = containerMatch[1];
        console.log("Success with Strategy 3");
      }
    }

    // --- STRATEGY 3: "BEST FIT" PRE TAGS ---
    if (!rawContent) {
      const preRegex = /<pre[^>]*>([\s\S]*?)<\/pre>/gi;
      let match;
      let longestPre = "";
      while ((match = preRegex.exec(html)) !== null) {
        if (match[1].length > longestPre.length) longestPre = match[1];
      }
      if (longestPre.length > 50) rawContent = stripHtml(longestPre);
    }

    // --- STRATEGY 4: ROBUST CONTAINER SEARCH (Div Counter) ---
    if (!rawContent) {
      // List of identifiers
      const markers = [
        'id="core"', 'class="core"', 'class="tab-content"', 'class="song-body"',
        'id="song_content"', 'class="song-holder"', 'class="mw-parser-output"',
        'class="print-body"', 'class="js-tab-content"', 'class="content"', 'class="entry-content"'
      ];

      for (let marker of markers) {
        let startIndex = html.indexOf(marker);
        if (startIndex !== -1) {
          // Find the actual opening '>' of this div
          let tagOpenEnd = html.indexOf('>', startIndex);
          if (tagOpenEnd !== -1) {
            // Start counting tags from here to handle nested divs
            let contentStart = tagOpenEnd + 1;
            let currentIdx = contentStart;
            let depth = 1;

            // Loop until we balance the tags or hit end of string
            while (depth > 0 && currentIdx < html.length) {
              let nextDivStart = html.indexOf('<div', currentIdx);
              let nextDivEnd = html.indexOf('</div>', currentIdx);

              if (nextDivEnd === -1) break; // Malformed HTML

              // Determine which comes first: a nested open or a close
              if (nextDivStart !== -1 && nextDivStart < nextDivEnd) {
                depth++;
                currentIdx = nextDivStart + 4;
              } else {
                depth--;
                currentIdx = nextDivEnd + 6;
              }
            }

            if (depth === 0) {
              // We found the matching closing tag
              let dirtyContent = html.substring(contentStart, currentIdx - 6); // Exclude final </div>
              dirtyContent = dirtyContent.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n");
              rawContent = stripHtml(dirtyContent);
              if (rawContent.length > 50) break; // We found good content
            }
          }
        }
      }
    }

    if (!rawContent) {
      if (returnRawHtmlIfFailed) return html;
      throw new Error("Could not find chord content using any known strategy");
    }

    // --- CLEANUP PIPELINE ---
    // Instead of just stripping tags, add spaces around them to prevent jamming into lyrics
    rawContent = rawContent.replace(/\[ch\]/gi, "  ");
    rawContent = rawContent.replace(/\[\/ch\]/gi, "  ");
    rawContent = rawContent.replace(/\[tab\]/gi, "");
    rawContent = rawContent.replace(/\[\/tab\]/gi, "");

    // Convert multiple line breaks into single ones, but preserve paragraph spacing
    rawContent = rawContent.replace(/\r\n/g, "\n");
    rawContent = decodeHtmlEntities(rawContent);

    // Ensure we don't have super long lines of just chords
    rawContent = rawContent.split('\n').map(line => {
      // If a line is just chords but very long, it might be jammed
      if (isChordLine(line) && line.length > 100 && !line.includes('  ')) {
        return line.replace(/([A-G][#b]?[\w]*)/g, "$1  ");
      }
      return line;
    }).join('\n');

    return rawContent.trim();

  } catch (e) {
    throw new Error("Scraping Failed: " + e.message);
  }
}

/**
 * SPECIAL HANDLER: COPIES EXISTING GOOGLE DOCS
 */
function copyExistingGoogleDoc(title, url) {
  // Extract ID from URL
  const idMatch = url.match(/[-\w]{25,}/);
  if (!idMatch) throw new Error("Invalid Google Doc URL");

  const originalFileId = idMatch[0];
  const originalFile = DriveApp.getFileById(originalFileId);

  // Get Target Folder
  let folder;
  if (CONFIG.targetFolderId !== "REPLACE_WITH_YOUR_FOLDER_ID") {
    folder = DriveApp.getFolderById(CONFIG.targetFolderId);
  } else {
    folder = DriveApp.getRootFolder();
  }

  // Make Copy
  const newFile = originalFile.makeCopy(String(title) + " [Chords]", folder);
  return newFile.getUrl();
}

/**
 * HELPER: Create the actual Google Doc (Unchanged styling)
 */
function createGoogleDoc(title, content, originalUrl) {
  let folder;
  try {
    if (CONFIG.targetFolderId === "REPLACE_WITH_YOUR_FOLDER_ID") {
      folder = DriveApp.getRootFolder();
    } else {
      folder = DriveApp.getFolderById(CONFIG.targetFolderId);
    }
  } catch (e) {
    folder = DriveApp.getRootFolder();
  }

  const doc = DocumentApp.create(String(title) + " [Chords]");
  const body = doc.getBody();

  const titleParagraph = body.getParagraphs()[0];
  titleParagraph.setText(String(title));
  titleParagraph.setAttributes({
    [DocumentApp.Attribute.FONT_SIZE]: 18,
    [DocumentApp.Attribute.BOLD]: false,
    [DocumentApp.Attribute.FONT_FAMILY]: 'Arial'
  });

  const sourcePara = body.appendParagraph("Source: " + String(originalUrl));
  sourcePara.setAttributes({
    [DocumentApp.Attribute.FONT_SIZE]: 8,
    [DocumentApp.Attribute.FOREGROUND_COLOR]: '#000000',
    [DocumentApp.Attribute.FONT_FAMILY]: 'Arial',
    [DocumentApp.Attribute.BOLD]: false
  });

  body.appendHorizontalRule();

  const chordParagraph = body.appendParagraph(String(content));
  const chordStyle = {};
  chordStyle[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto Mono';
  chordStyle[DocumentApp.Attribute.FONT_SIZE] = 10;
  chordStyle[DocumentApp.Attribute.BOLD] = false;
  chordParagraph.setAttributes(chordStyle);

  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  try {
    file.moveTo(folder);
  } catch (e) {
    console.warn("Could not move file: " + e.message);
  }

  return file.getUrl();
}

function decodeHtmlEntities(str) {
  return str.replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, function (match, dec) {
      return String.fromCharCode(dec);
    });
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, '');
}

function setupTrigger() {
  const sheet = SpreadsheetApp.getActive();
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger('processChordQueue')
    .forSpreadsheet(sheet)
    .onChange()
    .create();
  SpreadsheetApp.getUi().alert("Trigger set up! AppSheet updates will now run the script automatically.");
}