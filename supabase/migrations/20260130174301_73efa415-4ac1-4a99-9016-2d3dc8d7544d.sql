-- Create collections table for organizing memories
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for collections
CREATE POLICY "Users can view their own collections" 
ON public.collections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections" 
ON public.collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" 
ON public.collections FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" 
ON public.collections FOR DELETE 
USING (auth.uid() = user_id);

-- Create junction table for memory-collection relationships
CREATE TABLE public.memory_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(memory_id, collection_id)
);

-- Enable RLS
ALTER TABLE public.memory_collections ENABLE ROW LEVEL SECURITY;

-- RLS policies for memory_collections
CREATE POLICY "Users can view their own memory collections" 
ON public.memory_collections FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add memories to their collections" 
ON public.memory_collections FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove memories from their collections" 
ON public.memory_collections FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at on collections
CREATE TRIGGER update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_memory_collections_memory_id ON public.memory_collections(memory_id);
CREATE INDEX idx_memory_collections_collection_id ON public.memory_collections(collection_id);
CREATE INDEX idx_collections_user_id ON public.collections(user_id);