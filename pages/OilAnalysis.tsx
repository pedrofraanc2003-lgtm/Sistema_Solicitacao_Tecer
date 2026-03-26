import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Beaker,
  CheckCircle2,
  ChevronRight,
  Droplets,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  ShieldAlert,
  Upload,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Toolbar from '../ui/Toolbar';
import {
  OilCompartmentReport,
  OilEquipmentReport,
  OilFilter,
  OilSample,
  OilSeverity,
  filterEquipmentsBySeverity,
  parseOilAnalysisWorkbook,
  summarizeOilAnalysis,
} from '../domains/oil-analysis';
import { cn } from '../lib/cn';

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

const severityMeta: Record<
  OilSeverity,
  {
    label: string;
    border: string;
    badge: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }
> = {
  critico: {
    label: 'Trocar / Intervir',
    border: 'border-l-[6px] border-l-[#E24B4A]',
    badge: 'bg-[#FCEBEB] text-[#A32D2D] dark:bg-red-900/20 dark:text-red-400',
    icon: AlertTriangle,
  },
  alerta: {
    label: 'Atencao / Acompanhar',
    border: 'border-l-[6px] border-l-[#EF9F27]',
    badge: 'bg-[#FAEEDA] text-[#854F0B] dark:bg-orange-900/20 dark:text-orange-400',
    icon: AlertTriangle,
  },
  ok: {
    label: 'Ok / Normal',
    border: 'border-l-[6px] border-l-[#639922]',
    badge: 'bg-[#EAF3DE] text-[#3B6D11] dark:bg-green-900/20 dark:text-green-400',
    icon: CheckCircle2,
  },
};

const filterOptions: Array<{ value: OilFilter; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'ok', label: 'Ok' },
  { value: 'alerta', label: 'Atencao' },
  { value: 'critico', label: 'Trocar' },
];

const dashboardPalette = ['#E24B4A', '#EF9F27', '#639922', '#0F73CC', '#005CB9', '#48A3FF'];

function DashboardStat({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: string;
  hint: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
      <div className={cn('absolute inset-x-0 top-0 h-1.5 opacity-90', tone)} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">{label}</p>
          <p className="mt-3 text-3xl font-display font-extrabold text-tecer-grayDark dark:text-white">{value}</p>
          <p className="mt-2 text-xs text-tecer-grayMed">{hint}</p>
        </div>
        <div className={cn('rounded-2xl p-3 text-white shadow-lg', tone)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
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

function EquipmentCard({
  equipment,
  selectedSampleId,
  onSelectSample,
}: {
  equipment: OilEquipmentReport;
  selectedSampleId?: string;
  onSelectSample: (equipment: OilEquipmentReport, compartment: OilCompartmentReport) => void;
}) {
  return (
    <article
      className={cn(
        'group rounded-[28px] bg-white p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl dark:bg-tecer-darkCard',
        severityMeta[equipment.criticidade].border
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Equipamento</p>
          <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">{equipment.id}</h3>
          <p className="mt-2 text-sm text-tecer-grayMed">{equipment.totalCompartimentos} compartimentos monitorados</p>
        </div>
        <StatusBadge severity={equipment.criticidade}>{severityMeta[equipment.criticidade].label}</StatusBadge>
      </div>

      <div className="mt-6 space-y-2">
        {equipment.compartimentos.map(compartment => (
          <button
            key={compartment.id}
            onClick={() => onSelectSample(equipment, compartment)}
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/30',
              selectedSampleId === compartment.latestSample.id && 'border-blue-200 bg-blue-50/60 dark:bg-blue-500/5'
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-tecer-grayDark dark:text-white">{compartment.compartimentoResumo}</p>
              <p className="mt-1 text-xs text-tecer-grayMed">
                Coleta {compartment.latestSample.dataColeta || 'sem data'} {compartment.history.length > 1 ? `- ${compartment.history.length} registros` : ''}
              </p>
            </div>
            <StatusBadge severity={compartment.latestSample.criticidade} compact>
              {compartment.latestSample.criticidade}
            </StatusBadge>
          </button>
        ))}
      </div>
    </article>
  );
}

function HistoryButton({
  sample,
  active,
  onSelect,
}: {
  sample: OilSample;
  active: boolean;
  onSelect: (sample: OilSample) => void;
}) {
  return (
    <button
      onClick={() => onSelect(sample)}
      className={cn(
        'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left',
        active ? 'border-blue-200 bg-blue-50/60 dark:bg-blue-500/5' : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/30'
      )}
    >
      <div>
        <p className="text-sm font-semibold text-tecer-grayDark dark:text-white">{sample.dataColeta || 'Sem data'}</p>
        <p className="mt-1 text-xs text-tecer-grayMed">Laudo {sample.nrLaudo || 'nao informado'}</p>
      </div>
      <StatusBadge severity={sample.criticidade} compact>
        {sample.criticidade}
      </StatusBadge>
    </button>
  );
}

function DetailPanel({
  equipment,
  compartment,
  sample,
  onClose,
  onSelectCompartment,
  onSelectHistory,
  onNavigateSample,
}: {
  equipment: OilEquipmentReport;
  compartment: OilCompartmentReport;
  sample: OilSample;
  onClose: () => void;
  onSelectCompartment: (compartment: OilCompartmentReport) => void;
  onSelectHistory: (sample: OilSample) => void;
  onNavigateSample: (direction: 'prev' | 'next') => void;
}) {
  const currentIndex = compartment.history.findIndex(item => item.id === sample.id);

  return (
    <div className="flex h-full flex-col rounded-[30px] bg-white shadow-2xl dark:bg-tecer-darkCard">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6 dark:border-gray-700">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Analise detalhada</p>
          <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">{equipment.id}</h3>
          <p className="mt-2 text-sm text-tecer-grayMed">{compartment.compartimento}</p>
        </div>
        <button onClick={onClose} className="rounded-full p-2 text-tecer-grayMed hover:bg-gray-100 dark:hover:bg-gray-800">
          <X size={20} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge severity={sample.criticidade}>{sample.condicao || severityMeta[sample.criticidade].label}</StatusBadge>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed dark:bg-gray-800">
            Oleo {sample.oleo || 'nao informado'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/40">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Nr. Laudo</p>
            <p className="mt-2 text-lg font-semibold text-tecer-grayDark dark:text-white">{sample.nrLaudo || 'Nao informado'}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/40">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Data da coleta</p>
            <p className="mt-2 text-lg font-semibold text-tecer-grayDark dark:text-white">{sample.dataColeta || 'Nao informada'}</p>
          </div>
        </div>

        <div className="rounded-[26px] border border-gray-100 bg-gradient-to-br from-white to-[#f5f9ff] p-5 dark:border-gray-700 dark:from-tecer-darkCard dark:to-[#0f2742]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Navegacao por historico</p>
              <p className="mt-1 text-sm text-tecer-grayMed">{compartment.history.length} registro(s) para este compartimento</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onNavigateSample('prev')} className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800" disabled={currentIndex <= 0}>
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => onNavigateSample('next')}
                className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                disabled={currentIndex < 0 || currentIndex >= compartment.history.length - 1}
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {compartment.history.map(item => (
              <HistoryButton key={item.id} sample={item} active={item.id === sample.id} onSelect={onSelectHistory} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Outros compartimentos do equipamento</p>
          <div className="mt-3 space-y-2">
            {equipment.compartimentos.map(item => (
              <button
                key={item.id}
                onClick={() => onSelectCompartment(item)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left',
                  item.id === compartment.id ? 'border-blue-200 bg-blue-50/60 dark:bg-blue-500/5' : 'border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/30'
                )}
              >
                <div>
                  <p className="text-sm font-semibold text-tecer-grayDark dark:text-white">{item.compartimentoResumo}</p>
                  <p className="mt-1 text-xs text-tecer-grayMed">Ultima coleta {item.latestSample.dataColeta || 'sem data'}</p>
                </div>
                <ChevronRight size={16} className="text-tecer-grayMed" />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[26px] border border-gray-100 p-5 dark:border-gray-700">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Laudo completo</p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-tecer-grayDark dark:text-gray-200" style={{ textTransform: 'none' }}>
            {sample.laudo || 'Nenhum texto de laudo disponivel para esta amostra.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function CustomChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name?: string; label?: string; value?: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const first = payload[0];
  const title = label || first.payload.label || first.payload.name || '';
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-xl dark:border-gray-700 dark:bg-tecer-darkCard">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-tecer-grayMed">{title}</p>
      <p className="mt-2 text-sm font-semibold text-tecer-grayDark dark:text-white">{first.value} registro(s)</p>
    </div>
  );
}

const OilAnalysis: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [fileName, setFileName] = useState('');
  const [equipments, setEquipments] = useState<OilEquipmentReport[]>([]);
  const [filter, setFilter] = useState<OilFilter>('todos');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [selectedCompartmentId, setSelectedCompartmentId] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  const summary = useMemo(() => summarizeOilAnalysis(equipments), [equipments]);
  const filteredEquipments = useMemo(() => filterEquipmentsBySeverity(equipments, filter), [equipments, filter]);
  const latestSamples = useMemo(() => equipments.flatMap(item => item.compartimentos.map(compartment => compartment.latestSample)), [equipments]);
  const dashboardData = useMemo(() => {
    const severityChart = [
      { name: 'Critico', value: summary.criticos, fill: '#E24B4A' },
      { name: 'Alerta', value: summary.alertas, fill: '#EF9F27' },
      { name: 'Ok', value: summary.ok, fill: '#639922' },
    ].filter(item => item.value > 0);

    const oilMap = new Map<string, number>();
    latestSamples.forEach(sample => {
      const key = sample.oleo || 'Nao informado';
      oilMap.set(key, (oilMap.get(key) ?? 0) + 1);
    });

    const oilChart = Array.from(oilMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const criticalEquipments = equipments
      .map(equipment => {
        const criticos = equipment.compartimentos.filter(item => item.latestSample.criticidade === 'critico').length;
        const alertas = equipment.compartimentos.filter(item => item.latestSample.criticidade === 'alerta').length;
        const score = criticos * 2 + alertas;
        return {
          id: equipment.id,
          criticidade: equipment.criticidade,
          criticos,
          alertas,
          score,
          totalCompartimentos: equipment.totalCompartimentos,
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, 5);

    const topCompartments = latestSamples
      .filter(sample => sample.criticidade !== 'ok')
      .sort((a, b) => {
        const severityA = a.criticidade === 'critico' ? 2 : 1;
        const severityB = b.criticidade === 'critico' ? 2 : 1;
        if (severityA !== severityB) return severityB - severityA;
        return (b.dataColetaDate?.getTime() ?? 0) - (a.dataColetaDate?.getTime() ?? 0);
      })
      .slice(0, 5);

    const totalLatest = latestSamples.length;
    const criticalRate = totalLatest ? Math.round((latestSamples.filter(item => item.criticidade === 'critico').length / totalLatest) * 100) : 0;

    return {
      severityChart,
      oilChart,
      criticalEquipments,
      topCompartments,
      totalLatest,
      criticalRate,
    };
  }, [equipments, latestSamples, summary.alertas, summary.criticos, summary.ok]);

  const selectedEquipment = useMemo(
    () => equipments.find(item => item.id === selectedEquipmentId) ?? null,
    [equipments, selectedEquipmentId]
  );

  const selectedCompartment = useMemo(() => {
    if (!selectedEquipment) return null;
    return selectedEquipment.compartimentos.find(item => item.id === selectedCompartmentId) ?? selectedEquipment.compartimentos[0] ?? null;
  }, [selectedCompartmentId, selectedEquipment]);

  const selectedSample = useMemo(() => {
    if (!selectedCompartment) return null;
    return selectedCompartment.history.find(item => item.id === selectedSampleId) ?? selectedCompartment.latestSample;
  }, [selectedCompartment, selectedSampleId]);

  const openSelection = (equipment: OilEquipmentReport, compartment: OilCompartmentReport, sample?: OilSample) => {
    setSelectedEquipmentId(equipment.id);
    setSelectedCompartmentId(compartment.id);
    setSelectedSampleId(sample?.id ?? compartment.latestSample.id);
  };

  const closePanel = () => {
    setSelectedEquipmentId(null);
    setSelectedCompartmentId(null);
    setSelectedSampleId(null);
  };

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
      closePanel();
      setLoadState('loaded');
    } catch (error) {
      setEquipments([]);
      closePanel();
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Falha ao processar o arquivo informado.');
    } finally {
      event.target.value = '';
    }
  };

  const navigateHistory = (direction: 'prev' | 'next') => {
    if (!selectedCompartment || !selectedSample) return;
    const index = selectedCompartment.history.findIndex(item => item.id === selectedSample.id);
    if (index < 0) return;

    const nextIndex = direction === 'prev' ? index - 1 : index + 1;
    const nextSample = selectedCompartment.history[nextIndex];
    if (nextSample) {
      setSelectedSampleId(nextSample.id);
    }
  };

  return (
    <div className="tecer-page mx-auto flex max-w-[1600px] flex-col gap-6">
      <input ref={inputRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={onImportFile} />

      <div className="tecer-view-header">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="tecer-view-headline max-w-3xl">
            <div className="flex items-center gap-3 text-tecer-primary dark:text-tecer-secondary">
              <FlaskConical size={16} />
              <span className="text-xs font-bold uppercase tracking-[0.24em]">Saude dos lubrificantes</span>
            </div>
            <h2 className="text-4xl font-display font-extrabold text-tecer-grayDark dark:text-white">Laudos de analise de oleo</h2>
            <p className="max-w-2xl text-sm text-tecer-grayMed">
              Importe a planilha do laboratorio para triar rapidamente equipamentos criticos, compartimentos em alerta e o historico de cada coleta.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => inputRef.current?.click()} disabled={loadState === 'loading'}>
              <Upload size={18} />
              {loadState === 'loading' ? 'Importando...' : 'Importar XLS'}
            </Button>
            {fileName ? (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-tecer-grayDark dark:bg-blue-900/10 dark:text-gray-100">
                <span className="font-semibold">Arquivo:</span> {fileName}
              </div>
            ) : null}
          </div>
        </div>

        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Equipamentos</span>
            <span className="tecer-view-stat-value">{summary.totalEquipamentos}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Compartimentos</span>
            <span className="tecer-view-stat-value">{summary.totalCompartimentos}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Criticos</span>
            <span className="tecer-view-stat-value">{summary.criticos}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Alerta</span>
            <span className="tecer-view-stat-value">{summary.alertas}</span>
          </div>
        </div>
      </div>

      <Toolbar className="justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]',
                filter === option.value ? 'bg-tecer-primary text-white' : 'bg-gray-100 text-tecer-grayDark dark:bg-gray-800'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed dark:bg-gray-800">
          <FileSpreadsheet size={14} />
          {summary.totalEquipamentos} equipamentos · {summary.criticos} criticos
        </div>
      </Toolbar>

      {loadState === 'error' ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:bg-red-900/10 dark:text-red-400">{errorMessage}</div>
      ) : null}

      {loadState === 'loaded' && equipments.length ? (
        <section className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <DashboardStat
              label="Compartimentos ativos"
              value={dashboardData.totalLatest}
              icon={Gauge}
              tone="bg-tecer-primary"
              hint="Ultimo registro valido por compartimento."
            />
            <DashboardStat
              label="Taxa critica"
              value={`${dashboardData.criticalRate}%`}
              icon={ShieldAlert}
              tone="bg-red-500"
              hint="Percentual de compartimentos na condicao mais grave."
            />
            <DashboardStat
              label="Oleo dominante"
              value={dashboardData.oilChart[0]?.name || 'N/A'}
              icon={Droplets}
              tone="bg-tecer-secondary"
              hint={`${dashboardData.oilChart[0]?.value || 0} compartimentos na amostra mais recente.`}
            />
            <DashboardStat
              label="Frota em alerta"
              value={summary.criticos + summary.alertas}
              icon={BarChart3}
              tone="bg-orange-500"
              hint="Equipamentos que exigem acompanhamento ou intervencao."
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Mapa de criticidade</p>
                  <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Distribuicao dos status da frota</h3>
                </div>
                <div className="rounded-full bg-gray-100 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed dark:bg-gray-800">
                  Base atualizada pelo upload
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardData.severityChart}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={11} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={11} />
                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(15, 115, 204, 0.06)' }} />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={54}>
                        {dashboardData.severityChart.map(entry => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dashboardData.severityChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
                        {dashboardData.severityChart.map(entry => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Foco imediato</p>
              <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Equipamentos mais pressionados</h3>
              <div className="mt-6 space-y-3">
                {dashboardData.criticalEquipments.length ? (
                  dashboardData.criticalEquipments.map(item => (
                    <div key={item.id} className="rounded-[24px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-tecer-grayDark dark:text-white">{item.id}</p>
                          <p className="mt-1 text-xs text-tecer-grayMed">{item.totalCompartimentos} compartimentos avaliados</p>
                        </div>
                        <StatusBadge severity={item.criticidade}>{severityMeta[item.criticidade].label}</StatusBadge>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-tecer-grayMed">
                        <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-700 dark:bg-red-900/20 dark:text-red-400">{item.criticos} criticos</span>
                        <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">{item.alertas} alertas</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState icon={CheckCircle2} title="Sem pressão operacional" description="Nenhum equipamento possui compartimentos em alerta ou criticidade na amostra mais recente." />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <div className="mb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Perfil do fluido</p>
                <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Distribuicao por tipo de oleo</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.oilChart} layout="vertical" margin={{ left: 12, right: 12 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} stroke="var(--chart-axis)" fontSize={11} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      axisLine={false}
                      tickLine={false}
                      stroke="var(--chart-axis)"
                      fontSize={11}
                    />
                    <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(15, 115, 204, 0.06)' }} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={22}>
                      {dashboardData.oilChart.map((entry, index) => (
                        <Cell key={entry.name} fill={dashboardPalette[index % dashboardPalette.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[30px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-tecer-grayMed">Triagem prioritaria</p>
              <h3 className="mt-2 text-2xl font-display font-extrabold text-tecer-grayDark dark:text-white">Compartimentos que pedem leitura</h3>
              <div className="mt-6 space-y-3">
                {dashboardData.topCompartments.length ? (
                  dashboardData.topCompartments.map(sample => (
                    <button
                      key={sample.id}
                      onClick={() => {
                        const equipment = equipments.find(item => item.id === sample.equipamento);
                        const compartment = equipment?.compartimentos.find(item => item.latestSample.id === sample.id || item.history.some(history => history.id === sample.id));
                        if (equipment && compartment) {
                          openSelection(equipment, compartment, sample);
                        }
                      }}
                      className="w-full rounded-[24px] border border-gray-100 bg-gray-50 p-4 text-left hover:bg-blue-50/60 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:bg-blue-500/5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-tecer-grayDark dark:text-white">{sample.equipamento}</p>
                          <p className="mt-1 text-xs text-tecer-grayMed">{sample.compartimentoResumo}</p>
                        </div>
                        <StatusBadge severity={sample.criticidade}>{sample.criticidade}</StatusBadge>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-tecer-grayMed">
                        <span>Coleta {sample.dataColeta || 'sem data'}</span>
                        <span>Laudo {sample.nrLaudo || 'nao informado'}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyState icon={Beaker} title="Sem itens prioritarios" description="Todos os compartimentos estao em condicao normal na amostra mais recente." />
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {loadState === 'idle' ? (
        <EmptyState
          icon={Beaker}
          title="Nenhum arquivo importado"
          description="Selecione um .xls ou .xlsx exportado pelo laboratorio para gerar a visao de frota e abrir os laudos por compartimento."
        />
      ) : null}

      {loadState === 'loaded' && !filteredEquipments.length ? (
        <EmptyState icon={AlertTriangle} title="Nenhum equipamento para este filtro" description="Ajuste o status selecionado para visualizar os cards correspondentes." />
      ) : null}

      {loadState === 'loaded' && filteredEquipments.length ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
            {filteredEquipments.map(equipment => (
              <EquipmentCard
                key={equipment.id}
                equipment={equipment}
                selectedSampleId={selectedSample?.id}
                onSelectSample={(nextEquipment, nextCompartment) => openSelection(nextEquipment, nextCompartment)}
              />
            ))}
          </div>

          {selectedEquipment && selectedCompartment && selectedSample ? (
            <div className="hidden xl:block">
              <div className="sticky top-6 h-[calc(100vh-9rem)]">
                <DetailPanel
                  equipment={selectedEquipment}
                  compartment={selectedCompartment}
                  sample={selectedSample}
                  onClose={closePanel}
                  onSelectCompartment={item => openSelection(selectedEquipment, item)}
                  onSelectHistory={sampleItem => setSelectedSampleId(sampleItem.id)}
                  onNavigateSample={navigateHistory}
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedEquipment && selectedCompartment && selectedSample ? (
        <div className="xl:hidden">
          <div className="tecer-modal-backdrop fixed inset-0 z-[90] p-3">
            <DetailPanel
              equipment={selectedEquipment}
              compartment={selectedCompartment}
              sample={selectedSample}
              onClose={closePanel}
              onSelectCompartment={item => openSelection(selectedEquipment, item)}
              onSelectHistory={sampleItem => setSelectedSampleId(sampleItem.id)}
              onNavigateSample={navigateHistory}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OilAnalysis;
