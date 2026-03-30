import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, BarChart3, ClipboardCheck, Clock, ShoppingCart, TimerOff, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useEquipmentsData, useRequestsData } from '../app/hooks';
import { getRequestKpis } from '../domains/dashboard/metrics';
import { buildEquipmentMap, enrichRequests, RequestWithDerivedFields } from '../domains/requests/selectors';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

const chartPalette = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)', 'var(--color-warning)', 'var(--color-success)', 'var(--color-muted-soft)'];

const StatCard = React.memo(function StatCard({ label, value, icon: Icon, action }: { label: string; value: string | number; icon: React.ComponentType<{ size?: number }>; action?: () => void }) {
  return (
    <Panel className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-tecer-grayMed">{label}</span>
          <div className="mt-4 font-display text-4xl font-semibold leading-none text-tecer-grayDark dark:text-white">{value}</div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-[rgba(167,111,44,0.22)] bg-[rgba(255,255,255,0.44)] text-tecer-primary dark:border-[rgba(217,192,160,0.18)] dark:bg-[rgba(255,255,255,0.04)]">
          <Icon size={20} />
        </div>
      </div>
      {action ? (
        <Button variant="ghost" onClick={action} className="justify-start px-0">
          Abrir fila
          <ArrowRight size={16} />
        </Button>
      ) : null}
    </Panel>
  );
});

const ActionList = React.memo(function ActionList({ title, items, emptyLabel, onNavigate }: { title: string; items: RequestWithDerivedFields[]; emptyLabel: string; onNavigate: () => void }) {
  return (
    <Panel className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Visao operacional</p>
          <h3 className="mt-2 font-display text-[28px] font-semibold">{title}</h3>
        </div>
        <Button variant="ghost" onClick={onNavigate}>Abrir visao</Button>
      </div>
      <div className="space-y-3">
        {items.length ? items.map(item => (
          <div key={item.id} className="rounded-[22px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.36)] p-4 dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)]">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-tecer-primary">{item.id}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tecer-grayMed">{item.displayDeadline ? new Date(item.displayDeadline).toLocaleDateString('pt-BR') : 'Sem prazo'}</span>
            </div>
            <p className="mt-3 text-sm font-semibold leading-6 text-tecer-grayDark dark:text-white">{item.description}</p>
          </div>
        )) : <p className="text-sm text-tecer-grayMed">{emptyLabel}</p>}
      </div>
    </Panel>
  );
});

export default function Dashboard() {
  const navigate = useNavigate();
  const { requests } = useRequestsData();
  const { equipments } = useEquipmentsData();
  const enrichedRequests = useMemo(() => enrichRequests(requests, buildEquipmentMap(equipments)), [equipments, requests]);
  const kpis = useMemo(() => getRequestKpis(enrichedRequests), [enrichedRequests]);

  return (
    <div className="tecer-page space-y-6">
      <Panel tone="hero" className="relative overflow-hidden">
        <div className="relative z-[1] grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-tecer-grayMed">Painel executivo</p>
            <h2 className="mt-4 font-display text-[42px] font-semibold leading-[0.94] md:text-[54px]">
              Informacoes criticas, organizadas para acao.
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-tecer-grayMed">
              A leitura foi reestruturada para destacar prioridade, atraso e gargalo sem espalhar atencao. Cada bloco passa a funcionar como um quadro de decisao.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => navigate('/requests/in-progress')}>Abrir andamento</Button>
              <Button variant="secondary" onClick={() => navigate('/reports')}>Ver relatorios</Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[24px] border border-[rgba(167,111,44,0.22)] bg-[rgba(255,255,255,0.46)] p-5 backdrop-blur-sm dark:border-[rgba(217,192,160,0.18)] dark:bg-[rgba(255,255,255,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tecer-grayMed">Total registrado</p>
              <p className="mt-3 font-display text-4xl font-semibold text-tecer-primary">{kpis.total}</p>
              <p className="mt-2 text-sm leading-6 text-tecer-grayMed">Volume completo de demandas monitoradas pelo sistema.</p>
            </div>
            <div className="rounded-[24px] border border-[rgba(45,106,159,0.22)] bg-[rgba(255,255,255,0.46)] p-5 backdrop-blur-sm dark:border-[rgba(156,196,232,0.18)] dark:bg-[rgba(255,255,255,0.04)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tecer-grayMed">Demandas abertas</p>
              <p className="mt-3 font-display text-4xl font-semibold text-tecer-secondary">{kpis.open}</p>
              <p className="mt-2 text-sm leading-6 text-tecer-grayMed">Itens que seguem exigindo controle, resposta ou suprimento.</p>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Atrasadas" value={kpis.overdue} icon={AlertTriangle} action={() => navigate('/requests/in-progress')} />
        <StatCard label="Sem prazo" value={kpis.withoutDeadline} icon={TimerOff} action={() => navigate('/requests/in-progress')} />
        <StatCard label="Alta urgencia" value={kpis.highUrgency} icon={TrendingUp} action={() => navigate('/requests/in-progress')} />
        <StatCard label="MTTR medio" value={`${kpis.avgResponseTimeDays} dias`} icon={Clock} action={() => navigate('/reports')} />
        <StatCard label="Lead time SC" value={`${kpis.avgPurchasingTimeHours}h`} icon={ShoppingCart} action={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Panel className="lg:col-span-1">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Leitura de fluxo</p>
              <h3 className="mt-2 flex items-center gap-2 font-display text-[30px] font-semibold">
                <BarChart3 className="text-tecer-primary" size={22} />
                Gargalo por status
              </h3>
            </div>
            <Button variant="ghost" onClick={() => navigate('/requests/in-progress')}>Ir para andamento</Button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.statusCounts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="var(--chart-axis)" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="var(--chart-axis)" />
                <Tooltip cursor={{ fill: 'rgba(167, 111, 44, 0.08)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={34}>
                  {kpis.statusCounts.map((entry, index) => <Cell key={entry.name} fill={chartPalette[index % chartPalette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Monitoramento</p>
            <h3 className="mt-2 flex items-center gap-2 font-display text-[30px] font-semibold">
              <ClipboardCheck className="text-tecer-primary" size={22} />
              Fila critica
            </h3>
          </div>
          <div className="space-y-3">
            {kpis.criticalRequests.length ? kpis.criticalRequests.map(request => (
              <div key={request.id} className="rounded-[22px] border border-[color:var(--color-border)] bg-[rgba(255,255,255,0.36)] p-4 dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.03)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-tecer-primary">{request.id}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-tecer-grayMed">{request.urgency}</span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-tecer-grayDark dark:text-white">{request.description}</p>
              </div>
            )) : <p className="text-sm text-tecer-grayMed">Sem solicitacoes criticas abertas.</p>}
          </div>
          <Button variant="secondary" onClick={() => navigate('/requests/in-progress')}>Abrir fila critica</Button>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ActionList title="Proximas prioridades" items={kpis.priorityRequests} emptyLabel="Nenhuma prioridade pendente." onNavigate={() => navigate('/requests/in-progress')} />
        <ActionList title="Demandas criticas" items={kpis.criticalRequests} emptyLabel="Nenhuma demanda critica no momento." onNavigate={() => navigate('/requests/all')} />
      </div>
    </div>
  );
}
