import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Kandidaat, UitstroomRubriekMapping, DeelnemerRapportage } from '@/lib/types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const rapportageKeys = {
  all: ['rapportage'] as const,
  deelnemers: (activiteit?: string) => [...rapportageKeys.all, 'deelnemers', activiteit] as const,
  stats: (activiteit?: string) => [...rapportageKeys.all, 'stats', activiteit] as const,
  rubrieken: () => [...rapportageKeys.all, 'rubrieken'] as const,
  activiteiten: () => [...rapportageKeys.all, 'activiteiten'] as const,
  importLog: () => [...rapportageKeys.all, 'import-log'] as const,
};

// ---------------------------------------------------------------------------
// useActiviteiten – unique activiteit values
// ---------------------------------------------------------------------------

export function useActiviteiten() {
  return useQuery({
    queryKey: rapportageKeys.activiteiten(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_kandidaten')
        .select('activiteit')
        .not('activiteit', 'is', null);

      if (error) throw error;
      const unique = [...new Set((data ?? []).map((d) => d.activiteit).filter(Boolean))] as string[];
      return unique.sort();
    },
  });
}

// ---------------------------------------------------------------------------
// useUitstroomRubrieken
// ---------------------------------------------------------------------------

export function useUitstroomRubrieken() {
  return useQuery({
    queryKey: rapportageKeys.rubrieken(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_uitstroom_rubrieken')
        .select('*')
        .order('uitstroom_waarde');

      if (error) throw error;
      return data as UitstroomRubriekMapping[];
    },
  });
}

// ---------------------------------------------------------------------------
// useRapportageDeelnemers – all candidates with certificate data
// ---------------------------------------------------------------------------

export function useRapportageDeelnemers(activiteit?: string) {
  return useQuery({
    queryKey: rapportageKeys.deelnemers(activiteit),
    queryFn: async () => {
      // 1. Fetch kandidaten
      let query = supabase
        .from('cs_kandidaten')
        .select('*')
        .order('created_at', { ascending: false });

      if (activiteit) {
        query = query.eq('activiteit', activiteit);
      }

      const { data: kandidaten, error: kErr } = await query;
      if (kErr) throw kErr;

      // 2. Fetch rubrieken mapping
      const { data: rubrieken } = await supabase
        .from('cs_uitstroom_rubrieken')
        .select('*');

      const rubriekMap = new Map(
        (rubrieken ?? []).map((r) => [r.uitstroom_waarde, r])
      );

      // 3. Fetch certificate data from voortgang
      const kandidaatIds = (kandidaten ?? []).map((k) => k.id);
      let certData: { kandidaat_id: string; omschrijving: string; behaald: boolean }[] = [];

      if (kandidaatIds.length > 0) {
        const { data: kts } = await supabase
          .from('cs_kandidaat_trainingen')
          .select('id, kandidaat_id')
          .in('kandidaat_id', kandidaatIds);

        if (kts && kts.length > 0) {
          const ktMap = new Map(kts.map((kt) => [kt.id, kt.kandidaat_id]));
          const ktIds = kts.map((kt) => kt.id);

          const { data: voortgangen } = await supabase
            .from('cs_voortgang')
            .select('kandidaat_training_id, omschrijving, behaald')
            .in('kandidaat_training_id', ktIds)
            .eq('type', 'certificaat');

          certData = (voortgangen ?? []).map((v) => ({
            kandidaat_id: ktMap.get(v.kandidaat_training_id) ?? '',
            omschrijving: v.omschrijving,
            behaald: v.behaald,
          }));
        }
      }

      // 4. Merge into DeelnemerRapportage
      const certByKandidaat = new Map<string, { naam: string; behaald: boolean }[]>();
      for (const c of certData) {
        if (!certByKandidaat.has(c.kandidaat_id)) {
          certByKandidaat.set(c.kandidaat_id, []);
        }
        certByKandidaat.get(c.kandidaat_id)!.push({
          naam: c.omschrijving,
          behaald: c.behaald,
        });
      }

      return (kandidaten ?? []).map((k) => {
        const certs = certByKandidaat.get(k.id) ?? [];
        const rubriekMapping = k.uitstroom_status ? rubriekMap.get(k.uitstroom_status) : null;

        return {
          ...k,
          certificaten_lijst: certs,
          aantal_certificaten: certs.filter((c) => c.behaald).length,
          aantal_gezakt: certs.filter((c) => !c.behaald).length,
          uitstroom_rubriek: rubriekMapping ? (rubriekMapping as UitstroomRubriekMapping).rubriek : null,
        } as DeelnemerRapportage;
      });
    },
  });
}

// ---------------------------------------------------------------------------
// useImportLog
// ---------------------------------------------------------------------------

export function useImportLog() {
  return useQuery({
    queryKey: rapportageKeys.importLog(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cs_import_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as import('@/lib/types').ImportLogEntry[];
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: compute dashboard stats from deelnemers
// ---------------------------------------------------------------------------

export function computeDashboardStats(
  deelnemers: DeelnemerRapportage[],
  rubrieken: UitstroomRubriekMapping[],
) {
  const rubriekMap = new Map(rubrieken.map((r) => [r.uitstroom_waarde, r]));
  const toonInGrafieken = new Set(
    rubrieken.filter((r) => r.toon_in_grafieken).map((r) => r.uitstroom_waarde)
  );

  // For charts: exclude uitval/afval that shouldn't show
  const chartDeelnemers = deelnemers.filter((d) => {
    if (!d.uitstroom_status) return true;
    return toonInGrafieken.has(d.uitstroom_status);
  });

  // Pipeline counts
  const instroom = deelnemers.length;
  const gestart = deelnemers.filter((d) =>
    !['aanmelding'].includes(d.traject_status)
  ).length;

  const inProces = deelnemers.filter((d) => {
    const r = d.uitstroom_status ? rubriekMap.get(d.uitstroom_status) : null;
    return r?.rubriek === 'in_proces' || (!d.uitstroom_status && d.traject_status !== 'aanmelding');
  }).length;

  const uitstroom = deelnemers.filter((d) => {
    const r = d.uitstroom_status ? rubriekMap.get(d.uitstroom_status) : null;
    return r?.rubriek === 'uitstroom';
  }).length;

  // Stat cards
  const opleidingen = chartDeelnemers.map((d) => d.opleiding_niveau).filter(Boolean);
  const opleidingCount = new Map<string, number>();
  for (const o of opleidingen) {
    opleidingCount.set(o!, (opleidingCount.get(o!) ?? 0) + 1);
  }
  const meestVoorkomendeOpleiding = [...opleidingCount.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

  const geenBrp = chartDeelnemers.filter((d) => !d.ingeschreven_adres_brp || d.ingeschreven_adres_brp === 'nee').length;
  const geenBrpPct = chartDeelnemers.length > 0 ? Math.round((geenBrp / chartDeelnemers.length) * 100) : 0;

  const justitie = chartDeelnemers.filter((d) => d.aanraking_politie_justitie).length;
  const justitiePct = chartDeelnemers.length > 0 ? Math.round((justitie / chartDeelnemers.length) * 100) : 0;

  const heeftUitkering = chartDeelnemers.filter((d) => d.uitkering && d.uitkering.length > 0).length;
  const uitkeringPct = chartDeelnemers.length > 0 ? Math.round((heeftUitkering / chartDeelnemers.length) * 100) : 0;

  const leeftijden = chartDeelnemers
    .map((d) => {
      if (d.leeftijd) return parseInt(d.leeftijd);
      if (d.geboortedatum) {
        const birth = new Date(d.geboortedatum);
        const now = new Date();
        return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
      return null;
    })
    .filter((l): l is number => l !== null);
  const gemLeeftijd = leeftijden.length > 0 ? Math.round(leeftijden.reduce((a, b) => a + b, 0) / leeftijden.length) : 0;

  const mannen = chartDeelnemers.filter((d) => d.geslacht === 'man').length;
  const vrouwen = chartDeelnemers.filter((d) => d.geslacht === 'vrouw').length;
  const geslachtVerdeling = chartDeelnemers.length > 0
    ? `${Math.round((mannen / chartDeelnemers.length) * 100)}% / ${Math.round((vrouwen / chartDeelnemers.length) * 100)}%`
    : '0% / 0%';

  // Chart data
  const leeftijdGroepen = [
    { label: '12-13', min: 12, max: 13 },
    { label: '14-17', min: 14, max: 17 },
    { label: '18-23', min: 18, max: 23 },
    { label: '24-27', min: 24, max: 27 },
    { label: '27+', min: 28, max: 999 },
  ];

  const leeftijdData = leeftijdGroepen.map((g) => ({
    name: g.label,
    value: leeftijden.filter((l) => l >= g.min && l <= g.max).length,
  }));

  const geslachtData = [
    { name: 'Man', value: mannen },
    { name: 'Vrouw', value: vrouwen },
    { name: 'Anders/Onbekend', value: chartDeelnemers.length - mannen - vrouwen },
  ].filter((d) => d.value > 0);

  const uitkeringData = [
    { name: 'Ja', value: heeftUitkering },
    { name: 'Nee', value: chartDeelnemers.length - heeftUitkering },
  ];

  const opleidingData = [...opleidingCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const orgCount = new Map<string, number>();
  for (const d of chartDeelnemers) {
    const org = d.aanmeld_organisatie ?? 'Onbekend';
    orgCount.set(org, (orgCount.get(org) ?? 0) + 1);
  }
  const organisatieData = [...orgCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const sectorCount = new Map<string, number>();
  for (const d of chartDeelnemers) {
    for (const s of d.gewenste_sector ?? []) {
      sectorCount.set(s, (sectorCount.get(s) ?? 0) + 1);
    }
  }
  const sectorData = [...sectorCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Gebied data
  const gebiedCount = new Map<string, number>();
  for (const d of chartDeelnemers) {
    const g = d.gebied ?? 'Onbekend';
    gebiedCount.set(g, (gebiedCount.get(g) ?? 0) + 1);
  }
  const gebiedData = [...gebiedCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Uitstroom per status
  const uitstroomCount = new Map<string, number>();
  for (const d of deelnemers) {
    if (d.uitstroom_status) {
      const label = d.uitstroom_status.toUpperCase();
      uitstroomCount.set(label, (uitstroomCount.get(label) ?? 0) + 1);
    }
  }
  const uitstroomData = [...uitstroomCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Certificaten totals
  const totaalCertificaten = deelnemers.reduce((s, d) => s + d.aantal_certificaten, 0);
  const totaalGezakt = deelnemers.reduce((s, d) => s + d.aantal_gezakt, 0);
  const slagingspercentage = (totaalCertificaten + totaalGezakt) > 0
    ? Math.round((totaalCertificaten / (totaalCertificaten + totaalGezakt)) * 100)
    : 0;

  return {
    pipeline: { instroom, gestart, inProces, uitstroom },
    stats: {
      meestVoorkomendeOpleiding,
      geenBrpPct,
      justitiePct,
      uitkeringPct,
      gemLeeftijd,
      geslachtVerdeling,
    },
    charts: {
      leeftijdData,
      geslachtData,
      uitkeringData,
      opleidingData,
      organisatieData,
      sectorData,
      gebiedData,
      uitstroomData,
    },
    certificaten: { totaalCertificaten, totaalGezakt, slagingspercentage },
    chartDeelnemers,
  };
}
