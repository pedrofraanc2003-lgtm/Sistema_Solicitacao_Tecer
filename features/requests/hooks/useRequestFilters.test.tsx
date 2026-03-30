import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MOCK_EQUIPMENTS, MOCK_REQUESTS } from '../../../services/mockData';
import { getRequestDisplayDeadline } from '../../../domains/requests/selectors';
import { useRequestFilters } from './useRequestFilters';

describe('useRequestFilters', () => {
  it('filtra visão mine pelo requesterId', () => {
    const { result } = renderHook(() => useRequestFilters(MOCK_REQUESTS, MOCK_EQUIPMENTS, '3', false, 'mine'));
    expect(result.current.filteredRequests).toHaveLength(1);
  });

  it('retorna prazo do item mais próximo quando disponível', () => {
    expect(getRequestDisplayDeadline(MOCK_REQUESTS[0])).toBeTruthy();
  });

  it('expõe mapa de equipamentos e ordena por prazo derivado', () => {
    const { result } = renderHook(() => useRequestFilters(MOCK_REQUESTS, MOCK_EQUIPMENTS, '3', true, 'all'));
    expect(result.current.equipmentMap.eq1?.tag).toBe('EMP-001');
    expect(result.current.filteredRequests[0]?.displayDeadline).toBeTruthy();
  });
});
