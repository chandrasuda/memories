require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function testSpecific() {
  try {
    // Trying the exact model string that usually works for free tier
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    const result = await model.generateContent("Hello");
    console.log(`✅ gemini-1.0-pro worked!`);
  } catch (e) {
    console.log(`❌ gemini-1.0-pro failed: ${e.message.split('\n')[0]}`);
  }
}

testSpecific();
