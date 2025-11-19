import { NextRequest, NextResponse } from 'next/server';
import { extractMetadata } from '@/lib/metadata';
import { createMemory } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400, headers: corsHeaders });
    }

    // Normalize URL
    const normalizedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;

    // 1. Extract metadata
    let metadata;
    try {
      metadata = await extractMetadata(normalizedUrl);
    } catch (err) {
      console.error("Metadata extraction failed", err);
      metadata = {
        title: new URL(normalizedUrl).hostname,
        description: '',
        image: null,
        url: normalizedUrl,
        content: ''
      };
    }

    if (!metadata) {
      metadata = {
        title: new URL(normalizedUrl).hostname,
        description: '',
        image: null,
        url: normalizedUrl,
        content: ''
      };
    }

    // 2. Generate Embedding
    const scrapedContent = metadata.content || '';
    const contentToEmbed = `${metadata.title} ${metadata.description || ''} ${metadata.url} ${scrapedContent}`;
    const embedding = await generateEmbedding(contentToEmbed);

    // 3. Create memory
    // Using the same content format as AddMemoryButton (URL + newline + description + scraped content)
    // to ensure link preview works correctly and RAG has access to full text.
    // Explicitly setting type to 'link' to ensure correct rendering.
    const memory = await createMemory({
      title: metadata.title,
      content: `${metadata.url}\n${metadata.description || ''}\n\n${scrapedContent}`,
      assets: metadata.image ? [metadata.image] : [],
      type: 'link',
      embedding: embedding.length > 0 ? embedding : undefined,
    });

    return NextResponse.json({ success: true, memory }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating memory from extension:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

