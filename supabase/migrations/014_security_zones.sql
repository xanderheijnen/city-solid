-- ============================================================================
-- 014: Security Zones — 3-zone security model
-- ============================================================================
-- Zone 1 (Public): cs_kandidaten (non-sensitive fields)
-- Zone 2 (Restricted): cs_kandidaten_sensitive (BSN, medisch, justitie, schulden)
-- Zone 3 (Audit): cs_sensitive_access_log (append-only access log)
-- ============================================================================


-- ============================================================================
-- 1. CREATE cs_kandidaten_sensitive TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cs_kandidaten_sensitive (
  kandidaat_id UUID PRIMARY KEY REFERENCES cs_kandidaten(id) ON DELETE CASCADE,
  bsn_last4 TEXT,
  bsn_encrypted TEXT,
  medische_bijzonderheden TEXT,
  middelengebruik TEXT,
  aanraking_politie_justitie BOOLEAN DEFAULT false,
  aanraking_reden TEXT,
  veroordeeld_detentie TEXT,
  lopende_zaken TEXT,
  heeft_schulden BOOLEAN DEFAULT false,
  schulden_reden_bedrag TEXT,
  schulden_afspraken TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE cs_kandidaten_sensitive IS 'Zone 2: gevoelige persoonsgegevens — alleen admin en intaker';


-- ============================================================================
-- 2. MIGRATE EXISTING DATA FROM cs_kandidaten
-- ============================================================================

-- First: candidates that have any sensitive data populated
INSERT INTO cs_kandidaten_sensitive (
  kandidaat_id, bsn_last4, bsn_encrypted,
  medische_bijzonderheden, middelengebruik,
  aanraking_politie_justitie, aanraking_reden,
  veroordeeld_detentie, lopende_zaken,
  heeft_schulden, schulden_reden_bedrag, schulden_afspraken
)
SELECT
  id,
  CASE WHEN bsn IS NOT NULL THEN RIGHT(bsn, 4) ELSE NULL END,
  bsn,  -- Will be encrypted later via Edge Function
  medische_bijzonderheden, middelengebruik,
  aanraking_politie_justitie, aanraking_reden,
  veroordeeld_detentie, lopende_zaken,
  heeft_schulden, schulden_reden_bedrag, schulden_afspraken
FROM cs_kandidaten
WHERE bsn IS NOT NULL
  OR medische_bijzonderheden IS NOT NULL
  OR middelengebruik IS NOT NULL
  OR aanraking_politie_justitie = true
  OR heeft_schulden = true
ON CONFLICT (kandidaat_id) DO NOTHING;

-- Second: ensure every candidate has a sensitive row (even if empty)
INSERT INTO cs_kandidaten_sensitive (kandidaat_id)
SELECT id FROM cs_kandidaten
WHERE id NOT IN (SELECT kandidaat_id FROM cs_kandidaten_sensitive)
ON CONFLICT (kandidaat_id) DO NOTHING;


-- ============================================================================
-- 3. ENABLE RLS ON cs_kandidaten_sensitive
-- ============================================================================

ALTER TABLE cs_kandidaten_sensitive ENABLE ROW LEVEL SECURITY;

-- Admin: full access (ALL)
CREATE POLICY "cs_kandidaten_sensitive_admin_all"
  ON cs_kandidaten_sensitive FOR ALL TO authenticated
  USING (cs_has_role(auth.uid(), 'admin'::cs_role))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'::cs_role));

-- Intaker: SELECT
CREATE POLICY "cs_kandidaten_sensitive_intaker_select"
  ON cs_kandidaten_sensitive FOR SELECT TO authenticated
  USING (cs_has_role(auth.uid(), 'intaker'::cs_role));

-- Intaker: INSERT
CREATE POLICY "cs_kandidaten_sensitive_intaker_insert"
  ON cs_kandidaten_sensitive FOR INSERT TO authenticated
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'::cs_role));

-- Intaker: UPDATE
CREATE POLICY "cs_kandidaten_sensitive_intaker_update"
  ON cs_kandidaten_sensitive FOR UPDATE TO authenticated
  USING (cs_has_role(auth.uid(), 'intaker'::cs_role))
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'::cs_role));

-- trainer, manager, readonly: NO ACCESS (RLS enabled + no policies = denied)


-- ============================================================================
-- 4. CREATE cs_sensitive_access_log TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cs_sensitive_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kandidaat_id UUID REFERENCES cs_kandidaten(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason_code TEXT,
  ip_adres INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE cs_sensitive_access_log IS 'Zone 3: append-only log van toegang tot gevoelige gegevens';


-- ============================================================================
-- 5. PROTECT ACCESS LOG (INSERT-ONLY — prevent UPDATE/DELETE)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_sensitive_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Sensitive access log mag niet worden gewijzigd of verwijderd';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_sensitive_log_update
  BEFORE UPDATE ON cs_sensitive_access_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sensitive_log_modification();

CREATE TRIGGER trg_prevent_sensitive_log_delete
  BEFORE DELETE ON cs_sensitive_access_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_sensitive_log_modification();


-- ============================================================================
-- 6. RLS ON cs_sensitive_access_log
-- ============================================================================

ALTER TABLE cs_sensitive_access_log ENABLE ROW LEVEL SECURITY;

-- All authenticated users: INSERT (to log their own access)
CREATE POLICY "cs_sensitive_access_log_authenticated_insert"
  ON cs_sensitive_access_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- Admin: SELECT (to review access logs)
CREATE POLICY "cs_sensitive_access_log_admin_select"
  ON cs_sensitive_access_log FOR SELECT TO authenticated
  USING (cs_has_role(auth.uid(), 'admin'::cs_role));


-- ============================================================================
-- 7. UPDATED_AT TRIGGER ON cs_kandidaten_sensitive
-- ============================================================================

CREATE TRIGGER trg_cs_kandidaten_sensitive_updated_at
  BEFORE UPDATE ON cs_kandidaten_sensitive
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 8. INDEXES
-- ============================================================================

-- kandidaat_id on cs_kandidaten_sensitive is already the PRIMARY KEY (indexed)

CREATE INDEX idx_cs_sensitive_access_log_user_id
  ON cs_sensitive_access_log(user_id);

CREATE INDEX idx_cs_sensitive_access_log_created_at
  ON cs_sensitive_access_log(created_at);

CREATE INDEX idx_cs_sensitive_access_log_kandidaat_id
  ON cs_sensitive_access_log(kandidaat_id);
