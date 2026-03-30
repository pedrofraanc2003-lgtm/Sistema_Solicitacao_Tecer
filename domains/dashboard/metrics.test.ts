import { describe, expect, it } from 'vitest';
import { MOCK_EQUIPMENTS, MOCK_REQUESTS } from '../../services/mockData';
import { buildEquipmentMap, enrichRequests } from '../requests/selectors';
import { getRequestKpis } from './metrics';

describe('getRequestKpis', () => {
  it('calcula indicadores operacionais principais', () => {
    const kpis = getRequestKpis(enrichRequests(MOCK_REQUESTS, buildEquipmentMap(MOCK_EQUIPMENTS)));
    expect(kpis.total).toBe(1);
    expect(kpis.open).toBe(1);
    expect(kpis.highUrgency).toBe(1);
    expect(kpis.statusCounts.some(item => item.value > 0)).toBe(true);
  });
});
