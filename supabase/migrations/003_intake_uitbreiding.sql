-- ============================================================================
-- 003 – Uitbreiding intakeformulier conform Intakedocument 2025
-- ============================================================================
-- Voegt alle ontbrekende velden toe aan cs_kandidaten zodat het formulier
-- 1-op-1 overeenkomt met het papieren intakedocument.
-- ============================================================================

-- ── Persoonlijke gegevens ────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS geboorteplaats        TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS bsn                   TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS nationaliteit         TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS woonplaats            TEXT DEFAULT 'Rotterdam';
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS reden_geen_brp        TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS zorgverzekering       TEXT;

-- ── Verwijzing ───────────────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS door_wie_bekend       TEXT;

-- ── Sector & certificaat voorkeur ────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS gewenste_sector       TEXT[];
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS certificaat_voorkeur_1 TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS certificaat_voorkeur_2 TEXT;

-- ── Motivatie & competenties ─────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS motivatie             TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS demotivatie           TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS goede_eigenschappen   TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS minder_goed_in       TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS talen                TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS hobbys               TEXT;

-- ── Thuissituatie ────────────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS woonsituatie          TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS kinderen             TEXT;

-- ── Middelengebruik ──────────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS middelengebruik       TEXT;

-- ── Schulden ─────────────────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS heeft_schulden        BOOLEAN DEFAULT FALSE;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS schulden_reden_bedrag TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS schulden_afspraken    TEXT;

-- ── Justitie (extra velden) ──────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS veroordeeld_detentie  TEXT;

-- ── Opleidingen ──────────────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS opleiding             TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS diploma_behaald       TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS opleiding_niveau      TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS reden_uitval          TEXT;

-- ── Cursussen ────────────────────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS cursussen_gevolgd     TEXT;

-- ── Werkervaring (extra velden) ──────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS waarom_lukte_niet     TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS heeft_cv              BOOLEAN DEFAULT FALSE;

-- ── Acties deelnemer & coach ─────────────────────────────────────────────────
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS acties_afspraken      TEXT;
ALTER TABLE cs_kandidaten ADD COLUMN IF NOT EXISTS leefgebieden_aandacht TEXT;
