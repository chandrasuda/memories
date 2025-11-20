require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseAnonKey || !geminiApiKey) {
  console.error('Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "models/embedding-001" });

async function generateEmbedding(text) {
  try {
    const cleanText = text.replace(/\n/g, " ");
    const result = await model.embedContent(cleanText);
    return result.embedding.values;
  } catch (error) {
    console.error("Error generating embedding:", error.message);
    return null;
  }
}

async function backfill() {
  console.log('Starting backfill process...');

  // 1. Fetch memories without embeddings
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .is('embedding', null);

  if (error) {
    console.error('Error fetching memories:', error);
    return;
  }

  console.log(`Found ${memories.length} memories to backfill.`);

  // 2. Process each memory
  for (const memory of memories) {
    console.log(`Processing: "${memory.title}"...`);
    
    // Construct text to embed (Title + Content + AI Description)
    // Include all available context for richer embeddings
    const contentToEmbed = `${memory.title} ${memory.content || ''} ${memory.ai_description || ''}`;
    
    const embedding = await generateEmbedding(contentToEmbed);

    if (embedding) {
      // 3. Update Supabase
      const { error: updateError } = await supabase
        .from('memories')
        .update({ embedding: embedding })
        .eq('id', memory.id);

      if (updateError) {
        console.error(`  ❌ Failed to update ${memory.id}:`, updateError.message);
      } else {
        console.log(`  ✅ Updated.`);
      }
    } else {
      console.log(`  ⚠️ Skipped (embedding failed).`);
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('Backfill complete!');
}

backfill();
