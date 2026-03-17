-- Add missing fields from citysolid.nl aanmelden form
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS leeftijd TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS aanmeld_type TEXT; -- 'zelf' or 'ander'
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS aanmelder_naam TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS aanmelder_telefoon TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS aanmelder_email TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS gewenst_project TEXT[]; -- Certi & Skills, Cityteam, City Side Jobs
