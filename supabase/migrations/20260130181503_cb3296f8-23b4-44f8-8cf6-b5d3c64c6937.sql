-- Update the memories type constraint to include 'decision'
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE public.memories ADD CONSTRAINT memories_type_check 
CHECK (type = ANY (ARRAY['note', 'link', 'image', 'pdf', 'voice_memo', 'bookmark', 'decision']));

-- Add decision-specific columns
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS reasoning text;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS alternatives_rejected jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS outcome text CHECK (outcome = ANY (ARRAY['pending', 'worked', 'didnt_work', 'mixed']));
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS outcome_notes text;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS decision_date timestamp with time zone;

-- Add compression columns
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS compressed_content text;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS is_compressed boolean DEFAULT false;
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS compression_date timestamp with time zone;