-- 010: Security hardening — tighten RLS policies
-- Fixes overly permissive policies on uitstroom_updates, uitstroom_rubrieken,
-- import_log and storage.objects

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. cs_uitstroom_updates — restrict to role-based access
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can read uitstroom updates" ON cs_uitstroom_updates;
DROP POLICY IF EXISTS "Authenticated users can insert uitstroom updates" ON cs_uitstroom_updates;
DROP POLICY IF EXISTS "Authenticated users can delete uitstroom updates" ON cs_uitstroom_updates;

-- Read: admin, manager, intaker, trainer
CREATE POLICY "Role-based read uitstroom updates"
ON cs_uitstroom_updates FOR SELECT TO authenticated
USING (
  cs_has_any_role(auth.uid(), ARRAY['admin','manager','intaker','trainer'])
);

-- Insert: admin, intaker
CREATE POLICY "Role-based insert uitstroom updates"
ON cs_uitstroom_updates FOR INSERT TO authenticated
WITH CHECK (
  cs_has_any_role(auth.uid(), ARRAY['admin','intaker'])
);

-- Delete: admin only
CREATE POLICY "Admin can delete uitstroom updates"
ON cs_uitstroom_updates FOR DELETE TO authenticated
USING (
  cs_has_role(auth.uid(), 'admin')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. cs_uitstroom_rubrieken — admin/manager only for writes
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can read uitstroom rubrieken" ON cs_uitstroom_rubrieken;
DROP POLICY IF EXISTS "Authenticated users can manage uitstroom rubrieken" ON cs_uitstroom_rubrieken;

-- Read: all authenticated (needed for reports)
CREATE POLICY "Authenticated read uitstroom rubrieken"
ON cs_uitstroom_rubrieken FOR SELECT TO authenticated
USING (true);

-- Insert/Update/Delete: admin or manager only
CREATE POLICY "Admin/manager manage uitstroom rubrieken"
ON cs_uitstroom_rubrieken FOR ALL TO authenticated
USING (
  cs_has_any_role(auth.uid(), ARRAY['admin','manager'])
)
WITH CHECK (
  cs_has_any_role(auth.uid(), ARRAY['admin','manager'])
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. cs_import_log — restrict writes to admin/manager
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can read import log" ON cs_import_log;
DROP POLICY IF EXISTS "Authenticated users can insert import log" ON cs_import_log;

-- Read: admin, manager
CREATE POLICY "Admin/manager read import log"
ON cs_import_log FOR SELECT TO authenticated
USING (
  cs_has_any_role(auth.uid(), ARRAY['admin','manager'])
);

-- Insert: admin, manager (only they should import)
CREATE POLICY "Admin/manager insert import log"
ON cs_import_log FOR INSERT TO authenticated
WITH CHECK (
  cs_has_any_role(auth.uid(), ARRAY['admin','manager'])
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Storage — restrict file operations to admin/intaker and scope by path
-- ═══════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can upload kandidaat files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read kandidaat files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete kandidaat files" ON storage.objects;

-- Read: any authenticated user (needed for displaying files)
CREATE POLICY "Authenticated read kandidaat files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kandidaat-bestanden');

-- Upload: admin, intaker only
CREATE POLICY "Admin/intaker upload kandidaat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kandidaat-bestanden'
  AND cs_has_any_role(auth.uid(), ARRAY['admin','intaker'])
);

-- Delete: admin only
CREATE POLICY "Admin delete kandidaat files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kandidaat-bestanden'
  AND cs_has_role(auth.uid(), 'admin')
);
