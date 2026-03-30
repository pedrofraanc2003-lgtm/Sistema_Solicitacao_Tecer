import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getDatabaseHealthStatus, hasSupabaseConfig } from '../../services/supabase';

type CloudStatus = {
  online: boolean;
  syncing: boolean;
  message: string;
};

type RefreshHandler = () => Promise<void>;

type AppSyncContextValue = {
  cloudStatus: CloudStatus;
  isRefreshing: boolean;
  refreshAll: () => Promise<void>;
  registerRefresher: (key: string, handler: RefreshHandler) => () => void;
};

const AppSyncContext = createContext<AppSyncContextValue | null>(null);

export function AppSyncProvider({ children }: { children: React.ReactNode }) {
  const refreshersRef = useRef(new Map<string, RefreshHandler>());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({
    online: hasSupabaseConfig,
    syncing: false,
    message: hasSupabaseConfig ? 'Pronto para sincronização com Supabase.' : 'Modo local ativo.',
  });

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    setCloudStatus(prev => ({ ...prev, syncing: true }));

    const refreshResults = await Promise.allSettled(Array.from(refreshersRef.current.values(), refresh => refresh()));
    const failedRefreshes = refreshResults.filter(result => result.status === 'rejected');

    try {
      const health = await getDatabaseHealthStatus();
      const partialMessage = failedRefreshes.length ? ` | ${failedRefreshes.length} atualização(ões) parcial(is) falharam.` : '';

      setCloudStatus({
        online: health.ok,
        syncing: false,
        message: `${health.message}${partialMessage}`,
      });

      if (failedRefreshes.length) {
        return;
      }
    } catch (error) {
      setCloudStatus({
        online: false,
        syncing: false,
        message: error instanceof Error ? error.message : 'Falha ao atualizar dados.',
      });
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshAll().catch(() => undefined);
  }, [refreshAll]);

  const registerRefresher = useCallback((key: string, handler: RefreshHandler) => {
    refreshersRef.current.set(key, handler);
    return () => refreshersRef.current.delete(key);
  }, []);

  const value = useMemo<AppSyncContextValue>(
    () => ({
      cloudStatus,
      isRefreshing,
      refreshAll,
      registerRefresher,
    }),
    [cloudStatus, isRefreshing, refreshAll, registerRefresher]
  );

  return <AppSyncContext.Provider value={value}>{children}</AppSyncContext.Provider>;
}

export function useAppSync() {
  const context = useContext(AppSyncContext);
  if (!context) {
    throw new Error('useAppSync must be used within AppSyncProvider');
  }

  return context;
}
