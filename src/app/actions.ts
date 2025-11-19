'use server';
import 'server-only';
import { extractMetadata as extractMetadataLogic, LinkMetadata } from '@/lib/metadata';
import { generateEmbedding, generateAnswer } from '@/lib/gemini';
import { searchMemories } from '@/lib/supabase';

export { type LinkMetadata };

export async function extractMetadata(url: string): Promise<LinkMetadata | null> {
  return extractMetadataLogic(url);
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
    const memories = await searchMemories(embedding);

    // Generate RAG answer
    let answer = null;
    if (memories.length > 0) {
      const context = memories.map(m => `Title: ${m.title}\nContent: ${m.content}`).join("\n\n");
      answer = await generateAnswer(query, context);
    } else {
      answer = "I couldn't find any memories related to that.";
    }

    return { memories, answer };
  } catch (error) {
    console.error("Search failed:", error);
    return { memories: [], answer: null };
  }
}
