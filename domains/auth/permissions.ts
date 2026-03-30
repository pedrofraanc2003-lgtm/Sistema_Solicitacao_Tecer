import { RequestStatus, User, UserRole } from '../../types';

export type AppRouteKey =
  | 'dashboard'
  | 'requests'
  | 'equipments'
  | 'workshop'
  | 'reports'
  | 'oilAnalysis'
  | 'users'
  | 'audits';

export type RequestPermissions = {
  canViewAllRequests: boolean;
  canCreateRequest: boolean;
  canEditRequest: boolean;
  canTransitionRequest: boolean;
  canEditGeneralDeadline: boolean;
  canEditItemDeadline: boolean;
  canRemoveExistingInsumo: boolean;
  canManageAttachments: boolean;
};

const routePermissions: Record<AppRouteKey, UserRole[]> = {
  dashboard: [UserRole.ADMIN, UserRole.PCM, UserRole.LIDERANCA, UserRole.COMPRAS],
  requests: [UserRole.ADMIN, UserRole.PCM, UserRole.LIDERANCA, UserRole.COMPRAS],
  equipments: [UserRole.ADMIN, UserRole.PCM, UserRole.LIDERANCA, UserRole.COMPRAS],
  workshop: [UserRole.ADMIN, UserRole.PCM, UserRole.LIDERANCA, UserRole.COMPRAS],
  reports: [UserRole.ADMIN, UserRole.PCM],
  oilAnalysis: [UserRole.ADMIN, UserRole.PCM],
  users: [UserRole.ADMIN],
  audits: [UserRole.ADMIN],
};

export function canAccessRoute(user: User | null, route: AppRouteKey) {
  if (!user) return false;
  return routePermissions[route].includes(user.role);
}

export function getRequestPermissions(userOrRole: User | UserRole): RequestPermissions {
  const role = typeof userOrRole === 'string' ? userOrRole : userOrRole.role;
  const isAdmin = role === UserRole.ADMIN;
  const isPcm = role === UserRole.PCM;
  const isLeadership = role === UserRole.LIDERANCA;

  return {
    canViewAllRequests: isAdmin,
    canCreateRequest: true,
    canEditRequest: isAdmin || isPcm || isLeadership || role === UserRole.COMPRAS,
    canTransitionRequest: isAdmin || isPcm || role === UserRole.COMPRAS,
    canEditGeneralDeadline: isAdmin || isPcm,
    canEditItemDeadline: isAdmin || isPcm,
    canRemoveExistingInsumo: !isLeadership,
    canManageAttachments: true,
  };
}

export function canEditRequest(user: User, status: RequestStatus) {
  const permissions = getRequestPermissions(user);
  if (!permissions.canEditRequest) return false;
  return status !== RequestStatus.CANCELADA && status !== RequestStatus.DISPONIVEL;
}
