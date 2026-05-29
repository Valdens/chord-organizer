const { GoogleGenerativeAI } = require('@google/generative-ai');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function list() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("hi");
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}
list();
