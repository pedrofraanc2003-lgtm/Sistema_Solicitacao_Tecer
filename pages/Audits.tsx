
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Activity,
  ArrowRight,
  ShieldAlert,
  Tag,
  ClipboardList,
  Users as UsersIcon
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditsProps {
  logs: AuditLog[];
}

const Audits: React.FC<AuditsProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('All');

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(log => 
        log.userName.toLowerCase().includes(s) || 
        log.entityId.toLowerCase().includes(s) ||
        log.summary.toLowerCase().includes(s)
      );
    }

    if (entityFilter !== 'All') {
      result = result.filter(log => log.entity === entityFilter);
    }

    // Ordenação: Mais recentes primeiro
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, search, entityFilter]);

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
    <div className="tecer-page space-y-6 flex flex-col h-full">
      <div className="tecer-view-header">
        <div className="tecer-view-headline">
          <p className="tecer-view-kicker">Rastreabilidade</p>
          <h2 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <ShieldAlert className="text-tecer-primary" />
            Auditoria do Sistema
          </h2>
          <p className="text-tecer-grayMed text-sm">Registro imutável de ações, mudanças de status e intervenções críticas.</p>
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
            <span className="tecer-view-stat-value">{new Set(logs.map((log) => log.entity)).size}</span>
          </div>
        </div>
      </div>

      <div className="tecer-toolbar bg-white dark:bg-tecer-darkCard p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por usuário, ID ou resumo da alteração..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-tecer-grayMed" />
          <select 
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-4 focus:outline-none"
          >
            <option value="All">Todas Entidades</option>
            <option value="Solicitação">Solicitações</option>
            <option value="Equipamento">Equipamentos</option>
            <option value="Usuário">Usuários</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-tecer-darkCard rounded-[24px] shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Container com rolagem interna e altura máxima calculada para evitar rolagem da página inteira */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin">
          <table className="tecer-table w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">
              <tr className="text-tecer-grayMed text-[10px] uppercase font-bold border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Entidade</th>
                <th className="px-6 py-4">Resumo da Alteração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-tecer-grayDark dark:text-gray-200">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      <span className="text-[10px] text-tecer-grayMed">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-tecer-primary/10 text-tecer-primary flex items-center justify-center text-[10px] font-bold">
                        {log.userName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{log.userName}</span>
                        <span className="text-[10px] text-tecer-grayMed uppercase">{log.userRole}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getActionColor(log.actionType)}`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-xs font-semibold text-tecer-primary dark:text-tecer-secondary">
                      {getEntityIcon(log.entity)}
                      <span>{log.entityId}</span>
                    </div>
                    <span className="text-[10px] text-tecer-grayMed uppercase">{log.entity}</span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-tecer-grayDark dark:text-gray-300 max-w-md">{log.summary}</p>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-tecer-grayMed italic opacity-50">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Audits;

