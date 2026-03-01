-- Add storage policy for authenticated users to upload files
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'memories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add storage policy for authenticated users to view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'memories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add storage policy for authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'memories' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);