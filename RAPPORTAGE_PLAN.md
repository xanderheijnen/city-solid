# City Solid - Rapportage Dashboard Implementatieplan

## Context

De City Solid app beheert het traject van kandidaten (aanmelding → intake → training → uitstroom). Nu moet er een **Rapportage** sectie worden toegevoegd in de linker sidebar. Deze sectie bevat rapportage-pagina's gebaseerd op de user stories (US-01 t/m US-30) van de "City Solid Reporting App". De data komt uit de bestaande `cs_kandidaten`, `cs_voortgang`, en gerelateerde tabellen. Ontbrekende velden worden toegevoegd aan de database; het intakeformulier blijft ongewijzigd.

---

## 1. GAP-analyse: Ontbrekende velden

### Velden die AL bestaan en direct mappen

| US-kolom | Bestaand veld | Type |
|----------|--------------|------|
| Wijk | `wijk` | text |
| Gebied | `gebied` | text |
| Uitkering | `uitkering` | text[] |
| Leeftijd | `leeftijd` / berekend uit `geboortedatum` | int / date |
| Geslacht | `geslacht` | enum |
| Opleiding | `opleiding_niveau` | text |
| Woonplaats | `woonplaats` | text |
| Ingeschreven (BRP) | `ingeschreven_adres_brp` | text |
| Sector (Wenssector) | `gewenste_sector` | text[] |
| Justitie | `aanraking_politie_justitie` | bool |
| Rijbewijs | `rijbewijs` | bool |
| Organisatie | `aanmeld_organisatie` | text |
| Uitstroom | `uitstroom_status` | text |

### Nieuwe kolommen op `cs_kandidaten` (migratie nodig)

| Kolom | Type | Reden |
|-------|------|-------|
| `activiteit` | text | SC-activiteit label (bijv. "BIROTA", "CWST") — het top-level filter |
| `csn` | text UNIQUE | City Solid Nummer — leesbaar ID (bijv. "CSN-2026-001") |
| `no_show` | boolean DEFAULT false | Of kandidaat niet is komen opdagen |
| `eenoudergezin` | boolean DEFAULT false | Eenoudergezin indicator |
| `verandering` | text | Vrij tekstveld "verandering in gedrag/leven/kennis" |

### Nieuwe tabellen

**`cs_uitstroom_rubrieken`** — Koppeling uitstroomwaarden → categorieën (US-26)
- `id` uuid PK
- `uitstroom_waarde` text UNIQUE NOT NULL
- `rubriek` text CHECK IN ('uitstroom', 'in_proces', 'uitval')
- `toon_in_grafieken` boolean DEFAULT true
- `created_at` timestamptz

**`cs_import_log`** — Import logboek (US-25)
- `id` uuid PK
- `bestandsnaam` text NOT NULL
- `bron` text (excel/monday)
- `aantal_rijen` integer
- `aantal_succesvol` integer
- `aantal_mislukt` integer
- `fouten` jsonb
- `activiteit` text
- `geimporteerd_door` uuid FK auth.users
- `created_at` timestamptz

### Certificaten (Cert 1-5, # Cert, # Gezakt)

Geen nieuwe kolommen nodig. Worden **berekend** uit bestaande `cs_voortgang` tabel (type='certificaat') via client-side joins met TanStack Query. Certificaat-namen komen uit `cs_voortgang.omschrijving`, behaald uit `cs_voortgang.behaald`.

---

## 2. Navigatie-wijziging

**Sidebar** (`src/components/AppSidebar.tsx`) — nieuwe groep "RAPPORTAGE" toevoegen:

```
RAPPORTAGE
  📊 Dashboard         → /rapportage/dashboard
  👥 Deelnemers        → /rapportage/deelnemers
  📄 Rapportage        → /rapportage/rapport
  📋 Eindrapportage    → /rapportage/eindrapport
  ✨ AI Rapport        → /rapportage/ai-rapport
  📍 Gebiedskaart      → /rapportage/gebiedskaart
  📥 Import Log        → /rapportage/import-log
  🏷️ Rubrieken         → /rapportage/rubrieken
  ℹ️ Instructies       → /rapportage/instructies
```

**Routes** (`src/App.tsx`) — 9 nieuwe routes onder `/rapportage/*`

**Breadcrumbs** (`src/components/AppBreadcrumb.tsx`) — mappings voor alle /rapportage/* paden

**i18n** (`src/i18n/locales/nl.json` + `en.json`) — vertaalsleutels voor navigatie en pagina-inhoud

---

## 3. Bouwvolgorde

### Stap 1: Database migratie (`009_rapportage_velden.sql`)
- ALTER cs_kandidaten ADD: `activiteit`, `csn`, `no_show`, `eenoudergezin`, `verandering`
- CREATE TABLE `cs_uitstroom_rubrieken` + seed met standaardwaarden
- CREATE TABLE `cs_import_log`
- RLS policies voor nieuwe tabellen

### Stap 2: Types & hooks bijwerken
- **`src/lib/types.ts`** — nieuwe velden toevoegen aan Kandidaat interface + nieuwe interfaces (UitstroomRubriek, ImportLog)
- **`src/hooks/useRapportageData.ts`** — TanStack Query hook voor geaggregeerde rapportage-data (pipeline counts, stats, per-gebied data)
- **`src/hooks/useUitstroomRubrieken.ts`** — CRUD hook voor rubrieken
- **`src/hooks/useImportLog.ts`** — query hook voor import logboek

### Stap 3: Activiteitenfilter component
- **`src/components/rapportage/ActiviteitFilter.tsx`** — dropdown die unieke `activiteit` waarden ophaalt, state via URL searchParam zodat het over pagina's heen werkt

### Stap 4: Rapportage Dashboard (US-06 t/m US-10)
- **`src/pages/rapportage/RapportageDashboard.tsx`**
- Pipeline visualisatie: 4 stappen (Instroom → Gestarte trajecten → In Proces → Uitstroom), getallen berekend uit `traject_status` + `uitstroom_rubriek`
- Top 6 gebieden donuts (Recharts PieChart)
- 6 statistiekkaarten (meest voorkomende opleiding, % geen BRP, % justitie, % uitkering, gem. leeftijd, M/V verdeling)
- 6 wisselbare grafieken (leeftijd, geslacht, uitkering, opleiding, organisatie, sector) met 5 chart-type knoppen per grafiek
- Uitval/afval uitsluiting uit grafieken (via `cs_uitstroom_rubrieken.toon_in_grafieken`)

### Stap 5: Deelnemers tabel (US-11 t/m US-19)
- **`src/pages/rapportage/RapportageDeelnemers.tsx`**
- Brede scrollbare tabel met alle kolommen uit US-11
- Certificaat-kolommen berekend via join met `cs_voortgang`
- Zoekbalk (US-12), kolomfilters (US-13)
- Bewerkmodal (US-14), toevoegen (US-15)
- Excel import (US-16) via `xlsx` library, Monday import knop (US-17)
- Excel export (US-18)
- Alles verwijderen met bevestiging (US-19)
- StatusBadges: AFGEROND (grijs), LOPEND (primair), OVERGEDRAGEN (grijs)

### Stap 6: Visuele rapportage (US-20)
- **`src/pages/rapportage/RapportageVisueel.tsx`**
- Samenvatting met auto-gegenereerde tekst
- Sectie 1: Demografie (leeftijd balken, geslacht, uitstroom, overige)
- Sectie 2: Opleiding & Status (opleiding balken, justitie, uitkering, organisaties)
- Sectie 3: Certificaten KPI's (behaald/gezakt/slagingspercentage) + verdeling

### Stap 7: Eindrapportage (US-21)
- **`src/pages/rapportage/RapportageEind.tsx`**
- Formeel PmG-document in kaart-layout
- Printen/PDF knop via `window.print()` + `@media print` CSS
- City Solid branding header per sectie
- Secties: cijfers, gebieden, aanmelders, deelnemersinfo, certificaten, uitstroom

### Stap 8: AI Rapportage (US-22)
- **`src/pages/rapportage/RapportageAI.tsx`**
- "Rapport genereren" knop die data samenvat en naar een Supabase Edge Function stuurt
- **`supabase/functions/cs-rapport-ai/index.ts`** — edge function die data ontvangt en AI-rapport genereert
- Aanpasbare prompt
- Donut-charts onder het rapport (leeftijd, geslacht)

### Stap 9: Gebiedskaart (US-23/24)
- **`src/pages/rapportage/RapportageGebiedskaart.tsx`**
- **`src/components/rapportage/RotterdamMap.tsx`** — SVG kaart met 14 gebieden
- Klik/hover op gebied toont detail
- Deelnemers + certificaten per gebied als bolletjes op de kaart
- Totaaloverzicht + ranking sidebar

### Stap 10: Overige pagina's
- **`src/pages/rapportage/RapportageImportLog.tsx`** (US-25) — tabel met import historie
- **`src/pages/rapportage/RapportageRubrieken.tsx`** (US-26) — uitstroomwaarden koppelen aan rubrieken, toggles voor "toon in grafieken"
- **`src/pages/rapportage/RapportageInstructies.tsx`** (US-27) — tips + accordion secties + FAQ

### Stap 11: Navigatie & routing integratie
- Sidebar, routes, breadcrumbs, i18n sleutels

---

## 4. Kritieke bestanden

| Bestand | Wijziging |
|---------|-----------|
| `supabase/migrations/009_rapportage_velden.sql` | Nieuwe migratie |
| `src/lib/types.ts` | Interfaces bijwerken |
| `src/App.tsx` | 9 nieuwe routes |
| `src/components/AppSidebar.tsx` | Rapportage nav-groep |
| `src/components/AppBreadcrumb.tsx` | Breadcrumb mappings |
| `src/i18n/locales/nl.json` + `en.json` | Vertaalsleutels |
| `src/pages/rapportage/*.tsx` | 9 nieuwe pagina's |
| `src/components/rapportage/*.tsx` | Gedeelde componenten |
| `src/hooks/useRapportageData.ts` | Data hooks |
| `supabase/functions/cs-rapport-ai/` | Edge function voor AI |

## 5. Verificatie

Per stap:
- TypeScript compilatie zonder fouten
- Preview screenshot van elke nieuwe pagina
- Activiteitenfilter werkt cross-pagina
- Grafieken renderen correct met bestaande data
- Print/PDF output is schoon
- Excel import/export roundtrip werkt
- Commit + push na elke stap
