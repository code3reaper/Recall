-- Allow all supported memory types used by the app (including demo data)
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_type_check;
ALTER TABLE public.memories
  ADD CONSTRAINT memories_type_check
  CHECK (
    type = ANY (
      ARRAY[
        'note'::text,
        'link'::text,
        'image'::text,
        'pdf'::text,
        'voice_memo'::text,
        'bookmark'::text
      ]
    )
  );
