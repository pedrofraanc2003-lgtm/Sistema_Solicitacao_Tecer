import { DemandClassification, MaintenanceRequest, OperationalImpact, RequestStatus } from '../../types';

export type RequestViewMode = 'new' | 'mine' | 'inProgress' | 'all';

export type RequestFiltersState = {
  search: string;
  status: RequestStatus | 'All';
  classification: DemandClassification | 'All';
  impact: OperationalImpact | 'All';
  startDate: string;
  endDate: string;
  sortField: keyof MaintenanceRequest;
  sortOrder: 'asc' | 'desc';
};

export type RequestMetrics = {
  total: number;
  overdue: number;
  withoutDeadline: number;
  highUrgency: number;
  criticalImpact: number;
  byStatus: Record<RequestStatus, number>;
};
