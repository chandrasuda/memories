'use server';
import 'server-only';
import { extractMetadata as extractMetadataLogic, LinkMetadata } from '@/lib/metadata';
import { generateEmbedding, generateAnswer, generateAnswerWithFiltering } from '@/lib/gemini';
import { searchMemories, createMemory, CreateMemoryData } from '@/lib/supabase';

export { type LinkMetadata };

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function extractMetadata(url: string): Promise<LinkMetadata | null> {
  return extractMetadataLogic(url);
}

export async function createMemoryWithEmbedding(memoryData: CreateMemoryData & { ai_description?: string }) {
  try {
    // Generate embedding for the memory content
    // We combine title, content, and ai_description for a richer embedding context
    const contentToEmbed = `${memoryData.title} ${memoryData.content} ${memoryData.ai_description || ''}`;
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

export async function analyzeImages(imageUrls: string[]) {
  try {
    const { analyzeImage } = await import('@/lib/gemini');
    
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('No image URLs provided');
    }

    // Analyze all images
    const descriptions = [];
    for (const imageUrl of imageUrls) {
      try {
        const description = await analyzeImage(imageUrl);
        if (description) {
          descriptions.push(description);
        }
      } catch (error) {
        console.error(`Failed to analyze image ${imageUrl}:`, error);
        // Continue with other images even if one fails
      }
    }

    if (descriptions.length === 0) {
      throw new Error('Failed to analyze any images');
    }

    // Combine descriptions
    const combinedDescription = descriptions.join('\n\n');

    // Create memory with AI descriptions
    // Set type to 'image' so it's properly recognized as an image memory
    const memory = await createMemoryWithEmbedding({
      title: 'Image Memory',
      content: '',
      assets: imageUrls,
      type: 'image',
      ai_description: combinedDescription,
    });

    return memory;
  } catch (error) {
    console.error("Failed to analyze images:", error);
    throw error;
  }
}

export async function performSearch(
  query: string, 
  conversationHistory: ConversationMessage[] = [],
  pinnedMemoryIds: string[] = []
) {
  if (!query.trim()) {
    return { memories: [], answer: null, memoryIds: [] };
  }

  try {
    let allMemories: (Memory & { similarity: number; ai_description?: string })[];
    
    // If we have pinned memories (follow-up question), fetch those specific memories
    // Otherwise, do a new vector search (initial question)
    if (pinnedMemoryIds.length > 0) {
      // Follow-up question: reuse the same memories from initial search
      const { fetchMemories } = await import('@/lib/supabase');
      const allFetchedMemories = await fetchMemories();
      allMemories = allFetchedMemories
        .filter(m => pinnedMemoryIds.includes(m.id))
        .map(m => ({ ...m, similarity: 1.0 })) as (Memory & { similarity: number; ai_description?: string })[];
    } else {
      // Initial question: perform vector search
      const embedding = await generateEmbedding(query);
      if (embedding.length === 0) {
        return { memories: [], answer: null, memoryIds: [] };
      }
      
      // Fetch candidate memories with optimal threshold
      allMemories = await searchMemories(embedding, 0.4, 15);
    }

    // Generate RAG answer - LLM will decide which memories are actually relevant
    let answer = null;
    let relevantMemoryIds: string[] = [];
    
    if (allMemories.length > 0) {
      // Include similarity scores to help the LLM understand relevance
      // Include ai_description for image memories to enable searching by visual content
      const memoryContext = allMemories
        .map((m, idx) => {
          const memory = m as Memory & { similarity: number; ai_description?: string };
          const parts = [
            `[Memory ${idx + 1}] ID: ${memory.id}${pinnedMemoryIds.length === 0 ? ` | Relevance: ${(memory.similarity * 100).toFixed(0)}%` : ''}`,
            `Title: ${memory.title}`
          ];
          
          if (memory.content && memory.content.trim()) {
            parts.push(`Content: ${memory.content}`);
          }
          
          // Make AI description prominent for image memories
          if (memory.ai_description && memory.ai_description.trim()) {
            parts.push(`Visual Content (AI Description): ${memory.ai_description}`);
          }
          
          return parts.join('\n');
        })
        .join("\n\n---\n\n");
      
      const result = await generateAnswerWithFiltering(
        query, 
        memoryContext, 
        allMemories.length, 
        conversationHistory,
        pinnedMemoryIds.length > 0 // isFollowUp
      );
      answer = result.answer;
      relevantMemoryIds = result.relevantMemoryIds;
    } else {
      answer = "I couldn't find any memories related to that. Try describing what you're looking for in different words.";
    }

    // Filter memories to only show what LLM deemed relevant
    const memories = relevantMemoryIds.length > 0 
      ? allMemories.filter(m => relevantMemoryIds.includes(m.id))
      : allMemories.slice(0, 5); // Fallback: show top 5 if LLM doesn't specify

    // Return the memory IDs so they can be pinned for follow-up questions
    const memoryIds = allMemories.map(m => m.id);

    return { memories, answer, memoryIds };
  } catch (error) {
    console.error("Search failed:", error);
    return { memories: [], answer: null, memoryIds: [] };
  }
}
