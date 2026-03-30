import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole, UserStatus, type User } from '../../types';

vi.mock('../supabase', () => ({
  hasSupabaseConfig: true,
  clearLocalSupabaseSession: vi.fn(),
  getCurrentAuthenticatedUser: vi.fn(),
  onSupabaseAuthStateChange: vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  })),
  sendPasswordResetEmail: vi.fn(),
  signInWithIdentifier: vi.fn(),
  signOutFromSupabase: vi.fn(),
}));

import { getSessionUser, signIn } from './authApi';
import { clearLocalSupabaseSession, getCurrentAuthenticatedUser, signInWithIdentifier } from '../supabase';

const mockedUser: User = {
  id: '1',
  name: 'Teste',
  email: 'teste@example.com',
  username: 'teste',
  role: UserRole.ADMIN,
  status: UserStatus.ATIVO,
};

describe('authApi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('continua o login mesmo se a limpeza da sessao local travar', async () => {
    vi.mocked(clearLocalSupabaseSession).mockImplementation(() => new Promise<void>(() => undefined));
    vi.mocked(signInWithIdentifier).mockResolvedValue(mockedUser);

    const signInPromise = signIn('teste', 'senha');

    await vi.advanceTimersByTimeAsync(SESSION_CLEANUP_TIMEOUT_MS_FOR_TESTS);

    await expect(signInPromise).resolves.toEqual(mockedUser);
    expect(signInWithIdentifier).toHaveBeenCalledWith('teste', 'senha');
  });

  it('retorna null quando a sessao atual falha e a limpeza local trava', async () => {
    vi.mocked(getCurrentAuthenticatedUser).mockRejectedValue(new Error('Sessao invalida'));
    vi.mocked(clearLocalSupabaseSession).mockImplementation(() => new Promise<void>(() => undefined));

    const sessionPromise = getSessionUser();

    await vi.advanceTimersByTimeAsync(SESSION_CLEANUP_TIMEOUT_MS_FOR_TESTS);

    await expect(sessionPromise).resolves.toBeNull();
  });
});

const SESSION_CLEANUP_TIMEOUT_MS_FOR_TESTS = 2000;
