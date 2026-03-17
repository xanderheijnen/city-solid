import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  Header, Footer, PageNumber, NumberFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import type { Kandidaat, Geslacht, Aanwezigheidsregistratie, Voortgang } from '@/lib/types';
import { GESLACHT_LABELS, STATUS_CONFIG, AANWEZIGHEID_LABELS } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BRAND_BLUE = '242C4C';
const BRAND_YELLOW = 'FFD62D';

function fmt(value: string | null | undefined | boolean): string {
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nee';
  return value ?? '—';
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({ text, bold: true, size: 32, color: BRAND_BLUE }),
    ],
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    children: [
      new TextRun({ text, bold: true, size: 24, color: BRAND_BLUE }),
    ],
  });
}

function infoRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 3500, type: WidthType.DXA },
        shading: { type: ShadingType.SOLID, color: 'F3F4F6' },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri' })],
        })],
      }),
      new TableCell({
        width: { size: 6500, type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: value, size: 20, font: 'Calibri' })],
        })],
      }),
    ],
  });
}

function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 10000, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    },
    rows: rows.map(([l, v]) => infoRow(l, v)),
  });
}

function spacer(): Paragraph {
  return new Paragraph({ spacing: { before: 100, after: 100 }, children: [] });
}

// ---------------------------------------------------------------------------
// Intake Rapport
// ---------------------------------------------------------------------------

export async function exportIntakeRapport(kandidaat: Kandidaat) {
  const today = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const doc = new Document({
    creator: 'City Solid',
    title: `Intake Rapport - ${kandidaat.voornaam} ${kandidaat.achternaam}`,
    description: `Intake rapport voor kandidaat ${kandidaat.display_id}`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          pageNumbers: { start: 1 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'CITY SOLID', bold: true, size: 18, color: BRAND_BLUE }),
              new TextRun({ text: '  |  Intake Rapport', size: 18, color: '6B7280' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${kandidaat.display_id}  |  Gegenereerd op ${today}  |  Pagina `, size: 16, color: '9CA3AF' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9CA3AF' }),
            ],
          })],
        }),
      },
      children: [
        // Title block
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'INTAKE RAPPORT', bold: true, size: 40, color: BRAND_BLUE }),
          ],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({
              text: `${kandidaat.voornaam} ${kandidaat.achternaam}`,
              bold: true, size: 28, color: BRAND_BLUE,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `${kandidaat.display_id}  |  Status: ${STATUS_CONFIG[kandidaat.traject_status].label}`, size: 20, color: '6B7280' }),
          ],
        }),

        // Persoonlijke gegevens
        sectionHeading('Persoonlijke gegevens'),
        infoTable([
          ['Voornaam', kandidaat.voornaam],
          ['Achternaam', kandidaat.achternaam],
          ['Geslacht', kandidaat.geslacht ? GESLACHT_LABELS[kandidaat.geslacht as Geslacht] : '—'],
          ['Geboortedatum', fmtDate(kandidaat.geboortedatum)],
          ['Geboorteplaats', fmt(kandidaat.geboorteplaats)],
          ['BSN', fmt(kandidaat.bsn)],
          ['Nationaliteit', fmt(kandidaat.nationaliteit)],
        ]),
        spacer(),

        // Adres
        sectionHeading('Adresgegevens'),
        infoTable([
          ['Straat', fmt(kandidaat.straat)],
          ['Postcode', fmt(kandidaat.postcode)],
          ['Woonplaats', fmt(kandidaat.woonplaats)],
          ['Ingeschreven adres (BRP)', fmt(kandidaat.ingeschreven_adres_brp)],
          ['Reden geen BRP/ander adres', fmt(kandidaat.reden_geen_brp)],
          ['Wijk', fmt(kandidaat.wijk)],
          ['Gebied', fmt(kandidaat.gebied)],
        ]),
        spacer(),

        // Contact & verwijzing
        sectionHeading('Contactgegevens & Verwijzing'),
        infoTable([
          ['Telefoon', fmt(kandidaat.telefoon)],
          ['Email', fmt(kandidaat.email)],
          ['Contactpersoon', fmt(kandidaat.contactpersoon)],
          ['WhatsApp', fmt(kandidaat.whatsapp)],
          ['Eigen vervoer', fmt(kandidaat.eigen_vervoer)],
          ['Rijbewijs', fmt(kandidaat.rijbewijs)],
          ['Zorgverzekering', fmt(kandidaat.zorgverzekering)],
          ['Door wie bekend', fmt(kandidaat.door_wie_bekend)],
        ]),
        spacer(),

        // Financieel
        sectionHeading('Financieel'),
        infoTable([
          ['Uitkering', kandidaat.uitkering?.join(', ') ?? '—'],
          ['Klantmanager', fmt(kandidaat.klantmanager)],
          ['Toestemming', fmt(kandidaat.toestemming)],
        ]),
        spacer(),

        // Sector & voorkeur
        sectionHeading('Sector & Certificaat voorkeur'),
        infoTable([
          ['Gewenste sector', kandidaat.gewenste_sector?.join(', ') ?? '—'],
          ['1e certificaat voorkeur', fmt(kandidaat.certificaat_voorkeur_1)],
          ['2e certificaat voorkeur', fmt(kandidaat.certificaat_voorkeur_2)],
        ]),
        spacer(),

        // Motivatie & competenties
        sectionHeading('Motivatie, Competenties & Vaardigheden'),
        infoTable([
          ['Motivatie', fmt(kandidaat.motivatie)],
          ['Demotivatie / belemmeringen', fmt(kandidaat.demotivatie)],
          ['Stip aan de horizon', fmt(kandidaat.stip_aan_de_horizon)],
          ['Goede eigenschappen', fmt(kandidaat.goede_eigenschappen)],
          ['Minder goed in', fmt(kandidaat.minder_goed_in)],
          ['Talen', fmt(kandidaat.talen)],
          ["Hobby's", fmt(kandidaat.hobbys)],
        ]),
        spacer(),

        // Thuissituatie
        sectionHeading('Thuissituatie'),
        infoTable([
          ['Woonsituatie', fmt(kandidaat.woonsituatie)],
          ['Kinderen', fmt(kandidaat.kinderen)],
          ['Eerder trajecten deelgenomen', fmt(kandidaat.trajecten)],
          ['Hulpverleners betrokken', fmt(kandidaat.hulpverleners_betrokken)],
        ]),
        spacer(),

        // Gezondheid & middelengebruik
        sectionHeading('Gezondheid & Middelengebruik'),
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [
            new TextRun({ text: 'AVG-gevoelige informatie', italics: true, size: 18, color: 'EF4444' }),
          ],
        }),
        infoTable([
          ['Medische bijzonderheden', fmt(kandidaat.medische_bijzonderheden)],
          ['Middelengebruik (drugs/alcohol)', fmt(kandidaat.middelengebruik)],
        ]),
        spacer(),

        // Schulden
        sectionHeading('Schulden'),
        infoTable([
          ['Heeft schulden', fmt(kandidaat.heeft_schulden)],
          ['Reden en bedrag', fmt(kandidaat.schulden_reden_bedrag)],
          ['Afspraken/hulp', fmt(kandidaat.schulden_afspraken)],
        ]),
        spacer(),

        // Justitie
        sectionHeading('Justitieel verleden'),
        new Paragraph({
          spacing: { before: 100, after: 50 },
          children: [
            new TextRun({ text: 'AVG-gevoelige informatie', italics: true, size: 18, color: 'EF4444' }),
          ],
        }),
        infoTable([
          ['Aanraking politie/justitie', fmt(kandidaat.aanraking_politie_justitie)],
          ['Reden', fmt(kandidaat.aanraking_reden)],
          ['Veroordeeld/detentie', fmt(kandidaat.veroordeeld_detentie)],
          ['Lopende zaken', fmt(kandidaat.lopende_zaken)],
        ]),
        spacer(),

        // Opleidingen
        sectionHeading('Opleidingen'),
        infoTable([
          ['Opleiding', fmt(kandidaat.opleiding)],
          ['Diploma behaald', fmt(kandidaat.diploma_behaald)],
          ['Niveau', fmt(kandidaat.opleiding_niveau)],
          ['Reden uitval', fmt(kandidaat.reden_uitval)],
        ]),
        spacer(),

        // Cursussen & certificaten
        sectionHeading('Cursussen & Certificaten'),
        infoTable([
          ['Cursussen gevolgd', fmt(kandidaat.cursussen_gevolgd)],
          ['Certificaten behaald', fmt(kandidaat.certificaten_behaald)],
        ]),
        spacer(),

        // Werkervaring
        sectionHeading('Werkervaring'),
        infoTable([
          ['Werkervaring', fmt(kandidaat.werkervaring)],
          ['Waarom lukte het wel/niet', fmt(kandidaat.waarom_lukte_niet)],
          ['Heeft CV', fmt(kandidaat.heeft_cv)],
        ]),
        spacer(),

        // Acties
        sectionHeading('Acties Deelnemer & Coach'),
        infoTable([
          ['Afspraken', fmt(kandidaat.acties_afspraken)],
          ['Leefgebieden aandacht', fmt(kandidaat.leefgebieden_aandacht)],
          ['Afspraken hulp', fmt(kandidaat.afspraken_hulp)],
        ]),
        spacer(),

        // Intake metadata
        sectionHeading('Intake Informatie'),
        infoTable([
          ['Aanmelddatum', fmtDate(kandidaat.aanmeld_datum)],
          ['Intakedatum', fmtDate(kandidaat.intake_datum)],
          ['Intake notities', fmt(kandidaat.intake_notities)],
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${kandidaat.display_id}_intake_rapport.docx`);
}

// ---------------------------------------------------------------------------
// Voortgangs Rapport
// ---------------------------------------------------------------------------

interface VoortgangRapportData {
  kandidaat: Kandidaat;
  groepscode: string;
  trainingNaam: string;
  aanwezigheid: { datum: string; status: string }[];
  voortgang: { datum: string; type: string; omschrijving: string; behaald: boolean }[];
}

export async function exportVoortgangsRapport(data: VoortgangRapportData) {
  const { kandidaat, groepscode, trainingNaam, aanwezigheid, voortgang } = data;

  const today = new Date().toLocaleDateString('nl-NL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Aanwezigheids-samenvatting
  const totaalDagen = aanwezigheid.length;
  const aanwezigDagen = aanwezigheid.filter((a) => a.status === 'aanwezig' || a.status === 'te_laat').length;
  const percentage = totaalDagen > 0 ? Math.round((aanwezigDagen / totaalDagen) * 100) : 0;

  // Aanwezigheid table rows
  const aanwezigheidHeaderRow = new TableRow({
    children: ['Datum', 'Status'].map((text) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: BRAND_BLUE },
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Calibri' })],
        })],
      }),
    ),
  });

  const aanwezigheidRows = aanwezigheid.slice(0, 50).map((a) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: fmtDate(a.datum), size: 20, font: 'Calibri' })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: AANWEZIGHEID_LABELS[a.status as keyof typeof AANWEZIGHEID_LABELS] ?? a.status, size: 20, font: 'Calibri' })] })],
        }),
      ],
    }),
  );

  // Voortgang table rows
  const voortgangHeaderRow = new TableRow({
    children: ['Datum', 'Type', 'Omschrijving', 'Behaald'].map((text) =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: BRAND_BLUE },
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF', font: 'Calibri' })],
        })],
      }),
    ),
  });

  const voortgangRows = voortgang.map((v) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: fmtDate(v.datum), size: 20, font: 'Calibri' })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: v.type, size: 20, font: 'Calibri' })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: v.omschrijving, size: 20, font: 'Calibri' })] })],
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: v.behaald ? 'Ja' : 'Nee', size: 20, font: 'Calibri' })] })],
        }),
      ],
    }),
  );

  const doc = new Document({
    creator: 'City Solid',
    title: `Voortgangsrapport - ${kandidaat.voornaam} ${kandidaat.achternaam}`,
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'CITY SOLID', bold: true, size: 18, color: BRAND_BLUE }),
              new TextRun({ text: '  |  Voortgangsrapport', size: 18, color: '6B7280' }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `${kandidaat.display_id}  |  ${groepscode}  |  Gegenereerd op ${today}  |  Pagina `, size: 16, color: '9CA3AF' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9CA3AF' }),
            ],
          })],
        }),
      },
      children: [
        // Title
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: 'VOORTGANGSRAPPORT', bold: true, size: 40, color: BRAND_BLUE })],
        }),
        new Paragraph({
          spacing: { after: 40 },
          children: [new TextRun({ text: `${kandidaat.voornaam} ${kandidaat.achternaam}`, bold: true, size: 28, color: BRAND_BLUE })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: `${kandidaat.display_id}  |  Groep: ${groepscode}  |  ${trainingNaam}`, size: 20, color: '6B7280' })],
        }),

        // Samenvatting
        sectionHeading('Samenvatting'),
        infoTable([
          ['Training', trainingNaam],
          ['Groep', groepscode],
          ['Status', STATUS_CONFIG[kandidaat.traject_status].label],
          ['Aanwezigheid', `${aanwezigDagen}/${totaalDagen} dagen (${percentage}%)`],
          ['Vorderingen', `${voortgang.length} geregistreerd`],
        ]),
        spacer(),

        // Aanwezigheid
        sectionHeading('Aanwezigheidsoverzicht'),
        ...(aanwezigheid.length > 0 ? [
          new Table({
            width: { size: 10000, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            },
            rows: [aanwezigheidHeaderRow, ...aanwezigheidRows],
          }),
        ] : [
          new Paragraph({ children: [new TextRun({ text: 'Nog geen aanwezigheidsregistraties.', italics: true, color: '6B7280' })] }),
        ]),
        spacer(),

        // Voortgang
        sectionHeading('Vorderingen & Resultaten'),
        ...(voortgang.length > 0 ? [
          new Table({
            width: { size: 10000, type: WidthType.DXA },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
            },
            rows: [voortgangHeaderRow, ...voortgangRows],
          }),
        ] : [
          new Paragraph({ children: [new TextRun({ text: 'Nog geen vorderingen geregistreerd.', italics: true, color: '6B7280' })] }),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${kandidaat.display_id}_voortgangsrapport_${groepscode}.docx`);
}
