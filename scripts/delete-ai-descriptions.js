const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAIDescriptions() {
  // Fetch all memories with assets
  const { data: memories, error } = await supabase
    .from('memories')
    .select('*')
    .not('assets', 'is', null);

  if (error) {
    console.error('Error fetching memories:', error);
    return;
  }

  console.log(`Found ${memories.length} memories with assets`);

  let deletedCount = 0;

  for (const memory of memories) {
    if (!memory.assets || memory.assets.length === 0) continue;

    const contentLower = memory.content?.toLowerCase() || '';
    const isAIDescription = contentLower.includes('here is a detailed') || 
                           contentLower.includes('here is an analysis') ||
                           contentLower.includes('analysis of the image') ||
                           contentLower.includes('image 1:') ||
                           contentLower.includes('image 2:') ||
                           (memory.content && memory.content.length > 500);

    if (isAIDescription && memory.assets.length > 1) {
      console.log(`Deleting memory ${memory.id}: ${memory.title}`);
      
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', memory.id);

      if (deleteError) {
        console.error(`Error deleting ${memory.id}:`, deleteError);
      } else {
        deletedCount++;
      }
    }
  }

  console.log(`\nDeleted ${deletedCount} memories with AI descriptions`);
}

deleteAIDescriptions();
