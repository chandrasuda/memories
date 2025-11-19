import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const embeddingModel = genAI.getGenerativeModel({ model: "models/embedding-001" });
const textModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

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

export async function generateAnswer(query: string, context: string, memoryCount: number = 0): Promise<string> {
  if (!apiKey) return "I cannot answer because the API key is missing.";

  try {
    const prompt = `
You are a helpful assistant for a personal memory system. You have access to ${memoryCount} relevant memories.

Your task:
1. Analyze the provided memories and their relevance scores
2. Identify which memories are most relevant to the user's query
3. Synthesize a helpful answer based on the relevant information
4. Keep your response concise (3-5 sentences) but informative

Guidelines:
- Focus on memories with higher relevance scores (above 70%)
- If multiple memories are relevant, synthesize information from them
- If no memories seem highly relevant to the specific question, mention what related information was found
- Use a natural, conversational tone
- You can use bullet points for clarity if listing multiple items

Relevant Memories:
${context}

User Query: ${query}

Answer:
    `;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating answer:", error);
    return "Sorry, I couldn't generate an answer at this time.";
  }
}

export async function generateAnswerWithFiltering(query: string, context: string, memoryCount: number = 0): Promise<{ answer: string; relevantMemoryIds: string[] }> {
  if (!apiKey) return { answer: "I cannot answer because the API key is missing.", relevantMemoryIds: [] };

  try {
    const prompt = `
You are a helpful assistant for a personal memory system analyzing ${memoryCount} candidate memories.

Your task:
1. Carefully analyze each memory and determine if it's truly relevant to the user's query
2. Only select memories that directly relate to what the user is asking about
3. Provide a concise, helpful answer based on the most relevant memories
4. Return your response in this EXACT JSON format:
{
  "relevantMemoryIds": ["id1", "id2", "id3"],
  "answer": "Your natural language answer here"
}

Guidelines for selecting relevant memories:
- Prioritize memories with relevance scores above 60%
- Include memories that directly answer the query or provide related context
- Exclude tangentially related memories unless they add significant value
- Limit to 3-5 most relevant memories maximum
- If no memories are truly relevant, return empty array and explain what you did find

Guidelines for the answer:
- Keep response to 3-5 sentences maximum
- Be specific and reference the actual content from relevant memories
- Use bullet points if listing multiple related items
- Natural, conversational tone

Candidate Memories:
${context}

User Query: ${query}

Respond with valid JSON only:
    `;

    const result = await textModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text;
    const jsonMatch = text.match(/```json\s*({[\s\S]*?})\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else {
      const codeBlockMatch = text.match(/```\s*({[\s\S]*?})\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
    }
    
    try {
      const parsed = JSON.parse(jsonText);
      return {
        answer: parsed.answer || "I found some memories but couldn't generate a proper answer.",
        relevantMemoryIds: Array.isArray(parsed.relevantMemoryIds) ? parsed.relevantMemoryIds : []
      };
    } catch (parseError) {
      console.error("Failed to parse LLM JSON response:", parseError);
      // Fallback: return the text as answer
      return {
        answer: text,
        relevantMemoryIds: []
      };
    }
  } catch (error) {
    console.error("Error generating answer with filtering:", error);
    return {
      answer: "Sorry, I couldn't generate an answer at this time.",
      relevantMemoryIds: []
    };
  }
}
