import * as XLSX from 'xlsx';

export type OilSeverity = 'ok' | 'alerta' | 'critico';
export type OilFilter = 'todos' | OilSeverity;

export interface OilSample {
  id: string;
  equipamento: string;
  compartimento: string;
  compartimentoResumo: string;
  oleo: string;
  laudo: string;
  condicao: string;
  criticidade: OilSeverity;
  nrLaudo: string;
  dataColeta: string;
  dataColetaDate: Date | null;
}

export interface OilCompartmentReport {
  id: string;
  compartimento: string;
  compartimentoResumo: string;
  latestSample: OilSample;
  history: OilSample[];
}

export interface OilEquipmentReport {
  id: string;
  criticidade: OilSeverity;
  totalCompartimentos: number;
  compartimentos: OilCompartmentReport[];
  amostras: OilSample[];
}

export interface OilAnalysisParseResult {
  equipments: OilEquipmentReport[];
  samples: OilSample[];
  totalRows: number;
}

type HeaderIndexMap = {
  equipamento: number;
  compartimento: number;
  oleo: number;
  laudo: number;
  condicao: number;
  nrLaudo: number;
  dataColeta: number;
};

const HEADER_ALIASES: Record<keyof HeaderIndexMap, string[]> = {
  equipamento: ['equipamento'],
  compartimento: ['compartimento'],
  oleo: ['oleo', 'oleo lubrificante'],
  laudo: ['laudo'],
  condicao: ['condicao', 'condicao resumida'],
  nrLaudo: ['nrlaudo', 'nr laudo', 'numero laudo'],
  dataColeta: ['datacoleta', 'data coleta'],
};

const SEVERITY_ORDER: Record<OilSeverity, number> = {
  ok: 0,
  alerta: 1,
  critico: 2,
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function parseColetaDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const text = String(value ?? '').trim();
  if (!text) return null;

  const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]) - 1;
    const day = Number(isoMatch[3]);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatColetaDate(value: unknown): string {
  const date = parseColetaDate(value);
  if (!date) return String(value ?? '').trim();

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function calcularCriticidade(condicao: unknown): OilSeverity {
  const normalized = normalizeHeader(condicao);
  if (normalized.includes('trocar') || normalized.includes('intervir')) return 'critico';
  if (normalized.includes('atencao') || normalized.includes('acompanhar')) return 'alerta';
  return 'ok';
}

export function criticidadeEquipamento(samples: OilSample[]): OilSeverity {
  return samples.reduce<OilSeverity>((current, sample) => {
    return SEVERITY_ORDER[sample.criticidade] > SEVERITY_ORDER[current] ? sample.criticidade : current;
  }, 'ok');
}

export function resumirCompartimento(value: unknown): string {
  const text = String(value ?? '').trim();
  const [, suffix] = text.split(/\s-\s(.+)/);
  return (suffix || text).trim();
}

export function compareSampleRecency(a: OilSample, b: OilSample): number {
  const timeA = a.dataColetaDate?.getTime() ?? 0;
  const timeB = b.dataColetaDate?.getTime() ?? 0;
  if (timeA !== timeB) return timeB - timeA;
  return b.nrLaudo.localeCompare(a.nrLaudo);
}

function findRequiredHeaders(headers: unknown[]): HeaderIndexMap {
  const normalized = headers.map(normalizeHeader);
  const result = {} as HeaderIndexMap;

  (Object.keys(HEADER_ALIASES) as Array<keyof HeaderIndexMap>).forEach(key => {
    const aliases = HEADER_ALIASES[key];
    const index = normalized.findIndex(header => aliases.includes(header));
    result[key] = index;
  });

  const missing = (Object.keys(result) as Array<keyof HeaderIndexMap>).filter(key => result[key] < 0);
  if (missing.length) {
    throw new Error(`Colunas obrigatorias ausentes: ${missing.join(', ')}`);
  }

  return result;
}

export function buildOilAnalysis(rows: unknown[][]): OilAnalysisParseResult {
  if (!rows.length) {
    return { equipments: [], samples: [], totalRows: 0 };
  }

  const headerMap = findRequiredHeaders(rows[0] || []);
  const samples: OilSample[] = [];

  rows.slice(1).forEach((row, index) => {
    const equipamento = String(row[headerMap.equipamento] ?? '').trim();
    if (!equipamento) return;

    const compartimento = String(row[headerMap.compartimento] ?? '').trim();
    const nrLaudo = String(row[headerMap.nrLaudo] ?? '').trim();
    const dataColetaRaw = row[headerMap.dataColeta];
    const dataColetaDate = parseColetaDate(dataColetaRaw);

    samples.push({
      id: `${equipamento}::${compartimento || 'sem-compartimento'}::${nrLaudo || index}`,
      equipamento,
      compartimento,
      compartimentoResumo: resumirCompartimento(compartimento),
      oleo: String(row[headerMap.oleo] ?? '').trim(),
      laudo: String(row[headerMap.laudo] ?? '').trim(),
      condicao: String(row[headerMap.condicao] ?? '').trim(),
      criticidade: calcularCriticidade(row[headerMap.condicao]),
      nrLaudo,
      dataColeta: formatColetaDate(dataColetaRaw),
      dataColetaDate,
    });
  });

  const equipmentMap = new Map<string, OilSample[]>();
  samples.forEach(sample => {
    const current = equipmentMap.get(sample.equipamento) ?? [];
    current.push(sample);
    equipmentMap.set(sample.equipamento, current);
  });

  const equipments = Array.from(equipmentMap.entries())
    .map(([id, equipmentSamples]) => {
      const compartmentMap = new Map<string, OilSample[]>();

      equipmentSamples.forEach(sample => {
        const key = sample.compartimento || 'Sem compartimento';
        const current = compartmentMap.get(key) ?? [];
        current.push(sample);
        compartmentMap.set(key, current);
      });

      const compartimentos: OilCompartmentReport[] = Array.from(compartmentMap.entries())
        .map(([key, compartmentSamples]) => {
          const history = [...compartmentSamples].sort(compareSampleRecency);
          return {
            id: `${id}::${key}`,
            compartimento: key,
            compartimentoResumo: resumirCompartimento(key),
            latestSample: history[0],
            history,
          };
        })
        .sort((a, b) => compareSampleRecency(a.latestSample, b.latestSample));

      const latestSamples = compartimentos.map(item => item.latestSample);

      return {
        id,
        criticidade: criticidadeEquipamento(latestSamples),
        totalCompartimentos: compartimentos.length,
        compartimentos,
        amostras: [...equipmentSamples].sort(compareSampleRecency),
      };
    })
    .sort((a, b) => {
      const severityDiff = SEVERITY_ORDER[b.criticidade] - SEVERITY_ORDER[a.criticidade];
      if (severityDiff !== 0) return severityDiff;
      return a.id.localeCompare(b.id);
    });

  return {
    equipments,
    samples,
    totalRows: rows.length - 1,
  };
}

export function parseOilAnalysisWorkbook(arrayBuffer: ArrayBuffer): OilAnalysisParseResult {
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellDates: true,
  });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) {
    return { equipments: [], samples: [], totalRows: 0 };
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    raw: true,
    blankrows: false,
    defval: '',
  });

  return buildOilAnalysis(rows);
}

export function filterEquipmentsBySeverity(equipments: OilEquipmentReport[], filter: OilFilter): OilEquipmentReport[] {
  if (filter === 'todos') return equipments;
  return equipments.filter(equipment => equipment.criticidade === filter);
}

export function summarizeOilAnalysis(equipments: OilEquipmentReport[]) {
  return equipments.reduce(
    (acc, equipment) => {
      acc.totalEquipamentos += 1;
      if (equipment.criticidade === 'critico') acc.criticos += 1;
      if (equipment.criticidade === 'alerta') acc.alertas += 1;
      if (equipment.criticidade === 'ok') acc.ok += 1;
      acc.totalCompartimentos += equipment.totalCompartimentos;
      return acc;
    },
    { totalEquipamentos: 0, totalCompartimentos: 0, criticos: 0, alertas: 0, ok: 0 }
  );
}
