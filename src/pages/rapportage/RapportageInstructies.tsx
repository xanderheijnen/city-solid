import { useState } from 'react';
import {
  Info,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Users,
  FileUp,
  FileDown,
  Trash2,
  BarChart3,
  FileText,
  Bot,
  Map,
  Tag,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ── Quick tips ───────────────────────────────────────────────────────────────

const QUICK_TIPS = [
  'Gebruik altijd het activiteitenfilter',
  'Rapporten exporteerbaar als PDF of Word',
  'Zoekfunctie op deelnemerspagina',
  'Klik op grafiekonderdelen voor detail',
  'AI-prompt aanpasbaar',
  'Beheer certificaat classificaties via Rubrieken',
];

const TIP_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-cyan-500',
];

// ── Sections ─────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  content: string;
}

const SECTIONS: Section[] = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Overzicht van kerngegevens en statistieken.',
    content:
      'Het dashboard toont een overzicht van alle belangrijke statistieken: instroom, gestart, in proces en uitstroom. Gebruik het activiteitenfilter bovenaan om data per activiteit te filteren. De grafieken tonen leeftijdsverdeling, geslachtsverdeling, opleidingsniveau, organisaties en sectoren. Klik op een grafiekonderdeel om de onderliggende data te bekijken. Het dashboard wordt automatisch bijgewerkt wanneer nieuwe data wordt geimporteerd.',
  },
  {
    id: 'deelnemers',
    icon: Users,
    title: 'Deelnemers',
    description: 'Beheer en doorzoek de deelnemerslijst.',
    content:
      'Op de deelnemerspagina vindt u een overzicht van alle kandidaten. Gebruik de zoekbalk om te zoeken op naam, CSN-nummer of andere velden. Filter op traject-status, wijk, gebied of geslacht. Klik op een deelnemer om het volledige profiel te openen met intake-gegevens, trainingen, certificaten en voortgang. U kunt deelnemergegevens direct bewerken vanuit het profiel.',
  },
  {
    id: 'importeren',
    icon: FileUp,
    title: 'Data importeren (Excel)',
    description: 'Importeer kandidaatgegevens vanuit Excel.',
    content:
      'Navigeer naar de importpagina en selecteer een Excel-bestand (.xlsx). Het systeem herkent automatisch de kolommen en koppelt deze aan de juiste velden. Controleer de preview voordat u bevestigt. Bestaande kandidaten (op basis van CSN-nummer) worden bijgewerkt; nieuwe kandidaten worden aangemaakt. Na de import verschijnt een samenvatting met het aantal geslaagde en mislukte rijen. Eventuele fouten worden gelogd in het Import Logboek.',
  },
  {
    id: 'exporteren',
    icon: FileDown,
    title: 'Data exporteren',
    description: 'Exporteer rapporten en overzichten.',
    content:
      'Rapporten kunnen worden geexporteerd als PDF of Word-document. Gebruik de exportknop op de rapportagepagina. U kunt kiezen welke secties worden opgenomen in het rapport. De grafieken worden automatisch meegenomen. Voor ruwe data kunt u ook exporteren naar Excel. Het activiteitenfilter bepaalt welke data wordt meegenomen in de export.',
  },
  {
    id: 'verwijderen',
    icon: Trash2,
    title: 'Data verwijderen',
    description: 'Verwijder kandidaten of importgegevens.',
    content:
      'Data verwijderen kan via het beheer-paneel (alleen beschikbaar voor admins). U kunt individuele kandidaten verwijderen vanuit het deelnemersprofiel, of een volledige import ongedaan maken via het Import Logboek. Let op: verwijderde data kan niet worden hersteld. Het systeem vraagt altijd om bevestiging voordat data definitief wordt verwijderd.',
  },
  {
    id: 'rapportage',
    icon: BarChart3,
    title: 'Rapportage',
    description: 'Bekijk en analyseer rapportagedata.',
    content:
      'De rapportagepagina biedt uitgebreide analyses van uw data. Het rapportage-dashboard toont pipeline-overzichten, demografische grafieken en uitstroomstatistieken. Gebruik het activiteitenfilter om specifieke projecten te analyseren. Alle grafieken zijn interactief: klik op onderdelen voor detailinformatie. U kunt het grafiektype wijzigen (staaf, taart, lijn) per visualisatie.',
  },
  {
    id: 'eindrapportage',
    icon: FileText,
    title: 'Eindrapportage',
    description: 'Genereer eindrapportages per activiteit.',
    content:
      'De eindrapportage combineert alle data tot een compleet overzicht per activiteit. Selecteer de gewenste activiteit en klik op "Genereer rapport". Het rapport bevat: samenvatting, pipeline-analyse, demografische gegevens, uitstroomgegevens, certificaatresultaten en aanbevelingen. Het rapport kan worden geexporteerd als PDF of Word-document.',
  },
  {
    id: 'ai-rapportage',
    icon: Bot,
    title: 'AI Rapportage',
    description: 'Laat AI een analyse genereren op basis van uw data.',
    content:
      'De AI-rapportagemodule genereert automatisch analyses en inzichten op basis van uw data. De AI analyseert patronen, trends en opvallende gegevens. U kunt de prompt aanpassen om specifieke vragen te stellen of de focus van de analyse te bepalen. De gegenereerde tekst kan worden bewerkt en opgenomen in het eindrapport. Let op: de AI-analyse is een hulpmiddel; controleer de uitkomsten altijd handmatig.',
  },
  {
    id: 'gebiedskaart',
    icon: Map,
    title: 'Gebiedskaart',
    description: 'Bekijk de geografische spreiding van deelnemers.',
    content:
      'De gebiedskaart toont de verdeling van deelnemers over verschillende gebieden en wijken. Gebruik de kaart om concentraties te identificeren en de geografische spreiding te analyseren. Klik op een gebied voor gedetailleerde informatie over de deelnemers in dat gebied. De kleurintensiteit geeft het aantal deelnemers per gebied weer.',
  },
  {
    id: 'rubrieken',
    icon: Tag,
    title: 'Rubrieken & Classificaties',
    description: 'Beheer uitstroom-rubrieken en certificaat-classificaties.',
    content:
      'Op de rubrieken-pagina koppelt u uitstroomwaarden aan rubrieken (Uitstroom, In Proces, Uitval/afval). Dit bepaalt hoe de data wordt gecategoriseerd in grafieken en rapporten. Met de "Toon in grafieken"-schakelaar bepaalt u welke waarden zichtbaar zijn in de visualisaties. Nieuwe uitstroomwaarden die nog niet zijn gekoppeld worden automatisch gedetecteerd en getoond in een waarschuwing.',
  },
  {
    id: 'beheer',
    icon: Settings,
    title: 'Beheer (Admin)',
    description: 'Systeeminstellingen en gebruikersbeheer.',
    content:
      'Het beheerpaneel is alleen toegankelijk voor gebruikers met de admin-rol. Hier kunt u: gebruikers beheren en rollen toewijzen, dropdown-opties configureren, het auditlog bekijken, systeeminstellingen aanpassen en data-onderhoud uitvoeren. Wijzigingen in het beheerpaneel worden gelogd in het auditlog.',
  },
];

// ── FAQ ──────────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    question: 'Hoe exporteer ik een rapport als PDF?',
    answer:
      'Ga naar de rapportagepagina en klik op de exportknop (download-icoon). Kies "PDF" als formaat. U kunt selecteren welke secties worden opgenomen. Het PDF-bestand wordt automatisch gedownload naar uw apparaat.',
  },
  {
    id: 'faq-2',
    question: 'Kan ik data uit meerdere activiteiten tegelijk bekijken?',
    answer:
      'Ja, door het activiteitenfilter op "Alle activiteiten" te zetten, worden de gegevens van alle activiteiten gecombineerd weergegeven. U kunt ook specifieke activiteiten selecteren voor een gefilterd overzicht.',
  },
  {
    id: 'faq-3',
    question:
      'Wat gebeurt er als ik een Excel-bestand importeer met bestaande CSN-nummers?',
    answer:
      'Het systeem herkent bestaande kandidaten op basis van het CSN-nummer. Deze worden bijgewerkt met de nieuwe gegevens uit het Excel-bestand. Er worden geen duplicaten aangemaakt. Het import-logboek toont welke rijen zijn bijgewerkt en welke nieuw zijn aangemaakt.',
  },
  {
    id: 'faq-4',
    question: 'Hoe pas ik de AI-prompt aan?',
    answer:
      'Ga naar de AI-rapportagepagina. Boven het gegenereerde rapport vindt u een tekstveld met de huidige prompt. Pas de tekst aan naar wens en klik op "Opnieuw genereren". De AI zal de analyse opnieuw uitvoeren met uw aangepaste instructies. U kunt de prompt ook opslaan als sjabloon voor toekomstig gebruik.',
  },
  {
    id: 'faq-5',
    question: 'Wie kan het Admin-paneel gebruiken?',
    answer:
      'Alleen gebruikers met de rol "admin" hebben toegang tot het beheerpaneel. Een admin kan andere gebruikers deze rol toewijzen via Beheer > Gebruikers. Standaard heeft de eerste gebruiker van het systeem de admin-rol.',
  },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function RapportageInstructies() {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const [expandedFaq, setExpandedFaq] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Info className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Gebruikersinstructies</h1>
          <p className="text-sm text-muted-foreground">
            Leer hoe je alle onderdelen van de City Solid Reporting-app
            gebruikt.
          </p>
        </div>
      </div>

      {/* Quick tips */}
      <Card>
        <CardHeader>
          <CardTitle>Snelle tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {QUICK_TIPS.map((tip, index) => (
              <li key={index} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${TIP_COLORS[index]}`}
                >
                  {index + 1}
                </span>
                <span className="text-sm">{tip}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Collapsible sections */}
      <Card>
        <CardHeader>
          <CardTitle>Onderdelen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isExpanded = expandedSections.has(section.id);

            return (
              <div key={section.id} className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{section.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {section.description}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 pl-12">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Veelgestelde vragen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {FAQ_ITEMS.map((faq) => {
            const isExpanded = expandedFaq.has(faq.id);

            return (
              <div key={faq.id} className="border rounded-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleFaq(faq.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{faq.question}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
