import { useState, useRef, useEffect } from 'react';
import {
  Book, HelpCircle, MessageCircle, Search, ChevronDown, ChevronRight,
  Send, Bot, User, LayoutDashboard, ClipboardList, Users, GraduationCap,
  TrendingUp, UserCog, Upload, FileText, Shield, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

// ═══════════════════════════════════════════════════════════════════════════
// HANDLEIDING DATA — update dit bij nieuwe functionaliteit
// ═══════════════════════════════════════════════════════════════════════════

interface ManualSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: ManualArticle[];
}

interface ManualArticle {
  title: string;
  body: string;
  tags: string[];
}

const HANDLEIDING: ManualSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    content: [
      {
        title: 'Overzicht',
        body: `Het dashboard is de startpagina van City Solid. Hier zie je in één oogopslag:

• **Totaal kandidaten** — het aantal geregistreerde kandidaten in het systeem.
• **Actieve trajecten** — hoeveel kandidaten momenteel in een traject zitten.
• **Intake deze maand** — aantal nieuwe intakes in de huidige maand.
• **Uitstroom** — kandidaten die het traject succesvol hebben afgerond.

Daarnaast toont het dashboard een **staafdiagram** met kandidaten per trajectfase (Aangemeld, Intake, Training, Stage, Geplaatst, Uitstroom). Dit geeft snel inzicht in de verdeling over de verschillende fases.`,
        tags: ['dashboard', 'overzicht', 'statistieken', 'kandidaten', 'trajectfase'],
      },
    ],
  },
  {
    id: 'aanmeldingen',
    title: 'Aanmeldingen',
    icon: ClipboardList,
    content: [
      {
        title: 'Nieuwe aanmelding maken',
        body: `Ga naar **Kandidaten → Aanmeldingen** en klik op de knop **"Nieuwe Aanmelding"**. Vul de basisgegevens in:

1. **Voornaam** en **Achternaam** (verplicht)
2. **E-mailadres** en **Telefoonnummer**
3. **Geboortedatum** en **Leeftijd**
4. **Bron** — hoe de kandidaat is binnengekomen
5. **Aanmeld organisatie** — de organisatie die de aanmelding doet
6. **Aanmeld type** — of de kandidaat zichzelf aanmeldt of door iemand anders wordt aangemeld
7. **Aanmelder gegevens** — bij aanmelding door een ander: naam, telefoon en e-mail van de aanmelder
8. **Gewenst project** — welk project de kandidaat wil volgen (Certi & Skills, Cityteam, City Side Jobs)

Na het opslaan verschijnt de kandidaat in het aanmeldingenoverrzicht met de status "Aangemeld".`,
        tags: ['aanmelding', 'nieuw', 'kandidaat', 'registreren', 'toevoegen', 'organisatie', 'aanmelder'],
      },
      {
        title: 'Aanmeldingenlijst',
        body: `Het aanmeldingenoverrzicht toont alle kandidaten in een tabel met kolommen:

• **Naam** — volledige naam van de kandidaat
• **Voortgang** — visuele indicator van de huidige trajectfase
• **Status** — Aangemeld, Intake, Training, Stage, Geplaatst of Uitstroom
• **Datum** — aanmelddatum

Je kunt zoeken via de zoekbalk en filteren op status. Klik op een kandidaat om het detailscherm te openen.`,
        tags: ['aanmeldingen', 'overzicht', 'lijst', 'zoeken', 'filteren', 'voortgang'],
      },
      {
        title: 'Kandidaten uploaden (batch import)',
        body: `Je kunt kandidaten ook in bulk toevoegen via de **upload-functie**. Klik op de knop **"Upload Kandidaten"** in het overzicht.

Ondersteunde bestandsformaten:
• **Excel (.xlsx, .xls)** — kolommen worden automatisch herkend
• **CSV** — komma- of puntkomma-gescheiden bestanden
• **Word (.docx)** — tekst wordt geparsed en velden worden geëxtraheerd
• **PDF** — tekst wordt geëxtraheerd uit het document
• **Afbeeldingen (.png, .jpg)** — OCR wordt gebruikt om tekst te herkennen

Na het uploaden zie je een **preview** van de herkende kandidaten. Je kunt velden aanpassen of kandidaten verwijderen voordat je definitief importeert.`,
        tags: ['upload', 'importeren', 'batch', 'excel', 'csv', 'word', 'pdf', 'afbeelding', 'ocr'],
      },
    ],
  },
  {
    id: 'kandidaten',
    title: 'Kandidaten',
    icon: Users,
    content: [
      {
        title: 'Kandidaatoverzicht',
        body: `Het kandidaatoverzicht (**Alle Kandidaten**) heeft twee weergaven:

**Compleetheid-view (standaard):**
• Toont per kandidaat welke gegevens compleet of incompleet zijn
• 19 velden gegroepeerd in categorieën (Persoonlijk, Contact, Adres, Intake, Documenten)
• Voortgangspercentage en kleurgecodeerde balk per kandidaat
• Sorteerbaar op volledigheid (klik op "%" kolomkop)
• Samenvattingskaarten: totaal, gemiddelde volledigheid, compleet en incompleet

**Tabel-view:**
• Klassieke tabelweergave met alle kolommen
• Excel-achtige sortering: klik op een kolomkop → A→Z / Z→A
• Sorteerbaar op alle kolommen

**Kolomkiezer:** Klik op de "Kolommen"/"Velden" knop om te kiezen welke kolommen zichtbaar zijn, de volgorde te wijzigen (drag & drop) en verborgen kolommen weer aan te zetten.

**Import:** Klik op "Importeren" om kandidaten te uploaden vanuit Excel, CSV, Word of PDF. Het systeem herkent automatisch bestaande kandidaten (op CSN of naam) en vult ontbrekende gegevens aan.`,
        tags: ['kandidaten', 'overzicht', 'zoeken', 'filteren', 'exporteren', 'compleetheid', 'sorteren', 'kolommen', 'import', 'upsert'],
      },
      {
        title: 'Kandidaat detailpagina',
        body: `De detailpagina bevat alle informatie over een kandidaat, verdeeld in tabs:

• **Persoon** — persoonlijke gegevens, adres, contact, financieel, trajecten, sector/voorkeur, motivatie, thuissituatie, schulden, opleidingen, cursussen, werkervaring en acties/afspraken
• **Trainingen** — gekoppelde trainingsgroepen en resultaten
• **Certificaten** — behaalde en lopende certificaten
• **Notities** — vrije notities van medewerkers
• **Documenten** — pasfoto, ID-scan en CV uploaden en bekijken
• **Uitstroom** — uitstroomstatus instellen en gespreksupdates bijhouden

**Trajecten koppelen:**
Op het Persoon-tab staat een "Trajecten" sectie met gekleurde chips. Klik op een traject (bijv. Certi & Skills, City Team, BIROTA) om het te koppelen of ontkoppelen. Meerdere trajecten per kandidaat mogelijk.

**Bestanden uploaden en bekijken:**
Upload een pasfoto, ID-scan of CV. Klik op "Bekijken" om het bestand te openen in een nieuw tabblad. Je kunt bestanden ook vervangen of verwijderen.

**Uitstroom beheren:**
Op het Uitstroom-tab kun je de uitstroomstatus instellen en gespreksupdates toevoegen.`,
        tags: ['kandidaat', 'detail', 'persoon', 'intake', 'documenten', 'notities', 'voortgang', 'rapport', 'uitstroom', 'foto', 'id scan', 'cv', 'upload', 'bestanden', 'trajecten', 'bekijken'],
      },
      {
        title: 'Intake uitvoeren',
        body: `De intake is een uitgebreid formulier van **14 stappen**, gebaseerd op het Intakedocument 2025:

1. **Persoonlijke gegevens** — naam, BSN, nationaliteit, geboorteplaats
2. **Adres** — woonplaats, straat, BRP-registratie
3. **Contact & Verwijzing** — telefoon, e-mail, door wie bekend, zorgverzekering
4. **Financieel** — inkomen, vervoer, OV-chipkaart
5. **Sector & Voorkeur** — gewenste sector(en), certificaatvoorkeur
6. **Motivatie & Competenties** — motivatie, demotivatie, goede eigenschappen, verbeterpunten
7. **Thuissituatie** — woonsituatie, kinderen, talen, hobbys
8. **Gezondheid & Middelen** — middelengebruik
9. **Schulden** — of er schulden zijn, reden, afspraken
10. **Justitieel verleden** — veroordelingen, detentie
11. **Opleidingen** — opleiding, diploma, niveau, reden uitval
12. **Cursussen & Certificaten** — gevolgde cursussen, waarom het niet lukte
13. **Werkervaring** — CV, eerdere werkervaring
14. **Acties & Afspraken** — vervolgstappen en aandachtsgebieden

Elke stap kan worden ingevuld en opgeslagen. Je kunt heen en weer navigeren tussen stappen.`,
        tags: ['intake', 'formulier', 'wizard', 'stappen', 'invullen', 'intakedocument'],
      },
      {
        title: 'Formulier scannen (OCR)',
        body: `Bij internet- of computerstoringen kun je een **foto van een handgeschreven intakeformulier** uploaden:

1. Open de intake-pagina van een kandidaat
2. Klik rechtsboven op **"Formulier scannen"**
3. Upload een foto (PNG, JPG) of PDF van het formulier
4. Het systeem herkent de tekst via OCR (Nederlands + Engels)
5. Een review-dialog toont de herkende velden naast de huidige waarden
6. Per veld kun je kiezen of de OCR-waarde overgenomen wordt
7. Pas handmatig aan bij slecht handschrift

Het systeem herkent automatisch 88+ veldlabels uit het intakeformulier.`,
        tags: ['ocr', 'scannen', 'foto', 'handschrift', 'formulier', 'herkenning', 'camera'],
      },
    ],
  },
  {
    id: 'trainingen',
    title: 'Trainingen',
    icon: GraduationCap,
    content: [
      {
        title: "Programma's beheren",
        body: `Onder **Trainingen → Programma's** vind je alle trainingsprogramma's. Een programma beschrijft het type training (bijv. "Bouw Basis", "Logistiek Startkwalificatie").

Je kunt:
• Een **nieuw programma** aanmaken met naam, beschrijving en duur
• Bestaande programma's **bewerken**
• Programma's **archiveren** als ze niet meer actief zijn`,
        tags: ['trainingen', 'programma', 'aanmaken', 'bewerken'],
      },
      {
        title: 'Groepen',
        body: `Onder **Trainingen → Groepen** kun je trainingsgroepen aanmaken en beheren. Een groep is gekoppeld aan een programma en bevat kandidaten.

• **Groep aanmaken** — kies een programma, startdatum en trainer
• **Kandidaten toevoegen** aan een groep
• **Aanwezigheid** bijhouden per sessie
• **Groepdetail** — overzicht van alle deelnemers en hun voortgang`,
        tags: ['groepen', 'trainingsgroep', 'aanwezigheid', 'deelnemers'],
      },
    ],
  },
  {
    id: 'voortgang',
    title: 'Voortgang & Resultaten',
    icon: TrendingUp,
    content: [
      {
        title: 'Voortgangsoverzicht',
        body: `De pagina **Voortgang & Resultaten** geeft een totaaloverzicht van alle kandidaten en hun voortgang door het traject.

De trajectfasen zijn:
1. **Aangemeld** — kandidaat is geregistreerd
2. **Intake** — intakegesprek vindt plaats
3. **Training** — kandidaat volgt een trainingsprogramma
4. **Stage** — kandidaat loopt stage
5. **Geplaatst** — kandidaat is succesvol geplaatst
6. **Uitstroom** — traject is afgerond

Per kandidaat wordt een **voortgangsbalk** getoond die visueel aangeeft in welke fase iemand zit.`,
        tags: ['voortgang', 'resultaten', 'trajectfase', 'fase', 'geplaatst', 'uitstroom'],
      },
    ],
  },
  {
    id: 'gebruikers',
    title: 'Gebruikersbeheer',
    icon: UserCog,
    content: [
      {
        title: 'Gebruikers aanmaken',
        body: `Ga naar **Beheer → Gebruikers** en klik op **"Gebruiker Toevoegen"**. Vul in:

• **Naam** — volledige naam van de medewerker
• **E-mailadres** — wordt gebruikt om in te loggen
• **Wachtwoord** — minimaal 6 tekens
• **Functie** — optioneel, bijv. "Intaker" of "Trainer"
• **Rol** — bepaalt de rechten (zie hieronder)

De gebruiker ontvangt een bevestigingsmail om het account te activeren.`,
        tags: ['gebruiker', 'aanmaken', 'account', 'medewerker', 'toevoegen'],
      },
      {
        title: 'Rollen en rechten',
        body: `Er zijn 5 rollen beschikbaar, elk met eigen rechten:

**Admin**
• Volledige toegang tot alle functies
• Gebruikers aanmaken, bewerken en verwijderen
• Rollen toewijzen en verwijderen
• Beheerinstellingen wijzigen

**Intaker**
• Nieuwe kandidaten aanmelden
• Intakeformulieren invullen en bewerken
• Documenten uploaden bij kandidaten

**Trainer**
• Kandidaten in eigen groep inzien
• Voortgang en aanwezigheid bijhouden
• Notities toevoegen

**Manager**
• Dashboard en rapportages inzien
• Alle kandidaatgegevens inzien (niet bewerken)
• Exports en overzichten genereren

**Alleen lezen**
• Alleen-lezen toegang tot dashboard en overzichten
• Geen bewerkrechten

Je kunt rollen toewijzen of verwijderen via de **"Rol"**-knop naast elke gebruiker. Een gebruiker kan meerdere rollen hebben.`,
        tags: ['rollen', 'rechten', 'admin', 'intaker', 'trainer', 'manager', 'readonly', 'alleen lezen', 'bevoegdheden'],
      },
      {
        title: 'Opties beheren',
        body: `Onder **Instellingen → Opties** kun je de keuzelijsten van de applicatie beheren. Er zijn 5 categorieën:

• **Wijk** — wijken voor kandidaat-adresgegevens
• **Gebied** — Rotterdamse gebieden
• **Uitkering** — soorten uitkeringen
• **Klantmanager** — klantmanagers/casemanagers
• **Traject** — beschikbare trajecten (bijv. Certi & Skills, City Team, BIROTA)

Per categorie kun je waarden **toevoegen**, **bewerken** (inline klikken), **verwijderen** (soft-delete) en **herstellen**. Verwijderde waarden worden niet meer getoond in dropdowns maar de data blijft behouden.`,
        tags: ['opties', 'instellingen', 'wijk', 'gebied', 'uitkering', 'traject', 'klantmanager', 'beheer', 'keuzelijst'],
      },
    ],
  },
  {
    id: 'rapportage',
    title: 'Rapportage',
    icon: BarChart3,
    content: [
      {
        title: 'Rapportage Dashboard',
        body: `Het **Rapportage Dashboard** (Rapportage → Dashboard) biedt een visueel overzicht van alle deelnemersdata:

• **Pipeline overzicht** — toont de doorstroom in 4 stappen: Instroom → Gestarte trajecten → In Proces → Uitstroom
• **Top 6 gebieden** — donut-grafieken met de meest voorkomende Rotterdamse gebieden
• **Statistiekkaarten** — meest voorkomende opleiding, % geen BRP, % justitie, % uitkering, gemiddelde leeftijd en man/vrouw verdeling
• **Wisselbare grafieken** — 6 grafieken (leeftijd, geslacht, uitkering, opleiding, organisatie, sector) met 5 weergavemodi per grafiek
• **Vergroten** — klik op het vergroot-icoon (⛶) naast een grafiek om deze als popup op groot formaat te bekijken

Gebruik het **activiteitenfilter** rechtsboven om te filteren op een specifieke activiteit (bijv. BIROTA, CWST). Dit filter werkt op alle rapportagepagina's.`,
        tags: ['rapportage', 'dashboard', 'pipeline', 'grafieken', 'statistieken', 'activiteit', 'filter'],
      },
      {
        title: 'Deelnemers tabel',
        body: `De **Deelnemers** pagina (Rapportage → Deelnemers) toont een brede, scrollbare tabel met alle kandidaatgegevens:

• Kolommen: Activiteit, CSN, Uitstroom, Wijk, Gebied, Uitkering, Leeftijd, Geslacht, Opleiding, Woonplaats, Ingeschreven, Sector, No-show, Eenoudergezin, Certificaten (1-5), # Cert, # Gezakt
• **Zoeken** — zoek op CSN, wijk, organisatie of uitstroom
• **Toevoegen** — voeg handmatig een deelnemer toe
• **Import Excel** — importeer deelnemers vanuit een Excel-bestand
• **Export Excel** — exporteer de huidige tabel naar CSV
• **Bewerken** — klik op een rij om gegevens aan te passen
• **Alles verwijderen** — verwijder alle deelnemers (met bevestiging)`,
        tags: ['deelnemers', 'tabel', 'zoeken', 'importeren', 'exporteren', 'excel', 'csv', 'certificaten'],
      },
      {
        title: 'Visuele Rapportage',
        body: `De **Rapportage** pagina (Rapportage → Rapportage) toont een visueel rapport met:

• **Samenvatting** — automatisch gegenereerde tekst met kerngegevens
• **Demografisch overzicht** — leeftijdsverdeling (balkdiagram), geslacht, uitstroomstatus en overige kenmerken
• **Opleiding en Status** — opleidingsniveau, justitie, uitkering en aanmeldende organisaties
• **Certificaten KPI's** — totaal behaald, totaal gezakt en slagingspercentage

Alle data wordt automatisch berekend op basis van de deelnemersgegevens.`,
        tags: ['rapportage', 'visueel', 'demografie', 'certificaten', 'kpi', 'slagingspercentage'],
      },
      {
        title: 'Eindrapportage (PmG)',
        body: `De **Eindrapportage** pagina (Rapportage → Eindrapportage) genereert een formeel PmG-document:

• Gestructureerde secties: Feiten & Cijfers, Gebieden, Aanmelders, Deelnemersinfo, Certificaten, Uitstroom
• City Solid branding per sectie
• **Printen/PDF** — klik op de "Printen" knop om het rapport af te drukken of als PDF op te slaan via het printvenster van je browser`,
        tags: ['eindrapportage', 'pmg', 'printen', 'pdf', 'formeel', 'rapport'],
      },
      {
        title: 'AI Rapportage',
        body: `De **AI Rapport** pagina (Rapportage → AI Rapport) genereert een tekstueel rapport op basis van de deelnemersdata:

• **Prompt aanpassen** — pas de instructie aan om het rapport naar wens te genereren
• **Rapport genereren** — klik op de knop om een samenvatting te maken
• **Donut-grafieken** — leeftijdsverdeling en geslacht worden visueel weergegeven onder het rapport`,
        tags: ['ai', 'rapport', 'genereren', 'prompt', 'samenvatting'],
      },
      {
        title: 'Gebiedskaart Rotterdam',
        body: `De **Gebiedskaart** pagina (Rapportage → Gebiedskaart) toont alle 14 Rotterdamse gebieden:

• **Gebiedskaarten** — klik op een gebied om details te bekijken (deelnemers, certificaten, aan het werk, op school)
• **Totaaloverzicht** — totaal deelnemers, certificaten behaald, aan het werk en op school
• **Ranking** — gebieden gerangschikt op aantal deelnemers`,
        tags: ['gebiedskaart', 'rotterdam', 'gebied', 'kaart', 'ranking'],
      },
      {
        title: 'Uitstroom Rubrieken',
        body: `De **Rubrieken** pagina (Rapportage → Rubrieken) beheert de koppeling tussen uitstroomwaarden en categorieën:

• **Rubrieken** — koppel elke uitstroomwaarde aan een rubriek: Uitstroom, In proces of Uitval
• **Toon in grafieken** — schakel per rubriek in of uit of deze meetelt in de rapportagegrafieken
• **Niet-gekoppelde waarden** — worden bovenaan getoond met de optie om ze toe te voegen of als "niet meetellen" te markeren
• **Nieuwe waarden** — voeg handmatig nieuwe uitstroomwaarden toe`,
        tags: ['rubrieken', 'uitstroom', 'koppeling', 'grafieken', 'uitval', 'in proces'],
      },
      {
        title: 'Import Logboek',
        body: `De **Import Log** pagina (Rapportage → Import Log) toont de geschiedenis van alle Excel-imports:

• Bestandsnaam, bron, aantal rijen, succesvol, mislukt en datum
• Handig om te controleren of een import correct is verlopen`,
        tags: ['import', 'log', 'logboek', 'excel', 'geschiedenis'],
      },
    ],
  },
  {
    id: 'export',
    title: 'Exports & Rapporten',
    icon: FileText,
    content: [
      {
        title: 'Intake-rapport exporteren',
        body: `Vanuit de kandidaat-detailpagina kun je een **Word-rapport** exporteren met alle intakegegevens. Dit rapport bevat alle 14 secties van het intakeformulier en is geschikt om af te drukken of te delen.

Klik op de **"Export"**-knop in de kandidaat-detailpagina om het rapport te genereren.`,
        tags: ['export', 'rapport', 'word', 'intakerapport', 'afdrukken'],
      },
      {
        title: 'Kandidatenlijst exporteren',
        body: `Vanuit het kandidaatoverzicht kun je de volledige lijst exporteren naar Excel. Dit bevat alle zichtbare kolommen en is handig voor rapportages of externe communicatie.`,
        tags: ['export', 'excel', 'kandidatenlijst', 'rapportage'],
      },
    ],
  },
  {
    id: 'beveiliging',
    title: 'Beveiliging & Privacy',
    icon: Shield,
    content: [
      {
        title: 'Inloggen',
        body: `Je logt in met je **e-mailadres** en **wachtwoord** op de inlogpagina. Als je account nieuw is, moet je eerst de bevestigingsmail openen.

Als je je wachtwoord bent vergeten, neem contact op met een beheerder om een nieuw wachtwoord in te stellen.`,
        tags: ['inloggen', 'login', 'wachtwoord', 'account', 'beveiliging'],
      },
      {
        title: 'Gegevensbeveiliging',
        body: `City Solid maakt gebruik van **Supabase** als backend met:

• **Row Level Security (RLS)** — gebruikers kunnen alleen gegevens zien waartoe ze geautoriseerd zijn
• **Versleutelde verbinding** — alle communicatie verloopt via HTTPS
• **Audit Log** — alle wijzigingen worden bijgehouden onder Beheer → Audit Log

Persoonsgegevens van kandidaten worden vertrouwelijk behandeld conform de AVG.`,
        tags: ['beveiliging', 'privacy', 'rls', 'avg', 'audit', 'versleuteling'],
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// FAQ DATA
// ═══════════════════════════════════════════════════════════════════════════

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Hoe maak ik een nieuwe kandidaat aan?',
    answer: 'Ga naar Kandidaten → Aanmeldingen en klik op "Nieuwe Aanmelding". Vul de verplichte velden in (voornaam, achternaam) en klik op Opslaan.',
    category: 'Kandidaten',
    tags: ['kandidaat', 'aanmaken', 'nieuw', 'aanmelding'],
  },
  {
    question: 'Kan ik meerdere kandidaten tegelijk importeren?',
    answer: 'Ja! Klik op "Upload Kandidaten" in het overzicht. Je kunt Excel, CSV, Word, PDF of zelfs een screenshot uploaden. Het systeem herkent automatisch de velden.',
    category: 'Kandidaten',
    tags: ['import', 'upload', 'batch', 'meerdere', 'excel'],
  },
  {
    question: 'Hoe voer ik een intake uit?',
    answer: 'Open de kandidaat-detailpagina en klik op "Intake Uitvoeren". Het formulier bevat 14 stappen die je één voor één kunt invullen. Je kunt tussendoor opslaan en later verdergaan.',
    category: 'Kandidaten',
    tags: ['intake', 'formulier', 'uitvoeren', 'invullen'],
  },
  {
    question: 'Hoe exporteer ik een intake-rapport?',
    answer: 'Ga naar de kandidaat-detailpagina en klik op de "Export"-knop. Er wordt een Word-document gegenereerd met alle intakegegevens.',
    category: 'Kandidaten',
    tags: ['export', 'rapport', 'word', 'intake'],
  },
  {
    question: 'Welke rollen zijn er en wat kunnen ze?',
    answer: 'Er zijn 5 rollen: Admin (volledige toegang), Intaker (kandidaten aanmelden en intakes), Trainer (groepen beheren), Manager (rapportages inzien), en Alleen lezen (alleen bekijken). Ga naar Beheer → Gebruikers voor de volledige rollenlegenda.',
    category: 'Gebruikers',
    tags: ['rollen', 'rechten', 'admin', 'intaker', 'trainer', 'manager'],
  },
  {
    question: 'Hoe voeg ik een nieuwe gebruiker toe?',
    answer: 'Ga naar Beheer → Gebruikers en klik op "Gebruiker Toevoegen". Vul naam, e-mailadres, wachtwoord en rol in. De gebruiker ontvangt een bevestigingsmail.',
    category: 'Gebruikers',
    tags: ['gebruiker', 'toevoegen', 'account', 'aanmaken'],
  },
  {
    question: 'Kan een gebruiker meerdere rollen hebben?',
    answer: 'Ja. Klik op de "Rol"-knop naast een gebruiker om extra rollen toe te voegen. Klik op een rolbadge (×) om een rol te verwijderen.',
    category: 'Gebruikers',
    tags: ['rollen', 'meerdere', 'toewijzen', 'verwijderen'],
  },
  {
    question: 'Hoe maak ik een trainingsgroep aan?',
    answer: 'Ga naar Trainingen → Groepen en klik op "Nieuwe Groep". Kies een programma, stel een startdatum in en wijs een trainer toe. Daarna kun je kandidaten aan de groep toevoegen.',
    category: 'Trainingen',
    tags: ['groep', 'training', 'aanmaken', 'programma'],
  },
  {
    question: 'Hoe houd ik aanwezigheid bij?',
    answer: 'Open een trainingsgroep via Trainingen → Groepen. In het groepdetail kun je per sessie de aanwezigheid van deelnemers registreren.',
    category: 'Trainingen',
    tags: ['aanwezigheid', 'registreren', 'groep', 'sessie'],
  },
  {
    question: 'Wat betekenen de trajectfasen?',
    answer: 'De fasen zijn: Aangemeld (nieuw), Intake (gesprek), Training (in opleiding), Stage (werkervaring), Geplaatst (baan gevonden) en Uitstroom (afgerond). De voortgangsbalk toont visueel in welke fase een kandidaat zit.',
    category: 'Voortgang',
    tags: ['trajectfase', 'fase', 'voortgang', 'status', 'aangemeld', 'geplaatst'],
  },
  {
    question: 'Wat betekent "Intake gedaan"?',
    answer: 'Wanneer een kandidaat de status "Intake" heeft, betekent dit dat het intakegesprek is afgerond. Tijdens de intake worden 14 secties ingevuld: persoonlijke gegevens, adres, contact, financieel, sectorvoorkeur, motivatie, thuissituatie, gezondheid, schulden, justitieel verleden, opleidingen, cursussen, werkervaring en acties/afspraken. Na de intake gaat de kandidaat door naar de Training-fase.',
    category: 'Kandidaten',
    tags: ['intake', 'gedaan', 'afgerond', 'status', 'betekent', 'fase'],
  },
  {
    question: 'Ik ben mijn wachtwoord vergeten. Wat nu?',
    answer: 'Neem contact op met een beheerder (admin). Zij kunnen je wachtwoord resetten via het gebruikersbeheer.',
    category: 'Account',
    tags: ['wachtwoord', 'vergeten', 'reset', 'inloggen'],
  },
  {
    question: 'Wie kan de audit log inzien?',
    answer: 'Alleen gebruikers met de rol Admin hebben toegang tot Beheer → Audit Log. Hier worden alle wijzigingen in het systeem bijgehouden.',
    category: 'Beheer',
    tags: ['audit', 'log', 'wijzigingen', 'admin', 'beheer'],
  },
  {
    question: 'Hoe wijzig ik de status van een kandidaat?',
    answer: 'Open de kandidaat-detailpagina. Op de tab "Voortgang" kun je de trajectfase aanpassen. De nieuwe fase wordt direct opgeslagen.',
    category: 'Kandidaten',
    tags: ['status', 'wijzigen', 'fase', 'kandidaat', 'voortgang'],
  },
  {
    question: 'Welke bestandsformaten kan ik uploaden bij kandidaten?',
    answer: 'Bij de batch-import worden Excel (.xlsx, .xls), CSV, Word (.docx), PDF en afbeeldingen (PNG, JPG) ondersteund. Bij documenten uploaden op de kandidaat-detailpagina worden alle gangbare bestandsformaten geaccepteerd.',
    category: 'Kandidaten',
    tags: ['upload', 'bestand', 'formaat', 'excel', 'pdf', 'word', 'afbeelding'],
  },
  {
    question: 'Hoe upload ik een foto, ID-scan of CV voor een kandidaat?',
    answer: 'Ga naar de kandidaat-detailpagina. Op de tab "Persoon" vind je de upload-knoppen voor pasfoto, ID-scan en CV. Klik op de upload-knop, selecteer het bestand en het wordt automatisch opgeslagen. De uploadstatus wordt weergegeven op de voortgangs-tramlijn met groene (aanwezig) of grijze (ontbrekend) indicatoren.',
    category: 'Kandidaten',
    tags: ['foto', 'id scan', 'cv', 'upload', 'bestand', 'tramlijn', 'pasfoto'],
  },
  {
    question: 'Hoe beheer ik de uitstroom van een kandidaat?',
    answer: 'Open de kandidaat-detailpagina en ga naar het tab "Uitstroom". Hier kun je de uitstroomstatus instellen (bijv. Werk, School, Lopend, Vrijwilligerswerk, Garantiebaan, Beschut werk, Binnen, No-show of Uitval). Je kunt ook gespreksupdates toevoegen met datum, tijd en inhoud om het uitstroomproces te documenteren.',
    category: 'Kandidaten',
    tags: ['uitstroom', 'status', 'gesprek', 'update', 'werk', 'school'],
  },
  {
    question: 'Hoe gebruik ik het activiteitenfilter in de rapportage?',
    answer: 'Rechtsboven op elke rapportagepagina staat een dropdown "Alle activiteiten". Selecteer een activiteit (bijv. BIROTA of CWST) om alleen de deelnemers van die activiteit te tonen. Het filter werkt op alle rapportagepagina\'s.',
    category: 'Rapportage',
    tags: ['activiteit', 'filter', 'rapportage', 'dropdown'],
  },
  {
    question: 'Hoe exporteer ik de deelnemerstabel naar Excel?',
    answer: 'Ga naar Rapportage → Deelnemers en klik op de knop "Export Excel". De huidige tabelgegevens worden gedownload als CSV-bestand dat je kunt openen in Excel.',
    category: 'Rapportage',
    tags: ['export', 'excel', 'csv', 'deelnemers', 'rapportage'],
  },
  {
    question: 'Hoe importeer ik deelnemers vanuit Excel?',
    answer: 'Ga naar Rapportage → Deelnemers en klik op "Import Excel". Selecteer een .xlsx of .xls bestand. Het systeem herkent de kolommen en importeert de data. Controleer achteraf de Import Log pagina voor eventuele fouten.',
    category: 'Rapportage',
    tags: ['import', 'excel', 'deelnemers', 'rapportage', 'xlsx'],
  },
  {
    question: 'Wat zijn uitstroom rubrieken en hoe beheer ik ze?',
    answer: 'Uitstroom rubrieken koppelen uitstroomwaarden (bijv. "werk", "school", "uitval") aan categorieën: Uitstroom, In proces of Uitval. Ga naar Rapportage → Rubrieken om de koppeling te beheren. Je kunt per rubriek instellen of deze meetelt in de grafieken via de toggle "Toon in grafieken".',
    category: 'Rapportage',
    tags: ['rubrieken', 'uitstroom', 'categorie', 'grafieken', 'beheren'],
  },
  {
    question: 'Hoe genereer ik een eindrapportage voor PmG?',
    answer: 'Ga naar Rapportage → Eindrapportage. Selecteer eventueel een activiteit en klik op "Printen" om het rapport af te drukken of als PDF op te slaan. Het rapport bevat secties over feiten & cijfers, gebieden, aanmelders, deelnemersinfo, certificaten en uitstroom.',
    category: 'Rapportage',
    tags: ['eindrapportage', 'pmg', 'printen', 'pdf', 'rapport'],
  },
  {
    question: 'Hoe koppel ik een traject aan een kandidaat?',
    answer: 'Open de kandidaat-detailpagina en ga naar het Persoon-tab. In de sectie "Trajecten" zie je gekleurde chips voor elk beschikbaar traject. Klik op een traject om het te koppelen of ontkoppelen. Je kunt meerdere trajecten per kandidaat selecteren.',
    category: 'Kandidaten',
    tags: ['traject', 'koppelen', 'kandidaat', 'chips', 'certi', 'city team'],
  },
  {
    question: 'Hoe scan ik een handgeschreven formulier?',
    answer: 'Open de intake-pagina van een kandidaat en klik rechtsboven op "Formulier scannen". Upload een foto of PDF van het formulier. Het systeem herkent de tekst via OCR en toont een review-dialog waar je per veld kunt kiezen welke waarden overgenomen worden.',
    category: 'Kandidaten',
    tags: ['ocr', 'scannen', 'handschrift', 'foto', 'formulier', 'intake'],
  },
  {
    question: 'Wat gebeurt er als ik dezelfde Excel opnieuw importeer?',
    answer: 'Het systeem herkent bestaande kandidaten op basis van CSN-nummer of voornaam+achternaam. Bij een dubbele import worden alleen lege velden aangevuld met nieuwe data — bestaande waarden blijven behouden. Er worden geen duplicaten aangemaakt.',
    category: 'Kandidaten',
    tags: ['import', 'duplicaat', 'upsert', 'excel', 'aanvullen'],
  },
  {
    question: 'Hoe kan ik een grafiek vergroten op het rapportage dashboard?',
    answer: 'Klik op het vergroot-icoon (⛶) rechts naast de grafiektype-knoppen. De grafiek opent in een groot popup-venster. Je kunt ook in de popup het grafiektype wisselen.',
    category: 'Rapportage',
    tags: ['grafiek', 'vergroten', 'popup', 'dashboard', 'rapportage'],
  },
  {
    question: 'Hoe beheer ik de opties/keuzelijsten?',
    answer: 'Ga naar Instellingen → Opties. Hier vind je tabs voor Wijk, Gebied, Uitkering, Klantmanager en Traject. Per tab kun je waarden toevoegen, inline bewerken (klik op de naam), verwijderen (soft-delete) en herstellen.',
    category: 'Beheer',
    tags: ['opties', 'keuzelijst', 'traject', 'wijk', 'beheren', 'instellingen'],
  },
  {
    question: 'Hoe werkt de AI rapportage?',
    answer: 'Ga naar Rapportage → AI Rapport. Pas eventueel de prompt aan en klik op "Rapport genereren". Het systeem maakt een tekstuele samenvatting op basis van de deelnemersdata. Onder het rapport worden donut-grafieken getoond voor leeftijd en geslacht.',
    category: 'Rapportage',
    tags: ['ai', 'rapport', 'genereren', 'samenvatting', 'prompt'],
  },
  {
    question: 'Is de data beveiligd?',
    answer: 'Ja. Alle data wordt versleuteld verzonden (HTTPS), opgeslagen in Supabase met Row Level Security, en wijzigingen worden gelogd in de audit trail. De applicatie voldoet aan de AVG-richtlijnen.',
    category: 'Beveiliging',
    tags: ['beveiliging', 'privacy', 'avg', 'versleuteling', 'data'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CHATBOT — lokale kennisbank-zoeker
// ═══════════════════════════════════════════════════════════════════════════

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

function buildKnowledgeBase() {
  const entries: { text: string; source: string; tags: string[] }[] = [];

  // Handleiding entries
  for (const section of HANDLEIDING) {
    for (const article of section.content) {
      entries.push({
        text: `${article.title}\n${article.body}`,
        source: `Handleiding → ${section.title} → ${article.title}`,
        tags: article.tags,
      });
    }
  }

  // FAQ entries
  for (const faq of FAQ_ITEMS) {
    entries.push({
      text: `${faq.question}\n${faq.answer}`,
      source: `FAQ → ${faq.category}`,
      tags: faq.tags,
    });
  }

  return entries;
}

const KNOWLEDGE_BASE = buildKnowledgeBase();

// Stopwoorden die geen betekenis toevoegen aan de zoekopdracht
const STOPWORDS = new Set([
  'wat', 'hoe', 'wie', 'waar', 'wanneer', 'waarom', 'welke', 'welk',
  'een', 'het', 'de', 'van', 'voor', 'met', 'aan', 'uit', 'bij', 'als',
  'dan', 'dat', 'die', 'dit', 'zijn', 'kan', 'kun', 'mag', 'moet',
  'ben', 'bent', 'wordt', 'worden', 'naar', 'toe', 'ook', 'nog', 'wel',
  'niet', 'geen', 'meer', 'alle', 'erg', 'veel', 'heel', 'zeer',
  'betekend', 'betekent', 'bedoel', 'bedoelt', 'wil', 'graag', 'even',
]);

function searchKnowledge(query: string): { text: string; source: string }[] {
  const q = query.toLowerCase().replace(/[?!.,;:'"()]/g, '');
  const allWords = q.split(/\s+/).filter((w) => w.length > 1);
  // Contentwoorden (zonder stopwoorden) voor scoring
  const contentWords = allWords.filter((w) => !STOPWORDS.has(w));
  // Als alle woorden stopwoorden zijn, gebruik dan alle woorden
  const words = contentWords.length > 0 ? contentWords : allWords.filter((w) => w.length > 2);

  if (words.length === 0) return [];

  const scored = KNOWLEDGE_BASE.map((entry) => {
    const entryText = (entry.text + ' ' + entry.tags.join(' ')).toLowerCase();
    const titleText = entry.text.split('\n')[0].toLowerCase();
    let score = 0;
    let matchedWords = 0;

    // Volledige zin match in tekst (sterkste signaal)
    if (entryText.includes(q)) score += 20;

    for (const word of words) {
      const inText = entryText.includes(word);
      const inTitle = titleText.includes(word);
      const inTag = entry.tags.some((t) => t.includes(word) || word.includes(t));

      if (inText || inTag) matchedWords++;

      // Titel-match is het sterkste signaal
      if (inTitle) score += 8;
      // Tag-match is ook sterk (tags zijn handmatig gekozen kernwoorden)
      if (inTag) score += 6;
      // Gewone tekst-match
      if (inText) score += 2;
    }

    // Bonus als een groot deel van de zoekwoorden matcht (relevantie)
    if (words.length > 0) {
      const coverage = matchedWords / words.length;
      score *= (0.5 + coverage); // 50% basis + tot 50% bonus bij volledige dekking
    }

    // Straf voor entries die maar 1 woord matchen bij meerdere zoekwoorden
    if (words.length >= 2 && matchedWords <= 1) {
      score *= 0.3;
    }

    return { ...entry, score };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function generateBotResponse(query: string): string {
  const results = searchKnowledge(query);

  if (results.length === 0) {
    return `Ik heb helaas geen informatie gevonden over "${query}". Probeer het met andere zoektermen, of bekijk de **Handleiding** en **FAQ** tabs voor een compleet overzicht.\n\nVoorbeeldvragen die ik kan beantwoorden:\n• Hoe maak ik een kandidaat aan?\n• Welke rollen zijn er?\n• Hoe voer ik een intake uit?\n• Hoe upload ik kandidaten?`;
  }

  const best = results[0];
  let response = best.text;

  // Add source reference
  response += `\n\n📖 *Bron: ${best.source}*`;

  // If there are more results, mention them
  if (results.length > 1) {
    response += '\n\n**Gerelateerde onderwerpen:**';
    for (let i = 1; i < results.length; i++) {
      response += `\n• ${results[i].source}`;
    }
  }

  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function HandleidingTab() {
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(HANDLEIDING.map((s) => s.id))
  );

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = search.trim()
    ? HANDLEIDING.map((section) => ({
        ...section,
        content: section.content.filter(
          (a) =>
            a.title.toLowerCase().includes(search.toLowerCase()) ||
            a.body.toLowerCase().includes(search.toLowerCase()) ||
            a.tags.some((t) => t.includes(search.toLowerCase()))
        ),
      })).filter((s) => s.content.length > 0)
    : HANDLEIDING;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek in de handleiding..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          Geen resultaten gevonden voor "{search}"
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((section) => (
            <Card key={section.id}>
              <button
                className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 rounded-t-lg transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                {expandedSections.has(section.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <section.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-semibold">{section.title}</span>
                <Badge variant="secondary" className="ml-auto">
                  {section.content.length} artikel{section.content.length !== 1 ? 'en' : ''}
                </Badge>
              </button>
              {expandedSections.has(section.id) && (
                <CardContent className="pt-0 space-y-4">
                  {section.content.map((article, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-2">
                      <h3 className="font-semibold text-sm">{article.title}</h3>
                      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                        {article.body.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={pi} className="text-foreground font-medium">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={pi}>{part}</span>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FAQTab() {
  const [search, setSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (idx: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const filtered = search.trim()
    ? FAQ_ITEMS.filter(
        (item) =>
          item.question.toLowerCase().includes(search.toLowerCase()) ||
          item.answer.toLowerCase().includes(search.toLowerCase()) ||
          item.tags.some((t) => t.includes(search.toLowerCase()))
      )
    : FAQ_ITEMS;

  // Group by category
  const grouped = filtered.reduce<Record<string, { item: FAQItem; idx: number }[]>>(
    (acc, item, idx) => {
      const origIdx = FAQ_ITEMS.indexOf(item);
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push({ item, idx: origIdx });
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek in de FAQ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          Geen vragen gevonden voor "{search}"
        </div>
      ) : (
        Object.entries(grouped).map(([category, entries]) => (
          <div key={category} className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              {category}
            </h3>
            {entries.map(({ item, idx }) => (
              <Card key={idx} className="overflow-hidden">
                <button
                  className="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleItem(idx)}
                >
                  {expandedItems.has(idx) ? (
                    <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm">{item.question}</span>
                </button>
                {expandedItems.has(idx) && (
                  <div className="px-4 pb-4 pl-11">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer.split(/(\*\*[^*]+\*\*)/).map((part, pi) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={pi} className="text-foreground font-medium">
                            {part.slice(2, -2)}
                          </strong>
                        ) : (
                          <span key={pi}>{part}</span>
                        )
                      )}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function ChatbotTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'bot',
      text: 'Hallo! Ik ben de City Solid assistent. Stel me een vraag over de applicatie en ik zoek het antwoord voor je op in de handleiding en FAQ.\n\nBijvoorbeeld:\n• "Hoe maak ik een kandidaat aan?"\n• "Welke rollen zijn er?"\n• "Hoe werkt de intake?"',
    },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const q = input.trim();
    if (!q) return;

    const userMsg: ChatMessage = { role: 'user', text: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulate slight delay for natural feel
    setTimeout(() => {
      const response = generateBotResponse(q);
      setMessages((prev) => [...prev, { role: 'bot', text: response }]);
    }, 300);
  };

  return (
    <Card className="flex flex-col" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-5 w-5 text-primary" />
          City Solid Assistent
          <Badge variant="secondary" className="ml-2 text-xs">Lokaal</Badge>
        </CardTitle>
      </CardHeader>
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'bot' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="whitespace-pre-line">
                  {msg.text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, pi) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={pi}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                      return <em key={pi} className="text-xs text-muted-foreground">{part.slice(1, -1)}</em>;
                    }
                    return <span key={pi}>{part}</span>;
                  })}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary flex-shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Stel een vraag..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function HelpCenter() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Help Center</h1>
        <p className="text-muted-foreground">
          Gebruikershandleiding, veelgestelde vragen en een assistent om je te helpen.
        </p>
      </div>

      <Tabs defaultValue="handleiding">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="handleiding" className="gap-2">
            <Book className="h-4 w-4" />
            Handleiding
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Assistent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="handleiding" className="mt-4">
          <HandleidingTab />
        </TabsContent>

        <TabsContent value="faq" className="mt-4">
          <FAQTab />
        </TabsContent>

        <TabsContent value="chatbot" className="mt-4">
          <ChatbotTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
