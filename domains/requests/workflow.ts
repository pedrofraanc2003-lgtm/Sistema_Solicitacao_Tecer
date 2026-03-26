import { RequestStatus, UserRole } from '../../types';

const transitions: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.NOVA]: [RequestStatus.CADASTRO, RequestStatus.CANCELADA],
  [RequestStatus.CADASTRO]: [RequestStatus.EMITIDO_SC, RequestStatus.CANCELADA],
  [RequestStatus.EMITIDO_SC]: [RequestStatus.AGUARDANDO_ENTREGA, RequestStatus.CANCELADA],
  [RequestStatus.AGUARDANDO_ENTREGA]: [RequestStatus.DISPONIVEL, RequestStatus.CANCELADA],
  [RequestStatus.DISPONIVEL]: [],
  [RequestStatus.CANCELADA]: [],
};

const rolePermissions: Record<UserRole, RequestStatus[]> = {
  [UserRole.ADMIN]: Object.values(RequestStatus),
  [UserRole.PCM]: [
    RequestStatus.CADASTRO,
    RequestStatus.EMITIDO_SC,
    RequestStatus.AGUARDANDO_ENTREGA,
    RequestStatus.DISPONIVEL,
    RequestStatus.CANCELADA,
  ],
  [UserRole.LIDERANCA]: [RequestStatus.NOVA],
  [UserRole.COMPRAS]: [RequestStatus.EMITIDO_SC, RequestStatus.AGUARDANDO_ENTREGA],
};

export const canEditDeadline = (role: UserRole) => role === UserRole.ADMIN || role === UserRole.PCM;

export function canTransitionRequest(
  role: UserRole,
  currentStatus: RequestStatus,
  nextStatus: RequestStatus
) {
  return transitions[currentStatus].includes(nextStatus) && rolePermissions[role].includes(nextStatus);
}

export function getAvailableStatusTransitions(role: UserRole, currentStatus: RequestStatus) {
  return transitions[currentStatus].filter(status => rolePermissions[role].includes(status));
}
