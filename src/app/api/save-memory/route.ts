import { NextRequest, NextResponse } from 'next/server';
import { extractMetadata } from '@/lib/metadata';
import { createMemory } from '@/lib/supabase';

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
    const memory = await createMemory({
      title: metadata.title,
      content: `${metadata.url}\n${metadata.description || ''}`,
      assets: metadata.image ? [metadata.image] : [],
    });

    return NextResponse.json({ success: true, memory }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating memory from extension:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

