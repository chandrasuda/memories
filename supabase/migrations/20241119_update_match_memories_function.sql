-- Update the match_memories function to include ai_description in results
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
