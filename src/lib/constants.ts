import type { TrajectStatus, CsRole, AanwezigheidStatus, Resultaat } from '@/lib/types';

// ---------------------------------------------------------------------------
// Tramline steps – the linear journey each kandidaat follows
// ---------------------------------------------------------------------------
export const TRAMLINE_STEPS = [
  { key: 'aanmelding', label: 'Aanmelding', icon: 'ClipboardList' },
  { key: 'intake_gepland', label: 'Intake gepland', icon: 'CalendarCheck' },
  { key: 'intake_afgerond', label: 'Intake afgerond', icon: 'ClipboardCheck' },
  { key: 'deelnemer', label: 'Deelnemer', icon: 'UserCheck' },
  { key: 'in_training', label: 'In training', icon: 'GraduationCap' },
  { key: 'voortgang', label: 'Voortgang', icon: 'TrendingUp' },
  { key: 'afronding', label: 'Afronding', icon: 'Award' },
] as const;

export type TramlineStepKey = (typeof TRAMLINE_STEPS)[number]['key'];

// ---------------------------------------------------------------------------
// Status labels and badge colors
// ---------------------------------------------------------------------------
export const STATUS_CONFIG: Record<
  TrajectStatus,
  { label: string; color: string; bgColor: string }
> = {
  aanmelding: {
    label: 'Aanmelding',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  intake_gepland: {
    label: 'Intake gepland',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
  },
  intake_afgerond: {
    label: 'Intake afgerond',
    color: 'text-violet-700',
    bgColor: 'bg-violet-100',
  },
  deelnemer: {
    label: 'Deelnemer',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
  },
  in_training: {
    label: 'In training',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  voortgang: {
    label: 'Voortgang',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  afronding: {
    label: 'Afronding',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  uitgevallen: {
    label: 'Uitgevallen',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
};

// ---------------------------------------------------------------------------
// Role labels (Dutch)
// ---------------------------------------------------------------------------
export const ROLE_LABELS: Record<CsRole, string> = {
  admin: 'Beheerder',
  intaker: 'Intaker',
  trainer: 'Trainer',
  manager: 'Manager',
  readonly: 'Alleen lezen',
};

// ---------------------------------------------------------------------------
// Geslacht labels
// ---------------------------------------------------------------------------
export const GESLACHT_LABELS = {
  man: 'Man',
  vrouw: 'Vrouw',
  anders: 'Anders',
  onbekend: 'Onbekend',
} as const;

// ---------------------------------------------------------------------------
// Aanwezigheid status labels (matching DB enum cs_aanwezigheid)
// ---------------------------------------------------------------------------
export const AANWEZIGHEID_LABELS: Record<AanwezigheidStatus, string> = {
  aanwezig: 'Aanwezig',
  afwezig_gemeld: 'Afwezig (met melding)',
  afwezig_ongemeld: 'Afwezig (zonder melding)',
  te_laat: 'Te laat',
  ziek: 'Ziek',
};

// ---------------------------------------------------------------------------
// Resultaat labels (matching DB enum cs_resultaat)
// ---------------------------------------------------------------------------
export const RESULTAAT_LABELS: Record<Resultaat, string> = {
  behaald: 'Behaald',
  niet_behaald: 'Niet behaald',
  lopend: 'Lopend',
  gestopt: 'Gestopt',
};

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------
export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

// ---------------------------------------------------------------------------
// Date format constants (date-fns)
// ---------------------------------------------------------------------------
export const DATE_FORMAT = 'dd-MM-yyyy';
export const DATETIME_FORMAT = 'dd-MM-yyyy HH:mm';
