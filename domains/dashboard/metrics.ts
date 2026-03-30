import { RequestStatus, UrgencyLevel } from '../../types';
import { RequestWithDerivedFields } from '../requests/selectors';

export type RequestKpis = {
  total: number;
  open: number;
  overdue: number;
  withoutDeadline: number;
  highUrgency: number;
  criticalRequests: RequestWithDerivedFields[];
  priorityRequests: RequestWithDerivedFields[];
  statusCounts: { name: RequestStatus; value: number }[];
  avgResponseTimeDays: string;
  avgPurchasingTimeHours: string;
};

export function getRequestKpis(requests: RequestWithDerivedFields[]): RequestKpis {
  const total = requests.length;
  const open = requests.filter(request => request.status !== RequestStatus.DISPONIVEL && request.status !== RequestStatus.CANCELADA).length;
  const now = Date.now();
  const overdue = requests.filter(request => request.displayDeadline && new Date(request.displayDeadline).getTime() < now && request.status !== RequestStatus.DISPONIVEL && request.status !== RequestStatus.CANCELADA).length;
  const withoutDeadline = requests.filter(request => !request.displayDeadline && request.status !== RequestStatus.DISPONIVEL && request.status !== RequestStatus.CANCELADA).length;
  const highUrgency = requests.filter(request => request.urgency === UrgencyLevel.ALTA).length;

  const completedRequests = requests.filter(request => request.status === RequestStatus.DISPONIVEL);
  const avgResponseTimeDays = completedRequests.length
    ? (
        completedRequests.reduce((sum, request) => {
          const completionEntry = request.history.find(entry => entry.newStatus === RequestStatus.DISPONIVEL);
          const end = completionEntry ? new Date(completionEntry.timestamp).getTime() : now;
          return sum + (end - new Date(request.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        }, 0) / completedRequests.length
      ).toFixed(1)
    : '0.0';

  const purchasingTimings = requests
    .map(request => {
      const scEntry = request.history.find(entry => entry.newStatus === RequestStatus.EMITIDO_SC);
      const availableEntry = request.history.find(entry => entry.newStatus === RequestStatus.DISPONIVEL);
      if (!scEntry || !availableEntry) return null;
      const diff = new Date(availableEntry.timestamp).getTime() - new Date(scEntry.timestamp).getTime();
      return diff > 0 ? diff / (1000 * 60 * 60) : null;
    })
    .filter((value): value is number => value !== null);

  const avgPurchasingTimeHours = purchasingTimings.length ? (purchasingTimings.reduce((sum, value) => sum + value, 0) / purchasingTimings.length).toFixed(1) : '0.0';

  return {
    total,
    open,
    overdue,
    withoutDeadline,
    highUrgency,
    criticalRequests: requests
      .filter(request => request.urgency === UrgencyLevel.ALTA || request.impact === 'Equipamento parado' || request.impact === 'Equipamento inoperante')
      .slice(0, 5),
    priorityRequests: requests
      .filter(request => request.status !== RequestStatus.DISPONIVEL && request.status !== RequestStatus.CANCELADA)
      .sort((left, right) => {
        const leftTime = left.displayDeadline ? new Date(left.displayDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        const rightTime = right.displayDeadline ? new Date(right.displayDeadline).getTime() : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      })
      .slice(0, 5),
    statusCounts: Object.values(RequestStatus).map(status => ({ name: status, value: requests.filter(request => request.status === status).length })),
    avgResponseTimeDays,
    avgPurchasingTimeHours,
  };
}
