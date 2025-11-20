const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllAI() {
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .not('assets', 'is', null);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${memories.length} memories with assets\n`);
  let deletedCount = 0;

  for (const memory of memories) {
    const contentLower = memory.content?.toLowerCase() || '';
    const hasAIPattern = contentLower.includes('here is a detailed') || 
                        contentLower.includes('here is an analysis') ||
                        contentLower.includes("here's a detailed") ||
                        contentLower.includes('analysis of the image');

    if (hasAIPattern) {
      console.log(`Deleting: ${memory.title.substring(0, 50)}...`);
      
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', memory.id);

      if (!deleteError) {
        deletedCount++;
      }
    }
  }

  console.log(`\nDeleted ${deletedCount} memories`);
}

deleteAllAI();
