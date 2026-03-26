import type { Session } from '@supabase/supabase-js';
import { UserStatus, type User } from '../types';
import { REQUEST_ATTACHMENTS_BUCKET, SUPABASE_FUNCTIONS_BASE_URL, hasSupabaseConfig, supabase } from './supabaseClient';

export { hasSupabaseConfig, supabase };

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export type DatabaseHealthStatus = {
  ok: boolean;
  source: 'supabase' | 'local';
  message: string;
  details: string[];
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
};

export const getDatabaseHealthStatus = async (
  tables = ['requests', 'equipments', 'users', 'audit_logs', 'workshop_kanban_items']
): Promise<DatabaseHealthStatus> => {
  if (!supabase) {
    return {
      ok: false,
      source: 'local',
      message: 'Supabase não configurado',
      details: ['Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar a persistência em nuvem.'],
    };
  }

  const details: string[] = [];
  for (const tableName of tables) {
    try {
      const { error, count } = await supabase.from(tableName).select('*', { head: true, count: 'exact' });
      if (error) details.push(`${tableName}: ${error.message}`);
      else details.push(`${tableName}: acesso OK${typeof count === 'number' ? ` (${count} registros)` : ''}`);
    } catch (error) {
      details.push(`${tableName}: ${getErrorMessage(error)}`);
    }
  }

  const hasFailures = details.some(detail => !detail.includes('acesso OK'));
  return {
    ok: !hasFailures,
    source: hasFailures ? 'local' : 'supabase',
    message: hasFailures ? 'Falhas detectadas na comunicação com o banco' : 'Conexão com o Supabase validada',
    details,
  };
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export type UploadedRequestAttachment = {
  id: string;
  path: string;
  url: string;
  type: 'photo' | 'doc';
  name: string;
};

export const uploadRequestAttachment = async (requestId: string, file: File): Promise<UploadedRequestAttachment> => {
  if (!supabase) {
    throw new Error('Supabase não configurado para upload de arquivos.');
  }

  const filePath = `requests/${requestId}/${crypto.randomUUID()}-${sanitizeFileName(file.name || 'arquivo')}`;
  const { error } = await supabase.storage.from(REQUEST_ATTACHMENTS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    throw new Error(`Falha no upload do arquivo "${file.name}": ${error.message}`);
  }

  return {
    id: crypto.randomUUID(),
    path: filePath,
    url: '',
    type: file.type.startsWith('image/') ? 'photo' : 'doc',
    name: file.name,
  };
};

export const createRequestAttachmentSignedUrl = async (path: string, expiresIn = 60) => {
  if (!supabase) {
    throw new Error('Supabase não configurado para acesso a anexos.');
  }

  const { data, error } = await supabase.storage.from(REQUEST_ATTACHMENTS_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Não foi possível gerar link temporário para o anexo.');
  }

  return data.signedUrl;
};

export const signInWithIdentifier = async (identifier: string, password: string): Promise<User> => {
  if (!supabase) {
    throw new Error('Supabase não configurado para autenticação.');
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier || !password) {
    throw new Error('Informe usuário/e-mail e senha.');
  }

  let email = normalizedIdentifier;
  if (!normalizedIdentifier.includes('@')) {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('username', normalizedIdentifier)
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`Falha ao localizar usuário: ${error.message}`);
    if (!data?.email) throw new Error('Usuário não encontrado.');
    email = normalizeEmail(String(data.email));
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message || 'Falha de autenticação.');
  }

  return getCurrentAuthenticatedUser(data.session);
};

export const signOutFromSupabase = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
};

export const clearLocalSupabaseSession = async () => {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: 'local' });
};

export const getCurrentAuthenticatedUser = async (session?: Session | null): Promise<User> => {
  if (!supabase) {
    throw new Error('Supabase não configurado para autenticação.');
  }

  const activeSession = session ?? (await supabase.auth.getSession()).data.session;
  const authUser = activeSession?.user;
  if (!authUser?.email) {
    throw new Error('Sessão autenticada não encontrada.');
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizeEmail(authUser.email))
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar perfil do usuário: ${error.message}`);
  if (!data) throw new Error(`Perfil não encontrado na tabela users para ${authUser.email}.`);
  if (data.status !== UserStatus.ATIVO) {
    await supabase.auth.signOut();
    throw new Error('Usuário inativo. Acesso bloqueado.');
  }

  return {
    id: String(data.id),
    name: String(data.name),
    email: String(data.email),
    username: String(data.username),
    role: data.role,
    status: data.status,
  };
};

export const onSupabaseAuthStateChange = (callback: (session: Session | null) => void) => {
  if (!supabase) {
    return {
      data: {
        subscription: {
          unsubscribe: () => undefined,
        },
      },
    };
  }

  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
};

export const sendPasswordResetEmail = async (email: string) => {
  if (!supabase) {
    throw new Error('Supabase não configurado para recuperação de senha.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));
  if (error) throw new Error(error.message);
};

type ManagedUserPayload = {
  id?: string;
  name: string;
  email: string;
  username: string;
  role: User['role'];
  status: User['status'];
  password?: string;
};

export const manageSupabaseUser = async (action: 'create' | 'update', payload: ManagedUserPayload): Promise<User> => {
  if (!supabase || !hasSupabaseConfig) {
    return {
      id: payload.id || crypto.randomUUID(),
      name: payload.name,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      status: payload.status,
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Sessão autenticada não encontrada para administrar usuários.');
  }

  const response = await fetch(`${SUPABASE_FUNCTIONS_BASE_URL}/admin-manage-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action,
      userId: payload.id,
      password: payload.password,
      profile: {
        name: payload.name,
        email: payload.email,
        username: payload.username,
        role: payload.role,
        status: payload.status,
      },
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      data?.error
        ? typeof data.error === 'string'
          ? data.error
          : JSON.stringify(data.error)
        : `Falha ao administrar usuário (HTTP ${response.status}).`
    );
  }

  if (!data?.user) throw new Error('Resposta inválida da função administrativa.');
  return {
    id: String(data.user.id),
    name: String(data.user.name),
    email: String(data.user.email),
    username: String(data.user.username),
    role: data.user.role,
    status: data.user.status,
  };
};
