-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memories table
CREATE TABLE public.memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('note', 'link', 'image', 'pdf')),
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  file_path TEXT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory_chunks table for semantic search
CREATE TABLE public.memory_chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on embeddings for fast similarity search
CREATE INDEX memory_chunks_embedding_idx ON public.memory_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for user queries
CREATE INDEX memories_user_id_idx ON public.memories(user_id);
CREATE INDEX memories_created_at_idx ON public.memories(created_at DESC);
CREATE INDEX memories_type_idx ON public.memories(type);
CREATE INDEX memory_chunks_user_id_idx ON public.memory_chunks(user_id);

-- Enable RLS
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_chunks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memories
CREATE POLICY "Users can view their own memories" 
  ON public.memories FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories" 
  ON public.memories FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
  ON public.memories FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
  ON public.memories FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for memory_chunks
CREATE POLICY "Users can view their own chunks" 
  ON public.memory_chunks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chunks" 
  ON public.memory_chunks FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chunks" 
  ON public.memory_chunks FOR DELETE 
  USING (auth.uid() = user_id);

-- Function to match memories using semantic search
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(768),
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  memory_id UUID,
  chunk_id UUID,
  chunk_text TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.memory_id,
    mc.id as chunk_id,
    mc.chunk_text,
    1 - (mc.embedding <=> query_embedding) as similarity
  FROM memory_chunks mc
  WHERE mc.user_id = match_user_id
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON public.memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for memory files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('memories', 'memories', false);

-- Storage policies
CREATE POLICY "Users can view their own memory files" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'memories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own memory files" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'memories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own memory files" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'memories' AND auth.uid()::text = (storage.foldername(name))[1]);