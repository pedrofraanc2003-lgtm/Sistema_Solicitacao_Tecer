import {
  Comment,
  HistoryEntry,
  Insumo,
  MaintenanceRequest,
  RequestAttachment,
  RequestStatus,
  RequestType,
  User,
} from '../../types';
import { canEditDeadline, canTransitionRequest } from '../../domains/requests/workflow';
import { MOCK_REQUESTS } from '../mockData';
import { deleteRequestAttachmentAsset, openRequestAttachment as openAttachment, uploadRequestAttachment } from '../attachments';
import { supabase } from '../supabaseClient';
import { safeUuid, sortByNewest } from './utils';

type RequestAttachmentRow = {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: 'photo' | 'doc';
  content_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: 'image' | 'raw' | null;
  cloudinary_asset_type?: 'authenticated' | null;
  cloudinary_version?: string | null;
  cloudinary_bytes?: number | null;
  cloudinary_format?: string | null;
  original_filename?: string | null;
  migrated_at?: string | null;
};

type RequestRow = Omit<MaintenanceRequest, 'attachments'> & {
  attachments?: MaintenanceRequest['attachments'];
  request_attachments?: RequestAttachmentRow[] | null;
};

const mapAttachmentRow = (row: RequestAttachmentRow): RequestAttachment => ({
  id: String(row.id),
  name: String(row.original_filename || row.file_name),
  path: row.storage_path ? String(row.storage_path) : undefined,
  url: '',
  type: row.file_type,
  contentType: row.content_type || undefined,
  sizeBytes:
    typeof row.cloudinary_bytes === 'number'
      ? row.cloudinary_bytes
      : typeof row.size_bytes === 'number'
        ? row.size_bytes
        : undefined,
  createdAt: row.created_at || undefined,
  publicId: row.cloudinary_public_id || undefined,
  resourceType: row.cloudinary_resource_type || undefined,
  assetType: row.cloudinary_asset_type || undefined,
  version: row.cloudinary_version || undefined,
  format: row.cloudinary_format || undefined,
  migratedAt: row.migrated_at || undefined,
});

const mapRequestRow = (row: RequestRow): MaintenanceRequest => ({
  ...row,
  attachments: row.request_attachments?.map(mapAttachmentRow) ?? row.attachments ?? [],
});

const hasMissingAttachmentColumnError = (error: { message?: string } | null) => {
  const message = error?.message?.toLowerCase() || '';
  return (
    message.includes('size_bytes') ||
    message.includes('created_at') ||
    message.includes('cloudinary_public_id') ||
    message.includes('cloudinary_resource_type') ||
    message.includes('cloudinary_asset_type') ||
    message.includes('cloudinary_version') ||
    message.includes('cloudinary_bytes') ||
    message.includes('cloudinary_format') ||
    message.includes('original_filename') ||
    message.includes('migrated_at')
  );
};

export type RequestCreateInput = Pick<
  MaintenanceRequest,
  'type' | 'classification' | 'equipmentId' | 'description' | 'urgency' | 'impact'
> & {
  insumos: Insumo[];
  attachments?: File[];
};

export type RequestUpdateInput = Partial<
  Pick<MaintenanceRequest, 'classification' | 'equipmentId' | 'description' | 'urgency' | 'impact' | 'status' | 'deadline'>
> & {
  insumos?: Insumo[];
  attachments?: File[];
};

export async function listRequests() {
  if (!supabase) return sortByNewest(MOCK_REQUESTS);
  let { data, error } = await supabase
    .from('requests')
    .select(
      '*, request_attachments(id, file_name, storage_path, file_type, content_type, size_bytes, created_at, cloudinary_public_id, cloudinary_resource_type, cloudinary_asset_type, cloudinary_version, cloudinary_bytes, cloudinary_format, original_filename, migrated_at)'
    );
  if (error && hasMissingAttachmentColumnError(error)) {
    ({ data, error } = await supabase
      .from('requests')
      .select('*, request_attachments(id, file_name, storage_path, file_type, content_type, created_at)'));
  }
  if (error) throw new Error(error.message);
  return sortByNewest(((data || []) as RequestRow[]).map(mapRequestRow));
}

async function nextRequestId() {
  if (!supabase) {
    return `SOL-MNT-${Date.now().toString().slice(-6)}`;
  }

  const { data, error } = await supabase.rpc('generate_request_code');
  if (error || !data) {
    throw new Error(error?.message || 'Não foi possível gerar o identificador da solicitação.');
  }

  return String(data);
}

async function uploadAttachments(requestId: string, files: File[] = []) {
  if (!files.length) return [];
  const uploaded: RequestAttachment[] = [];

  try {
    for (const file of files) {
      uploaded.push(await uploadRequestAttachment(requestId, file));
    }
  } catch (error) {
    await Promise.all(uploaded.map(attachment => deleteRequestAttachmentAsset(attachment.id)));
    throw error;
  }

  return uploaded;
}

export async function createRequest(actor: User, input: RequestCreateInput) {
  if ((input.type === RequestType.PECA || input.type === RequestType.SERVICO) && !input.classification) {
    throw new Error(`O campo "Classificação" é obrigatório para solicitações de ${input.type}.`);
  }
  if (!input.insumos.length) {
    throw new Error('É obrigatório adicionar ao menos um insumo.');
  }

  const id = await nextRequestId();
  const history: HistoryEntry[] = [
    {
      id: safeUuid(),
      newStatus: RequestStatus.NOVA,
      userId: actor.id,
      userName: actor.name,
      timestamp: new Date().toISOString(),
    },
  ];

  const request: MaintenanceRequest = {
    id,
    type: input.type,
    classification: input.classification,
    equipmentId: input.equipmentId,
    description: input.description,
    urgency: input.urgency,
    impact: input.impact,
    status: RequestStatus.NOVA,
    requesterId: actor.id,
    createdAt: new Date().toISOString(),
    insumos: input.insumos.map(item => ({ ...item, id: item.id || safeUuid() })),
    attachments: [],
    comments: [],
    history,
  };

  if (!supabase) {
    const attachments = await uploadAttachments(id, input.attachments);
    return {
      ...request,
      attachments,
    };
  }

  const { error } = await supabase.from('requests').insert({
    ...request,
    attachments: [],
  });
  if (error) throw new Error(error.message);

  try {
    const attachments = await uploadAttachments(id, input.attachments);
    return {
      ...request,
      attachments,
    };
  } catch (error) {
    await supabase.from('requests').delete().eq('id', id);
    throw error;
  }
}

export async function updateRequest(actor: User, current: MaintenanceRequest, input: RequestUpdateInput) {
  const nextStatus = input.status ?? current.status;
  if (nextStatus !== current.status && !canTransitionRequest(actor.role, current.status, nextStatus)) {
    throw new Error(`O perfil ${actor.role} não pode mover a solicitação de ${current.status} para ${nextStatus}.`);
  }

  const attachments = await uploadAttachments(current.id, input.attachments);
  const sanitizedInsumos = (input.insumos ?? current.insumos).map(item => {
    const existing = current.insumos.find(entry => entry.id === item.id);
    if (!canEditDeadline(actor.role)) {
      return { ...item, deadline: existing?.deadline };
    }
    return { ...item, id: item.id || safeUuid() };
  });

  const history =
    nextStatus !== current.status
      ? [
          ...current.history,
          {
            id: safeUuid(),
            oldStatus: current.status,
            newStatus: nextStatus,
            userId: actor.id,
            userName: actor.name,
            timestamp: new Date().toISOString(),
          },
        ]
      : current.history;

  const nextRequest: MaintenanceRequest = {
    ...current,
    ...input,
    deadline: canEditDeadline(actor.role) ? input.deadline ?? current.deadline : current.deadline,
    status: nextStatus,
    insumos: sanitizedInsumos,
    attachments: [...current.attachments, ...attachments],
    history,
  };

  if (!supabase) return nextRequest;
  const { error } = await supabase.from('requests').upsert(
    {
      ...nextRequest,
      attachments: [],
    },
    { onConflict: 'id' }
  );
  if (error) throw new Error(error.message);
  return nextRequest;
}

export async function openRequestAttachment(attachment: RequestAttachment) {
  if (attachment.url && !attachment.publicId && !attachment.path) return attachment.url;
  return openAttachment(attachment);
}

export function appendComment(current: MaintenanceRequest, actor: User, text: string) {
  const comment: Comment = {
    id: safeUuid(),
    userId: actor.id,
    userName: actor.name,
    text,
    timestamp: new Date().toISOString(),
  };

  return {
    ...current,
    comments: [...current.comments, comment],
  };
}
