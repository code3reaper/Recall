-- Add shared_memories table for public sharing
CREATE TABLE public.shared_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.shared_memories ENABLE ROW LEVEL SECURITY;

-- Users can create shares for their own memories
CREATE POLICY "Users can create their own shares"
ON public.shared_memories
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own shares
CREATE POLICY "Users can view their own shares"
ON public.shared_memories
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own shares
CREATE POLICY "Users can update their own shares"
ON public.shared_memories
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.shared_memories
FOR DELETE
USING (auth.uid() = user_id);

-- Public can view active shares (for the public share page)
CREATE POLICY "Public can view active shares by token"
ON public.shared_memories
FOR SELECT
USING (is_active = true);

-- Create index for fast token lookups
CREATE INDEX idx_shared_memories_token ON public.shared_memories(share_token);
CREATE INDEX idx_shared_memories_memory ON public.shared_memories(memory_id);