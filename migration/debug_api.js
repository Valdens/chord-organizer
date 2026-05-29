const axios = require('axios');

async function debug() {
  const url = "https://script.google.com/macros/s/AKfycbwgUo86seO5J7zy2YHl_-LtX80YOEC9DDyIP5GWVawA1eindYPvhXwg3vcBlmVl2PFJ/exec";
  
  try {
    console.log("Testing GET / action=listSongs...");
    const getRes = await axios.get(`${url}?action=listSongs`);
    console.log("GET Result Success:", getRes.data.success);
    if (getRes.data.data) console.log("Song count:", getRes.data.data.length);

    console.log("\nTesting POST / scrape...");
    const postRes = await axios.post(url, JSON.stringify({ url: "https://tabs.ultimate-guitar.com/tab/oasis/wonderwall-chords-277570" }), {
      headers: { 'Content-Type': 'text/plain' }
    });
    console.log("\nTesting GET / action=getDoc...");
    const docId = "1-ZVxH65tOQyr5M4Vz93HdKRBS0L1DJ68L7EosRyAtvY";
    const docRes = await axios.get(`${url}?action=getDoc&id=${docId}`);
    console.log("Doc Result Success:", docRes.data.success);
    console.log("Raw Doc Res:", docRes.data);
    if (docRes.data.data) console.log("Doc snippet:", docRes.data.data.substring(0, 100));

  } catch (err) {
    console.error("Debug Error:", err.message);
    if (err.response) console.error("Response Data:", err.response.data);
  }
}

debug();
