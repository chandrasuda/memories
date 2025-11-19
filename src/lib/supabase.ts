import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our memories table
export interface Memory {
  id: string
  title: string
  content: string
  assets?: string[] // URLs to images/files/videos
  created_at: string
}

export interface CreateMemoryData {
  title: string
  content: string
  assets?: string[]
}

// Helper function to fetch memories
export async function fetchMemories() {
  const { data, error } = await supabase
    .from('memories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data as Memory[];
}
