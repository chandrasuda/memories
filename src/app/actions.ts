'use server';
import 'server-only';
import { extractMetadata as extractMetadataLogic, LinkMetadata } from '@/lib/metadata';
import { generateEmbedding, generateAnswer, generateAnswerWithFiltering } from '@/lib/gemini';
import { searchMemories, createMemory, CreateMemoryData } from '@/lib/supabase';

export { type LinkMetadata };

export async function extractMetadata(url: string): Promise<LinkMetadata | null> {
  return extractMetadataLogic(url);
}

export async function createMemoryWithEmbedding(memoryData: CreateMemoryData) {
  try {
    // Generate embedding for the memory content
    // We combine title and content for a richer embedding context
    const contentToEmbed = `${memoryData.title} ${memoryData.content}`;
    const embedding = await generateEmbedding(contentToEmbed);
    
    const memoryWithEmbedding = {
      ...memoryData,
      embedding: embedding.length > 0 ? embedding : undefined,
    };

    return await createMemory(memoryWithEmbedding);
  } catch (error) {
    console.error("Failed to create memory with embedding:", error);
    throw error;
  }
}

export async function performSearch(query: string) {
  if (!query.trim()) {
    return { memories: [], answer: null };
  }

  try {
    const embedding = await generateEmbedding(query);
    if (embedding.length === 0) {
      return { memories: [], answer: null };
    }
    
    // Fetch candidate memories with optimal threshold
    const allMemories = await searchMemories(embedding, 0.4, 15);

    // Generate RAG answer - LLM will decide which memories are actually relevant
    let answer = null;
    let relevantMemoryIds: string[] = [];
    
    if (allMemories.length > 0) {
      // Include similarity scores to help the LLM understand relevance
      const context = allMemories
        .map((m, idx) => `[Memory ${idx + 1}] ID: ${m.id} | Relevance: ${(m.similarity * 100).toFixed(0)}%\nTitle: ${m.title}\nContent: ${m.content}`)
        .join("\n\n---\n\n");
      
      const result = await generateAnswerWithFiltering(query, context, allMemories.length);
      answer = result.answer;
      relevantMemoryIds = result.relevantMemoryIds;
    } else {
      answer = "I couldn't find any memories related to that. Try describing what you're looking for in different words.";
    }

    // Filter memories to only show what LLM deemed relevant
    const memories = relevantMemoryIds.length > 0 
      ? allMemories.filter(m => relevantMemoryIds.includes(m.id))
      : allMemories.slice(0, 5); // Fallback: show top 5 if LLM doesn't specify

    return { memories, answer };
  } catch (error) {
    console.error("Search failed:", error);
    return { memories: [], answer: null };
  }
}
