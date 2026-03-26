# Backup & Restore Documentatie — City Solid

## 1. Overzicht

Deze documentatie beschrijft het backup- en restorebeleid voor het City Solid platform. De volgende onderdelen worden gebacked-up:

| Onderdeel | Beschrijving | Methode |
|-----------|-------------|---------|
| **Database** | PostgreSQL database gehost op Supabase (tabellen, functies, triggers, RLS-policies) | Supabase automatische backups + handmatige dumps |
| **Storage** | Bestanden in Supabase Storage buckets (kandidaat-bestanden, kandidaat-verificatie) | Handmatige download via Dashboard of CLI |
| **Code** | Applicatiecode, migraties, edge functions | Git repository op GitHub |

Het doel is om bij een calamiteit (dataverlies, corruptie, verkeerde migratie) het platform volledig te kunnen herstellen.

---

## 2. Supabase Automatische Backups

Supabase maakt automatisch backups van de PostgreSQL database. De frequentie en retentie zijn afhankelijk van het gekozen plan:

### Free Plan

- **Frequentie:** wekelijks
- **Retentie:** 7 dagen
- **PITR (Point-in-Time Recovery):** niet beschikbaar

### Pro Plan

- **Frequentie:** dagelijks
- **Retentie:** 7 dagen
- **PITR (Point-in-Time Recovery):** beschikbaar (optioneel add-on)
- PITR maakt het mogelijk om de database te herstellen naar elk willekeurig moment binnen de retentieperiode

### Controleren in Supabase Dashboard

1. Ga naar [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecteer het project **city-solid**
3. Navigeer naar **Database** > **Backups**
4. Hier zie je een overzicht van beschikbare backups met datum en status
5. Controleer regelmatig (minimaal wekelijks) of de backups succesvol zijn aangemaakt

---

## 3. Handmatige Database Backup

Naast de automatische backups is het aan te raden om regelmatig handmatige backups te maken, vooral voor productieomgevingen.

### Vereisten

- Supabase CLI geinstalleerd (`npm install -g supabase`)
- Ingelogd bij Supabase CLI (`supabase login`)

### Project Referentie

```
Project ref: qwtvruniwnhiqgsyjskn
```

### Backup Commando

```bash
# Volledige database dump inclusief schema en data
supabase db dump -p qwtvruniwnhiqgsyjskn > backup_$(date +%Y-%m-%d).sql

# Alleen schema (zonder data)
supabase db dump -p qwtvruniwnhiqgsyjskn --schema-only > schema_$(date +%Y-%m-%d).sql

# Alleen data (zonder schema)
supabase db dump -p qwtvruniwnhiqgsyjskn --data-only > data_$(date +%Y-%m-%d).sql
```

### Aanbevolen Frequentie

| Omgeving | Frequentie | Opmerking |
|----------|-----------|-----------|
| **Productie** | Dagelijks | Automatiseer via cron job of CI/CD pipeline |
| **Staging** | Wekelijks | Voor grote wijzigingen |
| **Ontwikkeling** | Voor elke migratie | Als vangnet bij schema-wijzigingen |

### Opslag van Backups

- Sla backups op een veilige, externe locatie op (niet alleen lokaal)
- Gebruik een naamgevingsconventie: `backup_YYYY-MM-DD.sql`
- Bewaar minimaal de laatste 30 dagen aan dagelijkse backups
- Bewaar maandelijkse backups voor minimaal 6 maanden

---

## 4. Code Backup

### Git Repository

De volledige broncode wordt beheerd via Git en gehost op GitHub:

```
Repository: github.com/xanderheijnen/city-solid
Branch: main
```

### Git Tags voor Restore Punten

Gebruik Git tags om belangrijke momenten te markeren waarop de applicatie in een bekende, werkende staat is:

```bash
# Tag aanmaken met datum
git tag backup-v1-2026-03-20

# Tag aanmaken met beschrijving
git tag -a backup-v1-2026-03-20 -m "Backup voor productie release v1"

# Tag pushen naar remote
git push origin backup-v1-2026-03-20

# Alle tags pushen
git push origin --tags
```

### Naamgevingsconventie voor Tags

```
backup-v[versie]-YYYY-MM-DD
```

Voorbeelden:
- `backup-v1-2026-03-20` — eerste productie backup
- `backup-v2-2026-04-15` — backup na grote feature release

### Alle Bestaande Tags Bekijken

```bash
git tag --list "backup-*"
```

---

## 5. Storage Backup

Supabase Storage bevat bestanden die door gebruikers zijn geupload. Deze worden niet automatisch meegenomen in database backups.

### Storage Buckets

| Bucket | Inhoud |
|--------|--------|
| **kandidaat-bestanden** | CV's, motivatiebrieven en overige documenten van kandidaten |
| **kandidaat-verificatie** | Identiteitsverificatie documenten |

### Handmatig Downloaden via Supabase Dashboard

1. Ga naar **Storage** in het Supabase Dashboard
2. Open de gewenste bucket
3. Selecteer bestanden en download ze

### Downloaden via Supabase CLI

```bash
# Lijst van bestanden in een bucket
supabase storage ls kandidaat-bestanden -p qwtvruniwnhiqgsyjskn

# Specifiek bestand downloaden
supabase storage cp sb://kandidaat-bestanden/pad/naar/bestand.pdf ./backup/
```

### Aanbevolen Aanpak

- Maak wekelijks een volledige kopie van alle storage buckets
- Sla de bestanden op in een aparte backup-map met datum: `storage_backup_YYYY-MM-DD/`
- Houd een inventarislijst bij van het aantal bestanden per bucket

---

## 6. Restore Procedure

### 6.1 Database Restore

#### Via psql (aanbevolen voor volledige restore)

```bash
# Verkrijg de database connection string uit Supabase Dashboard
# Ga naar Settings > Database > Connection string

# Restore vanuit een SQL dump
psql "postgresql://postgres:[WACHTWOORD]@db.qwtvruniwnhiqgsyjskn.supabase.co:5432/postgres" < backup_YYYY-MM-DD.sql
```

**Let op:** Bij een volledige restore worden bestaande gegevens overschreven. Maak altijd eerst een backup van de huidige staat.

#### Via Supabase Dashboard (voor automatische backups)

1. Ga naar **Database** > **Backups** in het Supabase Dashboard
2. Selecteer de gewenste backup op basis van datum
3. Klik op **Restore**
4. Bevestig de actie
5. Wacht tot de restore is voltooid (dit kan enkele minuten duren)

#### Via PITR (Pro Plan)

1. Ga naar **Database** > **Backups** > **Point in Time Recovery**
2. Selecteer het exacte tijdstip waarnaar je wilt herstellen
3. Bevestig de actie
4. De database wordt hersteld naar de geselecteerde staat

### 6.2 Code Restore

```bash
# Bekijk beschikbare backup tags
git tag --list "backup-*"

# Checkout naar een specifieke tag
git checkout backup-v1-2026-03-20

# Of maak een nieuwe branch vanuit de tag
git checkout -b restore-branch backup-v1-2026-03-20

# Installeer dependencies opnieuw
npm install

# Controleer of de applicatie correct start
npm run dev
```

### 6.3 Storage Restore

Storage bestanden moeten handmatig worden teruggezet:

1. Ga naar **Storage** in het Supabase Dashboard
2. Open de betreffende bucket
3. Upload de bestanden vanuit de lokale backup-map
4. Controleer of de bestandspaden overeenkomen met de referenties in de database

**Let op:** Zorg ervoor dat de bestandsnamen en mappenstuctuur exact overeenkomen met de originele structuur, anders werken verwijzingen vanuit de database niet meer.

---

## 7. RPO/RTO Doelstellingen

### RPO — Recovery Point Objective

| Doelstelling | Waarde |
|-------------|--------|
| **Maximaal acceptabel dataverlies** | **24 uur** |

Dit betekent dat bij een calamiteit maximaal 24 uur aan data verloren mag gaan. Om dit te garanderen:

- Dagelijkse database backups zijn verplicht voor productie
- Code wordt na elke wijziging naar Git gepusht
- Storage backups worden minimaal wekelijks gemaakt

### RTO — Recovery Time Objective

| Doelstelling | Waarde |
|-------------|--------|
| **Maximale downtime na calamiteit** | **4 uur** |

Dit betekent dat het platform binnen 4 uur na een calamiteit weer operationeel moet zijn. Om dit te bereiken:

- Restore procedures zijn gedocumenteerd en getest
- Alle benodigde credentials zijn veilig opgeslagen en snel toegankelijk
- Minimaal twee teamleden zijn getraind in de restore procedure

### Overzicht Doelstellingen

```
RPO: max 24 uur dataverlies
RTO: max 4 uur downtime

Tijdlijn bij calamiteit:
|--- max 24u verlies ---|--- incident ---|--- max 4u herstel ---|
                         ^                                       ^
                    Calamiteit                          Platform operationeel
```

---

## 8. Testprocedure

### Frequentie

Voer **kwartaallijks** (elke 3 maanden) een volledige restore test uit. Plan deze in de agenda en wijs een verantwoordelijke aan.

### Testomgeving

Voer restore tests altijd uit in een aparte testomgeving, nooit direct op productie. Gebruik hiervoor een apart Supabase project of een lokale Supabase instantie.

### Restore Test Checklist

Gebruik onderstaande checklist bij elke kwartaallijkse restore test:

#### Voorbereiding

- [ ] Testomgeving is beschikbaar en operationeel
- [ ] Meest recente backup bestanden zijn verzameld (database, code, storage)
- [ ] Benodigde credentials en connection strings zijn bij de hand

#### Database Restore

- [ ] SQL dump succesvol geimporteerd in testomgeving
- [ ] Alle tabellen aanwezig en correct aantal rijen
- [ ] RLS policies en functies correct hersteld
- [ ] Steekproef van data inhoudelijk correct

#### Code Restore

- [ ] Code uitgecheckt vanuit backup tag
- [ ] Dependencies succesvol geinstalleerd (`npm install`)
- [ ] Applicatie start zonder fouten (`npm run dev`)
- [ ] Build succesvol (`npm run build`)

#### Storage Restore

- [ ] Bestanden succesvol geupload naar storage buckets
- [ ] Bestandsverwijzingen in database komen overeen met storage paden
- [ ] Steekproef van bestanden kan worden geopend en bekeken

#### Functionele Verificatie

- [ ] Gebruikers kunnen inloggen
- [ ] Kandidatenlijst wordt correct geladen
- [ ] Bestanden van kandidaten zijn zichtbaar en downloadbaar
- [ ] Kernfunctionaliteit werkt naar verwachting

#### Afronding

- [ ] Testresultaten gedocumenteerd
- [ ] Eventuele problemen vastgelegd met actie-items
- [ ] Datum en resultaat van test geregistreerd in onderstaande tabel
- [ ] Volgende test ingepland

### Testhistorie

| Datum | Uitgevoerd door | Resultaat | Opmerkingen |
|-------|----------------|-----------|-------------|
| _YYYY-MM-DD_ | _Naam_ | _Geslaagd / Niet geslaagd_ | _Eventuele opmerkingen_ |

---

## Contactgegevens bij Calamiteiten

| Rol | Verantwoordelijkheid |
|-----|---------------------|
| **Database beheerder** | Database restore en verificatie |
| **DevOps / Ontwikkelaar** | Code restore en deployment |
| **Projectleider** | Coordinatie en communicatie |

---

*Laatst bijgewerkt: 2026-03-26*
