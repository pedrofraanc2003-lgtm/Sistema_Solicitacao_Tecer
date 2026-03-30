import type { RequestAttachment } from '../types';
import { validateRequestAttachmentFile } from './requestAttachments';
import { REQUEST_ATTACHMENTS_BUCKET, SUPABASE_FUNCTIONS_BASE_URL, hasSupabaseConfig, supabase } from './supabaseClient';

export type UploadedRequestAttachment = RequestAttachment;

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
};

const getAccessToken = async () => {
  if (!supabase) {
    throw new Error('Supabase não configurado para autenticação.');
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session?.access_token) {
    throw new Error('Sessão autenticada não encontrada para gerenciar anexos.');
  }

  return session.access_token;
};

const getFunctionUrl = () => {
  if (!hasSupabaseConfig || !SUPABASE_FUNCTIONS_BASE_URL) {
    throw new Error('Supabase não configurado para o backend de anexos.');
  }

  return `${SUPABASE_FUNCTIONS_BASE_URL}/request-attachments`;
};

const normalizeAttachment = (payload: Record<string, unknown>): UploadedRequestAttachment => ({
  id: String(payload.id || ''),
  url: String(payload.url || ''),
  type: payload.type === 'photo' ? 'photo' : 'doc',
  name: String(payload.name || ''),
  path: typeof payload.path === 'string' ? payload.path : undefined,
  contentType: typeof payload.contentType === 'string' ? payload.contentType : undefined,
  sizeBytes: typeof payload.sizeBytes === 'number' ? payload.sizeBytes : undefined,
  createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : undefined,
  publicId: typeof payload.publicId === 'string' ? payload.publicId : undefined,
  resourceType: payload.resourceType === 'raw' ? 'raw' : payload.resourceType === 'image' ? 'image' : undefined,
  assetType: payload.assetType === 'authenticated' ? 'authenticated' : undefined,
  version: typeof payload.version === 'string' ? payload.version : undefined,
  format: typeof payload.format === 'string' ? payload.format : undefined,
  migratedAt: typeof payload.migratedAt === 'string' ? payload.migratedAt : undefined,
});

export const uploadRequestAttachment = async (requestId: string, file: File): Promise<UploadedRequestAttachment> => {
  validateRequestAttachmentFile(file);

  const formData = new FormData();
  formData.append('action', 'upload');
  formData.append('requestId', requestId);
  formData.append('file', file, file.name);

  const response = await fetch(getFunctionUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: formData,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.attachment) {
    throw new Error(
      data?.error
        ? typeof data.error === 'string'
          ? data.error
          : JSON.stringify(data.error)
        : `Falha ao enviar anexo (HTTP ${response.status}).`
    );
  }

  return normalizeAttachment(data.attachment);
};

export const createRequestAttachmentSignedUrl = async (attachment: RequestAttachment) => {
  if (attachment.publicId) {
    const response = await fetch(getFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'sign',
        attachmentId: attachment.id,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.signedUrl) {
      throw new Error(
        data?.error
          ? typeof data.error === 'string'
            ? data.error
            : JSON.stringify(data.error)
          : `Falha ao assinar anexo (HTTP ${response.status}).`
      );
    }

    return String(data.signedUrl);
  }

  if (!supabase || !attachment.path) {
    throw new Error('Anexo sem origem válida para abertura.');
  }

  const { data, error } = await supabase.storage.from(REQUEST_ATTACHMENTS_BUCKET).createSignedUrl(attachment.path, 60);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Não foi possível gerar link temporário para o anexo.');
  }

  return data.signedUrl;
};

export const downloadRequestAttachment = async (attachment: RequestAttachment) => {
  if (attachment.publicId) {
    const response = await fetch(getFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'download',
        attachmentId: attachment.id,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.error
          ? typeof data.error === 'string'
            ? data.error
            : JSON.stringify(data.error)
          : `Falha ao baixar anexo (HTTP ${response.status}).`
      );
    }

    return response.blob();
  }

  const signedUrl = await createRequestAttachmentSignedUrl(attachment);
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Falha ao abrir anexo legado: HTTP ${response.status}.`);
  }
  return response.blob();
};

export const openRequestAttachment = async (attachment: RequestAttachment) => {
  const blob = await downloadRequestAttachment(attachment);
  return URL.createObjectURL(blob);
};

export const deleteRequestAttachmentAsset = async (attachmentId: string) => {
  try {
    const response = await fetch(getFunctionUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'delete',
        attachmentId,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(
        data?.error
          ? typeof data.error === 'string'
            ? data.error
            : JSON.stringify(data.error)
          : `Falha ao excluir anexo (HTTP ${response.status}).`
      );
    }
  } catch (error) {
    console.warn('Falha ao limpar anexo remoto:', getErrorMessage(error));
  }
};
