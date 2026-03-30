import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AppSyncProvider, useAppSync } from './AppSyncProvider';

vi.mock('../../services/supabase', () => ({
  hasSupabaseConfig: true,
  getDatabaseHealthStatus: vi.fn(async () => ({
    ok: true,
    source: 'supabase',
    message: 'Conexão com o Supabase validada',
    details: ['requests: acesso OK'],
  })),
}));

describe('AppSyncProvider', () => {
  it('mantém status online mesmo com falha parcial de refresh', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <AppSyncProvider>{children}</AppSyncProvider>;
    const { result } = renderHook(() => useAppSync(), { wrapper });

    act(() => {
      result.current.registerRefresher('ok', async () => undefined);
      result.current.registerRefresher('broken', async () => {
        throw new Error('boom');
      });
    });

    await act(async () => {
      await result.current.refreshAll();
    });

    expect(result.current.cloudStatus.online).toBe(true);
    expect(result.current.cloudStatus.message).toContain('parcial');
  });
});
