require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // There isn't a direct listModels on the instance in the node SDK easily exposed in this version maybe?
    // Actually usually it's on the class or a manager.
    // Let's just try to generate content with a few variants to see what works.
    
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-001",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro",
      "gemini-pro"
    ];

    for (const m of modelsToTry) {
      console.log(`Trying model: ${m}`);
      try {
        const model = genAI.getGenerativeModel({ model: m });
        const result = await model.generateContent("Hello");
        console.log(`✅ ${m} worked!`);
        return; // Found one
      } catch (e) {
        console.log(`❌ ${m} failed: ${e.message.split('\n')[0]}`);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

listModels();
