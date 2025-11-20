const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAIDescriptions() {
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .not('assets', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${memories.length} memories with assets\n`);

  for (const memory of memories) {
    const contentLower = memory.content?.toLowerCase() || '';
    const hasAIPattern = contentLower.includes('here is a detailed') || 
                        contentLower.includes('here is an analysis') ||
                        contentLower.includes("here's a detailed");

    if (hasAIPattern) {
      console.log(`ID: ${memory.id}`);
      console.log(`Title: ${memory.title}`);
      console.log(`Type: ${memory.type}`);
      console.log(`Assets: ${memory.assets?.length || 0}`);
      console.log(`Content preview: ${memory.content?.substring(0, 100)}...`);
      console.log('---\n');
    }
  }
}

checkAIDescriptions();
