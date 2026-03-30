import { Equipment, MaintenanceRequest, RequestStatus, UrgencyLevel } from '../../types';
import { RequestFiltersState, RequestMetrics, RequestViewMode } from '../../features/requests/types';

export type EquipmentMap = Record<string, Equipment>;

export type RequestWithDerivedFields = MaintenanceRequest & {
  displayDeadline?: string;
  equipmentTag: string;
  equipmentName: string;
};

const IN_PROGRESS_STATUSES: RequestStatus[] = [
  RequestStatus.CADASTRO,
  RequestStatus.EMITIDO_SC,
  RequestStatus.AGUARDANDO_ENTREGA,
];

export const defaultRequestFilters: RequestFiltersState = {
  search: '',
  status: 'All',
  classification: 'All',
  impact: 'All',
  startDate: '',
  endDate: '',
  sortField: 'createdAt',
  sortOrder: 'desc',
};

export function buildEquipmentMap(equipments: Equipment[]): EquipmentMap {
  return equipments.reduce<EquipmentMap>((acc, equipment) => {
    acc[equipment.id] = equipment;
    return acc;
  }, {});
}

export function getRequestDisplayDeadline(request: MaintenanceRequest) {
  let closestDeadline: number | null = null;

  for (const item of request.insumos) {
    if (!item.deadline) continue;
    const timestamp = new Date(item.deadline).getTime();
    if (Number.isNaN(timestamp)) continue;
    if (closestDeadline === null || timestamp < closestDeadline) {
      closestDeadline = timestamp;
    }
  }

  if (closestDeadline !== null) {
    return new Date(closestDeadline).toISOString();
  }

  return request.deadline;
}

export function enrichRequests(requests: MaintenanceRequest[], equipmentMap: EquipmentMap): RequestWithDerivedFields[] {
  return requests.map(request => {
    const equipment = request.equipmentId ? equipmentMap[request.equipmentId] : undefined;

    return {
      ...request,
      displayDeadline: getRequestDisplayDeadline(request),
      equipmentTag: equipment?.tag || '',
      equipmentName: equipment?.name || '',
    };
  });
}

export function filterRequests(
  requests: RequestWithDerivedFields[],
  filters: RequestFiltersState,
  userId: string,
  isAdmin: boolean,
  viewMode: RequestViewMode
) {
  let result = [...requests];

  if (viewMode === 'new') result = result.filter(request => request.status === RequestStatus.NOVA);
  if (viewMode === 'mine') result = result.filter(request => request.requesterId === userId);
  if (viewMode === 'inProgress') result = result.filter(request => IN_PROGRESS_STATUSES.includes(request.status));
  if (viewMode === 'all' && !isAdmin) return [];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    result = result.filter(request =>
      request.id.toLowerCase().includes(search) ||
      request.description.toLowerCase().includes(search) ||
      request.equipmentTag.toLowerCase().includes(search) ||
      request.equipmentName.toLowerCase().includes(search)
    );
  }

  if (filters.status !== 'All') result = result.filter(request => request.status === filters.status);
  if (filters.classification !== 'All') result = result.filter(request => request.classification === filters.classification);
  if (filters.impact !== 'All') result = result.filter(request => request.impact === filters.impact);

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    result = result.filter(request => new Date(request.createdAt).getTime() >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    result = result.filter(request => new Date(request.createdAt).getTime() <= end.getTime());
  }

  return result.sort((left, right) => {
    const factor = filters.sortOrder === 'asc' ? 1 : -1;
    if (filters.sortField === 'deadline') {
      const leftTime = left.displayDeadline ? new Date(left.displayDeadline).getTime() : Number.MAX_SAFE_INTEGER;
      const rightTime = right.displayDeadline ? new Date(right.displayDeadline).getTime() : Number.MAX_SAFE_INTEGER;
      return (leftTime - rightTime) * factor;
    }

    if (filters.sortField === 'createdAt') {
      return (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) * factor;
    }

    return String(left[filters.sortField] || '').toLowerCase().localeCompare(String(right[filters.sortField] || '').toLowerCase()) * factor;
  });
}

export function buildRequestMetrics(requests: RequestWithDerivedFields[]): RequestMetrics {
  const byStatus = Object.values(RequestStatus).reduce<Record<RequestStatus, number>>((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<RequestStatus, number>);

  let overdue = 0;
  let withoutDeadline = 0;
  let highUrgency = 0;
  let criticalImpact = 0;
  const now = Date.now();

  for (const request of requests) {
    byStatus[request.status] += 1;

    if (request.displayDeadline && new Date(request.displayDeadline).getTime() < now && request.status !== RequestStatus.DISPONIVEL && request.status !== RequestStatus.CANCELADA) {
      overdue += 1;
    }

    if (!request.displayDeadline) {
      withoutDeadline += 1;
    }

    if (request.urgency === UrgencyLevel.ALTA) {
      highUrgency += 1;
    }

    if (request.impact === 'Equipamento parado' || request.impact === 'Equipamento inoperante') {
      criticalImpact += 1;
    }
  }

  return {
    total: requests.length,
    overdue,
    withoutDeadline,
    highUrgency,
    criticalImpact,
    byStatus,
  };
}

