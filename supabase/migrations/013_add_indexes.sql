-- 013: Performance indexes op veelgebruikte kolommen
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_email ON cs_kandidaten(email);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_telefoon ON cs_kandidaten(telefoon);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_csn ON cs_kandidaten(csn);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_traject_status ON cs_kandidaten(traject_status);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_aanmeld_datum ON cs_kandidaten(aanmeld_datum);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_gebied ON cs_kandidaten(gebied);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_wijk ON cs_kandidaten(wijk);
CREATE INDEX IF NOT EXISTS idx_cs_kandidaten_created_at ON cs_kandidaten(created_at);
