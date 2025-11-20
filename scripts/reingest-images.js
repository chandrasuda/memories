/**
 * Script to re-ingest existing images with Gemini Vision analysis
 * This will analyze all image memories and update their content with AI-generated descriptions
 */

const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

console.log('Environment check:');
console.log('  SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('  SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
console.log('  GEMINI_API_KEY:', geminiApiKey ? '✓ Set' : '✗ Missing');
console.log('');

if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please ensure .env.local exists with:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('  - GEMINI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
const embeddingModel = genAI.getGenerativeModel({ model: 'models/embedding-001' });

async function analyzeImage(imageUrl) {
  try {
    console.log(`  Analyzing: ${imageUrl}`);
    
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    
    // Determine mime type
    let mimeType = 'image/jpeg';
    if (imageUrl.toLowerCase().includes('.png')) mimeType = 'image/png';
    else if (imageUrl.toLowerCase().includes('.webp')) mimeType = 'image/webp';
    else if (imageUrl.toLowerCase().includes('.gif')) mimeType = 'image/gif';

    const prompt = `Analyze this image in detail. Provide a comprehensive description including:
- What is shown in the image (objects, people, scenery, etc.)
- The setting and context
- Any text visible in the image
- Colors, mood, and atmosphere
- Any notable details or interesting aspects

Be thorough and descriptive as this will be used for searching and finding this image later.`;

    const result = await visionModel.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const description = result.response.text();
    console.log(`  ✓ Analysis complete (${description.length} chars)`);
    return description;
  } catch (error) {
    console.error(`  ✗ Error analyzing image:`, error.message);
    return null;
  }
}

async function generateEmbedding(text) {
  try {
    const cleanText = text.replace(/\n/g, ' ');
    const result = await embeddingModel.embedContent(cleanText);
    return result.embedding.values;
  } catch (error) {
    console.error('  ✗ Error generating embedding:', error.message);
    return null;
  }
}

async function reingestImages() {
  console.log('🚀 Starting image re-ingestion process...\n');

  // Fetch all memories with images
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .not('assets', 'is', null);

  if (error) {
    console.error('Error fetching memories:', error);
    process.exit(1);
  }

  if (!memories || memories.length === 0) {
    console.log('No memories with images found.');
    return;
  }

  // Filter to only multi-image memories (2+ images)
  const imageMemories = memories.filter(m => 
    m.assets && 
    m.assets.length > 1
  );

  console.log(`Found ${imageMemories.length} multi-image memories to re-ingest\n`);

  let successful = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < imageMemories.length; i++) {
    const memory = imageMemories[i];
    console.log(`\n[${i + 1}/${imageMemories.length}] Processing memory: ${memory.id}`);
    console.log(`  Title: ${memory.title}`);
    console.log(`  Images: ${memory.assets.length}`);

    try {
      // Analyze all images
      const descriptions = [];
      for (const imageUrl of memory.assets) {
        const description = await analyzeImage(imageUrl);
        if (description) {
          descriptions.push(description);
        } else {
          console.log(`  ⚠ Skipping image due to analysis failure`);
        }
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (descriptions.length === 0) {
        console.log(`  ✗ No successful descriptions generated`);
        failed++;
        continue;
      }

      // Combine descriptions - join without prefixes
      const combinedDescription = descriptions.join('\n\n');

   
      // Generate embedding using title, content, and AI descriptions
      // This ensures the embedding includes all available context
      console.log(`  Generating embedding...`);
      const embeddingText = `${memory.title} ${memory.content || ''} ${combinedDescription}`;
      const embedding = await generateEmbedding(embeddingText);

      if (!embedding) {
        console.log(`  ✗ Failed to generate embedding`);
        failed++;
        continue;
      }

      // Update memory in database - store in ai_description to not interfere with UI
      const { error: updateError } = await supabase
        .from('memories')
        .update({
          ai_description: combinedDescription,
          embedding: embedding
        })
        .eq('id', memory.id);

      if (updateError) {
        console.error(`  ✗ Error updating memory:`, updateError.message);
        failed++;
      } else {
        console.log(`  ✓ Successfully updated with ${descriptions.length} image description(s)`);
        successful++;
      }

      // Rate limiting delay between memories
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`  ✗ Error processing memory:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Re-ingestion Summary:');
  console.log(`  ✓ Successful: ${successful}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  Total processed: ${imageMemories.length}`);
  console.log('='.repeat(60));
}

// Run the script
reingestImages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
