-- Add file URL columns for foto, ID scan, and CV
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS id_scan_url TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Create storage bucket for kandidaat files (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kandidaat-bestanden', 'kandidaat-bestanden', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/read from the bucket
CREATE POLICY "Authenticated users can upload kandidaat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kandidaat-bestanden');

CREATE POLICY "Authenticated users can read kandidaat files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kandidaat-bestanden');

CREATE POLICY "Authenticated users can delete kandidaat files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kandidaat-bestanden');
