import { NextRequest, NextResponse } from 'next/server';
import { extractMetadata } from '@/lib/metadata';
import { createMemory } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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
        url: normalizedUrl
      };
    }

    if (!metadata) {
      metadata = {
        title: new URL(normalizedUrl).hostname,
        description: '',
        image: null,
        url: normalizedUrl
      };
    }

    // 2. Create memory
    // Using the same content format as AddMemoryButton (URL + newline + description)
    // to ensure link preview works correctly.
    // Explicitly setting type to 'link' to ensure correct rendering.
    const memory = await createMemory({
      title: metadata.title,
      content: `${metadata.url}\n${metadata.description || ''}`,
      assets: metadata.image ? [metadata.image] : [],
      type: 'link',
    });

    return NextResponse.json({ success: true, memory });
  } catch (error) {
    console.error('Error creating memory from extension:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

