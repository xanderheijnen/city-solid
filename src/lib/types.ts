// ---------------------------------------------------------------------------
// Enums / Union types (matching database enums exactly)
// ---------------------------------------------------------------------------

export type TrajectStatus =
  | 'aanmelding'
  | 'intake_gepland'
  | 'intake_afgerond'
  | 'deelnemer'
  | 'in_training'
  | 'voortgang'
  | 'afronding'
  | 'uitgevallen';

export type CsRole = 'admin' | 'intaker' | 'trainer' | 'manager' | 'readonly';

export type Geslacht = 'man' | 'vrouw' | 'anders' | 'onbekend';

export type AanwezigheidStatus =
  | 'aanwezig'
  | 'afwezig_gemeld'
  | 'afwezig_ongemeld'
  | 'te_laat'
  | 'ziek';

export type Resultaat = 'behaald' | 'niet_behaald' | 'lopend' | 'gestopt';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'export'
  | 'login'
  | 'view_sensitive';

// ---------------------------------------------------------------------------
// User / Profile (cs_profiles)
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  telefoon: string | null;
  functie: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// UserRole (cs_user_roles)
// ---------------------------------------------------------------------------

export interface UserRole {
  id: string;
  user_id: string;
  role: CsRole;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Kandidaat (cs_kandidaten – the central entity with all intake fields)
// ---------------------------------------------------------------------------

export interface Kandidaat {
  id: string;
  display_id: string;
  traject_status: TrajectStatus;

  // Persoonlijk
  voornaam: string;
  achternaam: string;
  geslacht: Geslacht | null;
  geboortedatum: string | null;

  // Adres
  straat: string | null;
  postcode: string | null;
  ingeschreven_adres_brp: string | null;
  wijk: string | null;
  gebied: string | null;

  // Contact
  telefoon: string | null;
  email: string | null;
  contactpersoon: string | null;
  whatsapp: boolean;
  eigen_vervoer: boolean;
  rijbewijs: boolean;

  // Financieel
  uitkering: string[] | null;
  toestemming: boolean;

  // Gezondheid (AVG-gevoelig)
  medische_bijzonderheden: string | null;

  // Casemanagement
  klantmanager: string | null;

  // Doelen
  stip_aan_de_horizon: string | null;

  // Ondersteuning
  trajecten: string | null;
  hulpverleners_betrokken: string | null;
  afspraken_hulp: string | null;

  // Justitie (AVG-gevoelig)
  aanraking_politie_justitie: boolean;
  aanraking_reden: string | null;
  lopende_zaken: string | null;

  // Werkervaring
  werkervaring: string | null;
  certificaten_behaald: string | null;

  // Metadata
  aanmeld_datum: string | null;
  intake_datum: string | null;
  intake_door: string | null;
  intake_notities: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Training (cs_trainingen)
// ---------------------------------------------------------------------------

export interface Training {
  id: string;
  naam: string;
  omschrijving: string | null;
  duur_weken: number | null;
  max_deelnemers: number | null;
  locatie: string | null;
  is_actief: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Trainingsgroep (cs_trainingsgroepen)
// ---------------------------------------------------------------------------

export interface Trainingsgroep {
  id: string;
  training_id: string;
  groepscode: string | null;
  start_datum: string;
  eind_datum: string | null;
  trainer_id: string | null;
  status: 'gepland' | 'actief' | 'afgerond';
  max_deelnemers: number | null;
  dropbox_folder_url: string | null;
  notities: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  training?: Training;
}

// ---------------------------------------------------------------------------
// KandidaatTraining (cs_kandidaat_trainingen – junction table)
// ---------------------------------------------------------------------------

export interface KandidaatTraining {
  id: string;
  kandidaat_id: string;
  trainingsgroep_id: string;
  resultaat: Resultaat;
  start_datum: string | null;
  eind_datum: string | null;
  reden_stoppen: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  kandidaat?: Kandidaat;
  trainingsgroep?: Trainingsgroep;
}

// ---------------------------------------------------------------------------
// Aanwezigheidsregistratie (cs_aanwezigheidsregistratie)
// ---------------------------------------------------------------------------

export interface Aanwezigheidsregistratie {
  id: string;
  kandidaat_training_id: string;
  datum: string;
  status: AanwezigheidStatus;
  notitie: string | null;
  geregistreerd_door: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  kandidaat_training?: KandidaatTraining;
}

// ---------------------------------------------------------------------------
// Voortgang (cs_voortgang)
// ---------------------------------------------------------------------------

export interface Voortgang {
  id: string;
  kandidaat_training_id: string;
  omschrijving: string;
  datum: string;
  type: 'mijlpaal' | 'beoordeling' | 'certificaat';
  score: number | null;
  behaald: boolean;
  beoordeeld_door: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  kandidaat_training?: KandidaatTraining;
}

// ---------------------------------------------------------------------------
// Notitie (cs_notities)
// ---------------------------------------------------------------------------

export interface Notitie {
  id: string;
  kandidaat_id: string;
  trainingsgroep_id: string | null;
  inhoud: string;
  categorie: 'algemeen' | 'voortgang' | 'zorg' | 'positief';
  is_vertrouwelijk: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  kandidaat?: Kandidaat;
}

// ---------------------------------------------------------------------------
// Optie (cs_opties – dropdown values)
// ---------------------------------------------------------------------------

export interface Optie {
  id: string;
  categorie: string;
  waarde: string;
  volgorde: number;
  is_actief: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// AuditLogEntry (cs_audit_log)
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  actie: AuditAction;
  object_type: string;
  object_id: string | null;
  oude_waarden: Record<string, unknown> | null;
  nieuwe_waarden: Record<string, unknown> | null;
  omschrijving: string | null;
  ip_adres: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Document (cs_documenten)
// ---------------------------------------------------------------------------

export interface Document {
  id: string;
  kandidaat_id: string;
  type: string;
  bestandsnaam: string;
  storage_path: string;
  gegenereerd_door: string | null;
  created_at: string;
  updated_at: string;

  // Joined relations (optional)
  kandidaat?: Kandidaat;
}

// ---------------------------------------------------------------------------
// Filter types (for list queries)
// ---------------------------------------------------------------------------

export interface KandidaatFilters {
  search?: string;
  traject_status?: TrajectStatus | TrajectStatus[];
  wijk?: string;
  gebied?: string;
  geslacht?: Geslacht;
  klantmanager?: string;
  aanmeld_datum_van?: string;
  aanmeld_datum_tot?: string;
}

export interface TrainingenFilters {
  search?: string;
  is_actief?: boolean;
}

export interface TrainingsgroepFilters {
  training_id?: string;
  status?: Trainingsgroep['status'];
  trainer_id?: string;
}
