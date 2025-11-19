require('dotenv').config({ path: '.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

async function test() {
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp",
    "gemini-exp-1206"
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hello");
      const response = await result.response;
      console.log(`✅ ${modelName} works! Response: ${response.text().substring(0, 50)}...`);
      return;
    } catch (e) {
      console.log(`❌ ${modelName} failed: ${e.message.split('\n')[0]}`);
    }
  }
  console.log('\n⚠️  None of the experimental models worked.');
}

test();
