import React from 'react';
import { Navigate } from 'react-router-dom';
import RequestsPage from '../features/requests/RequestsPage';
import { useAuth, useEquipmentsData, useRequestsData } from '../app/hooks';
import { UserRole } from '../types';
import { RequestViewMode } from '../features/requests/types';

type RequestsRouteProps = {
  viewMode?: RequestViewMode;
};

export default function Requests({ viewMode = 'new' }: RequestsRouteProps) {
  const { user } = useAuth();
  const { requests, createRequestAction, updateRequestAction } = useRequestsData();
  const { equipments } = useEquipmentsData();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (viewMode === 'all' && user.role !== UserRole.ADMIN) {
    return <Navigate to="/requests/new" replace />;
  }

  return <RequestsPage user={user} requests={requests} equipments={equipments} onCreateRequest={createRequestAction} onUpdateRequest={updateRequestAction} viewMode={viewMode} />;
}
