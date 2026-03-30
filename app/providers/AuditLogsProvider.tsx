import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuditLog } from '../../types';
import { appendAuditLog, AuditInput, listAuditLogs } from '../../services/data/auditApi';
import { useAuth } from './AuthProvider';
import { useAppSync } from './AppSyncProvider';

type AuditLogsContextValue = {
  auditLogs: AuditLog[];
  appendAuditAction: (input: AuditInput) => Promise<void>;
  refreshAuditLogs: () => Promise<void>;
};

const AuditLogsContext = createContext<AuditLogsContextValue | null>(null);

export function AuditLogsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { registerRefresher } = useAppSync();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const refreshAuditLogs = useCallback(async () => {
    setAuditLogs(await listAuditLogs().catch(() => []));
  }, []);

  useEffect(() => registerRefresher('auditLogs', refreshAuditLogs), [refreshAuditLogs, registerRefresher]);

  const appendAuditAction = useCallback<AuditLogsContextValue['appendAuditAction']>(async input => {
    if (!user) return;
    const log = await appendAuditLog(user, input);
    setAuditLogs(prev => [log, ...prev]);
  }, [user]);

  const value = useMemo<AuditLogsContextValue>(
    () => ({
      auditLogs,
      refreshAuditLogs,
      appendAuditAction,
    }),
    [appendAuditAction, auditLogs, refreshAuditLogs]
  );

  return <AuditLogsContext.Provider value={value}>{children}</AuditLogsContext.Provider>;
}

export function useAuditLogsData() {
  const context = useContext(AuditLogsContext);
  if (!context) {
    throw new Error('useAuditLogsData must be used within AuditLogsProvider');
  }

  return context;
}
