import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, UserStatus, type User } from '../../types';
import { AuthProvider, useAuth } from './AuthProvider';

const getSessionUserMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();
const subscribeToAuthChangesMock = vi.fn();
let authChangeCallback: ((user: User | null) => void | Promise<void>) | null = null;

vi.mock('../../services/authMode', () => ({
  getAuthMode: vi.fn(() => 'supabase'),
  getAuthModeLabel: vi.fn(() => 'Supabase'),
}));

vi.mock('../../services/data/authApi', () => ({
  getSessionUser: (...args: unknown[]) => getSessionUserMock(...args),
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  subscribeToAuthChanges: (...args: unknown[]) => subscribeToAuthChangesMock(...args),
}));

const mockUser: User = {
  id: '1',
  name: 'Usuario Teste',
  email: 'teste@empresa.com',
  username: 'teste',
  role: UserRole.ADMIN,
  status: UserStatus.ATIVO,
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
    getSessionUserMock.mockResolvedValue(mockUser);
    subscribeToAuthChangesMock.mockImplementation((callback: (user: User | null) => void) => {
      authChangeCallback = callback;
      return { unsubscribe: vi.fn() };
    });
  });

  it('revalida a sessao antes de derrubar o usuario apos um evento nulo transitório', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthLoading).toBe(false);
    });

    getSessionUserMock.mockResolvedValueOnce(mockUser);

    await act(async () => {
      await authChangeCallback?.(null);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthLoading).toBe(false);
  });

  it('remove o usuario quando a revalidacao confirma ausencia de sessao', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    getSessionUserMock.mockResolvedValueOnce(null);

    await act(async () => {
      await authChangeCallback?.(null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthLoading).toBe(false);
  });
});
