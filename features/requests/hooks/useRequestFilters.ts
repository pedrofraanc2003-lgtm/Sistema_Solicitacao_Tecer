import { useMemo, useState } from 'react';
import { Equipment, MaintenanceRequest } from '../../../types';
import { buildEquipmentMap, defaultRequestFilters, enrichRequests, filterRequests } from '../../../domains/requests/selectors';
import { RequestViewMode } from '../types';

export function useRequestFilters(requests: MaintenanceRequest[], equipments: Equipment[], userId: string, isAdmin: boolean, viewMode: RequestViewMode) {
  const [filters, setFilters] = useState(defaultRequestFilters);
  const equipmentMap = useMemo(() => buildEquipmentMap(equipments), [equipments]);
  const enrichedRequests = useMemo(() => enrichRequests(requests, equipmentMap), [equipmentMap, requests]);

  const filteredRequests = useMemo(() => {
    return filterRequests(enrichedRequests, filters, userId, isAdmin, viewMode);
  }, [enrichedRequests, filters, isAdmin, userId, viewMode]);

  return {
    filters,
    setFilters,
    filteredRequests,
    equipmentMap,
    clearFilters: () => setFilters(defaultRequestFilters),
  };
}
