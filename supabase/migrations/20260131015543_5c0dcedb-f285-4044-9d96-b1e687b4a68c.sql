-- Drop the old function with extensions.vector signature
DROP FUNCTION IF EXISTS public.match_memories(extensions.vector, uuid, double precision, integer);

-- Create the function with text input
CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding text,
  match_user_id uuid,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 10
)
RETURNS TABLE (
  memory_id uuid,
  chunk_id uuid,
  chunk_text text,
  similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.memory_id,
    mc.id as chunk_id,
    mc.chunk_text,
    1 - (mc.embedding <=> query_embedding::extensions.vector) as similarity
  FROM memory_chunks mc
  WHERE mc.user_id = match_user_id
    AND mc.embedding IS NOT NULL
    AND 1 - (mc.embedding <=> query_embedding::extensions.vector) > match_threshold
  ORDER BY mc.embedding <=> query_embedding::extensions.vector
  LIMIT match_count;
END;
$$;