const axios = require('axios');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function list() {
  try {
    const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
list();
