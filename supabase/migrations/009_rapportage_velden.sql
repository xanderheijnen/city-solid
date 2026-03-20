-- 009: Rapportage velden en tabellen
-- Nieuwe kolommen op cs_kandidaten voor rapportage dashboard

ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS activiteit TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS csn TEXT UNIQUE;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS no_show BOOLEAN DEFAULT false;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS eenoudergezin BOOLEAN DEFAULT false;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS verandering TEXT;

-- Uitstroom rubrieken tabel
CREATE TABLE IF NOT EXISTS cs_uitstroom_rubrieken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uitstroom_waarde TEXT NOT NULL UNIQUE,
  rubriek TEXT NOT NULL CHECK (rubriek IN ('uitstroom', 'in_proces', 'uitval')),
  toon_in_grafieken BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed standaard rubrieken
INSERT INTO cs_uitstroom_rubrieken (uitstroom_waarde, rubriek, toon_in_grafieken) VALUES
  ('werk', 'uitstroom', true),
  ('school', 'uitstroom', true),
  ('vrijwilligers_werk', 'uitstroom', true),
  ('garantie_baan', 'uitstroom', true),
  ('beschut_werk', 'uitstroom', true),
  ('binnen', 'uitstroom', true),
  ('lopend', 'in_proces', true),
  ('no_show', 'uitval', false),
  ('uitval', 'uitval', false)
ON CONFLICT (uitstroom_waarde) DO NOTHING;

-- Import log tabel
CREATE TABLE IF NOT EXISTS cs_import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bestandsnaam TEXT NOT NULL,
  bron TEXT DEFAULT 'excel',
  aantal_rijen INTEGER DEFAULT 0,
  aantal_succesvol INTEGER DEFAULT 0,
  aantal_mislukt INTEGER DEFAULT 0,
  fouten JSONB DEFAULT '[]'::jsonb,
  activiteit TEXT,
  geimporteerd_door UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE cs_uitstroom_rubrieken ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read uitstroom rubrieken"
  ON cs_uitstroom_rubrieken FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage uitstroom rubrieken"
  ON cs_uitstroom_rubrieken FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read import log"
  ON cs_import_log FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert import log"
  ON cs_import_log FOR INSERT
  TO authenticated WITH CHECK (true);
