import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MaintenanceRequest } from '../../types';
import { createRequest, listRequests, RequestCreateInput, RequestUpdateInput, updateRequest } from '../../services/data/requestApi';
import { useAppSync } from './AppSyncProvider';
import { useToast } from '../../ui/ToastProvider';
import { useAuth } from './AuthProvider';
import { useAuditLogsData } from './AuditLogsProvider';
import { useUi } from './UiProvider';

type RequestsContextValue = {
  requests: MaintenanceRequest[];
  refreshRequests: () => Promise<void>;
  createRequestAction: (input: RequestCreateInput) => Promise<void>;
  updateRequestAction: (current: MaintenanceRequest, input: RequestUpdateInput) => Promise<void>;
};

const RequestsContext = createContext<RequestsContextValue | null>(null);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const { pushNotification } = useUi();
  const { appendAuditAction } = useAuditLogsData();
  const { registerRefresher } = useAppSync();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const refreshRequests = useCallback(async () => {
    setRequests(await listRequests());
  }, []);

  useEffect(() => registerRefresher('requests', refreshRequests), [refreshRequests, registerRefresher]);

  const createRequestAction = useCallback<RequestsContextValue['createRequestAction']>(async input => {
    if (!user) throw new Error('Usuário não autenticado.');

    const request = await createRequest(user, input);
    setRequests(prev => [request, ...prev]);
    await appendAuditAction({
      actionType: 'Criação',
      entity: 'Solicitação',
      entityId: request.id,
      summary: `Criou nova solicitação (${request.type})`,
    });
    pushToast(`Solicitação ${request.id} criada com sucesso.`, 'success');
  }, [appendAuditAction, pushToast, user]);

  const updateRequestAction = useCallback<RequestsContextValue['updateRequestAction']>(async (current, input) => {
    if (!user) throw new Error('Usuário não autenticado.');

    const updated = await updateRequest(user, current, input);
    setRequests(prev => prev.map(request => (request.id === current.id ? updated : request)));

    const statusChanged = updated.status !== current.status;
    await appendAuditAction({
      actionType: statusChanged ? 'Status' : 'Edição',
      entity: 'Solicitação',
      entityId: current.id,
      summary: statusChanged ? `Alterou status para ${updated.status}` : 'Atualizou detalhes da solicitação',
    });

    if (user.role === 'Liderança') {
      pushNotification(`Liderança ${user.name} atualizou a ${current.id}.`, current.id);
    }

    pushToast(`Solicitação ${current.id} atualizada.`, 'success');
  }, [appendAuditAction, pushNotification, pushToast, user]);

  const value = useMemo<RequestsContextValue>(
    () => ({
      requests,
      refreshRequests,
      createRequestAction,
      updateRequestAction,
    }),
    [createRequestAction, refreshRequests, requests, updateRequestAction]
  );

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}

export function useRequestsData() {
  const context = useContext(RequestsContext);
  if (!context) {
    throw new Error('useRequestsData must be used within RequestsProvider');
  }

  return context;
}
