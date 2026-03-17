-- Add intake_tijd column to cs_kandidaten
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS intake_tijd TEXT;
