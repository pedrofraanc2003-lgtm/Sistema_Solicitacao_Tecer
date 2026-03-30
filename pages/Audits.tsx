import React, { useMemo, useState } from 'react';
import { Activity, ClipboardList, Filter, Search, ShieldAlert, Tag, Users as UsersIcon } from 'lucide-react';
import { useAuditLogsData } from '../app/hooks';
import { AuditLog } from '../types';

function AuditsView({ logs }: { logs: AuditLog[] }) {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('All');

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (search) {
      const normalizedSearch = search.toLowerCase();
      result = result.filter(log => log.userName.toLowerCase().includes(normalizedSearch) || log.entityId.toLowerCase().includes(normalizedSearch) || log.summary.toLowerCase().includes(normalizedSearch));
    }

    if (entityFilter !== 'All') {
      result = result.filter(log => log.entity === entityFilter);
    }

    return result.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
  }, [entityFilter, logs, search]);

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'Solicitação': return <ClipboardList size={14} />;
      case 'Equipamento': return <Tag size={14} />;
      case 'Usuário': return <UsersIcon size={14} />;
      default: return <Activity size={14} />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Criação': return 'text-green-500 bg-green-50 dark:bg-green-900/10';
      case 'Edição': return 'text-tecer-primary bg-blue-50 dark:bg-blue-900/10';
      case 'Status': return 'text-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case 'Exclusão': return 'text-red-500 bg-red-50 dark:bg-red-900/10';
      default: return 'text-tecer-grayMed bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="tecer-page flex h-full flex-col space-y-6">
      <div className="tecer-view-header">
        <div className="tecer-view-headline">
          <p className="tecer-view-kicker">Rastreabilidade</p>
          <h2 className="flex items-center gap-2 font-display text-3xl font-extrabold">
            <ShieldAlert className="text-tecer-primary" />
            Auditoria do Sistema
          </h2>
          <p className="text-sm text-tecer-grayMed">Registro imutável de ações, mudanças de status e intervenções críticas.</p>
        </div>
        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Registros</span>
            <span className="tecer-view-stat-value">{logs.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Filtrados</span>
            <span className="tecer-view-stat-value">{filteredLogs.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Entidades</span>
            <span className="tecer-view-stat-value">{new Set(logs.map(log => log.entity)).size}</span>
          </div>
        </div>
      </div>

      <div className="tecer-toolbar flex flex-wrap items-center gap-4 rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por usuário, ID ou resumo da alteração..."
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-tecer-primary dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-tecer-grayMed" />
          <select
            value={entityFilter}
            onChange={event => setEntityFilter(event.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 focus:outline-none dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="All">Todas Entidades</option>
            <option value="Solicitação">Solicitações</option>
            <option value="Equipamento">Equipamentos</option>
            <option value="Usuário">Usuários</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-md dark:border-gray-700 dark:bg-tecer-darkCard">
        <div className="scrollbar-thin max-h-[calc(100vh-320px)] overflow-x-auto overflow-y-auto">
          <table className="tecer-table w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm dark:bg-gray-800">
              <tr className="border-b border-gray-100 text-[10px] font-bold uppercase text-tecer-grayMed dark:border-gray-700">
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Entidade</th>
                <th className="px-6 py-4">Resumo da Alteração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLogs.map(log => (
                <tr key={log.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-tecer-grayDark dark:text-gray-200">{new Date(log.timestamp).toLocaleDateString()}</span>
                      <span className="text-[10px] text-tecer-grayMed">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-tecer-primary/10 text-[10px] font-bold text-tecer-primary">
                        {log.userName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{log.userName}</span>
                        <span className="text-[10px] uppercase text-tecer-grayMed">{log.userRole}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${getActionColor(log.actionType)}`}>{log.actionType}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs font-semibold text-tecer-primary dark:text-tecer-secondary">
                      {getEntityIcon(log.entity)}
                      <span>{log.entityId}</span>
                    </div>
                    <span className="text-[10px] uppercase text-tecer-grayMed">{log.entity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="max-w-md text-xs text-tecer-grayDark dark:text-gray-300">{log.summary}</p>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center italic text-tecer-grayMed opacity-50">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Audits() {
  const { auditLogs } = useAuditLogsData();
  return <AuditsView logs={auditLogs} />;
}
