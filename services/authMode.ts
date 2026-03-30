import { User, UserStatus } from '../types';
import { hasSupabaseConfig } from './supabaseClient';

const LOCAL_AUTH_PASSWORD = import.meta.env.VITE_LOCAL_AUTH_PASSWORD?.trim();

export type AuthMode = 'supabase' | 'local';

export function getAuthMode(): AuthMode {
  return hasSupabaseConfig ? 'supabase' : 'local';
}

export function getAuthModeLabel(mode: AuthMode) {
  return mode === 'supabase' ? 'Supabase' : 'Local';
}

export function authenticateLocalUser(users: User[], identifier: string, password: string) {
  if (!LOCAL_AUTH_PASSWORD) {
    throw new Error('Modo local ativo sem VITE_LOCAL_AUTH_PASSWORD configurado.');
  }

  const normalized = identifier.trim().toLowerCase();
  const user = users.find(
    current =>
      current.status === UserStatus.ATIVO &&
      (current.username.toLowerCase() === normalized || (current.email || '').toLowerCase() === normalized)
  );

  if (!user || password !== LOCAL_AUTH_PASSWORD) {
    throw new Error('Credenciais inválidas ou usuário inativo.');
  }

  return user;
}
