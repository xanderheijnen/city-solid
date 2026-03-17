import { useState, useRef, useEffect } from 'react';
import {
  Book, HelpCircle, MessageCircle, Search, ChevronDown, ChevronRight,
  Send, Bot, User, LayoutDashboard, ClipboardList, Users, GraduationCap,
  TrendingUp, UserCog, Upload, FileText, Shield,
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
3. **Geboortedatum**
4. **Bron** — hoe de kandidaat is binnengekomen

Na het opslaan verschijnt de kandidaat in het aanmeldingenoverrzicht met de status "Aangemeld".`,
        tags: ['aanmelding', 'nieuw', 'kandidaat', 'registreren', 'toevoegen'],
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
        body: `Het kandidaatoverzicht (**Kandidaten → Overzicht**) toont alle kandidaten in het systeem. Hier kun je:

• **Zoeken** op naam of andere gegevens
• **Filteren** op status of trajectfase
• **Sorteren** op verschillende kolommen
• **Exporteren** naar Excel

Klik op een kandidaat om het volledige detailscherm te openen.`,
        tags: ['kandidaten', 'overzicht', 'zoeken', 'filteren', 'exporteren'],
      },
      {
        title: 'Kandidaat detailpagina',
        body: `De detailpagina bevat alle informatie over een kandidaat, verdeeld in tabs:

• **Persoon** — persoonlijke gegevens, adres, contact, financieel, sector/voorkeur, motivatie, thuissituatie, schulden, opleidingen, cursussen, werkervaring en acties/afspraken
• **Intake** — het intakeformulier en de mogelijkheid om een intake uit te voeren
• **Documenten** — geüploade bestanden
• **Notities** — vrije notities van medewerkers
• **Voortgang** — visuele weergave van de trajectfase

Je kunt vanuit de detailpagina ook een **Word-rapport exporteren** met alle intakegegevens.`,
        tags: ['kandidaat', 'detail', 'persoon', 'intake', 'documenten', 'notities', 'voortgang', 'rapport'],
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
