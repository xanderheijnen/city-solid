# City Solid - Administratie Platform

Webapplicatie voor een opleidingsbureau in Rotterdam-Zuid om het volledige traject van aanmelding tot afronding van cursisten te beheren.

## Features

- **Tramlijn**: Visueel procesoverzicht per kandidaat (aanmelding → intake → deelnemer → training → voortgang → afronding)
- **Kandidaatbeheer**: Volledige intake met ~25 velden, zoeken, filteren, brede tabel
- **Trainingen & Groepen**: Trainingsprogramma's, groepen met auto-groepscode (YYYY-MMx), deelnemers koppelen
- **Aanwezigheid**: Dag × deelnemer matrix met 5 statusopties
- **Voortgang**: Mijlpalen, beoordelingen en certificaten registreren
- **Notities**: Per kandidaat met categorie en vertrouwelijkheidsvlag
- **Dashboard**: KPI's, Recharts grafieken (tramlijn verdeling, resultaten, instroom, groepsbezetting)
- **Word Export**: Intake rapport en voortgangsrapport genereren als .docx
- **Excel Export**: Kandidaatdata exporteren naar .xlsx
- **Dropbox Integratie**: Koppel een Dropbox map per trainingsgroep
- **Rolsysteem**: Admin, intaker, trainer, manager, alleen-lezen
- **AVG Compliance**: Audit log, volledige data verwijdering, vertrouwelijke gegevens markering

## Tech Stack

| Laag | Technologie |
|------|-------------|
| Frontend | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Formulieren | React Hook Form + Zod |
| Data | Supabase (PostgreSQL + Auth + RLS) |
| Grafieken | Recharts |
| State | TanStack React Query |
| Exports | docx (Word), xlsx (Excel), file-saver |
| Routing | React Router v7 |

## Aan de slag

```bash
# Installeer dependencies
npm install

# Start development server
npm run dev

# TypeScript check
npx tsc --noEmit

# Build voor productie
npm run build
```

## Projectstructuur

```
src/
├── components/       # Herbruikbare UI-componenten (TramlineStepper, PermissionGate, etc.)
├── hooks/            # Custom React hooks (useKandidaten, useTrainingen, useAanwezigheid, etc.)
├── integrations/     # Supabase client configuratie
├── layouts/          # AppLayout met sidebar
├── lib/              # Constanten, types, utilities, export functies (excel.ts, word.ts)
└── pages/
    ├── Dashboard.tsx
    ├── auth/          # Login
    ├── kandidaten/    # Overzicht, Detail, Intake, Aanmelding
    ├── trainingen/    # Programma's, Groepen, Detail
    ├── voortgang/     # Voortgang & Resultaten overzicht
    └── beheer/        # Gebruikers, Opties, Audit Log
```

## Database

12 tabellen op Supabase met Row Level Security:

- `cs_kandidaten` - Kerntabel met alle intake-velden
- `cs_trainingen` - Trainingsprogramma's
- `cs_trainingsgroepen` - Groepen met auto-groepscode
- `cs_kandidaat_trainingen` - Koppeling deelnemer ↔ groep
- `cs_aanwezigheid` - Aanwezigheidsregistratie
- `cs_voortgang` - Vorderingen per deelnemer
- `cs_notities` - Notities met categorie en vertrouwelijkheidsvlag
- `cs_profiles` - Gebruikersprofielen
- `cs_user_roles` - Rolkoppelingen
- `cs_opties` - Beheerbare dropdown-waarden
- `cs_documenten` - Gegenereerde documenten
- `cs_audit_log` - Onwijzigbare audit trail (AVG)

## Huisstijl

- Primair geel: `#FFD62D`
- Donkerblauw sidebar: `#242C4C`
- Font: Poppins
