-- Fix: cs_aanwezigheid TABLE conflicts with cs_aanwezigheid ENUM type.
-- Rename table to cs_aanwezigheidsregistratie.

-- 1. Create the table with the new name
CREATE TABLE cs_aanwezigheidsregistratie (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_training_id UUID NOT NULL REFERENCES cs_kandidaat_trainingen(id) ON DELETE CASCADE,
  datum                 DATE NOT NULL,
  status                cs_aanwezigheid NOT NULL,
  notitie               TEXT,
  geregistreerd_door    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(kandidaat_training_id, datum)
);

-- 2. Indexes
CREATE INDEX idx_cs_aanwezigheidsregistratie_kt ON cs_aanwezigheidsregistratie(kandidaat_training_id);
CREATE INDEX idx_cs_aanwezigheidsregistratie_datum ON cs_aanwezigheidsregistratie(datum);
CREATE INDEX idx_cs_aanwezigheidsregistratie_status ON cs_aanwezigheidsregistratie(status);

-- 3. Updated_at trigger
CREATE TRIGGER trg_cs_aanwezigheidsregistratie_updated_at
  BEFORE UPDATE ON cs_aanwezigheidsregistratie
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS
ALTER TABLE cs_aanwezigheidsregistratie ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Admin: full access
CREATE POLICY "cs_aanwezigheidsregistratie_admin_all"
  ON cs_aanwezigheidsregistratie FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Trainer: full CRUD on own groups
CREATE POLICY "cs_aanwezigheidsregistratie_trainer_select"
  ON cs_aanwezigheidsregistratie FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheidsregistratie.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_aanwezigheidsregistratie_trainer_insert"
  ON cs_aanwezigheidsregistratie FOR INSERT
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheidsregistratie.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_aanwezigheidsregistratie_trainer_update"
  ON cs_aanwezigheidsregistratie FOR UPDATE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheidsregistratie.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheidsregistratie.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_aanwezigheidsregistratie_trainer_delete"
  ON cs_aanwezigheidsregistratie FOR DELETE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheidsregistratie.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

-- Intaker: read
CREATE POLICY "cs_aanwezigheidsregistratie_intaker_select"
  ON cs_aanwezigheidsregistratie FOR SELECT
  USING (cs_has_role(auth.uid(), 'intaker'));

-- Manager: read all
CREATE POLICY "cs_aanwezigheidsregistratie_manager_select"
  ON cs_aanwezigheidsregistratie FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read all
CREATE POLICY "cs_aanwezigheidsregistratie_readonly_select"
  ON cs_aanwezigheidsregistratie FOR SELECT
  USING (cs_has_role(auth.uid(), 'readonly'));
