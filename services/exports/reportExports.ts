import { Equipment, MaintenanceRequest } from '../../types';
import { RequestWithDerivedFields } from '../../domains/requests/selectors';

export type ExportDataset<Row> = {
  filename: string;
  headers: string[];
  rows: Row[];
};

const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const timestampSuffix = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

const toCsv = (headers: string[], rows: Array<Array<string | number>>) =>
  [headers, ...rows].map(row => row.join(';')).join('\n');

export function buildRequestsExport(requests: RequestWithDerivedFields[]): ExportDataset<Array<string | number>> {
  return {
    filename: `Relatorio_Solicitacoes_${timestampSuffix()}.csv`,
    headers: ['ID_Solicitacao', 'Tipo', 'Classificacao', 'Equipamento_TAG', 'Equipamento_Nome', 'Descricao', 'Urgencia', 'Impacto', 'Status', 'Data_Criacao', 'Prazo_Entrega'],
    rows: requests.map(request => [
      request.id,
      request.type,
      request.classification || 'N/A',
      request.equipmentTag || 'N/A',
      request.equipmentName || 'N/A',
      escapeCsv(request.description),
      request.urgency,
      request.impact,
      request.status,
      new Date(request.createdAt).toLocaleString('pt-BR'),
      request.displayDeadline ? new Date(request.displayDeadline).toLocaleDateString('pt-BR') : 'PRAZO NÃO DEFINIDO',
    ]),
  };
}

export function buildInsumosExport(requests: MaintenanceRequest[]): ExportDataset<Array<string | number>> {
  return {
    filename: `Relatorio_Insumos_${timestampSuffix()}.csv`,
    headers: ['ID_Solicitacao', 'Descricao_Insumo', 'Quantidade', 'Unidade', 'Prazo_Item'],
    rows: requests.flatMap(request =>
      request.insumos.map(insumo => [
        request.id,
        escapeCsv(insumo.description),
        insumo.quantity,
        insumo.unit,
        insumo.deadline ? new Date(insumo.deadline).toLocaleDateString('pt-BR') : 'N/A',
      ])
    ),
  };
}

export function buildEquipmentsExport(equipments: Equipment[]): ExportDataset<Array<string | number>> {
  return {
    filename: `Relatorio_Equipamentos_${timestampSuffix()}.csv`,
    headers: ['TAG', 'Nome_Equipamento', 'Tipo_Equipamento', 'Status_Ativo'],
    rows: equipments.map(equipment => [equipment.tag, escapeCsv(equipment.name), equipment.type, equipment.status]),
  };
}

export function downloadDataset(dataset: ExportDataset<Array<string | number>>) {
  const blob = new Blob(['\ufeff' + toCsv(dataset.headers, dataset.rows)], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', dataset.filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
