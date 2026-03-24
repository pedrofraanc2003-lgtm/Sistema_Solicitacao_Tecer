
import React from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Package, 
  Wrench, 
  ClipboardList,
  Database,
  ArrowRight,
  // Fix: Added missing icon imports
  Clock,
  ShieldAlert
} from 'lucide-react';
import { MaintenanceRequest, Equipment } from '../types';

interface ReportsProps {
  requests: MaintenanceRequest[];
  equipments: Equipment[];
}

const Reports: React.FC<ReportsProps> = ({ requests, equipments }) => {

  const downloadCSV = (filename: string, csvContent: string) => {
    // Adiciona o BOM (\ufeff) para que o Excel identifique UTF-8 corretamente
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportRequests = () => {
    const headers = [
      "ID_Solicitacao", "Tipo", "Classificacao", "Equipamento_TAG", 
      "Equipamento_Nome", "Descricao", "Urgencia", "Impacto", 
      "Status", "Data_Criacao", "Prazo_Entrega"
    ];

    const rows = requests.map(req => {
      const eq = equipments.find(e => e.id === req.equipmentId);
      return [
        req.id,
        req.type,
        req.classification || "N/A",
        eq?.tag || "N/A",
        eq?.name || "N/A",
        `"${req.description.replace(/"/g, '""')}"`,
        req.urgency,
        req.impact,
        req.status,
        new Date(req.createdAt).toLocaleString(),
        req.deadline ? new Date(req.deadline).toLocaleDateString() : "PRAZO NÃO DEFINIDO"
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    downloadCSV("Relatório_Solicitacoes_BI.csv", csvContent);
  };

  const exportInsumos = () => {
    const headers = ["ID_Solicitacao", "Descricao_Insumo", "Quantidade", "Unidade"];
    const rows: any[] = [];

    requests.forEach(req => {
      req.insumos.forEach(insumo => {
        rows.push([
          req.id,
          `"${insumo.description.replace(/"/g, '""')}"`,
          insumo.quantity,
          insumo.unit
        ]);
      });
    });

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    downloadCSV("Relatório_Insumos_BI.csv", csvContent);
  };

  const exportEquipments = () => {
    const headers = ["TAG", "Nome_Equipamento", "Tipo_Equipamento", "Status_Ativo"];
    const rows = equipments.map(eq => [
      eq.tag,
      `"${eq.name.replace(/"/g, '""')}"`,
      eq.type,
      eq.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    downloadCSV("Relatório_Equipamentos_BI.csv", csvContent);
  };

  const ReportCard = ({ title, description, icon: Icon, onExport, colorClass }: any) => (
    <div className="bg-white dark:bg-tecer-darkCard p-8 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center group hover:shadow-xl transition-all hover:-translate-y-1">
      <div className={`p-5 rounded-2xl ${colorClass} text-white mb-6 group-hover:scale-110 transition-transform`}>
        <Icon size={32} />
      </div>
      <h3 className="font-display text-xl font-extrabold text-tecer-grayDark dark:text-white mb-3 uppercase tracking-tight">{title}</h3>
      <p className="text-sm text-tecer-grayMed mb-8 leading-relaxed max-w-xs">{description}</p>
      <button 
        onClick={onExport}
        className="mt-auto w-full flex items-center justify-center gap-3 bg-tecer-primary hover:bg-[#1a2e5e] text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-tecer-primary/20"
      >
        <Download size={20} />
        Exportar para Excel (BI)
      </button>
    </div>
  );

  return (
    <div className="tecer-page space-y-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="tecer-view-header">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="tecer-view-headline">
            <div className="flex items-center gap-3 text-tecer-primary dark:text-tecer-secondary font-bold uppercase tracking-widest text-xs">
              <Database size={16} /> Exportação Estruturada
            </div>
            <h2 className="font-display text-4xl font-extrabold text-tecer-grayDark dark:text-white">Relatórios para BI</h2>
            <p className="text-tecer-grayMed text-sm">Dados formatados para importação direta no Microsoft Power BI Desktop ou Web.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-tecer-grayMed px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Clock size={14} />
            Última extração em tempo real
          </div>
        </div>
        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Solicitações</span>
            <span className="tecer-view-stat-value">{requests.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Equipamentos</span>
            <span className="tecer-view-stat-value">{equipments.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Exports</span>
            <span className="tecer-view-stat-value">3</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <ReportCard 
          title="Base de Solicitações"
          description="Contém todas as solicitações, tipos, urgências e status. Ideal para análise de MTTR e Lead Time."
          icon={ClipboardList}
          onExport={exportRequests}
          colorClass="bg-tecer-primary"
        />
        <ReportCard 
          title="Consumo de Insumos"
          description="Detalhamento item a item de todos os materiais vinculados. Utilize para análise de custos e estoque."
          icon={Package}
          onExport={exportInsumos}
          colorClass="bg-tecer-secondary"
        />
        <ReportCard 
          title="Base de Equipamentos"
          description="Lista técnica de ativos e TAGs operacionais para correlação de manutenções por equipamento."
          icon={Wrench}
          onExport={exportEquipments}
          colorClass="bg-blue-500"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[28px] border border-blue-100 dark:border-blue-900/30">
        <h4 className="font-bold text-tecer-primary dark:text-tecer-secondary flex items-center gap-3 mb-4 uppercase text-sm tracking-wider">
          {/* Fix: Added ShieldAlert component usage correctly */}
          <ShieldAlert size={20} /> Nota para Especialistas de BI
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-tecer-grayDark dark:text-gray-300 leading-relaxed">
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-tecer-primary text-white rounded-full flex items-center justify-center shrink-0 font-bold">1</div>
            <p>Os arquivos são exportados com o separador **ponto e vírgula (;)** e codificação **UTF-8 with BOM**. No Power BI, utilize o conector "Texto/CSV".</p>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 bg-tecer-primary text-white rounded-full flex items-center justify-center shrink-0 font-bold">2</div>
            <p>Para relacionar insumos às solicitações, utilize a coluna **ID_Solicitacao** como chave estrangeira entre as duas tabelas.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

