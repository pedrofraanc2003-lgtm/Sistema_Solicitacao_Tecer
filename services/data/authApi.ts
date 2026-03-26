import { MOCK_USERS } from '../mockData';
import { clearLocalSupabaseSession, getCurrentAuthenticatedUser, hasSupabaseConfig, onSupabaseAuthStateChange, sendPasswordResetEmail, signInWithIdentifier, signOutFromSupabase } from '../supabase';
import { User, UserStatus } from '../../types';

const AUTH_BOOTSTRAP_TIMEOUT_MS = 6000;

const withTimeout = async <T>(promise: Promise<T>, timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS) =>
  await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('Timeout ao validar a sessão atual.')), timeoutMs);
    }),
  ]);

export async function getSessionUser() {
  if (!hasSupabaseConfig) return null;
  try {
    return await withTimeout(getCurrentAuthenticatedUser());
  } catch {
    await clearLocalSupabaseSession();
    return null;
  }
}

export async function signIn(identifier: string, password: string) {
  if (hasSupabaseConfig) {
    await clearLocalSupabaseSession();
    return signInWithIdentifier(identifier, password);
  }

  const normalized = identifier.trim().toLowerCase();
  const user = MOCK_USERS.find(
    current =>
      current.status === UserStatus.ATIVO &&
      (current.username.toLowerCase() === normalized || (current.email || '').toLowerCase() === normalized) &&
      current.password === password
  );

  if (!user) {
    throw new Error('Credenciais inválidas ou usuário inativo.');
  }

  const { password: _password, ...profile } = user;
  return profile as User;
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
      await clearLocalSupabaseSession();
      callback(null);
    }
  });

  return subscription;
}

export { sendPasswordResetEmail };
