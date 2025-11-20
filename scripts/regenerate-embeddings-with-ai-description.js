/**
 * Script to regenerate embeddings for memories that have ai_description
 * This ensures embeddings include both the original content and AI descriptions
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
const embeddingModel = genAI.getGenerativeModel({ model: 'models/embedding-001' });

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

async function regenerateEmbeddings() {
  console.log('🚀 Starting embedding regeneration for memories with AI descriptions...\n');

  // Fetch all memories that have ai_description
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .not('ai_description', 'is', null);

  if (error) {
    console.error('Error fetching memories:', error);
    process.exit(1);
  }

  if (!memories || memories.length === 0) {
    console.log('No memories with AI descriptions found.');
    return;
  }

  console.log(`Found ${memories.length} memories with AI descriptions\n`);

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < memories.length; i++) {
    const memory = memories[i];
    console.log(`[${i + 1}/${memories.length}] Processing memory: ${memory.id}`);
    console.log(`  Title: ${memory.title}`);
    console.log(`  Has AI Description: ${memory.ai_description ? 'Yes' : 'No'}`);

    try {
      // Generate embedding using title, content, and ai_description
      // This ensures the embedding includes all available context
      const embeddingText = `${memory.title} ${memory.content || ''} ${memory.ai_description || ''}`;
      const embedding = await generateEmbedding(embeddingText);

      if (!embedding) {
        console.log(`  ✗ Failed to generate embedding`);
        failed++;
        continue;
      }

      // Update memory with new embedding
      const { error: updateError } = await supabase
        .from('memories')
        .update({ embedding: embedding })
        .eq('id', memory.id);

      if (updateError) {
        console.error(`  ✗ Error updating memory:`, updateError.message);
        failed++;
      } else {
        console.log(`  ✓ Successfully regenerated embedding`);
        successful++;
      }

      // Rate limiting delay between memories
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ✗ Error processing memory:`, error.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Regeneration Summary:');
  console.log(`  ✓ Successful: ${successful}`);
  console.log(`  ✗ Failed: ${failed}`);
  console.log(`  Total processed: ${memories.length}`);
  console.log('='.repeat(60));
}

// Run the script
regenerateEmbeddings().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

