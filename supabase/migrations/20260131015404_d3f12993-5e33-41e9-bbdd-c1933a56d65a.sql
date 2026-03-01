-- Drop and recreate the match_memories function with proper vector handling
DROP FUNCTION IF EXISTS public.match_memories(text, uuid, float, int);

CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding text,
  match_user_id uuid,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  memory_id uuid,
  chunk_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.memory_id,
    mc.id as chunk_id,
    mc.chunk_text,
    1 - (mc.embedding::extensions.vector <=> query_embedding::extensions.vector) as similarity
  FROM memory_chunks mc
  WHERE mc.user_id = match_user_id
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding::extensions.vector <=> query_embedding::extensions.vector) > match_threshold
  ORDER BY mc.embedding::extensions.vector <=> query_embedding::extensions.vector
  LIMIT match_count;
END;
$$;