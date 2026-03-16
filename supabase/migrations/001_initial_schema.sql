-- ============================================================================
-- City Solid - IMP Platform
-- Initial Database Schema Migration
-- ============================================================================
-- Training bureau administration for Rotterdam-Zuid
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE cs_role AS ENUM (
  'admin',
  'intaker',
  'trainer',
  'manager',
  'readonly'
);

CREATE TYPE cs_traject_status AS ENUM (
  'aanmelding',
  'intake_gepland',
  'intake_afgerond',
  'deelnemer',
  'in_training',
  'voortgang',
  'afronding',
  'uitgevallen'
);

CREATE TYPE cs_geslacht AS ENUM (
  'man',
  'vrouw',
  'anders',
  'onbekend'
);

CREATE TYPE cs_aanwezigheid AS ENUM (
  'aanwezig',
  'afwezig_gemeld',
  'afwezig_ongemeld',
  'te_laat',
  'ziek'
);

CREATE TYPE cs_resultaat AS ENUM (
  'behaald',
  'niet_behaald',
  'lopend',
  'gestopt'
);

CREATE TYPE cs_audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'status_change',
  'export',
  'login',
  'view_sensitive'
);


-- ============================================================================
-- 2. HELPER FUNCTIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- update_updated_at_column()
-- Trigger function to auto-set updated_at on row modification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- generate_kandidaat_display_id()
-- Auto-generates display IDs like KAN-0001, KAN-0002, ...
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_kandidaat_display_id()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(display_id FROM 5) AS INTEGER)), 0
  ) + 1
  INTO next_num
  FROM cs_kandidaten;

  NEW.display_id = 'KAN-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- generate_groepscode()
-- Auto-generates group codes like 2026-03a, 2026-03b based on start_datum
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_groepscode()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  existing_count INTEGER;
  letter_suffix CHAR(1);
BEGIN
  -- Only generate if not already set
  IF NEW.groepscode IS NOT NULL AND NEW.groepscode != '' THEN
    RETURN NEW;
  END IF;

  prefix = TO_CHAR(NEW.start_datum, 'YYYY-MM');

  SELECT COUNT(*)
  INTO existing_count
  FROM cs_trainingsgroepen
  WHERE groepscode LIKE prefix || '%';

  -- a = 97 in ASCII
  letter_suffix = CHR(97 + existing_count);

  NEW.groepscode = prefix || letter_suffix;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------------------------
-- cs_has_role(user_id, role)
-- Check if a user has a specific role
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cs_has_role(_user_id UUID, _role cs_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM cs_user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- cs_has_any_role(user_id, roles[])
-- Check if a user has any of the specified roles
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cs_has_any_role(_user_id UUID, _roles cs_role[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM cs_user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- cs_is_trainer_for_group(user_id, groep_id)
-- Check if a user is the assigned trainer for a training group
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cs_is_trainer_for_group(_user_id UUID, _groep_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM cs_trainingsgroepen
    WHERE id = _groep_id
      AND trainer_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ---------------------------------------------------------------------------
-- cs_log_audit(...)
-- Insert a row into the audit log (called from application code or triggers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cs_log_audit(
  _user_id UUID,
  _actie cs_audit_action,
  _object_type TEXT,
  _object_id UUID DEFAULT NULL,
  _oude_waarden JSONB DEFAULT NULL,
  _nieuwe_waarden JSONB DEFAULT NULL,
  _omschrijving TEXT DEFAULT NULL,
  _ip_adres INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  _id UUID;
BEGIN
  INSERT INTO cs_audit_log (
    user_id, actie, object_type, object_id,
    oude_waarden, nieuwe_waarden, omschrijving, ip_adres
  ) VALUES (
    _user_id, _actie, _object_type, _object_id,
    _oude_waarden, _nieuwe_waarden, _omschrijving, _ip_adres
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- cs_profiles
-- User profile information, extends auth.users
-- ---------------------------------------------------------------------------
CREATE TABLE cs_profiles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url   TEXT,
  telefoon     TEXT,
  functie      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_profiles_user_id ON cs_profiles(user_id);


-- ---------------------------------------------------------------------------
-- cs_user_roles
-- Many-to-many: users can have multiple roles
-- ---------------------------------------------------------------------------
CREATE TABLE cs_user_roles (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      cs_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, role)
);

CREATE INDEX idx_cs_user_roles_user_id ON cs_user_roles(user_id);
CREATE INDEX idx_cs_user_roles_role ON cs_user_roles(role);


-- ---------------------------------------------------------------------------
-- cs_trainingen
-- Training definitions (templates)
-- ---------------------------------------------------------------------------
CREATE TABLE cs_trainingen (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam           TEXT NOT NULL,
  omschrijving   TEXT,
  duur_weken     INTEGER,
  max_deelnemers INTEGER,
  locatie        TEXT,
  is_actief      BOOLEAN NOT NULL DEFAULT TRUE,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_trainingen_is_actief ON cs_trainingen(is_actief);
CREATE INDEX idx_cs_trainingen_naam ON cs_trainingen(naam);


-- ---------------------------------------------------------------------------
-- cs_trainingsgroepen
-- Concrete instances of trainings with a group of participants
-- ---------------------------------------------------------------------------
CREATE TABLE cs_trainingsgroepen (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id       UUID NOT NULL REFERENCES cs_trainingen(id) ON DELETE RESTRICT,
  groepscode        TEXT UNIQUE,
  start_datum       DATE NOT NULL,
  eind_datum        DATE,
  trainer_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'gepland' CHECK (status IN ('gepland', 'actief', 'afgerond')),
  max_deelnemers    INTEGER,
  dropbox_folder_url TEXT,
  notities          TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_trainingsgroepen_training_id ON cs_trainingsgroepen(training_id);
CREATE INDEX idx_cs_trainingsgroepen_trainer_id ON cs_trainingsgroepen(trainer_id);
CREATE INDEX idx_cs_trainingsgroepen_status ON cs_trainingsgroepen(status);
CREATE INDEX idx_cs_trainingsgroepen_start_datum ON cs_trainingsgroepen(start_datum);


-- ---------------------------------------------------------------------------
-- cs_kandidaten
-- THE MAIN TABLE - candidate / participant records
-- ---------------------------------------------------------------------------
CREATE TABLE cs_kandidaten (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id                  TEXT UNIQUE NOT NULL,
  traject_status              cs_traject_status NOT NULL DEFAULT 'aanmelding',

  -- Persoonlijke gegevens
  voornaam                    TEXT NOT NULL,
  achternaam                  TEXT NOT NULL,
  geslacht                    cs_geslacht DEFAULT 'onbekend',
  geboortedatum               DATE,

  -- Adresgegevens
  straat                      TEXT,
  postcode                    TEXT,
  ingeschreven_adres_brp      TEXT,
  wijk                        TEXT,
  gebied                      TEXT,

  -- Contactgegevens
  telefoon                    TEXT,
  email                       TEXT,
  contactpersoon              TEXT,
  whatsapp                    BOOLEAN DEFAULT FALSE,
  eigen_vervoer               BOOLEAN DEFAULT FALSE,
  rijbewijs                   BOOLEAN DEFAULT FALSE,

  -- Uitkering & toestemming
  uitkering                   TEXT[],
  toestemming                 BOOLEAN DEFAULT FALSE,

  -- Medisch
  medische_bijzonderheden     TEXT,

  -- Klantmanager
  klantmanager                TEXT,

  -- Doelstelling
  stip_aan_de_horizon         TEXT,

  -- Trajecten & hulpverlening
  trajecten                   TEXT,
  hulpverleners_betrokken     TEXT,
  afspraken_hulp              TEXT,

  -- Justitie
  aanraking_politie_justitie  BOOLEAN DEFAULT FALSE,
  aanraking_reden             TEXT,
  lopende_zaken               TEXT,

  -- Werkervaring
  werkervaring                TEXT,
  certificaten_behaald        TEXT,

  -- Intake
  aanmeld_datum               DATE DEFAULT CURRENT_DATE,
  intake_datum                DATE,
  intake_door                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  intake_notities             TEXT,

  -- Meta
  created_by                  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_kandidaten_display_id ON cs_kandidaten(display_id);
CREATE INDEX idx_cs_kandidaten_traject_status ON cs_kandidaten(traject_status);
CREATE INDEX idx_cs_kandidaten_achternaam ON cs_kandidaten(achternaam);
CREATE INDEX idx_cs_kandidaten_voornaam ON cs_kandidaten(voornaam);
CREATE INDEX idx_cs_kandidaten_wijk ON cs_kandidaten(wijk);
CREATE INDEX idx_cs_kandidaten_gebied ON cs_kandidaten(gebied);
CREATE INDEX idx_cs_kandidaten_aanmeld_datum ON cs_kandidaten(aanmeld_datum);
CREATE INDEX idx_cs_kandidaten_created_by ON cs_kandidaten(created_by);
CREATE INDEX idx_cs_kandidaten_intake_door ON cs_kandidaten(intake_door);


-- ---------------------------------------------------------------------------
-- cs_kandidaat_trainingen
-- Links candidates to training groups (enrollments)
-- ---------------------------------------------------------------------------
CREATE TABLE cs_kandidaat_trainingen (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id      UUID NOT NULL REFERENCES cs_kandidaten(id) ON DELETE CASCADE,
  trainingsgroep_id UUID NOT NULL REFERENCES cs_trainingsgroepen(id) ON DELETE CASCADE,
  resultaat         cs_resultaat NOT NULL DEFAULT 'lopend',
  start_datum       DATE,
  eind_datum        DATE,
  reden_stoppen     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(kandidaat_id, trainingsgroep_id)
);

CREATE INDEX idx_cs_kandidaat_trainingen_kandidaat_id ON cs_kandidaat_trainingen(kandidaat_id);
CREATE INDEX idx_cs_kandidaat_trainingen_trainingsgroep_id ON cs_kandidaat_trainingen(trainingsgroep_id);
CREATE INDEX idx_cs_kandidaat_trainingen_resultaat ON cs_kandidaat_trainingen(resultaat);


-- ---------------------------------------------------------------------------
-- cs_aanwezigheid
-- Attendance records per candidate-training per day
-- ---------------------------------------------------------------------------
CREATE TABLE cs_aanwezigheid (
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

CREATE INDEX idx_cs_aanwezigheid_kandidaat_training_id ON cs_aanwezigheid(kandidaat_training_id);
CREATE INDEX idx_cs_aanwezigheid_datum ON cs_aanwezigheid(datum);
CREATE INDEX idx_cs_aanwezigheid_status ON cs_aanwezigheid(status);


-- ---------------------------------------------------------------------------
-- cs_voortgang
-- Progress records: milestones, assessments, certificates
-- ---------------------------------------------------------------------------
CREATE TABLE cs_voortgang (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_training_id UUID NOT NULL REFERENCES cs_kandidaat_trainingen(id) ON DELETE CASCADE,
  omschrijving          TEXT NOT NULL,
  datum                 DATE NOT NULL DEFAULT CURRENT_DATE,
  type                  TEXT NOT NULL CHECK (type IN ('mijlpaal', 'beoordeling', 'certificaat')),
  score                 INTEGER CHECK (score IS NULL OR (score >= 1 AND score <= 10)),
  behaald               BOOLEAN DEFAULT FALSE,
  beoordeeld_door       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_voortgang_kandidaat_training_id ON cs_voortgang(kandidaat_training_id);
CREATE INDEX idx_cs_voortgang_datum ON cs_voortgang(datum);
CREATE INDEX idx_cs_voortgang_type ON cs_voortgang(type);


-- ---------------------------------------------------------------------------
-- cs_notities
-- Notes on candidates (optionally linked to a training group)
-- ---------------------------------------------------------------------------
CREATE TABLE cs_notities (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id      UUID NOT NULL REFERENCES cs_kandidaten(id) ON DELETE CASCADE,
  trainingsgroep_id UUID REFERENCES cs_trainingsgroepen(id) ON DELETE SET NULL,
  inhoud            TEXT NOT NULL,
  categorie         TEXT NOT NULL DEFAULT 'algemeen' CHECK (categorie IN ('algemeen', 'voortgang', 'zorg', 'positief')),
  is_vertrouwelijk  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_notities_kandidaat_id ON cs_notities(kandidaat_id);
CREATE INDEX idx_cs_notities_trainingsgroep_id ON cs_notities(trainingsgroep_id);
CREATE INDEX idx_cs_notities_categorie ON cs_notities(categorie);
CREATE INDEX idx_cs_notities_is_vertrouwelijk ON cs_notities(is_vertrouwelijk);
CREATE INDEX idx_cs_notities_created_by ON cs_notities(created_by);


-- ---------------------------------------------------------------------------
-- cs_opties
-- Lookup / option values (wijken, gebieden, uitkering types, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE cs_opties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie  TEXT NOT NULL,
  waarde     TEXT NOT NULL,
  volgorde   INTEGER NOT NULL DEFAULT 0,
  is_actief  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(categorie, waarde)
);

CREATE INDEX idx_cs_opties_categorie ON cs_opties(categorie);
CREATE INDEX idx_cs_opties_is_actief ON cs_opties(is_actief);


-- ---------------------------------------------------------------------------
-- cs_audit_log
-- Immutable audit trail - INSERT only, no UPDATE or DELETE
-- ---------------------------------------------------------------------------
CREATE TABLE cs_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actie           cs_audit_action NOT NULL,
  object_type     TEXT NOT NULL,
  object_id       UUID,
  oude_waarden    JSONB,
  nieuwe_waarden  JSONB,
  omschrijving    TEXT,
  ip_adres        INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_audit_log_user_id ON cs_audit_log(user_id);
CREATE INDEX idx_cs_audit_log_actie ON cs_audit_log(actie);
CREATE INDEX idx_cs_audit_log_object_type ON cs_audit_log(object_type);
CREATE INDEX idx_cs_audit_log_object_id ON cs_audit_log(object_id);
CREATE INDEX idx_cs_audit_log_created_at ON cs_audit_log(created_at);


-- ---------------------------------------------------------------------------
-- cs_documenten
-- Document metadata (files stored in Supabase Storage)
-- ---------------------------------------------------------------------------
CREATE TABLE cs_documenten (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kandidaat_id     UUID NOT NULL REFERENCES cs_kandidaten(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  bestandsnaam     TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  gegenereerd_door UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cs_documenten_kandidaat_id ON cs_documenten(kandidaat_id);
CREATE INDEX idx_cs_documenten_type ON cs_documenten(type);


-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

-- Auto-generate display_id for kandidaten
CREATE TRIGGER trg_generate_kandidaat_display_id
  BEFORE INSERT ON cs_kandidaten
  FOR EACH ROW
  EXECUTE FUNCTION generate_kandidaat_display_id();

-- Auto-generate groepscode for trainingsgroepen
CREATE TRIGGER trg_generate_groepscode
  BEFORE INSERT ON cs_trainingsgroepen
  FOR EACH ROW
  EXECUTE FUNCTION generate_groepscode();

-- Auto-update updated_at on all relevant tables
CREATE TRIGGER trg_cs_profiles_updated_at
  BEFORE UPDATE ON cs_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_trainingen_updated_at
  BEFORE UPDATE ON cs_trainingen
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_trainingsgroepen_updated_at
  BEFORE UPDATE ON cs_trainingsgroepen
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_kandidaten_updated_at
  BEFORE UPDATE ON cs_kandidaten
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_kandidaat_trainingen_updated_at
  BEFORE UPDATE ON cs_kandidaat_trainingen
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_aanwezigheid_updated_at
  BEFORE UPDATE ON cs_aanwezigheid
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_voortgang_updated_at
  BEFORE UPDATE ON cs_voortgang
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_notities_updated_at
  BEFORE UPDATE ON cs_notities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_opties_updated_at
  BEFORE UPDATE ON cs_opties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cs_documenten_updated_at
  BEFORE UPDATE ON cs_documenten
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 5. PREVENT UPDATE/DELETE ON AUDIT LOG
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log records cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_audit_log_update
  BEFORE UPDATE ON cs_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_prevent_audit_log_delete
  BEFORE DELETE ON cs_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();


-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE cs_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_trainingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_trainingsgroepen ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_kandidaten ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_kandidaat_trainingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_aanwezigheid ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_voortgang ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_notities ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_opties ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_documenten ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_profiles
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_profiles_admin_all"
  ON cs_profiles FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Users can read and update their own profile
CREATE POLICY "cs_profiles_own_select"
  ON cs_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "cs_profiles_own_update"
  ON cs_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Manager/Readonly: read all profiles
CREATE POLICY "cs_profiles_manager_readonly_select"
  ON cs_profiles FOR SELECT
  USING (cs_has_any_role(auth.uid(), ARRAY['manager', 'readonly']::cs_role[]));

-- Intaker/Trainer: read all profiles (for display names etc.)
CREATE POLICY "cs_profiles_intaker_trainer_select"
  ON cs_profiles FOR SELECT
  USING (cs_has_any_role(auth.uid(), ARRAY['intaker', 'trainer']::cs_role[]));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_user_roles
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_user_roles_admin_all"
  ON cs_user_roles FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Users can read their own roles
CREATE POLICY "cs_user_roles_own_select"
  ON cs_user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Manager: read all roles
CREATE POLICY "cs_user_roles_manager_select"
  ON cs_user_roles FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_trainingen
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_trainingen_admin_all"
  ON cs_trainingen FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Intaker/Trainer/Manager/Readonly: read all trainingen
CREATE POLICY "cs_trainingen_read_select"
  ON cs_trainingen FOR SELECT
  USING (cs_has_any_role(auth.uid(), ARRAY['intaker', 'trainer', 'manager', 'readonly']::cs_role[]));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_trainingsgroepen
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_trainingsgroepen_admin_all"
  ON cs_trainingsgroepen FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Intaker/Manager/Readonly: read all groepen
CREATE POLICY "cs_trainingsgroepen_read_select"
  ON cs_trainingsgroepen FOR SELECT
  USING (cs_has_any_role(auth.uid(), ARRAY['intaker', 'manager', 'readonly']::cs_role[]));

-- Trainer: read all groepen (need to see available groups)
CREATE POLICY "cs_trainingsgroepen_trainer_select"
  ON cs_trainingsgroepen FOR SELECT
  USING (cs_has_role(auth.uid(), 'trainer'));

-- Trainer: update only own groepen
CREATE POLICY "cs_trainingsgroepen_trainer_update"
  ON cs_trainingsgroepen FOR UPDATE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND trainer_id = auth.uid()
  )
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND trainer_id = auth.uid()
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_kandidaten
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_kandidaten_admin_all"
  ON cs_kandidaten FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Intaker: create, read, update
CREATE POLICY "cs_kandidaten_intaker_select"
  ON cs_kandidaten FOR SELECT
  USING (cs_has_role(auth.uid(), 'intaker'));

CREATE POLICY "cs_kandidaten_intaker_insert"
  ON cs_kandidaten FOR INSERT
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'));

CREATE POLICY "cs_kandidaten_intaker_update"
  ON cs_kandidaten FOR UPDATE
  USING (cs_has_role(auth.uid(), 'intaker'))
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'));

-- Trainer: read only kandidaten in their own groups
CREATE POLICY "cs_kandidaten_trainer_select"
  ON cs_kandidaten FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.kandidaat_id = cs_kandidaten.id
        AND tg.trainer_id = auth.uid()
    )
  );

-- Manager: read all
CREATE POLICY "cs_kandidaten_manager_select"
  ON cs_kandidaten FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read all
CREATE POLICY "cs_kandidaten_readonly_select"
  ON cs_kandidaten FOR SELECT
  USING (cs_has_role(auth.uid(), 'readonly'));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_kandidaat_trainingen
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_kandidaat_trainingen_admin_all"
  ON cs_kandidaat_trainingen FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Intaker: create and read
CREATE POLICY "cs_kandidaat_trainingen_intaker_select"
  ON cs_kandidaat_trainingen FOR SELECT
  USING (cs_has_role(auth.uid(), 'intaker'));

CREATE POLICY "cs_kandidaat_trainingen_intaker_insert"
  ON cs_kandidaat_trainingen FOR INSERT
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'));

-- Trainer: read and update for own groups
CREATE POLICY "cs_kandidaat_trainingen_trainer_select"
  ON cs_kandidaat_trainingen FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1 FROM cs_trainingsgroepen
      WHERE id = cs_kandidaat_trainingen.trainingsgroep_id
        AND trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_kandidaat_trainingen_trainer_update"
  ON cs_kandidaat_trainingen FOR UPDATE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1 FROM cs_trainingsgroepen
      WHERE id = cs_kandidaat_trainingen.trainingsgroep_id
        AND trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1 FROM cs_trainingsgroepen
      WHERE id = cs_kandidaat_trainingen.trainingsgroep_id
        AND trainer_id = auth.uid()
    )
  );

-- Manager: read all
CREATE POLICY "cs_kandidaat_trainingen_manager_select"
  ON cs_kandidaat_trainingen FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read all
CREATE POLICY "cs_kandidaat_trainingen_readonly_select"
  ON cs_kandidaat_trainingen FOR SELECT
  USING (cs_has_role(auth.uid(), 'readonly'));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_aanwezigheid
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_aanwezigheid_admin_all"
  ON cs_aanwezigheid FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Trainer: full CRUD on own groups
CREATE POLICY "cs_aanwezigheid_trainer_select"
  ON cs_aanwezigheid FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheid.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_aanwezigheid_trainer_insert"
  ON cs_aanwezigheid FOR INSERT
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheid.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_aanwezigheid_trainer_update"
  ON cs_aanwezigheid FOR UPDATE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheid.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheid.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_aanwezigheid_trainer_delete"
  ON cs_aanwezigheid FOR DELETE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_aanwezigheid.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

-- Intaker: read
CREATE POLICY "cs_aanwezigheid_intaker_select"
  ON cs_aanwezigheid FOR SELECT
  USING (cs_has_role(auth.uid(), 'intaker'));

-- Manager: read all
CREATE POLICY "cs_aanwezigheid_manager_select"
  ON cs_aanwezigheid FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read all
CREATE POLICY "cs_aanwezigheid_readonly_select"
  ON cs_aanwezigheid FOR SELECT
  USING (cs_has_role(auth.uid(), 'readonly'));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_voortgang
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_voortgang_admin_all"
  ON cs_voortgang FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Trainer: full CRUD on own groups
CREATE POLICY "cs_voortgang_trainer_select"
  ON cs_voortgang FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_voortgang.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_voortgang_trainer_insert"
  ON cs_voortgang FOR INSERT
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_voortgang.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_voortgang_trainer_update"
  ON cs_voortgang FOR UPDATE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_voortgang.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  )
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_voortgang.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

CREATE POLICY "cs_voortgang_trainer_delete"
  ON cs_voortgang FOR DELETE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.id = cs_voortgang.kandidaat_training_id
        AND tg.trainer_id = auth.uid()
    )
  );

-- Intaker: read
CREATE POLICY "cs_voortgang_intaker_select"
  ON cs_voortgang FOR SELECT
  USING (cs_has_role(auth.uid(), 'intaker'));

-- Manager: read all
CREATE POLICY "cs_voortgang_manager_select"
  ON cs_voortgang FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read all
CREATE POLICY "cs_voortgang_readonly_select"
  ON cs_voortgang FOR SELECT
  USING (cs_has_role(auth.uid(), 'readonly'));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_notities
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_notities_admin_all"
  ON cs_notities FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Intaker: create and read (non-confidential OR own)
CREATE POLICY "cs_notities_intaker_select"
  ON cs_notities FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'intaker')
    AND (is_vertrouwelijk = FALSE OR created_by = auth.uid())
  );

CREATE POLICY "cs_notities_intaker_insert"
  ON cs_notities FOR INSERT
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'));

-- Trainer: full CRUD on own groups
CREATE POLICY "cs_notities_trainer_select"
  ON cs_notities FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND (
      -- Notes for candidates in trainer's groups
      EXISTS (
        SELECT 1
        FROM cs_kandidaat_trainingen kt
        JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
        WHERE kt.kandidaat_id = cs_notities.kandidaat_id
          AND tg.trainer_id = auth.uid()
      )
    )
    AND (is_vertrouwelijk = FALSE OR created_by = auth.uid())
  );

CREATE POLICY "cs_notities_trainer_insert"
  ON cs_notities FOR INSERT
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND (
      -- Can only add notes for candidates in trainer's groups
      EXISTS (
        SELECT 1
        FROM cs_kandidaat_trainingen kt
        JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
        WHERE kt.kandidaat_id = cs_notities.kandidaat_id
          AND tg.trainer_id = auth.uid()
      )
    )
  );

CREATE POLICY "cs_notities_trainer_update"
  ON cs_notities FOR UPDATE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND created_by = auth.uid()
  )
  WITH CHECK (
    cs_has_role(auth.uid(), 'trainer')
    AND created_by = auth.uid()
  );

CREATE POLICY "cs_notities_trainer_delete"
  ON cs_notities FOR DELETE
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND created_by = auth.uid()
  );

-- Manager: read all (including confidential)
CREATE POLICY "cs_notities_manager_select"
  ON cs_notities FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read non-confidential only
CREATE POLICY "cs_notities_readonly_select"
  ON cs_notities FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'readonly')
    AND is_vertrouwelijk = FALSE
  );


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_opties
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_opties_admin_all"
  ON cs_opties FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- All authenticated users: read
CREATE POLICY "cs_opties_authenticated_select"
  ON cs_opties FOR SELECT
  USING (auth.uid() IS NOT NULL);


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_audit_log
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- INSERT only via function (service role or SECURITY DEFINER function)
-- No direct INSERT policy for regular users - they use cs_log_audit()

-- Admin: read
CREATE POLICY "cs_audit_log_admin_select"
  ON cs_audit_log FOR SELECT
  USING (cs_has_role(auth.uid(), 'admin'));

-- Manager: read
CREATE POLICY "cs_audit_log_manager_select"
  ON cs_audit_log FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));


-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- cs_documenten
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin: full access
CREATE POLICY "cs_documenten_admin_all"
  ON cs_documenten FOR ALL
  USING (cs_has_role(auth.uid(), 'admin'))
  WITH CHECK (cs_has_role(auth.uid(), 'admin'));

-- Intaker: create and read
CREATE POLICY "cs_documenten_intaker_select"
  ON cs_documenten FOR SELECT
  USING (cs_has_role(auth.uid(), 'intaker'));

CREATE POLICY "cs_documenten_intaker_insert"
  ON cs_documenten FOR INSERT
  WITH CHECK (cs_has_role(auth.uid(), 'intaker'));

-- Trainer: read for own groups
CREATE POLICY "cs_documenten_trainer_select"
  ON cs_documenten FOR SELECT
  USING (
    cs_has_role(auth.uid(), 'trainer')
    AND EXISTS (
      SELECT 1
      FROM cs_kandidaat_trainingen kt
      JOIN cs_trainingsgroepen tg ON tg.id = kt.trainingsgroep_id
      WHERE kt.kandidaat_id = cs_documenten.kandidaat_id
        AND tg.trainer_id = auth.uid()
    )
  );

-- Manager: read all
CREATE POLICY "cs_documenten_manager_select"
  ON cs_documenten FOR SELECT
  USING (cs_has_role(auth.uid(), 'manager'));

-- Readonly: read all
CREATE POLICY "cs_documenten_readonly_select"
  ON cs_documenten FOR SELECT
  USING (cs_has_role(auth.uid(), 'readonly'));


-- ============================================================================
-- 8. SEED DATA - cs_opties
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Wijken (Rotterdam-Zuid)
-- ---------------------------------------------------------------------------
INSERT INTO cs_opties (categorie, waarde, volgorde) VALUES
  ('wijk', 'Afrikaanderwijk', 1),
  ('wijk', 'Bloemhof', 2),
  ('wijk', 'Carnisse', 3),
  ('wijk', 'Feijenoord', 4),
  ('wijk', 'Hillesluis', 5),
  ('wijk', 'Katendrecht', 6),
  ('wijk', 'Kop van Zuid', 7),
  ('wijk', 'Lombardijen', 8),
  ('wijk', 'Noordereiland', 9),
  ('wijk', 'Oud-Charlois', 10),
  ('wijk', 'Pendrecht', 11),
  ('wijk', 'Tarwewijk', 12),
  ('wijk', 'Vreewijk', 13),
  ('wijk', 'Wielewaal', 14),
  ('wijk', 'Zuidwijk', 15);


-- ---------------------------------------------------------------------------
-- Gebieden (Rotterdam)
-- ---------------------------------------------------------------------------
INSERT INTO cs_opties (categorie, waarde, volgorde) VALUES
  ('gebied', 'Feijenoord', 1),
  ('gebied', 'Charlois', 2),
  ('gebied', 'IJsselmonde', 3),
  ('gebied', 'Hoogvliet', 4),
  ('gebied', 'Pernis', 5),
  ('gebied', 'Centrum', 6),
  ('gebied', 'Delfshaven', 7),
  ('gebied', 'Overschie', 8),
  ('gebied', 'Noord', 9),
  ('gebied', 'Hillegersberg-Schiebroek', 10),
  ('gebied', 'Prins Alexander', 11),
  ('gebied', 'Kralingen-Crooswijk', 12),
  ('gebied', 'Hoek van Holland', 13),
  ('gebied', 'Rozenburg', 14),
  ('gebied', 'Rotterdam-Zuid', 15);


-- ---------------------------------------------------------------------------
-- Uitkering types
-- ---------------------------------------------------------------------------
INSERT INTO cs_opties (categorie, waarde, volgorde) VALUES
  ('uitkering', 'Nee', 1),
  ('uitkering', 'Gemeentelijke uitkering', 2),
  ('uitkering', 'UWV', 3),
  ('uitkering', 'Wajong', 4),
  ('uitkering', 'WIA', 5),
  ('uitkering', 'Start', 6),
  ('uitkering', 'WW', 7),
  ('uitkering', 'Bijstand', 8),
  ('uitkering', 'ZW', 9),
  ('uitkering', 'IOW', 10);


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
