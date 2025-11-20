-- Drop the old match_memories function then re-create it with ai_description in return
-- Run this in Supabase SQL Editor (or via supabase CLI) to update the RPC signature

-- 1) Drop the old function (required because return row type is changing)
drop function if exists match_memories(vector, double precision, integer);

-- 2) Create the new function with ai_description returned
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
  ai_description text,
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
    memories.ai_description,
    memories.created_at,
    1 - (memories.embedding <=> query_embedding) as similarity
  from memories
  where 1 - (memories.embedding <=> query_embedding) > match_threshold
  order by memories.embedding <=> query_embedding
  limit match_count;
end;
$$;
