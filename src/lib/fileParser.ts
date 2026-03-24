/**
 * fileParser.ts – Parse uploaded files (Excel, CSV, Word, PDF, images) into
 * candidate data that can be inserted into cs_kandidaten.
 */

import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single parsed candidate row – partial, only filled fields */
export type ParsedKandidaat = Record<string, string | string[] | boolean | null>;

export interface ParseResult {
  kandidaten: ParsedKandidaat[];
  warnings: string[];
  source: 'excel' | 'csv' | 'word' | 'pdf' | 'image';
}

// ---------------------------------------------------------------------------
// Column ↔ Field mapping (Dutch labels → database fields)
// ---------------------------------------------------------------------------

const LABEL_TO_FIELD: [RegExp, string][] = [
  // Persoonlijk
  [/^voornaam$/i, 'voornaam'],
  [/^achternaam$/i, 'achternaam'],
  [/^(geslacht|m\/?v)$/i, 'geslacht'],
  [/^geboortedatum$/i, 'geboortedatum'],
  [/^geboorteplaats$/i, 'geboorteplaats'],
  [/^bsn$/i, 'bsn'],
  [/^nationaliteit$/i, 'nationaliteit'],
  // Adres
  [/^(straat|adres)$/i, 'straat'],
  [/^postcode$/i, 'postcode'],
  [/^(woonplaats|plaats|stad)$/i, 'woonplaats'],
  [/^(ingeschreven.?adres|brp.?adres)$/i, 'ingeschreven_adres_brp'],
  [/^(reden.?geen.?brp)$/i, 'reden_geen_brp'],
  [/^wijk$/i, 'wijk'],
  [/^gebied$/i, 'gebied'],
  // Contact
  [/^(telefoon|telefoonnummer|tel|mobiel)$/i, 'telefoon'],
  [/^(e-?mail|emailadres)$/i, 'email'],
  [/^(contactpersoon|noodcontact)$/i, 'contactpersoon'],
  [/^whatsapp$/i, 'whatsapp'],
  [/^(eigen.?vervoer)$/i, 'eigen_vervoer'],
  [/^rijbewijs$/i, 'rijbewijs'],
  [/^zorgverzekering$/i, 'zorgverzekering'],
  // Financieel
  [/^uitkering$/i, 'uitkering'],
  [/^toestemming$/i, 'toestemming'],
  [/^klantmanager$/i, 'klantmanager'],
  // Verwijzing
  [/^(door.?wie.?bekend|verwezen.?door|verwijzer)$/i, 'door_wie_bekend'],
  // Sector
  [/^(gewenste.?sector|sector)$/i, 'gewenste_sector'],
  [/^(certificaat.?voorkeur.?1|1e.?certificaat)$/i, 'certificaat_voorkeur_1'],
  [/^(certificaat.?voorkeur.?2|2e.?certificaat)$/i, 'certificaat_voorkeur_2'],
  // Motivatie
  [/^motivatie$/i, 'motivatie'],
  [/^(demotivatie|belemmering)$/i, 'demotivatie'],
  [/^(stip.?aan.?de.?horizon|doel|toekomstdoel)$/i, 'stip_aan_de_horizon'],
  [/^(goede.?eigenschappen|sterke.?punten)$/i, 'goede_eigenschappen'],
  [/^(minder.?goed|zwakke.?punten)$/i, 'minder_goed_in'],
  [/^talen$/i, 'talen'],
  [/^(hobby.?s|hobbys|hobby)$/i, 'hobbys'],
  // Gezondheid
  [/^(medisch|gezondheid|bijzonderheden)$/i, 'medische_bijzonderheden'],
  // Thuissituatie
  [/^woonsituatie$/i, 'woonsituatie'],
  [/^kinderen$/i, 'kinderen'],
  [/^(trajecten|eerder.?traject)$/i, 'trajecten'],
  [/^(hulpverleners?)$/i, 'hulpverleners_betrokken'],
  [/^(afspraken.?hulp)$/i, 'afspraken_hulp'],
  // Middelen
  [/^(middelen|middelengebruik)$/i, 'middelengebruik'],
  // Schulden
  [/^(heeft.?schulden|schulden)$/i, 'heeft_schulden'],
  [/^(schulden.?reden|reden.?bedrag)$/i, 'schulden_reden_bedrag'],
  [/^(schulden.?afspraken|schuldhulp)$/i, 'schulden_afspraken'],
  // Justitie
  [/^(politie|justitie|aanraking)$/i, 'aanraking_politie_justitie'],
  [/^(aanraking.?reden)$/i, 'aanraking_reden'],
  [/^(veroordeeld|detentie)$/i, 'veroordeeld_detentie'],
  [/^(lopende.?zaken)$/i, 'lopende_zaken'],
  // Opleiding
  [/^opleiding$/i, 'opleiding'],
  [/^(diploma.?behaald|diploma)$/i, 'diploma_behaald'],
  [/^(opleiding.?niveau|niveau)$/i, 'opleiding_niveau'],
  [/^(reden.?uitval)$/i, 'reden_uitval'],
  [/^(cursussen|cursussen.?gevolgd)$/i, 'cursussen_gevolgd'],
  [/^(certificaten|certificaten.?behaald)$/i, 'certificaten_behaald'],
  // Werkervaring
  [/^werkervaring$/i, 'werkervaring'],
  [/^(waarom.?lukte|waarom.?niet)$/i, 'waarom_lukte_niet'],
  [/^(heeft.?cv|cv)$/i, 'heeft_cv'],
  // Acties
  [/^(acties|afspraken|acties.?afspraken)$/i, 'acties_afspraken'],
  [/^(leefgebieden|aandacht)$/i, 'leefgebieden_aandacht'],
  // Metadata
  [/^(aanmeld.?datum|datum.?aanmelding)$/i, 'aanmeld_datum'],
  [/^(intake.?datum)$/i, 'intake_datum'],
  [/^(intake.?door)$/i, 'intake_door'],
  [/^(intake.?notities|opmerkingen)$/i, 'intake_notities'],
];

// Boolean fields
const BOOLEAN_FIELDS = new Set([
  'whatsapp', 'eigen_vervoer', 'rijbewijs', 'toestemming',
  'heeft_schulden', 'aanraking_politie_justitie', 'heeft_cv',
]);

// Array fields (comma-separated in input)
const ARRAY_FIELDS = new Set(['uitkering', 'gewenste_sector']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[_\-\.]/g, ' ')
    .trim();
}

function matchField(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [pattern, field] of LABEL_TO_FIELD) {
    if (pattern.test(normalized)) return field;
  }
  // Also try exact match on DB field name
  const asField = normalized.toLowerCase().replace(/\s+/g, '_');
  const allFields = LABEL_TO_FIELD.map(([, f]) => f);
  if (allFields.includes(asField)) return asField;
  return null;
}

function parseBoolean(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  const s = String(val).toLowerCase().trim();
  return ['ja', 'yes', 'true', '1', 'waar', 'x', 'v'].includes(s);
}

function parseArrayField(val: unknown): string[] {
  const s = String(val ?? '').trim();
  if (!s) return [];
  return s.split(/[,;]+/).map((v) => v.trim()).filter(Boolean);
}

function parseGeslacht(val: unknown): string | null {
  const s = String(val ?? '').toLowerCase().trim();
  if (['man', 'm'].includes(s)) return 'man';
  if (['vrouw', 'v'].includes(s)) return 'vrouw';
  if (['anders', 'x'].includes(s)) return 'anders';
  return 'onbekend';
}

function parseCellValue(field: string, raw: unknown): string | string[] | boolean | null {
  if (raw == null || String(raw).trim() === '') return null;

  if (BOOLEAN_FIELDS.has(field)) return parseBoolean(raw);
  if (ARRAY_FIELDS.has(field)) return parseArrayField(raw);
  if (field === 'geslacht') return parseGeslacht(raw);

  // Date fields
  if (field.includes('datum') && raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }
  if (field.includes('datum') && typeof raw === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  return String(raw).trim();
}

// ---------------------------------------------------------------------------
// Excel / CSV parser
// ---------------------------------------------------------------------------

export function parseExcel(buffer: ArrayBuffer, fileName: string): ParseResult {
  const warnings: string[] = [];
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rows.length === 0) {
    return { kandidaten: [], warnings: ['Geen rijen gevonden in het bestand'], source: 'excel' };
  }

  // Map headers to fields
  const headers = Object.keys(rows[0]);
  const headerMap: Record<string, string> = {};
  const unmapped: string[] = [];

  for (const header of headers) {
    const field = matchField(header);
    if (field) {
      headerMap[header] = field;
    } else {
      unmapped.push(header);
    }
  }

  if (unmapped.length > 0) {
    warnings.push(`Niet-herkende kolommen: ${unmapped.join(', ')}`);
  }

  if (!Object.values(headerMap).includes('voornaam') || !Object.values(headerMap).includes('achternaam')) {
    warnings.push('Let op: kolommen "voornaam" en/of "achternaam" niet gevonden. Deze zijn verplicht.');
  }

  const kandidaten: ParsedKandidaat[] = rows.map((row, idx) => {
    const k: ParsedKandidaat = {};
    for (const [header, field] of Object.entries(headerMap)) {
      const val = parseCellValue(field, row[header]);
      if (val !== null) {
        k[field] = val;
      }
    }
    if (!k.voornaam && !k.achternaam) {
      warnings.push(`Rij ${idx + 2}: geen naam gevonden, overgeslagen`);
    }
    return k;
  }).filter((k) => k.voornaam || k.achternaam);

  return {
    kandidaten,
    warnings,
    source: fileName.endsWith('.csv') ? 'csv' : 'excel',
  };
}

// ---------------------------------------------------------------------------
// Text extraction → field mapping (for Word, PDF, Image)
// ---------------------------------------------------------------------------

/** Labels used in the intake form to search for in extracted text */
const TEXT_LABELS: [RegExp, string][] = [
  [/voornaam\s*[:：\-]\s*/i, 'voornaam'],
  [/achternaam\s*[:：\-]\s*/i, 'achternaam'],
  [/geslacht\s*[:：\-]\s*/i, 'geslacht'],
  [/geboortedatum\s*[:：\-]\s*/i, 'geboortedatum'],
  [/geboorteplaats\s*[:：\-]\s*/i, 'geboorteplaats'],
  [/\bbsn\s*[:：\-]\s*/i, 'bsn'],
  [/nationaliteit\s*[:：\-]\s*/i, 'nationaliteit'],
  [/(straat|adres)\s*[:：\-]\s*/i, 'straat'],
  [/postcode\s*[:：\-]\s*/i, 'postcode'],
  [/(woonplaats|plaats)\s*[:：\-]\s*/i, 'woonplaats'],
  [/ingeschreven\s*adres\s*[:：\-]\s*/i, 'ingeschreven_adres_brp'],
  [/wijk\s*[:：\-]\s*/i, 'wijk'],
  [/gebied\s*[:：\-]\s*/i, 'gebied'],
  [/(telefoon|telefoonnummer|tel\.?|mobiel)\s*[:：\-]\s*/i, 'telefoon'],
  [/(e-?mail|emailadres)\s*[:：\-]\s*/i, 'email'],
  [/contactpersoon\s*[:：\-]\s*/i, 'contactpersoon'],
  [/klantmanager\s*[:：\-]\s*/i, 'klantmanager'],
  [/uitkering\s*[:：\-]\s*/i, 'uitkering'],
  [/(door wie bekend|verwezen door|verwijzer)\s*[:：\-]\s*/i, 'door_wie_bekend'],
  [/zorgverzekering\s*[:：\-]\s*/i, 'zorgverzekering'],
  [/(gewenste\s*sector|sector)\s*[:：\-]\s*/i, 'gewenste_sector'],
  [/certificaat\s*voorkeur\s*1\s*[:：\-]\s*/i, 'certificaat_voorkeur_1'],
  [/certificaat\s*voorkeur\s*2\s*[:：\-]\s*/i, 'certificaat_voorkeur_2'],
  [/motivatie\s*[:：\-]\s*/i, 'motivatie'],
  [/(demotivatie|belemmer)\s*[:：\-]\s*/i, 'demotivatie'],
  [/stip\s*aan\s*de\s*horizon\s*[:：\-]\s*/i, 'stip_aan_de_horizon'],
  [/goede\s*eigenschappen\s*[:：\-]\s*/i, 'goede_eigenschappen'],
  [/minder\s*goed\s*[:：\-]\s*/i, 'minder_goed_in'],
  [/talen\s*[:：\-]\s*/i, 'talen'],
  [/hobb(y|ies|y'?s)\s*[:：\-]\s*/i, 'hobbys'],
  [/medisch\w*\s*[:：\-]\s*/i, 'medische_bijzonderheden'],
  [/woonsituatie\s*[:：\-]\s*/i, 'woonsituatie'],
  [/kinderen\s*[:：\-]\s*/i, 'kinderen'],
  [/(middelen|middelengebruik)\s*[:：\-]\s*/i, 'middelengebruik'],
  [/schulden\s*[:：\-]\s*/i, 'heeft_schulden'],
  [/werkervaring\s*[:：\-]\s*/i, 'werkervaring'],
  [/opleiding\s*[:：\-]\s*/i, 'opleiding'],
  [/diploma\s*[:：\-]\s*/i, 'diploma_behaald'],
  [/certificaten\s*[:：\-]\s*/i, 'certificaten_behaald'],
  [/rijbewijs\s*[:：\-]\s*/i, 'rijbewijs'],
  [/(aanmeld\s*datum|datum\s*aanmelding)\s*[:：\-]\s*/i, 'aanmeld_datum'],
];

function parseTextToKandidaat(text: string): ParsedKandidaat {
  const k: ParsedKandidaat = {};
  const lines = text.split(/\n/);

  for (const line of lines) {
    for (const [pattern, field] of TEXT_LABELS) {
      const match = line.match(pattern);
      if (match) {
        const value = line.substring(match.index! + match[0].length).trim();
        if (value) {
          k[field] = parseCellValue(field, value);
        }
        break;
      }
    }
  }

  // If no structured fields found, try to extract name from first line
  if (!k.voornaam && !k.achternaam && lines.length > 0) {
    const nameLine = lines.find((l) => l.trim().length > 2 && l.trim().length < 60);
    if (nameLine) {
      const parts = nameLine.trim().split(/\s+/);
      if (parts.length >= 2) {
        k.voornaam = parts[0];
        k.achternaam = parts.slice(1).join(' ');
      }
    }
  }

  return k;
}

// Try to detect if the text contains multiple candidates (separated by clear markers)
function splitMultipleCandidates(text: string): string[] {
  // Check for common separators between candidate entries
  const separators = [
    /\n---+\n/,
    /\n===+\n/,
    /\n\*{3,}\n/,
    /\nKandidaat\s*\d+/i,
    /\nDeelnemer\s*\d+/i,
    /\nNaam\s*[:：]\s/i,
  ];

  for (const sep of separators) {
    const parts = text.split(sep).filter((p) => p.trim().length > 20);
    if (parts.length > 1) return parts;
  }

  // Check if "Voornaam:" appears multiple times
  const voornaamMatches = text.match(/voornaam\s*[:：\-]/gi);
  if (voornaamMatches && voornaamMatches.length > 1) {
    const parts = text.split(/(?=voornaam\s*[:：\-])/i).filter((p) => p.trim().length > 10);
    if (parts.length > 1) return parts;
  }

  return [text];
}

// ---------------------------------------------------------------------------
// Word parser (.docx)
// ---------------------------------------------------------------------------

export async function parseWord(buffer: ArrayBuffer): Promise<ParseResult> {
  const mammoth = await import('mammoth');
  const warnings: string[] = [];

  // First try HTML conversion to detect tables
  const htmlResult = await mammoth.default.convertToHtml({ arrayBuffer: buffer });
  if (htmlResult.messages.length > 0) {
    warnings.push(...htmlResult.messages.map((m: any) => m.message));
  }

  // Check if document contains tables
  const hasTable = /<table[\s>]/i.test(htmlResult.value);

  if (hasTable) {
    const tableKandidaten = parseWordTable(htmlResult.value, warnings);
    if (tableKandidaten.length > 0) {
      return { kandidaten: tableKandidaten, warnings, source: 'word' };
    }
  }

  // Fallback: plain text extraction for label: value format
  const textResult = await mammoth.default.extractRawText({ arrayBuffer: buffer });
  const text = textResult.value;

  const sections = splitMultipleCandidates(text);
  const kandidaten = sections
    .map(parseTextToKandidaat)
    .filter((k) => k.voornaam || k.achternaam);

  if (kandidaten.length === 0) {
    warnings.push('Geen kandidaatgegevens herkend in het document. Controleer of de velden gelabeld zijn (bijv. "Voornaam: Jan") of gebruik een tabel met kolommen.');
  }

  return { kandidaten, warnings, source: 'word' };
}

// ---------------------------------------------------------------------------
// Word TABLE parser — handles documents with tabular candidate data
// ---------------------------------------------------------------------------

/** Extract text from HTML, stripping tags */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .trim();
}

/** Parse all <tr> rows from HTML table(s) */
function extractTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const cells: string[] = [];
    const tdRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(trMatch[1])) !== null) {
      cells.push(htmlToText(tdMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/** Known header patterns for the aanmeldingen table format */
const TABLE_HEADER_PATTERNS: Record<string, (cell: string) => boolean> = {
  deelnemersgegevens: (c) => /deelnemer/i.test(c),
  aanmelder: (c) => /aanmelder/i.test(c),
  datum: (c) => /datum/i.test(c),
  code_org: (c) => /code\s*org/i.test(c),
  stavaza: (c) => /sta(va)?za|status|voortgang/i.test(c),
};

/** Parse a cell that contains "Label\nValue" pairs */
function parseLabelValueCell(cellText: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = cellText.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check for "Label: Value" on same line
    const colonMatch = line.match(/^(naam|telefoonnummer|e-?mailadres|telefoon|e-?mail|adres|woonplaats|leeftijd|geslacht)\s*[:：]\s*(.+)/i);
    if (colonMatch) {
      result[colonMatch[1].toLowerCase()] = colonMatch[2].trim();
      continue;
    }
    // Check for "Label" on one line, "Value" on next line
    if (/^(naam|telefoonnummer|e-?mailadres|telefoon|e-?mail|adres|woonplaats|leeftijd|geslacht)$/i.test(line) && i + 1 < lines.length) {
      result[line.toLowerCase()] = lines[i + 1].trim();
      i++; // skip value line
      continue;
    }
    // If first line has no label, assume it's a name
    if (i === 0 && !result['naam'] && line.length > 1 && line.length < 60 && !/^(naam|tel|e-?mail|adres)/i.test(line)) {
      result['naam'] = line;
    }
  }
  return result;
}

function parseWordTable(html: string, warnings: string[]): ParsedKandidaat[] {
  const rows = extractTableRows(html);
  if (rows.length < 2) return [];

  // Detect header row
  const headerRow = rows[0];
  const colMap: Record<string, number> = {};

  for (let i = 0; i < headerRow.length; i++) {
    for (const [key, matcher] of Object.entries(TABLE_HEADER_PATTERNS)) {
      if (matcher(headerRow[i])) {
        colMap[key] = i;
        break;
      }
    }
  }

  // If we didn't find at least deelnemersgegevens, try row-based label:value
  if (!('deelnemersgegevens' in colMap) && !('aanmelder' in colMap)) {
    return [];
  }

  const kandidaten: ParsedKandidaat[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const k: ParsedKandidaat = {};

    // Parse deelnemersgegevens cell
    if (colMap.deelnemersgegevens !== undefined) {
      const cell = row[colMap.deelnemersgegevens] ?? '';
      const parsed = parseLabelValueCell(cell);
      if (parsed['naam']) {
        const parts = parsed['naam'].split(/\s+/);
        k.voornaam = parts[0] ?? null;
        k.achternaam = parts.slice(1).join(' ') || null;
      }
      if (parsed['telefoonnummer'] || parsed['telefoon']) {
        k.telefoon = parsed['telefoonnummer'] || parsed['telefoon'];
      }
      if (parsed['e-mailadres'] || parsed['email'] || parsed['e-mail']) {
        k.email = parsed['e-mailadres'] || parsed['email'] || parsed['e-mail'];
      }
    }

    // Parse aanmelder cell
    if (colMap.aanmelder !== undefined) {
      const cell = row[colMap.aanmelder] ?? '';
      const cellUpper = cell.toUpperCase().trim();
      if (cellUpper === 'ZELFMELDER' || cellUpper === 'ZELF') {
        k.aanmeld_type = 'zelf';
        k.door_wie_bekend = 'Zelfmelder';
      } else if (cell.trim()) {
        k.aanmeld_type = 'ander';
        const parsed = parseLabelValueCell(cell);
        if (parsed['naam']) {
          k.aanmelder_naam = parsed['naam'];
        }
        if (parsed['telefoonnummer'] || parsed['telefoon']) {
          k.aanmelder_telefoon = parsed['telefoonnummer'] || parsed['telefoon'];
        }
        if (parsed['e-mailadres'] || parsed['email'] || parsed['e-mail']) {
          k.aanmelder_email = parsed['e-mailadres'] || parsed['email'] || parsed['e-mail'];
        }
      }
    }

    // Parse datum
    if (colMap.datum !== undefined && row[colMap.datum]) {
      const raw = row[colMap.datum].trim();
      // Try to parse DD/MM or DD/MM/YY format
      const dateMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        let year = dateMatch[3] ?? new Date().getFullYear().toString();
        if (year.length === 2) year = '20' + year;
        k.aanmeld_datum = `${year}-${month}-${day}`;
      }
    }

    // Parse code org
    if (colMap.code_org !== undefined && row[colMap.code_org]) {
      k.aanmeld_organisatie = row[colMap.code_org].trim();
    }

    // Parse stavaza (status/notes)
    if (colMap.stavaza !== undefined && row[colMap.stavaza]) {
      k.intake_notities = row[colMap.stavaza].trim();
    }

    // Only add if we have at least a name
    if (k.voornaam || k.achternaam) {
      k.traject_status = 'aanmelding';
      kandidaten.push(k);
    } else {
      warnings.push(`Tabelrij ${r + 1}: geen naam gevonden, overgeslagen`);
    }
  }

  return kandidaten;
}

// ---------------------------------------------------------------------------
// PDF parser
// ---------------------------------------------------------------------------

export async function parsePdf(buffer: ArrayBuffer): Promise<ParseResult> {
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const warnings: string[] = [];
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s{2,}/g, '\n');
    fullText += text + '\n';
  }

  const sections = splitMultipleCandidates(fullText);
  const kandidaten = sections
    .map(parseTextToKandidaat)
    .filter((k) => k.voornaam || k.achternaam);

  if (kandidaten.length === 0) {
    warnings.push('Geen kandidaatgegevens herkend in de PDF. Controleer of de velden gelabeld zijn (bijv. "Voornaam: Jan").');
  }

  return { kandidaten, warnings, source: 'pdf' };
}

// ---------------------------------------------------------------------------
// Image parser (OCR via tesseract.js)
// ---------------------------------------------------------------------------

export async function parseImage(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParseResult> {
  const Tesseract = await import('tesseract.js');
  const warnings: string[] = [];

  const result = await Tesseract.recognize(file, 'nld+eng', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = result.data.text;

  if (!text || text.trim().length < 10) {
    return {
      kandidaten: [],
      warnings: ['Geen tekst herkend in de afbeelding. Probeer een duidelijkere foto.'],
      source: 'image',
    };
  }

  const sections = splitMultipleCandidates(text);
  const kandidaten = sections
    .map(parseTextToKandidaat)
    .filter((k) => k.voornaam || k.achternaam);

  if (kandidaten.length === 0) {
    warnings.push('Tekst herkend maar geen kandidaatgegevens gevonden. Controleer of de velden gelabeld zijn.');
  }

  return { kandidaten, warnings, source: 'image' };
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp', 'image/tiff'];
const EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
const WORD_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];
const PDF_TYPES = ['application/pdf'];

export function getFileType(file: File): 'excel' | 'csv' | 'word' | 'pdf' | 'image' | 'unknown' {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') return 'csv';
  if (['xlsx', 'xls'].includes(ext ?? '')) return 'excel';
  if (['docx', 'doc'].includes(ext ?? '')) return 'word';
  if (ext === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff'].includes(ext ?? '')) return 'image';

  if (EXCEL_TYPES.includes(file.type)) return 'excel';
  if (WORD_TYPES.includes(file.type)) return 'word';
  if (PDF_TYPES.includes(file.type)) return 'pdf';
  if (IMAGE_TYPES.includes(file.type)) return 'image';

  return 'unknown';
}

export async function parseFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<ParseResult> {
  const type = getFileType(file);

  if (type === 'unknown') {
    return {
      kandidaten: [],
      warnings: [`Onbekend bestandstype: ${file.name}. Ondersteunde formaten: Excel, CSV, Word, PDF, afbeeldingen.`],
      source: 'excel',
    };
  }

  const buffer = await file.arrayBuffer();

  switch (type) {
    case 'excel':
    case 'csv':
      return parseExcel(buffer, file.name);
    case 'word':
      return parseWord(buffer);
    case 'pdf':
      return parsePdf(buffer);
    case 'image':
      return parseImage(file, onProgress);
  }
}

// ---------------------------------------------------------------------------
// Field metadata for the preview table
// ---------------------------------------------------------------------------

export const KANDIDAAT_FIELD_LABELS: Record<string, string> = {
  voornaam: 'Voornaam',
  achternaam: 'Achternaam',
  geslacht: 'Geslacht',
  geboortedatum: 'Geboortedatum',
  geboorteplaats: 'Geboorteplaats',
  bsn: 'BSN',
  nationaliteit: 'Nationaliteit',
  straat: 'Straat',
  postcode: 'Postcode',
  woonplaats: 'Woonplaats',
  ingeschreven_adres_brp: 'Ingeschreven adres (BRP)',
  reden_geen_brp: 'Reden geen BRP',
  wijk: 'Wijk',
  gebied: 'Gebied',
  telefoon: 'Telefoon',
  email: 'Email',
  contactpersoon: 'Contactpersoon',
  whatsapp: 'WhatsApp',
  eigen_vervoer: 'Eigen vervoer',
  rijbewijs: 'Rijbewijs',
  zorgverzekering: 'Zorgverzekering',
  uitkering: 'Uitkering',
  toestemming: 'Toestemming',
  klantmanager: 'Klantmanager',
  door_wie_bekend: 'Door wie bekend',
  gewenste_sector: 'Gewenste sector',
  certificaat_voorkeur_1: '1e certificaat voorkeur',
  certificaat_voorkeur_2: '2e certificaat voorkeur',
  motivatie: 'Motivatie',
  demotivatie: 'Demotivatie',
  stip_aan_de_horizon: 'Stip aan de horizon',
  goede_eigenschappen: 'Goede eigenschappen',
  minder_goed_in: 'Minder goed in',
  talen: 'Talen',
  hobbys: "Hobby's",
  medische_bijzonderheden: 'Medische bijzonderheden',
  woonsituatie: 'Woonsituatie',
  kinderen: 'Kinderen',
  trajecten: 'Trajecten',
  hulpverleners_betrokken: 'Hulpverleners betrokken',
  afspraken_hulp: 'Afspraken hulp',
  middelengebruik: 'Middelengebruik',
  heeft_schulden: 'Heeft schulden',
  schulden_reden_bedrag: 'Schulden reden & bedrag',
  schulden_afspraken: 'Schulden afspraken',
  aanraking_politie_justitie: 'Politie/justitie',
  aanraking_reden: 'Reden aanraking',
  veroordeeld_detentie: 'Veroordeeld/detentie',
  lopende_zaken: 'Lopende zaken',
  opleiding: 'Opleiding',
  diploma_behaald: 'Diploma behaald',
  opleiding_niveau: 'Niveau',
  reden_uitval: 'Reden uitval',
  cursussen_gevolgd: 'Cursussen gevolgd',
  certificaten_behaald: 'Certificaten behaald',
  werkervaring: 'Werkervaring',
  waarom_lukte_niet: 'Waarom lukte niet',
  heeft_cv: 'Heeft CV',
  acties_afspraken: 'Acties & afspraken',
  leefgebieden_aandacht: 'Leefgebieden aandacht',
  aanmeld_datum: 'Aanmelddatum',
  intake_datum: 'Intake datum',
  intake_door: 'Intake door',
  intake_notities: 'Intake notities',
};
