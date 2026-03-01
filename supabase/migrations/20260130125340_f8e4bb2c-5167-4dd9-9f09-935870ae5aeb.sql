-- Add tags column to memories table
ALTER TABLE public.memories
ADD COLUMN tags text[] DEFAULT '{}';

-- Create index for tags for better query performance
CREATE INDEX idx_memories_tags ON public.memories USING GIN(tags);