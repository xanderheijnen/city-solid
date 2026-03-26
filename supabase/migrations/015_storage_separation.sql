-- 015: Aparte storage bucket voor identiteitsdocumenten (Zone C)
-- ID-scans en verificatiedocumenten worden gescheiden van reguliere bestanden

-- Nieuwe privé bucket voor verificatiedocumenten
INSERT INTO storage.buckets (id, name, public)
VALUES ('kandidaat-verificatie', 'kandidaat-verificatie', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies voor verificatie-bucket
-- Lezen: alleen admin en intaker
CREATE POLICY "Admin/intaker read verificatie files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kandidaat-verificatie'
  AND cs_has_any_role(auth.uid(), ARRAY['admin','intaker']::cs_role[])
);

-- Uploaden: alleen admin en intaker
CREATE POLICY "Admin/intaker upload verificatie files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kandidaat-verificatie'
  AND cs_has_any_role(auth.uid(), ARRAY['admin','intaker']::cs_role[])
);

-- Verwijderen: alleen admin
CREATE POLICY "Admin delete verificatie files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kandidaat-verificatie'
  AND cs_has_role(auth.uid(), 'admin'::cs_role)
);
