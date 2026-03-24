-- ============================================================
-- 011: Vragenlijst configuratie tabel
-- Dynamische configuratie voor intake- en aanmeldingsformulieren
-- ============================================================

CREATE TABLE IF NOT EXISTS cs_vragenlijst_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulier TEXT NOT NULL DEFAULT 'intake',
  sectie TEXT NOT NULL,
  sectie_volgorde INTEGER NOT NULL DEFAULT 0,
  veld_naam TEXT NOT NULL,
  label TEXT NOT NULL,
  placeholder TEXT,
  help_tekst TEXT,
  veld_type TEXT NOT NULL DEFAULT 'text',
  opties JSONB,
  is_verplicht BOOLEAN DEFAULT false,
  is_actief BOOLEAN DEFAULT true,
  volgorde INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(formulier, veld_naam)
);

ALTER TABLE cs_vragenlijst_config ENABLE ROW LEVEL SECURITY;

-- All authenticated can read
CREATE POLICY "Authenticated read vragenlijst config"
  ON cs_vragenlijst_config FOR SELECT TO authenticated USING (true);

-- Admin/manager can manage
CREATE POLICY "Admin/manager manage vragenlijst config"
  ON cs_vragenlijst_config FOR ALL TO authenticated
  USING (cs_has_any_role(auth.uid(), ARRAY['admin','manager']::cs_role[]))
  WITH CHECK (cs_has_any_role(auth.uid(), ARRAY['admin','manager']::cs_role[]));

-- ============================================================
-- SEED: Intake formulier
-- ============================================================

-- Section 0: Persoonlijke gegevens
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, opties, is_verplicht, volgorde)
VALUES
  ('intake', 'Persoonlijke gegevens', 0, 'voornaam', 'Voornaam', 'text', NULL, true, 0),
  ('intake', 'Persoonlijke gegevens', 0, 'achternaam', 'Achternaam', 'text', NULL, true, 1),
  ('intake', 'Persoonlijke gegevens', 0, 'geslacht', 'Geslacht', 'select', '[{"value":"man","label":"Man"},{"value":"vrouw","label":"Vrouw"},{"value":"anders","label":"Anders"},{"value":"onbekend","label":"Onbekend"}]'::jsonb, false, 2),
  ('intake', 'Persoonlijke gegevens', 0, 'geboortedatum', 'Geboortedatum', 'date', NULL, false, 3),
  ('intake', 'Persoonlijke gegevens', 0, 'geboorteplaats', 'Geboorteplaats', 'text', NULL, false, 4),
  ('intake', 'Persoonlijke gegevens', 0, 'bsn', 'BSN', 'text', NULL, false, 5),
  ('intake', 'Persoonlijke gegevens', 0, 'nationaliteit', 'Nationaliteit', 'text', NULL, false, 6)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 1: Adres
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, placeholder, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Adres', 1, 'straat', 'Straat', NULL, 'text', false, 0),
  ('intake', 'Adres', 1, 'postcode', 'Postcode', NULL, 'text', false, 1),
  ('intake', 'Adres', 1, 'woonplaats', 'Woonplaats', 'Rotterdam', 'text', false, 2),
  ('intake', 'Adres', 1, 'ingeschreven_adres_brp', 'Ingeschreven adres BRP', NULL, 'text', false, 3),
  ('intake', 'Adres', 1, 'reden_geen_brp', 'Reden geen BRP', NULL, 'text', false, 4),
  ('intake', 'Adres', 1, 'wijk', 'Wijk', NULL, 'text', false, 5),
  ('intake', 'Adres', 1, 'gebied', 'Gebied', NULL, 'text', false, 6)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 2: Contact & Verwijzing
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Contact & Verwijzing', 2, 'telefoon', 'Telefoon', 'text', false, 0),
  ('intake', 'Contact & Verwijzing', 2, 'email', 'E-mail', 'text', false, 1),
  ('intake', 'Contact & Verwijzing', 2, 'contactpersoon', 'Contactpersoon', 'text', false, 2),
  ('intake', 'Contact & Verwijzing', 2, 'whatsapp', 'WhatsApp', 'checkbox', false, 3),
  ('intake', 'Contact & Verwijzing', 2, 'eigen_vervoer', 'Eigen vervoer', 'checkbox', false, 4),
  ('intake', 'Contact & Verwijzing', 2, 'rijbewijs', 'Rijbewijs', 'checkbox', false, 5),
  ('intake', 'Contact & Verwijzing', 2, 'zorgverzekering', 'Zorgverzekering', 'text', false, 6),
  ('intake', 'Contact & Verwijzing', 2, 'door_wie_bekend', 'Door wie bekend', 'text', false, 7)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 3: Financieel
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Financieel', 3, 'uitkering', 'Uitkering', 'text', false, 0),
  ('intake', 'Financieel', 3, 'toestemming', 'Toestemming', 'checkbox', false, 1)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 4: Sector & Voorkeur
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, opties, is_verplicht, volgorde)
VALUES
  ('intake', 'Sector & Voorkeur', 4, 'gewenste_sector', 'Gewenste sector', 'select', '[{"value":"Bouw","label":"Bouw"},{"value":"Logistiek","label":"Logistiek"},{"value":"Haven","label":"Haven"},{"value":"Schoonmaak","label":"Schoonmaak"},{"value":"Detailhandel","label":"Detailhandel"},{"value":"Productiewerk","label":"Productiewerk"},{"value":"Zorg","label":"Zorg"},{"value":"Elektrotechniek","label":"Elektrotechniek"},{"value":"Horeca","label":"Horeca"},{"value":"Beveiliging","label":"Beveiliging"},{"value":"Hospitality","label":"Hospitality"}]'::jsonb, false, 0),
  ('intake', 'Sector & Voorkeur', 4, 'certificaat_voorkeur_1', 'Certificaat voorkeur 1', 'text', NULL, false, 1),
  ('intake', 'Sector & Voorkeur', 4, 'certificaat_voorkeur_2', 'Certificaat voorkeur 2', 'text', NULL, false, 2)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 5: Motivatie & Competenties
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Motivatie & Competenties', 5, 'motivatie', 'Motivatie', 'textarea', false, 0),
  ('intake', 'Motivatie & Competenties', 5, 'demotivatie', 'Demotivatie', 'textarea', false, 1),
  ('intake', 'Motivatie & Competenties', 5, 'stip_aan_de_horizon', 'Stip aan de horizon', 'textarea', false, 2),
  ('intake', 'Motivatie & Competenties', 5, 'goede_eigenschappen', 'Goede eigenschappen', 'textarea', false, 3),
  ('intake', 'Motivatie & Competenties', 5, 'minder_goed_in', 'Minder goed in', 'textarea', false, 4),
  ('intake', 'Motivatie & Competenties', 5, 'talen', 'Talen', 'text', false, 5),
  ('intake', 'Motivatie & Competenties', 5, 'hobbys', 'Hobby''s', 'text', false, 6)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 6: Thuissituatie
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Thuissituatie', 6, 'woonsituatie', 'Woonsituatie', 'textarea', false, 0),
  ('intake', 'Thuissituatie', 6, 'kinderen', 'Kinderen', 'text', false, 1),
  ('intake', 'Thuissituatie', 6, 'trajecten', 'Trajecten', 'textarea', false, 2),
  ('intake', 'Thuissituatie', 6, 'hulpverleners_betrokken', 'Hulpverleners betrokken', 'textarea', false, 3)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 7: Gezondheid & Middelen
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Gezondheid & Middelen', 7, 'medische_bijzonderheden', 'Medische bijzonderheden', 'textarea', false, 0),
  ('intake', 'Gezondheid & Middelen', 7, 'middelengebruik', 'Middelengebruik', 'textarea', false, 1)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 8: Schulden
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Schulden', 8, 'heeft_schulden', 'Heeft schulden', 'checkbox', false, 0),
  ('intake', 'Schulden', 8, 'schulden_reden_bedrag', 'Schulden reden & bedrag', 'textarea', false, 1),
  ('intake', 'Schulden', 8, 'schulden_afspraken', 'Schulden afspraken', 'textarea', false, 2)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 9: Justitieel verleden
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Justitieel verleden', 9, 'aanraking_politie_justitie', 'Aanraking politie/justitie', 'checkbox', false, 0),
  ('intake', 'Justitieel verleden', 9, 'aanraking_reden', 'Aanraking reden', 'textarea', false, 1),
  ('intake', 'Justitieel verleden', 9, 'veroordeeld_detentie', 'Veroordeeld / detentie', 'textarea', false, 2),
  ('intake', 'Justitieel verleden', 9, 'lopende_zaken', 'Lopende zaken', 'textarea', false, 3)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 10: Opleidingen
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Opleidingen', 10, 'opleiding', 'Opleiding', 'text', false, 0),
  ('intake', 'Opleidingen', 10, 'diploma_behaald', 'Diploma behaald', 'text', false, 1),
  ('intake', 'Opleidingen', 10, 'opleiding_niveau', 'Opleiding niveau', 'text', false, 2),
  ('intake', 'Opleidingen', 10, 'reden_uitval', 'Reden uitval', 'textarea', false, 3)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 11: Cursussen & Certificaten
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Cursussen & Certificaten', 11, 'cursussen_gevolgd', 'Cursussen gevolgd', 'textarea', false, 0),
  ('intake', 'Cursussen & Certificaten', 11, 'certificaten_behaald', 'Certificaten behaald', 'textarea', false, 1)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 12: Werkervaring
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Werkervaring', 12, 'werkervaring', 'Werkervaring', 'textarea', false, 0),
  ('intake', 'Werkervaring', 12, 'waarom_lukte_niet', 'Waarom lukte het niet', 'textarea', false, 1),
  ('intake', 'Werkervaring', 12, 'heeft_cv', 'Heeft CV', 'checkbox', false, 2)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 13: Acties & Afspraken
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('intake', 'Acties & Afspraken', 13, 'acties_afspraken', 'Acties & afspraken', 'textarea', false, 0),
  ('intake', 'Acties & Afspraken', 13, 'leefgebieden_aandacht', 'Leefgebieden aandacht', 'textarea', false, 1),
  ('intake', 'Acties & Afspraken', 13, 'klantmanager', 'Klantmanager', 'text', false, 2),
  ('intake', 'Acties & Afspraken', 13, 'afspraken_hulp', 'Afspraken hulp', 'textarea', false, 3),
  ('intake', 'Acties & Afspraken', 13, 'intake_notities', 'Intake notities', 'textarea', false, 4)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- ============================================================
-- SEED: Aanmelding formulier
-- ============================================================

-- Section 0: Gegevens jongere
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, opties, is_verplicht, volgorde)
VALUES
  ('aanmelding', 'Gegevens jongere', 0, 'voornaam', 'Voornaam', 'text', NULL, true, 0),
  ('aanmelding', 'Gegevens jongere', 0, 'achternaam', 'Achternaam', 'text', NULL, true, 1),
  ('aanmelding', 'Gegevens jongere', 0, 'geslacht', 'Geslacht', 'select', '[{"value":"man","label":"Man"},{"value":"vrouw","label":"Vrouw"},{"value":"anders","label":"Anders"},{"value":"onbekend","label":"Onbekend"}]'::jsonb, false, 2),
  ('aanmelding', 'Gegevens jongere', 0, 'leeftijd', 'Leeftijd', 'text', NULL, false, 3),
  ('aanmelding', 'Gegevens jongere', 0, 'telefoon', 'Telefoon', 'text', NULL, false, 4),
  ('aanmelding', 'Gegevens jongere', 0, 'email', 'E-mail', 'text', NULL, false, 5),
  ('aanmelding', 'Gegevens jongere', 0, 'wijk', 'Wijk', 'text', NULL, false, 6)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 1: Project & Verwijzing
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('aanmelding', 'Project & Verwijzing', 1, 'gewenst_project', 'Gewenst project', 'text', false, 0),
  ('aanmelding', 'Project & Verwijzing', 1, 'door_wie_bekend', 'Door wie bekend', 'text', false, 1),
  ('aanmelding', 'Project & Verwijzing', 1, 'aanmeld_organisatie', 'Aanmeldende organisatie', 'text', false, 2)
ON CONFLICT (formulier, veld_naam) DO NOTHING;

-- Section 2: Aanmelder
INSERT INTO cs_vragenlijst_config (formulier, sectie, sectie_volgorde, veld_naam, label, veld_type, is_verplicht, volgorde)
VALUES
  ('aanmelding', 'Aanmelder', 2, 'aanmelder_naam', 'Naam aanmelder', 'text', false, 0),
  ('aanmelding', 'Aanmelder', 2, 'aanmelder_telefoon', 'Telefoon aanmelder', 'text', false, 1),
  ('aanmelding', 'Aanmelder', 2, 'aanmelder_email', 'E-mail aanmelder', 'text', false, 2)
ON CONFLICT (formulier, veld_naam) DO NOTHING;
