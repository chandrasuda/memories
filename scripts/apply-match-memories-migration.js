/**
 * Script to apply the match_memories function migration
 * This updates the function to return ai_description
 * 
 * Run this with: node scripts/apply-match-memories-migration.js
 * 
 * Note: This requires database admin permissions. If this fails,
 * run the SQL manually in Supabase SQL Editor.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyMigration() {
  console.log('🚀 Applying match_memories function migration...\n');

  // Read the migration SQL
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20241119_drop_and_replace_match_memories.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split into individual statements (drop and create)
  const dropStatement = `drop function if exists match_memories(vector, double precision, integer);`;
  const createStatement = migrationSQL.split('-- 2)')[1].trim();

  console.log('Step 1: Dropping old function...');
  try {
    // Try to execute via RPC if available, otherwise we'll need manual execution
    // Most Supabase setups require running migrations via SQL Editor or CLI
    console.log('⚠️  Cannot execute DDL statements via Supabase client.');
    console.log('Please run this SQL in your Supabase SQL Editor:\n');
    console.log('='.repeat(60));
    console.log(migrationSQL);
    console.log('='.repeat(60));
    console.log('\nOr use Supabase CLI:');
    console.log('  supabase db push');
    console.log('\nAfter applying, the function will return ai_description in search results.');
    return;
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor.');
  }
}

applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

