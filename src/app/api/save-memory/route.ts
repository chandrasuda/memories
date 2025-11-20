import { NextRequest, NextResponse } from 'next/server';
import { extractMetadata } from '@/lib/metadata';
import { createMemory, fetchMemories, Memory } from '@/lib/supabase';
import { generateEmbedding } from '@/lib/gemini';
import { processMemory } from '@/lib/memory-processing';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper to check intersection between two rectangles with padding
function isColliding(
  r1: { x: number; y: number; w: number; h: number },
  r2: { x: number; y: number; w: number; h: number },
  padding: number
) {
  return (
    r1.x < r2.x + r2.w + padding &&
    r1.x + r1.w + padding > r2.x &&
    r1.y < r2.y + r2.h + padding &&
    r1.y + r1.h + padding > r2.y
  );
}

// Compute a non-overlapping outward position for a new memory, based on
// existing memories' positions and approximate node dimensions.
async function computeNewMemoryPositionForLink(existingMemories: Memory[]) {
  const placedRects: { x: number; y: number; w: number; h: number }[] = [];

  // Center point (canvas origin)
  const centerX = 0;
  const centerY = 0;

  // Use the same sizing logic as the frontend: link nodes are ~300x280
  const NEW_WIDTH = 300;
  const NEW_HEIGHT = 280;

  // Pre-process existing memories to get their dimensions and positions
  const processedExisting = existingMemories.map(processMemory);

  processedExisting.forEach((m) => {
    if (typeof m.x === 'number' && typeof m.y === 'number') {
      placedRects.push({
        x: m.x,
        y: m.y,
        w: m._width,
        h: m._height,
      });
    }
  });

  let x: number;
  let y: number;

  if (placedRects.length === 0) {
    // First node ever: put it at the center.
    x = centerX - NEW_WIDTH / 2;
    y = centerY - NEW_HEIGHT / 2;
    return { x, y };
  }

  // Otherwise, walk a spiral outward from the origin until we find a
  // collision-free spot.
  const a = 0; // spiral offset
  const b = 25; // distance between spiral arms
  let angle = 0.1;

  while (true) {
    const r = a + b * angle;
    const scale = 1 / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));

    const candidateX = centerX + (r * Math.cos(angle)) * scale - NEW_WIDTH / 2;
    const candidateY = centerY + (r * Math.sin(angle)) * scale - NEW_HEIGHT / 2;

    const candidateRect = {
      x: candidateX,
      y: candidateY,
      w: NEW_WIDTH,
      h: NEW_HEIGHT,
    };

    const collision = placedRects.some((rect) =>
      isColliding(candidateRect, rect, 20)
    );

    if (!collision) {
      x = candidateX;
      y = candidateY;
      break;
    }

    const step = Math.min(0.1, 10 / (r + 10));
    angle += step;

    // Safety: bail out of an extreme loop, but in practice we should
    // find a spot long before this.
    if (angle > 2000) {
      x = centerX - NEW_WIDTH / 2;
      y = centerY - NEW_HEIGHT / 2;
      break;
    }
  }

  return { x, y };
}

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

    // 3. Compute an outward, non-overlapping position for this new link memory,
    //    based on existing memories.
    let position: { x: number; y: number } | null = null;
    try {
      const existingMemories = await fetchMemories();
      position = await computeNewMemoryPositionForLink(existingMemories);
    } catch (posError) {
      console.error('Failed to compute position for new memory, falling back to default:', posError);
      position = null;
    }

    // 4. Create memory
    // Using the same content format as AddMemoryButton (URL + newline + description + scraped content)
    // to ensure link preview works correctly and RAG has access to full text.
    // Explicitly setting type to 'link' to ensure correct rendering.
    const memory = await createMemory({
      title: metadata.title,
      content: `${metadata.url}\n${metadata.description || ''}\n\n${scrapedContent}`,
      assets: metadata.image ? [metadata.image] : [],
      type: 'link',
      embedding: embedding.length > 0 ? embedding : undefined,
      ...(position ? { x: position.x, y: position.y } : {}),
    });

    return NextResponse.json({ success: true, memory }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error creating memory from extension:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}

