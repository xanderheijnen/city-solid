# Security & Deployment Gap-Analyse — City Solid IMP Platform

**Datum:** 2026-03-26
**Stack:** React 19 + Vite 8 + Supabase (PostgreSQL + Auth + Storage + RLS)
**Audit door:** 5 parallelle security agents

---

## Samenvatting

De applicatie heeft **solide basis-beveiliging** met RLS-policies op alle tabellen, role-based access control en signed URLs voor bestanden. Er zijn echter **kritieke gaps** die vóór productie opgelost moeten worden: onbeschermde exports met gevoelige PII-data, ontbrekende audit logging bij exports, geen CSP-headers, en geen gescheiden dev/staging/prod omgevingen.

---

## Beantwoording Prioriteitsvragen

### 1. Dev-bypass: bestaat die en hoe is productie beschermd?
**Status: OPGELOST.** De `VITE_DEV_BYPASS_AUTH` is verwijderd uit de code (useAuth.tsx, useRole.ts). Enkel nog als `false` in `.env.example` (dood). Geen mock users/sessions meer aanwezig.

### 2. Gescheiden dev/staging/prod omgevingen?
**Status: NIET AANWEZIG.** Slechts één `.env` met productie-credentials. Geen `.env.development`, `.env.staging`, `.env.production`. Geen CI/CD pipeline. Ontwikkelaars gebruiken productie-database lokaal.

### 3. Hoe zijn RLS/access policies getest per rol en per tabel?
**Status: NIET GETEST.** Er zijn 70+ RLS-policies gedefinieerd in migratie 001, maar geen geautomatiseerde tests. Handmatige verificatie onbekend.

### 4. Welke rollen mogen gevoelige data zien, exporteren en wijzigen?
**Status: ONVOLDOENDE.** Alle geauthenticeerde gebruikers (incl. readonly) kunnen Word-exports triggeren met BSN, medische info, justitie-gegevens. Geen rol-filtering op exports. CSV-export bevat justitie-veld.

### 5. Is MFA verplicht voor beheerders?
**Status: NIET GEÏMPLEMENTEERD.** Geen MFA/2FA. Supabase ondersteunt dit wel maar het is niet geconfigureerd.

### 6. Hoe worden exports beveiligd en gelogd?
**Status: NIET BEVEILIGD.** Export-knoppen niet beschermd met PermissionGate. Geen audit logging bij exports. Geen CSV formula injection bescherming.

### 7. Hoe worden uploads gevalideerd en gescand?
**Status: DEELS.** File type whitelist (12 extensies), 10MB limiet, extensie-sanitisatie. GEEN malware scanning, GEEN MIME-type validatie, GEEN magic number check.

### 8. Hoe voorkom je data-lek in logs, audit trails en foutmeldingen?
**Status: MATIG.** Auth-fouten tonen raw Supabase errors. Geen React Error Boundary. Console.error statements in productie. Audit log bevat geen PII-scrubbing.

### 9. Hoe beheer je migrations, policies en rollback?
**Status: HANDMATIG.** Migrations in `supabase/migrations/`. Geen rollback mechanisme. Migration 011 nummering was conflicterend (nu gefixed naar 012). Geen automatische uitvoering.

### 10. Zijn backups actief en is restore getest?
**Status: ONBEKEND.** Supabase biedt automatische backups afhankelijk van plan. Geen gedocumenteerde backup-strategie of restore-test.

### 11. Waar staan frontend, database, storage en externe verwerking fysiek?
- **Database/Auth/Storage:** Supabase (AWS eu-central-1 vermoedelijk)
- **Frontend:** Lokaal development, geen productie-hosting geconfigureerd
- **OCR (Tesseract.js):** Client-side, geen externe API
- **Fonts:** Google Fonts CDN

### 12. Wie monitort verdachte acties en wat is het incidentproces?
**Status: NIET AANWEZIG.** Geen Sentry/DataDog, geen alerting, geen SECURITY.md, geen incident response plan.

---

## Prioriteitenmatrix

### KRITIEK (blokkeer livegang)

| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
| K1 | **Word export bevat alle PII zonder rolcontrole** — readonly users kunnen BSN, medische info, justitie-data exporteren | `KandidaatDetail.tsx:1067-1131`, `word.ts` | AVG-schending, data breach |
| K2 | **Geen audit logging bij exports** — geen spoor wie welke gevoelige data exporteert | `word.ts`, `KandidaatDetail.tsx` | Niet-compliance, ondetecteerbaar datalek |
| K3 | **CSV export bevat justitie-veld** zonder rolfiltering | `RapportageDeelnemers.tsx:66` | Gevoelige data bij verkeerde gebruiker |
| K4 | **Geen CSP/security headers** — kwetsbaar voor XSS en clickjacking | `index.html` | Cross-site scripting, data diefstal |

### HOOG (voor livegang oplossen)

| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
| H1 | **Geen MFA voor admin accounts** | `useAuth.tsx` | Account overname bij gelekt wachtwoord |
| H2 | **Geen gescheiden omgevingen** — dev gebruikt productie-database | `.env` | Onbedoelde data-mutaties |
| H3 | **Wachtwoordbeleid te zwak** — min 6 tekens, geen complexiteitseisen | `Gebruikers.tsx:366` | Brute-force kwetsbaar |
| H4 | **Sessions in localStorage** — XSS kan tokens stelen | `supabase/client.ts:15` | Session hijacking |
| H5 | **Geen Error Boundary** — stack traces zichtbaar voor gebruikers | `App.tsx` | Information disclosure |
| H6 | **Geen kolom-niveau RLS** — trainers/readonly zien alle velden incl. BSN/medisch | `001_initial_schema.sql` | Onnodige blootstelling gevoelige data |

### GEMIDDELD (kort na livegang)

| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
| G1 | Geen malware scanning bij uploads | `useFileUpload.ts` | Malware verspreiding |
| G2 | Geen MIME-type validatie (alleen extensie) | `useFileUpload.ts` | Bestandstype spoofing |
| G3 | CSV formula injection niet beschermd | `fileParser.ts`, exports | Code execution in Excel |
| G4 | `view_sensitive` audit actie gedefinieerd maar nooit aangeroepen | `types.ts:35` | Geen spoor van gevoelige data-inzage |
| G5 | Vite `host: true` exposeert dev server op netwerk | `vite.config.ts` | Ongeautoriseerde toegang in dev |

### LAAG (backlog)

| # | Bevinding | Locatie | Impact |
|---|-----------|---------|--------|
| L1 | Geen monitoring/alerting (Sentry, DataDog) | — | Fouten niet gedetecteerd |
| L2 | Geen SECURITY.md of incident response plan | — | Geen protocol bij incident |
| L3 | Geen backup/restore documentatie | — | Onbekende recovery time |
| L4 | TypeScript `noUnusedLocals: false` | `tsconfig.app.json` | Dode code niet gevangen |

---

## RLS/Policy Matrix

| Tabel | RLS | admin | intaker | trainer | manager | readonly |
|-------|-----|-------|---------|---------|---------|----------|
| cs_kandidaten | ✅ | CRUD | CRU | R (eigen groepen) | R | R |
| cs_kandidaat_trainingen | ✅ | CRUD | CRU | RU (eigen) | R | R |
| cs_trainingsgroepen | ✅ | CRUD | R | RU (eigen) | R | R |
| cs_trainingen | ✅ | CRUD | R | R | R | R |
| cs_voortgang | ✅ | CRUD | CRU | CRUD (eigen) | R | R |
| cs_aanwezigheid | ✅ | CRUD | R | CRUD (eigen) | R | R |
| cs_notities | ✅ | CRUD | CRU | CRU | R | R |
| cs_profiles | ✅ | CRUD | R | R | R | R (eigen) |
| cs_user_roles | ✅ | CRUD | R (eigen) | R (eigen) | R | R (eigen) |
| cs_audit_log | ✅ | R | — | — | R | — |
| cs_opties | ✅ | CRUD | R | R | R | R |
| cs_uitstroom_updates | ✅ | CRUD | CR | R | R | — |
| cs_uitstroom_rubrieken | ✅ | CRUD | R | R | CRUD | R |
| cs_import_log | ✅ | CR | — | — | CR | — |
| cs_vragenlijst_config | ✅ | CRUD | R | R | CRUD | R |
| storage.objects | ✅ | CRD | CR | R | R | R |

**Legenda:** C=Create, R=Read, U=Update, D=Delete

---

## Gevoelige Data Matrix

| Veld | Type | admin | intaker | trainer | manager | readonly | Gelogd? |
|------|------|-------|---------|---------|---------|----------|---------|
| bsn | PII | Zien+Export | Zien+Export | Zien* | Zien | Zien | ❌ |
| medische_bijzonderheden | Medisch | Zien+Export | Zien+Export | Zien* | Zien | Zien | ❌ |
| middelengebruik | Medisch | Zien+Export | Zien+Export | Zien* | Zien | Zien | ❌ |
| aanraking_politie_justitie | Justitie | Zien+Export | Zien+Export | Zien* | Zien+CSV | Zien+CSV | ❌ |
| veroordeeld_detentie | Justitie | Zien+Export | Zien+Export | Zien* | Zien | Zien | ❌ |
| schulden_reden_bedrag | Financieel | Zien+Export | Zien+Export | Zien* | Zien | Zien | ❌ |
| foto_url | Biometrisch | Zien | Zien | Zien* | Zien | Zien | ❌ |
| id_scan_url | ID document | Zien | Zien | Zien* | Zien | Zien | ❌ |

*Trainer ziet alleen kandidaten in eigen groepen (RLS enforced)
**Geen enkele gevoelige data-inzage of export wordt gelogd**

---

## Aanbevelingen (prioriteit)

### Direct (voor livegang)
1. **Wrap export-knoppen in PermissionGate** — alleen admin/intaker mogen exporteren
2. **Voeg audit logging toe bij exports** — `logAudit('export', 'kandidaat', id, ...)`
3. **Verwijder justitie-veld uit CSV export** of beperk tot admin
4. **Voeg CSP meta tag toe** aan index.html
5. **Voeg Error Boundary toe** aan App.tsx

### Kort na livegang
6. **Implementeer MFA** voor admin accounts via Supabase Auth
7. **Scheid omgevingen** — aparte Supabase projecten voor dev/staging/prod
8. **Versterk wachtwoordbeleid** — min 8 tekens, mixed case, cijfers
9. **Voeg MIME-type validatie toe** bij uploads
10. **Implementeer CSV formula injection bescherming** — prefix `=+-@` met `'`

### Op termijn
11. **Kolom-niveau beveiliging** — view voor niet-admin dat BSN/medisch maskeert
12. **Setup Sentry** voor error tracking
13. **Documenteer backup/restore** en test recovery
14. **Schrijf SECURITY.md** met incident response procedure
