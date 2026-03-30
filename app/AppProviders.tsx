import React from 'react';
import { ToastProvider } from '../ui/ToastProvider';
import { AppSyncProvider } from './providers/AppSyncProvider';
import { AuditLogsProvider } from './providers/AuditLogsProvider';
import { AuthProvider } from './providers/AuthProvider';
import { EquipmentsProvider } from './providers/EquipmentsProvider';
import { RequestsProvider } from './providers/RequestsProvider';
import { UiProvider } from './providers/UiProvider';
import { UsersProvider } from './providers/UsersProvider';
import { WorkshopProvider } from './providers/WorkshopProvider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <UiProvider>
          <AppSyncProvider>
            <AuditLogsProvider>
              <EquipmentsProvider>
                <UsersProvider>
                  <RequestsProvider>
                    <WorkshopProvider>{children}</WorkshopProvider>
                  </RequestsProvider>
                </UsersProvider>
              </EquipmentsProvider>
            </AuditLogsProvider>
          </AppSyncProvider>
        </UiProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
