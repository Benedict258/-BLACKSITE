-- Create public storage bucket 'media' (idempotent)
DO $$
BEGIN
  -- Try to create via helper; ignore error if exists
  PERFORM storage.create_bucket('media', public => true);
EXCEPTION WHEN others THEN
  -- If the bucket already exists, ignore
  NULL;
END $$;

-- Ensure bucket settings (max size and allowed mime types)
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 52428800, -- 50MB
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm']
WHERE id = 'media';

-- Policies to allow public read and insert for the 'media' bucket
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read for media'
  ) THEN
    CREATE POLICY "Public read for media"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'media');
  END IF;

  -- Public insert (uploads)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public insert for media'
  ) THEN
    CREATE POLICY "Public insert for media"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'media');
  END IF;
END $$;
