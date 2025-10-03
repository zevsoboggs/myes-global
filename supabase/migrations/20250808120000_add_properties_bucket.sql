-- Create public bucket for property images (id: properties)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'properties',
  'properties',
  true,
  10485760, -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Read: public (anon + authenticated)
DROP POLICY IF EXISTS "Public read properties images" ON storage.objects;
CREATE POLICY "Public read properties images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'properties');

-- Upload: authenticated users
DROP POLICY IF EXISTS "Authenticated upload properties images" ON storage.objects;
CREATE POLICY "Authenticated upload properties images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'properties');

-- Update metadata: authenticated users
DROP POLICY IF EXISTS "Authenticated update properties images" ON storage.objects;
CREATE POLICY "Authenticated update properties images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'properties')
WITH CHECK (bucket_id = 'properties');

-- Delete: authenticated users
DROP POLICY IF EXISTS "Authenticated delete properties images" ON storage.objects;
CREATE POLICY "Authenticated delete properties images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'properties'); 