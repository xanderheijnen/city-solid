-- Add uitstroom_status to kandidaten
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS uitstroom_status TEXT;

-- Create uitstroom updates table for gespreksupdates
CREATE TABLE IF NOT EXISTS cs_uitstroom_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id UUID NOT NULL REFERENCES cs_kandidaten(id) ON DELETE CASCADE,
  datum DATE NOT NULL DEFAULT CURRENT_DATE,
  tijd TEXT,
  inhoud TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE cs_uitstroom_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read uitstroom updates"
ON cs_uitstroom_updates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert uitstroom updates"
ON cs_uitstroom_updates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete uitstroom updates"
ON cs_uitstroom_updates FOR DELETE TO authenticated USING (true);
