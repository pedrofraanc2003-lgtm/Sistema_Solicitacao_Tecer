import React, { useMemo } from 'react';
import { Clock, Database, Download, Package, ShieldAlert, Wrench, ClipboardList } from 'lucide-react';
import { useEquipmentsData, useRequestsData } from '../app/hooks';
import { buildEquipmentsExport, buildInsumosExport, buildRequestsExport, downloadDataset } from '../services/exports/reportExports';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import { buildEquipmentMap, enrichRequests } from '../domains/requests/selectors';

const ReportCard = ({ title, description, countLabel, countValue, onExport }: { title: string; description: string; countLabel: string; countValue: number; onExport: () => void }) => (
  <Panel className="flex flex-col items-start gap-5">
    <div className="rounded-2xl bg-tecer-primary p-4 text-white shadow-lg shadow-tecer-primary/20">
      <Download size={24} />
    </div>
    <div>
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm text-tecer-grayMed">{description}</p>
    </div>
    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800/40">
      <span className="font-bold text-tecer-primary">{countValue}</span> {countLabel}
    </div>
    <Button onClick={onExport}>Exportar CSV</Button>
  </Panel>
);

export default function Reports() {
  const { requests } = useRequestsData();
  const { equipments } = useEquipmentsData();
  const enrichedRequests = useMemo(() => enrichRequests(requests, buildEquipmentMap(equipments)), [equipments, requests]);
  const lastExtraction = useMemo(() => new Date().toLocaleString('pt-BR'), []);
  const insumosCount = useMemo(() => requests.reduce((sum, request) => sum + request.insumos.length, 0), [requests]);

  return (
    <div className="tecer-page mx-auto max-w-7xl space-y-10">
      <div className="tecer-view-header">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="tecer-view-headline">
            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-tecer-primary">
              <Database size={16} />
              Exportação estruturada
            </div>
            <h2 className="font-display text-4xl font-extrabold text-tecer-grayDark dark:text-white">Relatórios para BI</h2>
            <p className="text-sm text-tecer-grayMed">Datasets isolados por domínio, com nomenclatura estável e carimbo temporal para ingestão analítica.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-tecer-grayMed dark:bg-gray-800">
            <Clock size={14} />
            Última extração preparada em {lastExtraction}
          </div>
        </div>
        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Solicitações</span>
            <span className="tecer-view-stat-value">{requests.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Insumos</span>
            <span className="tecer-view-stat-value">{insumosCount}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Equipamentos</span>
            <span className="tecer-view-stat-value">{equipments.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          title="Base de Solicitações"
          description="Histórico completo para acompanhar volume, lead time e situação operacional."
          countLabel="linhas previstas"
          countValue={requests.length}
          onExport={() => downloadDataset(buildRequestsExport(enrichedRequests))}
        />
        <ReportCard
          title="Consumo de Insumos"
          description="Detalhamento granular de materiais por solicitação para análises de abastecimento e custo."
          countLabel="linhas previstas"
          countValue={insumosCount}
          onExport={() => downloadDataset(buildInsumosExport(requests))}
        />
        <ReportCard
          title="Base de Equipamentos"
          description="Inventário operacional de ativos com TAG, categoria e status de uso."
          countLabel="linhas previstas"
          countValue={equipments.length}
          onExport={() => downloadDataset(buildEquipmentsExport(equipments))}
        />
      </div>

      <Panel tone="muted" className="space-y-5">
        <h4 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-tecer-primary">
          <ShieldAlert size={20} />
          Guia de consumo
        </h4>
        <div className="grid grid-cols-1 gap-6 text-sm text-tecer-grayDark dark:text-gray-300 md:grid-cols-3">
          <div className="flex gap-3">
            <ClipboardList size={18} className="mt-0.5 text-tecer-primary" />
            <p>Os arquivos saem em `;` com BOM UTF-8, prontos para o conector de texto/CSV do Power BI.</p>
          </div>
          <div className="flex gap-3">
            <Package size={18} className="mt-0.5 text-tecer-primary" />
            <p>O relacionamento entre insumos e solicitações usa `ID_Solicitacao` como chave lógica.</p>
          </div>
          <div className="flex gap-3">
            <Wrench size={18} className="mt-0.5 text-tecer-primary" />
            <p>Os nomes de arquivo incluem timestamp de extração para rastreabilidade analítica.</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
