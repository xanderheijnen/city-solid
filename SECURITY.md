# Beveiligingsbeleid IMP Platform — City Solid

**Versie:** 1.0
**Datum:** 26 maart 2026
**Classificatie:** Intern — Vertrouwelijk

---

## 1. Beveiligingsoverzicht

Het IMP Platform hanteert een 3-zone beveiligingsmodel om data te beschermen op basis van gevoeligheid. Elke zone heeft eigen toegangsregels, encryptie-eisen en auditverplichtingen.

### Zone A — Operationele data

Bevat de dagelijkse werkdata die nodig is voor trajectbegeleiding en uitvoering.

- **Tabellen:** `cs_kandidaten` (kernvelden), `cs_trainingen`, `cs_notities`, `cs_voortgang`
- **Inhoud:** Naam, trajectstatus, trainingsresultaten, voortgangsnotities, planning
- **Toegang:** Alle geautoriseerde medewerkers met een actief account
- **Encryptie:** At-rest via Supabase (AES-256), in-transit via TLS 1.3

### Zone B — Gevoelige persoonsgegevens

Bevat bijzondere persoonsgegevens die onder verscherpte AVG-bescherming vallen.

- **Tabellen:** `cs_kandidaten_sensitive`
- **Inhoud:** BSN, medische gegevens, justitiele achtergrond, schuldenhistorie
- **Toegang:** Uitsluitend geautoriseerde rollen met expliciete noodzaak (need-to-know)
- **Encryptie:** Kolomniveau encryptie bovenop standaard at-rest encryptie
- **Audit:** Elke leesactie wordt gelogd met gebruiker, tijdstip en reden

### Zone C — Identiteitsdocumenten

Bevat gedigitaliseerde identiteitsdocumenten en verificatiebestanden.

- **Storage:** Aparte Supabase Storage bucket `kandidaat-verificatie`
- **Inhoud:** ID-scans, verblijfsdocumenten, verificatiefoto's
- **Toegang:** Uitsluitend via signed URLs met korte geldigheidsduur (max 15 minuten)
- **Encryptie:** At-rest encryptie op bucketniveau, geen publieke toegang
- **Retentie:** Automatische verwijdering na afronding verificatieproces conform bewaartermijn

---

## 2. Rollenmatrix

Onderstaande tabel definieert de exacte rechten per rol per beveiligingszone.

| Rol | Zone A — Operationeel | Zone B — Gevoelig | Zone C — Documenten |
|---|---|---|---|
| **Admin** | Volledig (CRUD + beheer) | Volledig (CRUD + beheer) | Volledig (upload, inzien, verwijderen) |
| **Intaker** | Lezen + aanmaken + bewerken | Lezen + aanmaken + bewerken | Upload + inzien |
| **Trainer** | Lezen + bewerken (eigen kandidaten) | Geen toegang | Geen toegang |
| **Manager** | Lezen (alle kandidaten) | Lezen (alleen geanonimiseerd/geaggregeerd) | Geen toegang |
| **Readonly** | Lezen (beperkt tot toegewezen trajecten) | Geen toegang | Geen toegang |

### Toelichting rechten

- **CRUD:** Create, Read, Update, Delete
- **Eigen kandidaten:** Alleen kandidaten die aan de betreffende trainer zijn toegewezen
- **Geanonimiseerd:** Manager ziet uitsluitend geaggregeerde rapportages zonder directe persoonsidentificatie
- **Beheer:** Omvat gebruikersbeheer, rolwijzigingen en systeemconfiguratie
- Alle rolwijzigingen worden gelogd in het auditlogboek

---

## 3. Gevoelige data classificatie

### Kritiek

| Gegevenstype | Voorbeelden | Maatregelen |
|---|---|---|
| BSN | Burgerservicenummer | Kolomencryptie, toegangslog per leesactie, Zone B |
| ID-scans | Paspoort, ID-kaart, verblijfsdocument | Signed URLs, aparte bucket, Zone C |

### Hoog

| Gegevenstype | Voorbeelden | Maatregelen |
|---|---|---|
| Medisch | Diagnoses, beperkingen, medicatie | Zone B, need-to-know, audit logging |
| Justitieel | VOG-status, strafrechtelijke achtergrond | Zone B, need-to-know, audit logging |
| Schulden | Schuldenoverzicht, bewindvoering, WSNP | Zone B, need-to-know, audit logging |

### Midden

| Gegevenstype | Voorbeelden | Maatregelen |
|---|---|---|
| Contactgegevens | Telefoonnummer, e-mailadres | Zone A, standaard toegangscontrole |
| Adresgegevens | Woonadres, postadres | Zone A, standaard toegangscontrole |
| Uitkeringsgegevens | Type uitkering, uitkeringsinstantie | Zone A, beperkte zichtbaarheid |

### Laag

| Gegevenstype | Voorbeelden | Maatregelen |
|---|---|---|
| Naam | Voornaam, achternaam | Zone A, standaard toegangscontrole |
| Trajectgegevens | Trajecttype, startdatum, status | Zone A, standaard toegangscontrole |
| Trainingsgegevens | Gevolgde trainingen, certificaten | Zone A, standaard toegangscontrole |

---

## 4. Incident response procedure

### Stap 1 — Detectie en melding

- Elk vermoeden van een datalek of beveiligingsincident wordt direct gemeld bij de beveiligingsverantwoordelijke via **security@citysolid.nl**
- Automatische detectie via audit logs en anomaliedetectie op toegangspatronen
- Medewerkers zijn verplicht incidenten te melden, ook bij twijfel
- Eerste melding bevat: tijdstip ontdekking, aard van het incident, betrokken systemen, geschat aantal betrokkenen

### Stap 2 — Containment

- Onmiddellijke isolatie van getroffen systemen of accounts
- Intrekken van toegangsrechten bij gecompromitteerde accounts
- Blokkeren van verdachte IP-adressen of sessies
- Bewaren van logbestanden en forensisch bewijs (geen wijzigingen aan getroffen systemen)
- Activeren van het incidentteam binnen 1 uur na melding

### Stap 3 — Analyse

- Vaststellen van de omvang: welke data is geraakt, welke zones zijn betrokken
- Identificeren van de oorzaak (root cause analysis)
- Bepalen of het incident meldplichtig is bij de Autoriteit Persoonsgegevens (AP)
- Classificatie van het incident: laag, midden, hoog of kritiek
- Documenteren van alle bevindingen in het incidentlogboek

### Stap 4 — Herstel

- Dichten van de kwetsbaarheid of het beveiligingslek
- Herstellen van getroffen data vanuit back-ups indien nodig
- Opnieuw instellen van toegangsrechten en wachtwoorden
- Verifiëren dat het incident volledig is verholpen
- Hervatten van normale operaties na goedkeuring beveiligingsverantwoordelijke

### Stap 5 — Evaluatie en rapportage AP

- Opstellen van een volledig incidentrapport
- Melding bij de Autoriteit Persoonsgegevens (AP) binnen 72 uur indien het incident meldplichtig is
- Informeren van betrokkenen indien er een hoog risico is voor hun rechten en vrijheden
- Evaluatiesessie met het team om herhaling te voorkomen
- Bijwerken van beveiligingsmaatregelen en procedures op basis van geleerde lessen
- Archivering van het incidentdossier (bewaartermijn: minimaal 3 jaar)

---

## 5. AVG/GDPR compliance

### Grondslag verwerking

Het IMP Platform verwerkt persoonsgegevens op basis van de volgende grondslagen uit artikel 6 AVG:

| Grondslag | Toepassing |
|---|---|
| **Wettelijke verplichting** (art. 6 lid 1 sub c) | Verwerking BSN, uitkeringsgegevens ten behoeve van wettelijke re-integratietaken |
| **Algemeen belang / openbaar gezag** (art. 6 lid 1 sub e) | Uitvoering van publieke taken op het gebied van werk en participatie |
| **Uitdrukkelijke toestemming** (art. 9 lid 2 sub a) | Verwerking bijzondere persoonsgegevens (medisch, justitieel) uitsluitend met expliciete toestemming |
| **Gerechtvaardigd belang** (art. 6 lid 1 sub f) | Beveiligingslogging en fraudepreventie |

### Bewaartermijnen

| Gegevenstype | Bewaartermijn | Toelichting |
|---|---|---|
| Trajectgegevens | 2 jaar na afsluiting traject | Conform gemeentelijke archiefrichtlijnen |
| BSN | Verwijdering bij einde trajectrelatie | Niet langer bewaren dan strikt noodzakelijk |
| Medische gegevens | 1 jaar na afsluiting traject | Tenzij wettelijk anders voorgeschreven |
| Justitiele gegevens | 1 jaar na afsluiting traject | Verwijdering na afloop bewaartermijn |
| ID-scans | Verwijdering na verificatie (max 4 weken) | Zo kort mogelijk bewaren |
| Audit logs | 3 jaar | Ten behoeve van verantwoording en incidentafhandeling |
| Trainingsgegevens | 5 jaar na afsluiting | Ten behoeve van certificering en verantwoording |

### Recht op inzage en verwijdering

- **Recht op inzage (art. 15 AVG):** Kandidaten kunnen via hun trajectbegeleider of rechtstreeks een verzoek indienen om alle over hen opgeslagen gegevens in te zien. Reactietermijn: maximaal 1 maand.
- **Recht op rectificatie (art. 16 AVG):** Onjuiste gegevens worden op verzoek gecorrigeerd.
- **Recht op verwijdering (art. 17 AVG):** Kandidaten kunnen verzoeken om verwijdering van hun gegevens, tenzij een wettelijke bewaarverplichting van toepassing is. Bij verwijdering worden alle gegevens in Zone A, B en C gewist.
- **Recht op overdraagbaarheid (art. 20 AVG):** Gegevens kunnen in een machineleesbaar formaat (JSON/CSV) worden aangeleverd.
- **Verzoeken worden geregistreerd** in het AVG-verzoeklogboek met datum, type verzoek, behandelaar en afhandeltermijn.

### DPIA verplichting

Een Data Protection Impact Assessment (DPIA) is verplicht voor het IMP Platform op basis van:

- **Grootschalige verwerking** van bijzondere persoonsgegevens (medisch, justitieel)
- **Systematische monitoring** van kwetsbare personen in re-integratietrajecten
- **Verwerking van BSN** in combinatie met gevoelige gegevens
- **Profilering** ten behoeve van trajectmatching en voortgangsanalyse

De DPIA wordt:
- Uitgevoerd voor ingebruikname van nieuwe verwerkingen
- Minimaal jaarlijks herzien
- Gedeeld met de Functionaris Gegevensbescherming (FG)
- Beschikbaar gesteld aan de Autoriteit Persoonsgegevens op verzoek

---

## 6. Vulnerability disclosure

### Contactgegevens

Beveiligingskwetsbaarheden in het IMP Platform kunnen worden gemeld via:

- **E-mail:** security@citysolid.nl
- **PGP-sleutel:** Beschikbaar op aanvraag voor versleutelde communicatie

### Responsible disclosure beleid

City Solid hanteert een responsible disclosure beleid en waardeert de inspanningen van beveiligingsonderzoekers die kwetsbaarheden op een verantwoorde wijze melden.

**Richtlijnen voor melders:**

1. Meld kwetsbaarheden zo snel mogelijk na ontdekking via security@citysolid.nl
2. Verstrek voldoende informatie om het probleem te reproduceren (stappen, screenshots, logs)
3. Maak geen misbruik van de kwetsbaarheid door meer data te benaderen dan nodig voor het aantonen
4. Verwijder alle verkregen data na de melding
5. Deel de kwetsbaarheid niet met derden totdat deze is verholpen
6. Voer geen aanvallen uit die de beschikbaarheid van diensten aantasten (DDoS)
7. Voer geen social engineering, phishing of fysieke aanvallen uit op medewerkers

**Onze toezegging:**

- Bevestiging van ontvangst binnen 2 werkdagen
- Beoordeling en terugkoppeling binnen 5 werkdagen
- Geen juridische stappen tegen melders die zich aan bovenstaande richtlijnen houden
- Vermelding in de Hall of Fame (optioneel en met toestemming van de melder)
- Oplossing van kritieke kwetsbaarheden binnen 30 dagen

---

## 7. Technische maatregelen

### Row Level Security (RLS)

- **Alle tabellen** in de Supabase database zijn voorzien van Row Level Security policies
- RLS policies zijn gekoppeld aan de authenticatiecontext (`auth.uid()`) en de rol van de gebruiker
- Directe database-toegang zonder RLS is geblokkeerd; de service role key wordt uitsluitend server-side gebruikt
- RLS policies worden getest bij elke migratie en zijn onderdeel van de CI/CD pipeline
- Aparte policies voor SELECT, INSERT, UPDATE en DELETE per tabel en per rol

### Signed URLs voor bestanden

- Bestanden in de `kandidaat-verificatie` bucket zijn niet publiek toegankelijk
- Toegang verloopt uitsluitend via signed URLs met een maximale geldigheidsduur van 15 minuten
- Signed URLs worden server-side gegenereerd en bevatten een verificatietoken
- Verlopen URLs geven een 403 Forbidden response
- Download-acties worden gelogd met gebruiker, bestand en tijdstip

### Audit logging (onwijzigbaar)

- Alle schrijfacties (INSERT, UPDATE, DELETE) op gevoelige tabellen worden gelogd
- Audit logs worden opgeslagen in een append-only tabel (`cs_audit_log`) zonder DELETE- of UPDATE-rechten voor applicatierollen
- Elk logrecord bevat: tijdstip, gebruiker, actie, tabel, record-ID, oude waarde en nieuwe waarde
- Audit logs worden dagelijks geback-upt naar een externe locatie
- Retentieperiode: minimaal 3 jaar

### Access logging voor gevoelige data

- Elke leesactie op Zone B tabellen (`cs_kandidaten_sensitive`) wordt gelogd
- Logrecords bevatten: gebruiker, tijdstip, opgevraagd record, bron (API-endpoint)
- Periodieke analyse van toegangspatronen voor anomaliedetectie
- Rapportage van ongebruikelijke toegangspatronen aan de beveiligingsverantwoordelijke
- Toegangslogboek is beschikbaar voor audits door de Functionaris Gegevensbescherming

### Content Security Policy (CSP) headers

- Strikte CSP headers op alle pagina's ter voorkoming van XSS-aanvallen
- `default-src 'self'` als basisregel
- Externe bronnen uitsluitend toegestaan via expliciete whitelisting
- `script-src` beperkt tot eigen domein en vertrouwde CDN's, geen `unsafe-inline`
- `frame-ancestors 'none'` ter voorkoming van clickjacking
- CSP violation reports worden verzameld en geanalyseerd

### Error boundary (geen stack traces)

- De applicatie maakt gebruik van React Error Boundaries op alle routes
- Foutmeldingen aan gebruikers bevatten geen technische details, stack traces of interne paden
- Gedetailleerde foutinformatie wordt uitsluitend server-side gelogd
- Productie-builds bevatten geen source maps die publiek toegankelijk zijn
- API-foutresponses retourneren generieke foutcodes zonder implementatiedetails

---

## Bijlage: Verantwoordelijkheden

| Rol | Verantwoordelijkheid |
|---|---|
| **Beveiligingsverantwoordelijke** | Eigenaar van dit beleid, coördinatie incident response |
| **Functionaris Gegevensbescherming (FG)** | Toezicht AVG-compliance, DPIA-beoordeling |
| **Ontwikkelteam** | Implementatie technische maatregelen, security patches |
| **Teamleiders** | Naleving door medewerkers, toegangsbeheer eigen team |
| **Alle medewerkers** | Melden van incidenten, naleven van dit beleid |

---

*Dit document wordt minimaal jaarlijks herzien en bijgewerkt na significante wijzigingen in het platform of de wetgeving.*
