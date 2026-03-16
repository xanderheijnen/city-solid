import * as XLSX from 'xlsx';
import type { Kandidaat } from '@/lib/types';

export function exportToExcel(kandidaten: Kandidaat[], filename: string) {
  const rows = kandidaten.map((k) => ({
    'ID': k.display_id,
    'Voornaam': k.voornaam,
    'Achternaam': k.achternaam,
    'Status': k.traject_status,
    'Geslacht': k.geslacht ?? '',
    'Geboortedatum': k.geboortedatum ?? '',
    'Telefoon': k.telefoon ?? '',
    'Email': k.email ?? '',
    'Straat': k.straat ?? '',
    'Postcode': k.postcode ?? '',
    'Wijk': k.wijk ?? '',
    'Gebied': k.gebied ?? '',
    'Klantmanager': k.klantmanager ?? '',
    'Uitkering': k.uitkering?.join(', ') ?? '',
    'Eigen vervoer': k.eigen_vervoer ? 'Ja' : 'Nee',
    'Rijbewijs': k.rijbewijs ? 'Ja' : 'Nee',
    'Aanmelddatum': k.aanmeld_datum ?? '',
    'Intakedatum': k.intake_datum ?? '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as Record<string, string>)[key] ?? '').length)),
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kandidaten');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
