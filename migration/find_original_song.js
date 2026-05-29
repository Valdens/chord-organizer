const axios = require('axios');
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec";

async function findOriginal() {
  console.log('Fetching all songs from Apps Script to find "Distraction 74"...');
  try {
    const res = await axios.get(`${APPS_SCRIPT_URL}?action=listSongs`);
    if (res.data.success) {
      const all = res.data.data;
      const matches = all.filter(s => (s.title || '').toLowerCase().includes('distraction'));
      console.log('Matches in Apps Script:', matches.length);
      matches.forEach(s => console.log(JSON.stringify(s, null, 2)));
    } else {
      console.log('Failed to fetch from Apps Script:', res.data.error);
    }
  } catch (e) {
    console.log('Network error:', e.message);
  }
  process.exit(0);
}

findOriginal();
