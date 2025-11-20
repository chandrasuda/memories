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
  type?: 'default' | 'link' | 'image' // New field to distinguish memory types
  category?: string
  ai_description?: string // AI-generated descriptions for images
  created_at: string
  x?: number
  y?: number
  embedding?: number[]
}

export interface CreateMemoryData {
  title: string
  content: string
  assets?: string[]
  type?: 'default' | 'link' | 'image'
  category?: string
  ai_description?: string
  x?: number
  y?: number
  embedding?: number[]
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

export async function updateMemoryPosition(id: string, x: number, y: number) {
  const { error } = await supabase
    .from('memories')
    .update({ x, y })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function updateMemoryCategory(id: string, category: string) {
  const { error } = await supabase
    .from('memories')
    .update({ category })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function deleteMemory(id: string) {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function searchMemories(queryEmbedding: number[], threshold: number = 0.5, limit: number = 10) {
  const { data, error } = await supabase.rpc('match_memories', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
  });

  if (error) {
    throw error;
  }

  return data as (Memory & { similarity: number; ai_description?: string })[];
}

export async function createMemory(memory: CreateMemoryData) {
  const { data, error } = await supabase
    .from('memories')
    .insert([memory])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Memory;
}

export async function updateMemoryEmbedding(id: string, embedding: number[], ai_description?: string) {
  const updateData: { embedding: number[]; ai_description?: string } = { embedding };
  if (ai_description !== undefined) {
    updateData.ai_description = ai_description;
  }
  
  const { error } = await supabase
    .from('memories')
    .update(updateData)
    .eq('id', id);

  if (error) {
    throw error;
  }
}
