import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const embeddingModel = genAI.getGenerativeModel({ model: "models/embedding-001" });
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!apiKey) return [];
  
  try {
    // Clean the text to ensure better embeddings
    const cleanText = text.replace(/\n/g, " ");
    const result = await embeddingModel.embedContent(cleanText);
    const embedding = result.embedding;
    return embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
}

export async function generateAnswer(query: string, context: string): Promise<string> {
  if (!apiKey) return "I cannot answer because the API key is missing.";

  try {
    const prompt = `
You are a helpful assistant for a personal memory system. 
Answer the user's query based ONLY on the provided context.
If the answer is not in the context, say "I don't have a memory of that."
Keep the answer concise and friendly.

Context:
${context}

User Query: ${query}
    `;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating answer:", error);
    return "Sorry, I couldn't generate an answer at this time.";
  }
}
