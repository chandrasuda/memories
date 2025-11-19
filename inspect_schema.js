require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  console.log('Inspecting "memories" table...');
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching memories:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Found row. Columns:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  } else {
    console.log('Table is empty or could not fetch rows. Trying to insert a dummy row to check schema if possible, or just relying on error.');
    // If empty, we can't see columns easily via select * without a row. 
    // But the error `column memories.type does not exist` is pretty strong evidence.
  }
}

inspect();
