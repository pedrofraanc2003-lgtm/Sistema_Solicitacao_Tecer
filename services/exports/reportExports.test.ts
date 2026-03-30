import { describe, expect, it } from 'vitest';
import { MOCK_EQUIPMENTS, MOCK_REQUESTS } from '../mockData';
import { buildEquipmentMap, enrichRequests } from '../../domains/requests/selectors';
import { buildEquipmentsExport, buildInsumosExport, buildRequestsExport } from './reportExports';

describe('report exports', () => {
  it('gera dataset de solicitações com dados derivados do equipamento', () => {
    const dataset = buildRequestsExport(enrichRequests(MOCK_REQUESTS, buildEquipmentMap(MOCK_EQUIPMENTS)));
    expect(dataset.headers).toContain('ID_Solicitacao');
    expect(dataset.rows.length).toBe(MOCK_REQUESTS.length);
    expect(dataset.filename).toMatch(/^Relatorio_Solicitacoes_/);
    expect(dataset.rows[0]?.[3]).toBe('EMP-001');
  });

  it('gera dataset de insumos e equipamentos', () => {
    expect(buildInsumosExport(MOCK_REQUESTS).rows.length).toBeGreaterThan(0);
    expect(buildEquipmentsExport(MOCK_EQUIPMENTS).rows.length).toBe(MOCK_EQUIPMENTS.length);
  });
});
