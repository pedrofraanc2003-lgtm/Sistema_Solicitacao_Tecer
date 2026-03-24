
import React, { useMemo } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Package,
  Activity,
  BarChart3,
  ShoppingCart
} from 'lucide-react';
import { MaintenanceRequest, RequestStatus, UrgencyLevel } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  requests: MaintenanceRequest[];
}

const Dashboard: React.FC<DashboardProps> = ({ requests }) => {
  const navigate = useNavigate();
  const chartPalette = [
    'var(--color-primary)',
    'var(--color-secondary)',
    'var(--color-accent)',
    'var(--color-warning)',
    'var(--color-success)',
    'var(--color-muted-soft)',
  ];

  const stats = useMemo(() => {
    const total = requests.length;
    const open = requests.filter(r => r.status !== RequestStatus.DISPONIVEL && r.status !== RequestStatus.CANCELADA).length;
    
    const now = new Date();
    const overdue = requests.filter(r => {
      if (r.status === RequestStatus.DISPONIVEL || r.status === RequestStatus.CANCELADA) return false;
      if (!r.deadline) return false;
      return new Date(r.deadline) < now;
    }).length;

    const highUrgency = requests.filter(r => r.urgency === UrgencyLevel.ALTA).length;
    const urgencyPercent = total > 0 ? (highUrgency / total * 100).toFixed(1) : 0;

    // Cálculo dinâmico do Tempo Médio de Atendimento (MTTR/Lead Time Global)
    const completedRequests = requests.filter(r => r.status === RequestStatus.DISPONIVEL);
    
    let totalDays = 0;
    completedRequests.forEach(r => {
      const start = new Date(r.createdAt).getTime();
      const completionEntry = r.history.find(h => h.newStatus === RequestStatus.DISPONIVEL);
      const end = completionEntry ? new Date(completionEntry.timestamp).getTime() : new Date().getTime();
      
      const diffInDays = (end - start) / (1000 * 60 * 60 * 24);
      totalDays += diffInDays;
    });

    const avgResponseTime = completedRequests.length > 0 
      ? (totalDays / completedRequests.length).toFixed(1) 
      : "0.0";

    // NOVO INDICADOR: Lead Time de Suprimentos (Emitido SC -> Disponível) em Horas
    let totalPurchasingHours = 0;
    let validPurchasingCount = 0;

    requests.forEach(r => {
      if (r.status === RequestStatus.CANCELADA) return;

      const scEntry = r.history.find(h => h.newStatus === RequestStatus.EMITIDO_SC);
      const availableEntry = r.history.find(h => h.newStatus === RequestStatus.DISPONIVEL);

      if (scEntry && availableEntry) {
        const startTime = new Date(scEntry.timestamp).getTime();
        const endTime = new Date(availableEntry.timestamp).getTime();
        
        if (endTime > startTime) {
          const diffInHours = (endTime - startTime) / (1000 * 60 * 60);
          totalPurchasingHours += diffInHours;
          validPurchasingCount++;
        }
      }
    });

    const avgPurchasingTime = validPurchasingCount > 0 
      ? (totalPurchasingHours / validPurchasingCount).toFixed(1) 
      : "0.0";

    return { total, open, overdue, urgencyPercent, avgResponseTime, avgPurchasingTime };
  }, [requests]);

  const chartData = useMemo(() => {
    const statuses = Object.values(RequestStatus);
    return statuses.map(status => ({
      name: status,
      value: requests.filter(r => r.status === status).length
    }));
  }, [requests]);

  const StatCard = ({ label, value, icon: Icon, colorClass, subValue }: any) => (
    <div className="bg-white dark:bg-tecer-darkCard p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-tecer-primary/40 to-transparent opacity-80" />
      <div className="flex items-center justify-between mb-5">
        <span className="text-[11px] uppercase tracking-[0.18em] font-bold text-tecer-grayMed">{label}</span>
        <div className={`p-3 rounded-2xl shadow-lg ${colorClass}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-extrabold text-tecer-grayDark dark:text-white">{value}</span>
        {subValue && <span className="text-xs font-medium text-tecer-grayMed uppercase tracking-[0.12em]">{subValue}</span>}
      </div>
    </div>
  );

  return (
    <div className="tecer-page space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-tecer-darkCard p-8 rounded-[28px] border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-tecer-primary/10 to-transparent pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.26em] text-tecer-grayMed font-bold">Visão executiva</p>
            <h2 className="mt-3 font-display text-4xl font-extrabold">Indicadores de operação e atendimento</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-tecer-grayMed">
              Painel consolidado para acompanhar volume, criticidade, prazo e performance de atendimento das solicitações.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:min-w-[280px]">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-tecer-grayMed">Total registrado</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-tecer-primary">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-tecer-grayMed">Concluídas</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-tecer-secondary">{requests.filter(r => r.status === RequestStatus.DISPONIVEL).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Indicadores Superior */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          label="Solicitações Abertas" 
          value={stats.open} 
          icon={ClipboardCheck} 
          colorClass="bg-tecer-primary" 
        />
        <StatCard 
          label="Atrasadas" 
          value={stats.overdue} 
          icon={AlertTriangle} 
          colorClass="bg-red-500" 
          subValue="Ação imediata"
        />
        <StatCard 
          label="Tempo Médio Atendimento" 
          value={`${stats.avgResponseTime} dias`} 
          icon={Clock} 
          colorClass="bg-tecer-secondary" 
        />
        <StatCard 
          label="Lead Time Suprimentos" 
          value={`${stats.avgPurchasingTime}h`} 
          icon={ShoppingCart} 
          colorClass="bg-tecer-primary" 
          subValue="SC -> Disponível"
        />
        <StatCard 
          label="Alta Urgência" 
          value={`${stats.urgencyPercent}%`} 
          icon={TrendingUp} 
          colorClass="bg-tecer-secondary" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfico de Status */}
        <div className="lg:col-span-2 bg-white dark:bg-tecer-darkCard p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8 text-tecer-grayDark dark:text-white">
            <h3 className="font-display font-extrabold flex items-center gap-2">
              <BarChart3 className="text-tecer-primary" size={20} />
              Distribuição por Status
            </h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="var(--chart-axis)" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="var(--chart-axis)" />
                <Tooltip 
                  cursor={{fill: 'rgba(15, 115, 204, 0.08)'}}
                  contentStyle={{ 
                    borderRadius: '16px',
                    border: '1px solid var(--tooltip-border)',
                    boxShadow: 'var(--shadow-card)',
                    backgroundColor: 'var(--tooltip-bg)',
                    backdropFilter: 'blur(14px)',
                    color: 'var(--color-text)'
                  }} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Painel de Prioridades */}
        <div className="bg-white dark:bg-tecer-darkCard p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="font-display font-extrabold mb-6 flex items-center gap-2 text-tecer-grayDark dark:text-white">
            <Activity className="text-tecer-primary" size={20} />
            Prioridades Pendentes
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-2">
            {requests
              .filter(r => r.status !== RequestStatus.DISPONIVEL && r.status !== RequestStatus.CANCELADA)
              .sort((a, b) => {
                const da = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                const db = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
                return da - db;
              })
              .slice(0, 5)
              .map(req => {
                const isOverdue = !!req.deadline && new Date(req.deadline) < new Date();
                return (
                  <div key={req.id} className="p-4 border-l-4 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex flex-col gap-1 transition-all hover:translate-x-1" 
                       style={{ borderColor: isOverdue ? 'var(--color-danger)' : (req.urgency === UrgencyLevel.ALTA ? 'var(--color-danger)' : 'var(--color-warning)') }}>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-tecer-primary dark:text-tecer-secondary">{req.id}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isOverdue ? 'Atrasado' : 'Próximo'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold line-clamp-1 text-tecer-grayDark dark:text-gray-200">{req.description}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-tecer-grayMed">Prazo: {req.deadline ? new Date(req.deadline).toLocaleDateString() : 'NÃO DEFINIDO'}</span>
                    </div>
                  </div>
                );
              })}
            {requests.length === 0 && (
              <div className="text-center py-10">
                <Package className="mx-auto text-gray-300 mb-2" size={32} />
                <p className="text-sm text-tecer-grayMed italic">Nenhuma pendência crítica.</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/requests')}
            className="mt-6 w-full py-2 text-sm font-semibold text-tecer-primary dark:text-tecer-secondary hover:underline transition-colors"
          >
            Ver todas solicitações
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

