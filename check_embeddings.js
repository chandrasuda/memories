require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEmbeddings() {
  console.log('Checking embedding status...');
  
  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error getting total count:', countError);
    return;
  }

  // Get count of rows where embedding is not null
  // Note: Supabase JS client doesn't support "count(embedding)" directly in select easily without raw SQL or RPC.
  // So we'll just fetch rows with non-null embeddings and count them (efficient enough for small datasets).
  const { count: embeddedCount, error: embeddedError } = await supabase
    .from('memories')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null);

  if (embeddedError) {
    console.error('Error getting embedded count:', embeddedError);
    return;
  }

  console.log('------------------------------------------------');
  console.log(`Total Memories:           ${totalCount}`);
  console.log(`Memories with Embeddings: ${embeddedCount}`);
  console.log(`Missing Embeddings:       ${(totalCount || 0) - (embeddedCount || 0)}`);
  console.log('------------------------------------------------');

  if (embeddedCount === 0 && totalCount > 0) {
    console.log('⚠️  No embeddings found! Search will not work for existing items.');
    console.log('   You need to add new memories or backfill existing ones.');
  } else if (embeddedCount > 0) {
    console.log('✅  Embeddings exist. Search should work for these items.');
  }
}

checkEmbeddings();
