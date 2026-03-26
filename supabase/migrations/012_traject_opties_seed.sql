-- 011: Seed traject opties in cs_opties
INSERT INTO cs_opties (id, categorie, waarde, volgorde, is_actief) VALUES
  (gen_random_uuid(), 'traject', 'Certi & Skills', 1, true),
  (gen_random_uuid(), 'traject', 'City Team', 2, true),
  (gen_random_uuid(), 'traject', 'BIROTA', 3, true),
  (gen_random_uuid(), 'traject', 'City Side Jobs', 4, true)
ON CONFLICT (categorie, waarde) DO NOTHING;
