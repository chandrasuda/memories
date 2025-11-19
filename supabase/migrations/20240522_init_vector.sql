-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add a vector column to the memories table
-- Gemini embedding-001 output dimension is 768
alter table memories
add column if not exists embedding vector(768);

-- Add type column if it doesn't exist
alter table memories
add column if not exists type text default 'default';

-- Create a function to search for memories
create or replace function match_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  title text,
  content text,
  assets text[],
  type text,
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    memories.id,
    memories.title,
    memories.content,
    memories.assets,
    memories.type,
    memories.created_at,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where 1 - (memories.embedding <=> query_embedding) > match_threshold
  order by memories.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Create an index for faster queries (IVFFlat)
-- Note: This requires some data to be effective, but good to have defined.
-- You might need to drop and recreate this later if you have very little data initially.
create index on memories using ivfflat (embedding vector_cosine_ops)
with (lists = 100);
