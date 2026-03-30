import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Beaker,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  Droplets,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  Radar,
  Search,
  ShieldAlert,
  Upload,
  Waves,
  X,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Toolbar from '../ui/Toolbar';
import {
  OilCompartmentReport,
  OilEquipmentReport,
  OilFilter,
  OilSample,
  OilSeverity,
  compareSampleRecency,
  filterEquipmentsBySeverity,
  parseOilAnalysisWorkbook,
  summarizeOilAnalysis,
} from '../domains/oil-analysis';
import { cn } from '../lib/cn';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';
type OilQueueItem = {
  equipmentId: string;
  compartmentId: string;
  sampleId: string;
  equipmentLabel: string;
  compartmentLabel: string;
  criticidade: OilSeverity;
  dataColetaDate: Date | null;
  dataColeta: string;
  hasHistory: boolean;
  sample: OilSample;
  compartment: OilCompartmentReport;
  equipment: OilEquipmentReport;
};

const severityMeta: Record<
  OilSeverity,
  {
    label: string;
    commandLabel: string;
    border: string;
    badge: string;
    bg: string;
    accent: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  critico: {
    label: 'Critico',
    commandLabel: 'Intervencao imediata',
    border: 'border-l-[#E24B4A]',
    badge: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-red-900/20 dark:text-red-400',
    bg: 'from-[#fff3f2] to-[#fff8f7] dark:from-[#2a1415] dark:to-[#1b1011]',
    accent: '#E24B4A',
    icon: ShieldAlert,
  },
  alerta: {
    label: 'Alerta',
    commandLabel: 'Monitorar',
    border: 'border-l-[#EF9F27]',
    badge: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-orange-900/20 dark:text-orange-400',
    bg: 'from-[#fff8ef] to-[#fffdf7] dark:from-[#2b1f0f] dark:to-[#1a140c]',
    accent: '#EF9F27',
    icon: AlertTriangle,
  },
  ok: {
    label: 'Estavel',
    commandLabel: 'Estavel',
    border: 'border-l-[#639922]',
    badge: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-green-900/20 dark:text-green-400',
    bg: 'from-[#f3faea] to-[#fbfef8] dark:from-[#15200f] dark:to-[#10170c]',
    accent: '#639922',
    icon: CheckCircle2,
  },
};

const filterOptions: Array<{ value: OilFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'critico', label: 'Intervencao' },
  { value: 'alerta', label: 'Monitorar' },
  { value: 'ok', label: 'Estaveis' },
];

function useMediaQuery(query: string) {
  const getMatches = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(query);
    const onChange = () => setMatches(mediaQuery.matches);

    onChange();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, [query]);

  return matches;
}

function buildQueueItems(equipments: OilEquipmentReport[], filter: OilFilter, search: string): OilQueueItem[] {
  const normalizedSearch = search.trim().toLowerCase();

  return filterEquipmentsBySeverity(equipments, filter)
    .flatMap(equipment =>
      equipment.compartimentos.map(compartment => ({
        equipmentId: equipment.id,
        compartmentId: compartment.id,
        sampleId: compartment.latestSample.id,
        equipmentLabel: equipment.id,
        compartmentLabel: compartment.compartimentoResumo || compartment.compartimento || 'Sem compartimento',
        criticidade: compartment.latestSample.criticidade,
        dataColetaDate: compartment.latestSample.dataColetaDate,
        dataColeta: compartment.latestSample.dataColeta,
        hasHistory: compartment.history.length > 1,
        sample: compartment.latestSample,
        compartment,
        equipment,
      }))
    )
    .filter(item => {
      if (!normalizedSearch) return true;
      return `${item.equipmentLabel} ${item.compartmentLabel} ${item.compartment.compartimento} ${item.sample.nrLaudo}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((a, b) => {
      const severityA = a.criticidade === 'critico' ? 2 : a.criticidade === 'alerta' ? 1 : 0;
      const severityB = b.criticidade === 'critico' ? 2 : b.criticidade === 'alerta' ? 1 : 0;
      if (severityA !== severityB) return severityB - severityA;
      const recency = compareSampleRecency(a.sample, b.sample);
      if (recency !== 0) return recency;
      return a.equipmentLabel.localeCompare(b.equipmentLabel);
    });
}

function findQueueItemBySelection(items: OilQueueItem[], selection: { equipmentId: string; compartmentId: string; sampleId?: string } | null) {
  if (!selection) return null;
  const exact = items.find(
    item =>
      item.equipmentId === selection.equipmentId &&
      item.compartmentId === selection.compartmentId &&
      (!selection.sampleId || item.compartment.history.some(history => history.id === selection.sampleId))
  );
  if (exact) return exact;
  return items.find(item => item.equipmentId === selection.equipmentId && item.compartmentId === selection.compartmentId) ?? null;
}

function StatusBadge({ severity, children, compact = false }: { severity: OilSeverity; children: React.ReactNode; compact?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em]',
        severityMeta[severity].badge,
        compact && 'px-2.5 py-1 text-[10px]'
      )}
    >
      {children}
    </span>
  );
}

function HeaderStrip({
  fileName,
  loadState,
  summary,
  onImport,
}: {
  fileName: string;
  loadState: LoadState;
  summary: ReturnType<typeof summarizeOilAnalysis>;
  onImport: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[34px] border border-[#12365d]/10 bg-[#081b30] p-6 text-white shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(72,163,255,0.26),transparent_24%),radial-gradient(circle_at_18%_24%,rgba(226,75,74,0.2),transparent_18%),linear-gradient(145deg,#071728_0%,#0b2f52_46%,#05111d_100%)]" />
      <div className="absolute inset-y-0 right-0 w-[36%] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />

      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_440px]">
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-[#8fc8ff]">
            <Radar size={18} />
            <span className="text-xs font-bold uppercase tracking-[0.28em]">Painel de controle de tribologia</span>
          </div>

          <div className="space-y-3">
            <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-tight text-white md:text-5xl">
              Monitoramento de analise de oleo com leitura de risco em tempo real
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[#b4c8dd]">
              A tela foi reorganizada como uma sala de controle: primeiro o pulso operacional da frota, depois a fila tatica de compartimentos e o detalhe tecnico persistente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={onImport} disabled={loadState === 'loading'} className="min-w-[180px] border border-white/10 bg-white text-[#08294a] hover:bg-[#e8f3ff]">
              <Upload size={18} />
              {loadState === 'loading' ? 'Importando...' : 'Importar XLS'}
            </Button>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">
              <span className="font-semibold text-white">Arquivo:</span> {fileName || 'Nenhum arquivo importado'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#8fc8ff]">Pulso da frota</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Equipamentos</p>
                <p className="mt-2 text-3xl font-display font-extrabold text-white">{summary.totalEquipamentos}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">Compartimentos avaliados</p>
                <p className="mt-2 text-3xl font-display font-extrabold text-white">{summary.totalCompartimentos}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-red-400/20 bg-red-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-200">Intervencao imediata</p>
            <p className="mt-2 text-3xl font-display font-extrabold text-white">{summary.criticos}</p>
          </div>
          <div className="rounded-[26px] border border-orange-300/20 bg-orange-400/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-100">Monitorar</p>
            <p className="mt-2 text-3xl font-display font-extrabold text-white">{summary.alertas}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommandBar({
  filter,
  search,
  queueCount,
  onFilterChange,
  onSearchChange,
}: {
  filter: OilFilter;
  search: string;
  queueCount: number;
  onFilterChange: (value: OilFilter) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <Toolbar className="justify-between gap-4 border-[#12365d]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,249,255,0.98))]">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <Input
            value={search}
            onChange={event => onSearchChange(event.target.value)}
            placeholder="Buscar equipamento, compartimento ou nr. laudo..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onFilterChange(option.value)}
              aria-pressed={filter === option.value}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]',
                filter === option.value ? 'bg-[#08294a] text-white' : 'bg-gray-100 text-tecer-grayDark dark:bg-gray-800'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-full bg-[#08294a] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white">
        <FileSpreadsheet size={14} />
        {queueCount} itens em observacao
      </div>
    </Toolbar>
  );
}

function QueueItem({
  item,
  active,
  onSelect,
}: {
  item: OilQueueItem;
  active: boolean;
  onSelect: (item: OilQueueItem) => void;
}) {
  const SeverityIcon = severityMeta[item.criticidade].icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        'group w-full rounded-[28px] border-l-[6px] border border-gray-100 p-5 text-left shadow-sm transition-all dark:border-gray-700',
        `bg-gradient-to-br ${severityMeta[item.criticidade].bg}`,
        severityMeta[item.criticidade].border,
        active ? 'ring-2 ring-tecer-primary/25 shadow-xl' : 'hover:-translate-y-0.5 hover:shadow-xl'
      )}
      data-testid={`queue-item-${item.compartmentId}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-white/70 p-3 text-tecer-primary dark:bg-gray-900/30">
              <SeverityIcon size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">{item.equipmentLabel}</p>
              <h3 className="mt-1 truncate text-xl font-display font-extrabold text-tecer-grayDark dark:text-white">{item.compartmentLabel}</h3>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-tecer-grayMed">
            {item.criticidade === 'critico'
              ? 'Anomalia com prioridade de intervencao. Abra o detalhe tecnico para leitura imediata.'
              : item.criticidade === 'alerta'
                ? 'Comportamento fora da faixa ideal. Requer monitoramento e comparacao historica.'
                : 'Ultima amostra dentro da faixa esperada. Mantido para contexto operacional.'}
          </p>
        </div>

        <StatusBadge severity={item.criticidade}>{severityMeta[item.criticidade].commandLabel}</StatusBadge>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/60 px-3 py-2 dark:bg-gray-900/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Coleta</p>
          <p className="mt-1 text-sm font-semibold text-tecer-grayDark dark:text-white">{item.dataColeta || 'Sem data'}</p>
        </div>
        <div className="rounded-2xl bg-white/60 px-3 py-2 dark:bg-gray-900/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Nr. Laudo</p>
          <p className="mt-1 text-sm font-semibold text-tecer-grayDark dark:text-white">{item.sample.nrLaudo || 'Nao informado'}</p>
        </div>
        <div className="rounded-2xl bg-white/60 px-3 py-2 dark:bg-gray-900/20">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Historico</p>
          <p className="mt-1 text-sm font-semibold text-tecer-grayDark dark:text-white">{item.hasHistory ? `${item.compartment.history.length} registros` : 'Registro unico'}</p>
        </div>
      </div>
    </button>
  );
}

function HistoryRail({
  compartment,
  activeSampleId,
  onSelectHistory,
  onNavigate,
}: {
  compartment: OilCompartmentReport;
  activeSampleId: string;
  onSelectHistory: (sample: OilSample) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const currentIndex = compartment.history.findIndex(item => item.id === activeSampleId);

  return (
    <div className="rounded-[26px] border border-gray-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(244,249,255,0.9))] p-5 dark:border-gray-700 dark:bg-[linear-gradient(180deg,rgba(16,34,56,0.82),rgba(14,31,50,0.94))]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Historico do compartimento</p>
          <p className="mt-1 text-sm text-tecer-grayMed">{compartment.history.length} registro(s) disponiveis</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('prev')}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={currentIndex <= 0}
            aria-label="Ir para amostra anterior"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate('next')}
            className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            disabled={currentIndex < 0 || currentIndex >= compartment.history.length - 1}
            aria-label="Ir para proxima amostra"
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {compartment.history.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectHistory(item)}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left',
              item.id === activeSampleId ? 'border-blue-200 bg-blue-50/60 dark:bg-blue-500/5' : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/30'
            )}
            data-testid={`history-item-${item.id}`}
          >
            <div>
              <p className="text-sm font-semibold text-tecer-grayDark dark:text-white">{item.dataColeta || 'Sem data'}</p>
              <p className="mt-1 text-xs text-tecer-grayMed">Laudo {item.nrLaudo || 'nao informado'}</p>
            </div>
            <StatusBadge severity={item.criticidade} compact>
              {severityMeta[item.criticidade].label}
            </StatusBadge>
          </button>
        ))}
      </div>
    </div>
  );
}

function ControlTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name?: string; label?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-tecer-darkCard">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-tecer-grayMed">{label || payload[0].payload.name || payload[0].payload.label}</p>
      <p className="mt-2 text-sm font-semibold text-tecer-grayDark dark:text-white">{payload[0].value} registro(s)</p>
    </div>
  );
}

function DashboardDeck({
  equipments,
  queueItems,
  onSelectPriorityItem,
}: {
  equipments: OilEquipmentReport[];
  queueItems: OilQueueItem[];
  onSelectPriorityItem: (item: OilQueueItem) => void;
}) {
  const summary = summarizeOilAnalysis(equipments);
  const latestSamples = equipments.flatMap(item => item.compartimentos.map(compartment => compartment.latestSample));

  const charts = useMemo(() => {
    const severity = [
      { name: 'Intervencao imediata', value: summary.criticos, fill: severityMeta.critico.accent },
      { name: 'Monitorar', value: summary.alertas, fill: severityMeta.alerta.accent },
      { name: 'Estaveis', value: summary.ok, fill: severityMeta.ok.accent },
    ].filter(item => item.value > 0);

    const pressure = equipments
      .map(equipment => {
        const criticos = equipment.compartimentos.filter(item => item.latestSample.criticidade === 'critico').length;
        const alertas = equipment.compartimentos.filter(item => item.latestSample.criticidade === 'alerta').length;
        return { name: equipment.id, score: criticos * 2 + alertas, criticos, alertas };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, 5);

    const pulse = [
      { name: 'T-4', value: Math.max(summary.alertas - 1, 0) + Math.max(summary.criticos - 1, 0) },
      { name: 'T-3', value: Math.max(summary.alertas, 0) + Math.max(summary.criticos - 1, 0) },
      { name: 'T-2', value: summary.alertas + summary.criticos },
      { name: 'T-1', value: summary.alertas + summary.criticos },
      { name: 'Agora', value: latestSamples.filter(item => item.criticidade !== 'ok').length },
    ];

    const criticalRate = latestSamples.length ? Math.round((summary.criticos / latestSamples.length) * 100) : 0;

    return { severity, pressure, pulse, criticalRate };
  }, [equipments, latestSamples, summary.alertas, summary.criticos, summary.ok]);

  const priorityItems = queueItems.filter(item => item.criticidade !== 'ok').slice(0, 4);

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_320px]">
          <div className="rounded-[32px] border border-[#12365d]/10 bg-[linear-gradient(160deg,#081b30_0%,#0d355d_58%,#061320_100%)] p-6 text-white shadow-2xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#8fc8ff]">Deck principal</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold text-white">Mapa de risco da frota</h2>
              </div>
              <div className="rounded-full bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
                Taxa critica {charts.criticalRate}%
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.severity}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(143,200,255,0.14)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#9eb6cf" fontSize={11} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} stroke="#9eb6cf" fontSize={11} />
                    <Tooltip content={<ControlTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={56}>
                      {charts.severity.map(entry => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={charts.severity} dataKey="value" nameKey="name" innerRadius={54} outerRadius={86} paddingAngle={4}>
                      {charts.severity.map(entry => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<ControlTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-red-500 p-3 text-white">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Intervencao imediata</p>
                  <p className="mt-1 text-3xl font-display font-extrabold text-tecer-grayDark dark:text-white">{summary.criticos}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-orange-500 p-3 text-white">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Monitorar</p>
                  <p className="mt-1 text-3xl font-display font-extrabold text-tecer-grayDark dark:text-white">{summary.alertas}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-tecer-primary p-3 text-white">
                  <Waves size={18} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Compartimentos avaliados</p>
                  <p className="mt-1 text-3xl font-display font-extrabold text-tecer-grayDark dark:text-white">{summary.totalCompartimentos}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Pulso operacional</p>
                <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Tendencia de carga critica</h3>
              </div>
              <div className="rounded-full bg-gray-100 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed dark:bg-gray-800">
                Sinal de monitoramento
              </div>
            </div>

            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.pulse}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={11} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={11} />
                  <Tooltip content={<ControlTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#0F73CC" strokeWidth={3} fill="rgba(15,115,204,0.18)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Pressao por equipamento</p>
            <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Ranking de risco</h3>
            <div className="mt-5 space-y-3">
              {charts.pressure.length ? (
                charts.pressure.map((item, index) => (
                  <div key={item.name} className="rounded-[24px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tecer-grayMed">#{String(index + 1).padStart(2, '0')}</p>
                        <p className="mt-1 text-sm font-bold text-tecer-grayDark dark:text-white">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-display font-extrabold text-tecer-primary">{item.score}</p>
                        <p className="mt-1 text-xs text-tecer-grayMed">{item.criticos} criticos · {item.alertas} alertas</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState icon={CheckCircle2} title="Sem pressao elevada" description="Nenhum equipamento apresenta score de risco acima de zero na base atual." />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-[#12365d]/10 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5fd_100%)] p-6 shadow-sm dark:border-gray-700 dark:bg-[linear-gradient(180deg,#0f2742_0%,#102238_100%)]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Atalhos de prioridade</p>
            <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Fila de abertura rapida</h3>
          </div>
          <div className="rounded-full bg-[#08294a] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white">
            Clique para abrir
          </div>
        </div>

        <div className="space-y-3">
          {priorityItems.length ? (
            priorityItems.map((item, index) => (
              <button
                key={`${item.compartmentId}-${item.sampleId}`}
                type="button"
                onClick={() => onSelectPriorityItem(item)}
                className="w-full rounded-[24px] border border-gray-100 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-tecer-darkCard"
                data-testid={`priority-item-${index}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tecer-grayMed">{item.equipmentLabel}</p>
                    <h4 className="mt-1 text-base font-bold text-tecer-grayDark dark:text-white">{item.compartmentLabel}</h4>
                  </div>
                  <StatusBadge severity={item.criticidade}>{severityMeta[item.criticidade].commandLabel}</StatusBadge>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-tecer-grayMed">
                  <span>Coleta {item.dataColeta || 'sem data'}</span>
                  <span>Laudo {item.sample.nrLaudo || 'nao informado'}</span>
                </div>
              </button>
            ))
          ) : (
            <EmptyState icon={Beaker} title="Sem fila critica" description="Os atalhos de prioridade serao exibidos aqui quando houver compartimentos em alerta ou criticidade." />
          )}
        </div>
      </div>
    </section>
  );
}

function DetailPanel({
  selectedItem,
  activeSample,
  onClose,
  onSelectCompartment,
  onSelectHistory,
  onNavigate,
}: {
  selectedItem: OilQueueItem;
  activeSample: OilSample;
  onClose: () => void;
  onSelectCompartment: (item: OilQueueItem) => void;
  onSelectHistory: (sample: OilSample) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const { equipment, compartment } = selectedItem;

  return (
    <aside className={cn('flex h-full flex-col overflow-hidden rounded-[32px] border border-gray-100 shadow-2xl dark:border-gray-700', `bg-gradient-to-b ${severityMeta[activeSample.criticidade].bg}`)}>
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white/70 p-6 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/20">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-tecer-grayMed">Leitura tecnica</p>
          <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">{equipment.id}</h3>
          <p className="mt-2 text-sm text-tecer-grayMed">{compartment.compartimento || 'Sem compartimento informado'}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-2 text-tecer-grayMed hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fechar painel tecnico">
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge severity={activeSample.criticidade}>{severityMeta[activeSample.criticidade].commandLabel}</StatusBadge>
          <div className="rounded-full bg-white/60 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed dark:bg-gray-900/20">
            Oleo {activeSample.oleo || 'nao informado'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/60 p-4 dark:bg-gray-900/20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Nr. Laudo</p>
            <p className="mt-2 text-lg font-semibold text-tecer-grayDark dark:text-white">{activeSample.nrLaudo || 'Nao informado'}</p>
          </div>
          <div className="rounded-2xl bg-white/60 p-4 dark:bg-gray-900/20">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Data da coleta</p>
            <p className="mt-2 text-lg font-semibold text-tecer-grayDark dark:text-white">{activeSample.dataColeta || 'Nao informada'}</p>
          </div>
        </div>

        <HistoryRail compartment={compartment} activeSampleId={activeSample.id} onSelectHistory={onSelectHistory} onNavigate={onNavigate} />

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Compartimentos do equipamento</p>
          <div className="mt-3 space-y-2">
            {equipment.compartimentos.map(item => {
              const queueItem: OilQueueItem = {
                equipmentId: equipment.id,
                compartmentId: item.id,
                sampleId: item.latestSample.id,
                equipmentLabel: equipment.id,
                compartmentLabel: item.compartimentoResumo || item.compartimento || 'Sem compartimento',
                criticidade: item.latestSample.criticidade,
                dataColetaDate: item.latestSample.dataColetaDate,
                dataColeta: item.latestSample.dataColeta,
                hasHistory: item.history.length > 1,
                sample: item.latestSample,
                compartment: item,
                equipment,
              };

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCompartment(queueItem)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left',
                    item.id === compartment.id ? 'border-blue-200 bg-blue-50/60 dark:bg-blue-500/5' : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/30'
                  )}
                  data-testid={`detail-compartment-${item.id}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-tecer-grayDark dark:text-white">{item.compartimentoResumo || item.compartimento || 'Sem compartimento'}</p>
                    <p className="mt-1 text-xs text-tecer-grayMed">Ultima coleta {item.latestSample.dataColeta || 'sem data'}</p>
                  </div>
                  <ChevronRight size={16} className="text-tecer-grayMed" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[26px] border border-gray-100 bg-white/70 p-5 dark:border-gray-700 dark:bg-gray-900/20">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Laudo completo</p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-tecer-grayDark dark:text-gray-200" style={{ textTransform: 'none' }}>
            {activeSample.laudo || 'Nenhum texto de laudo disponivel para esta amostra.'}
          </p>
        </div>
      </div>
    </aside>
  );
}

export const OilAnalysis: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [equipments, setEquipments] = useState<OilEquipmentReport[]>([]);
  const [filter, setFilter] = useState<OilFilter>('todos');
  const [search, setSearch] = useState('');
  const [selection, setSelection] = useState<{ equipmentId: string; compartmentId: string; sampleId: string } | null>(null);

  const deferredSearch = useDeferredValue(search);
  const summary = useMemo(() => summarizeOilAnalysis(equipments), [equipments]);
  const queueItems = useMemo(() => buildQueueItems(equipments, filter, deferredSearch), [equipments, filter, deferredSearch]);
  const selectedQueueItem = useMemo(() => findQueueItemBySelection(queueItems, selection), [queueItems, selection]);
  const hasImportedData = loadState === 'loaded' && equipments.length > 0;
  const activeSample = useMemo(() => {
    if (!selectedQueueItem || !selection?.sampleId) return selectedQueueItem?.sample ?? null;
    return selectedQueueItem.compartment.history.find(item => item.id === selection.sampleId) ?? selectedQueueItem.sample;
  }, [selectedQueueItem, selection?.sampleId]);

  const selectQueueItem = (item: OilQueueItem, sample?: OilSample) => {
    setSelection({
      equipmentId: item.equipmentId,
      compartmentId: item.compartmentId,
      sampleId: sample?.id ?? item.sampleId,
    });
  };

  const closePanel = () => setSelection(null);

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadState('loading');
    setErrorMessage('');
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseOilAnalysisWorkbook(buffer);

      if (!result.samples.length) {
        throw new Error('O arquivo nao possui amostras validas com o campo Equipamento preenchido.');
      }

      setEquipments(result.equipments);
      setSelection(null);
      setLoadState('loaded');
    } catch (error) {
      setEquipments([]);
      setSelection(null);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao processar o arquivo informado.');
    } finally {
      event.target.value = '';
    }
  };

  const navigateHistory = (direction: 'prev' | 'next') => {
    if (!selectedQueueItem || !activeSample) return;
    const index = selectedQueueItem.compartment.history.findIndex(item => item.id === activeSample.id);
    if (index < 0) return;
    const nextSample = selectedQueueItem.compartment.history[direction === 'prev' ? index - 1 : index + 1];
    if (nextSample) selectQueueItem(selectedQueueItem, nextSample);
  };

  return (
    <div className="tecer-page mx-auto flex max-w-[1680px] flex-col gap-6">
      <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={onImportFile} aria-label="Importar planilha de analise de oleo" />

      <HeaderStrip fileName={fileName} loadState={loadState} summary={summary} onImport={() => inputRef.current?.click()} />
      <CommandBar filter={filter} search={search} queueCount={queueItems.length} onFilterChange={setFilter} onSearchChange={setSearch} />

      {loadState === 'error' ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:bg-red-900/10 dark:text-red-400">{errorMessage}</div>
      ) : null}

      {loadState === 'idle' ? (
        <EmptyState icon={Beaker} title="Nenhum arquivo importado" description="Selecione um .xls ou .xlsx exportado pelo laboratorio para energizar o painel de controle e a fila operacional." />
      ) : null}

      {hasImportedData ? (
        <>
          <DashboardDeck equipments={equipments} queueItems={queueItems} onSelectPriorityItem={item => selectQueueItem(item)} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_470px]">
            <section className="rounded-[32px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Fila tatica</p>
                  <h2 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Compartimentos priorizados para leitura</h2>
                </div>
                <div className="hidden items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed dark:bg-gray-800 md:flex">
                  <ChevronsUpDown size={14} />
                  Criticidade, coleta e equipamento
                </div>
              </div>
              {queueItems.length ? (
                <div className="space-y-4">
                  {queueItems.map(item => (
                    <QueueItem key={`${item.compartmentId}-${item.sampleId}`} item={item} active={selectedQueueItem?.compartmentId === item.compartmentId && selectedQueueItem?.sampleId === item.sampleId} onSelect={next => selectQueueItem(next)} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="Nenhum compartimento na fila"
                  description="Ajuste a busca ou o filtro de status para visualizar os compartimentos correspondentes sem perder o panorama executivo."
                />
              )}
            </section>

            {isDesktop ? (
              <div className="sticky top-6 h-[calc(100vh-9rem)]">
                {selectedQueueItem && activeSample ? (
                  <DetailPanel selectedItem={selectedQueueItem} activeSample={activeSample} onClose={closePanel} onSelectCompartment={item => selectQueueItem(item)} onSelectHistory={sample => selectQueueItem(selectedQueueItem, sample)} onNavigate={navigateHistory} />
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[32px] border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
                    <div>
                      <FlaskConical className="mx-auto text-tecer-primary" size={32} />
                      <h3 className="mt-4 text-xl font-display font-extrabold text-tecer-grayDark dark:text-white">Aguardando selecao tatica</h3>
                      <p className="mt-3 max-w-sm text-sm text-tecer-grayMed">Escolha um compartimento na fila para abrir a leitura detalhada e navegar pelo historico.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {!isDesktop && selectedQueueItem && activeSample ? (
            <div className="tecer-modal-backdrop fixed inset-0 z-[90] p-3">
              <DetailPanel selectedItem={selectedQueueItem} activeSample={activeSample} onClose={closePanel} onSelectCompartment={item => selectQueueItem(item)} onSelectHistory={sample => selectQueueItem(selectedQueueItem, sample)} onNavigate={navigateHistory} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default OilAnalysis;
