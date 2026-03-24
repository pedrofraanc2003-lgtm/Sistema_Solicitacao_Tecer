import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { UserStatus, type User, type WorkshopKanbanItem } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const REQUEST_ATTACHMENTS_BUCKET = 'anexos';

export type DatabaseHealthStatus = {
  ok: boolean;
  source: 'supabase' | 'local';
  message: string;
  details: string[];
};

export const supabase: SupabaseClient | null = hasSupabaseConfig
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
};

const getNetworkMessage = (tableName: string, error: unknown) => {
  const reason = getErrorMessage(error);
  return `Falha de conexão ao acessar "${tableName}": ${reason}. Verifique URL, chave, CORS ou status do projeto Supabase.`;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const getDatabaseHealthStatus = async (
  tables = ['requests', 'equipments', 'users', 'audit_logs', 'workshop_kanban_items']
): Promise<DatabaseHealthStatus> => {
  if (!supabase) {
    return {
      ok: false,
      source: 'local',
      message: 'Supabase não configurado',
      details: [
        'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar a sincronização em nuvem.',
      ],
    };
  }

  const details: string[] = [];

  for (const tableName of tables) {
    try {
      const { error, count } = await supabase
        .from(tableName)
        .select('*', { head: true, count: 'exact' });

      if (error) {
        details.push(`${tableName}: ${error.message}`);
      } else {
        details.push(`${tableName}: acesso OK${typeof count === 'number' ? ` (${count} registros)` : ''}`);
      }
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

export const syncTable = async (tableName: string, data: any[]): Promise<boolean> => {
  if (!data || data.length === 0) return true;
  if (!supabase) {
    console.warn(`Sincronização ignorada para "${tableName}": Supabase não configurado.`);
    return false;
  }

  try {
    const cleanData = JSON.parse(JSON.stringify(data));
    const { error } = await supabase.from(tableName).upsert(cleanData, { onConflict: 'id' });

    if (error) {
      console.warn(`Erro de API no Supabase (${tableName}): ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(getNetworkMessage(tableName, error));
    return false;
  }
};

export const fetchTable = async (tableName: string) => {
  if (!supabase) {
    console.warn(`Leitura ignorada para "${tableName}": Supabase não configurado.`);
    return null;
  }

  try {
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      console.warn(`Falha ao buscar dados de "${tableName}": ${error.message}`);
      return null;
    }

    return data;
  } catch (error) {
    console.warn(getNetworkMessage(tableName, error));
    return null;
  }
};

export const fetchWorkshopKanbanItems = async (): Promise<WorkshopKanbanItem[] | null> => {
  const data = await fetchTable('workshop_kanban_items');
  if (!data) return null;
  return (data as any[]).map(item => ({
    id: String(item.id),
    equipmentId: String(item.equipment_id),
    tag: String(item.tag),
    equipmentName: String(item.equipment_name),
    maintenanceType: item.maintenance_type,
    description: String(item.description),
    status: item.status,
    createdAt: String(item.created_at),
    updatedAt: String(item.updated_at),
  })) as WorkshopKanbanItem[];
};

export const syncWorkshopKanbanItems = async (items: WorkshopKanbanItem[]): Promise<boolean> => {
  if (!supabase) {
    console.warn('Sincronização ignorada para "workshop_kanban_items": Supabase não configurado.');
    return false;
  }

  try {
    const cleanItems = JSON.parse(JSON.stringify(items)) as WorkshopKanbanItem[];
    const databaseRows = cleanItems.map(item => ({
      id: item.id,
      equipment_id: item.equipmentId,
      tag: item.tag,
      equipment_name: item.equipmentName,
      maintenance_type: item.maintenanceType,
      description: item.description,
      status: item.status,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    }));
    const currentIds = cleanItems.map(item => item.id);

    const { data: remoteItems, error: fetchError } = await supabase
      .from('workshop_kanban_items')
      .select('id');

    if (fetchError) {
      console.warn(`Falha ao listar registros de "workshop_kanban_items": ${fetchError.message}`);
      return false;
    }

    const remoteIds = (remoteItems ?? []).map(item => String(item.id));
    const idsToDelete = remoteIds.filter(id => !currentIds.includes(id));

    if (idsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('workshop_kanban_items')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.warn(`Falha ao remover registros de "workshop_kanban_items": ${deleteError.message}`);
        return false;
      }
    }

    if (databaseRows.length === 0) {
      return true;
    }

    const { error: upsertError } = await supabase
      .from('workshop_kanban_items')
      .upsert(databaseRows, { onConflict: 'id' });

    if (upsertError) {
      console.warn(`Erro de API no Supabase (workshop_kanban_items): ${upsertError.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(getNetworkMessage('workshop_kanban_items', error));
    return false;
  }
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

export const uploadRequestAttachment = async (
  requestId: string,
  file: File
): Promise<UploadedRequestAttachment> => {
  if (!supabase) {
    throw new Error('Supabase não configurado para upload de arquivos.');
  }

  const safeName = sanitizeFileName(file.name || 'arquivo');
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const filePath = `requests/${requestId}/${uniqueSuffix}-${safeName}`;

  const { error } = await supabase.storage
    .from(REQUEST_ATTACHMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) {
    throw new Error(`Falha no upload do arquivo "${file.name}": ${error.message}`);
  }

  return {
    id: Math.random().toString(36).slice(2, 11),
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

  const { data, error } = await supabase.storage
    .from(REQUEST_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);

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

    if (error) {
      throw new Error(`Falha ao localizar usuário: ${error.message}`);
    }

    if (!data?.email) {
      throw new Error('Usuário não encontrado.');
    }

    email = normalizeEmail(String(data.email));
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Falha de autenticação.');
  }

  return getCurrentAuthenticatedUser(authData.session);
};

export const signOutFromSupabase = async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
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

  if (error) {
    throw new Error(`Falha ao carregar perfil do usuário: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Perfil não encontrado na tabela users para ${authUser.email}.`);
  }

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

  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};

export const sendPasswordResetEmail = async (email: string) => {
  if (!supabase) {
    throw new Error('Supabase não configurado para recuperação de senha.');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email));

  if (error) {
    throw new Error(error.message);
  }
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

export const manageSupabaseUser = async (
  action: 'create' | 'update',
  payload: ManagedUserPayload
): Promise<User> => {
  if (!supabase) {
    throw new Error('Supabase não configurado para administração de usuários.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    throw new Error('Sessão autenticada não encontrada para administrar usuários.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-manage-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY!,
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

  if (!data?.user) {
    throw new Error('Resposta inválida da função administrativa.');
  }

  return {
    id: String(data.user.id),
    name: String(data.user.name),
    email: String(data.user.email),
    username: String(data.user.username),
    role: data.user.role,
    status: data.user.status,
  };
};
