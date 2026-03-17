-- Add aanmeld_organisatie column to cs_kandidaten
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS aanmeld_organisatie TEXT;
