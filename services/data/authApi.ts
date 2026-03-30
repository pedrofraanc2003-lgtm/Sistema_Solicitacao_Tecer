import { User } from '../../types';
import { authenticateLocalUser } from '../authMode';
import { MOCK_USERS } from '../mockData';
import { clearLocalSupabaseSession, getCurrentAuthenticatedUser, hasSupabaseConfig, onSupabaseAuthStateChange, sendPasswordResetEmail, signInWithIdentifier, signOutFromSupabase } from '../supabase';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 6000;
const SESSION_CLEANUP_TIMEOUT_MS = 2000;
const SIGN_IN_TIMEOUT_MS = 12000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS, timeoutMessage = 'Timeout ao validar a sessao atual.') =>
  await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);

async function clearLocalSessionSafely() {
  if (!hasSupabaseConfig) return;

  try {
    await Promise.race<void>([
      clearLocalSupabaseSession(),
      new Promise<void>(resolve => {
        window.setTimeout(resolve, SESSION_CLEANUP_TIMEOUT_MS);
      }),
    ]);
  } catch {
    // A limpeza de cache precisa ser best-effort para nao bloquear login/bootstrap.
  }
}

export async function getSessionUser() {
  if (!hasSupabaseConfig) return null;

  try {
    return await withTimeout(getCurrentAuthenticatedUser());
  } catch {
    await clearLocalSessionSafely();
    return null;
  }
}

export async function signIn(identifier: string, password: string) {
  if (hasSupabaseConfig) {
    await clearLocalSessionSafely();
    return withTimeout(
      signInWithIdentifier(identifier, password),
      SIGN_IN_TIMEOUT_MS,
      'Timeout ao concluir o login. Tente novamente.',
    );
  }

  return authenticateLocalUser(MOCK_USERS, identifier, password) as User;
}

export async function signOut() {
  if (hasSupabaseConfig) {
    await signOutFromSupabase();
  }
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  if (!hasSupabaseConfig) {
    return { unsubscribe: () => undefined };
  }

  const {
    data: { subscription },
  } = onSupabaseAuthStateChange(async session => {
    if (!session) {
      callback(null);
      return;
    }

    try {
      callback(await withTimeout(getCurrentAuthenticatedUser(session)));
    } catch {
      await clearLocalSessionSafely();
      callback(null);
    }
  });

  return subscription;
}

export { sendPasswordResetEmail };
