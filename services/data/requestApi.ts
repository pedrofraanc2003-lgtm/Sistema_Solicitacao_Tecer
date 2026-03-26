import {
  Comment,
  HistoryEntry,
  Insumo,
  MaintenanceRequest,
  RequestStatus,
  RequestType,
  User,
} from '../../types';
import { canEditDeadline, canTransitionRequest } from '../../domains/requests/workflow';
import { MOCK_REQUESTS } from '../mockData';
import { createRequestAttachmentSignedUrl, uploadRequestAttachment } from '../supabase';
import { supabase } from '../supabaseClient';
import { safeUuid, sortByNewest } from './utils';

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
  const { data, error } = await supabase.from('requests').select('*');
  if (error) throw new Error(error.message);
  return sortByNewest((data || []) as MaintenanceRequest[]);
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
  return Promise.all(files.map(file => uploadRequestAttachment(requestId, file)));
}

export async function createRequest(actor: User, input: RequestCreateInput) {
  if ((input.type === RequestType.PECA || input.type === RequestType.SERVICO) && !input.classification) {
    throw new Error(`O campo "Classificação" é obrigatório para solicitações de ${input.type}.`);
  }
  if (!input.insumos.length) {
    throw new Error('É obrigatório adicionar ao menos um insumo.');
  }

  const id = await nextRequestId();
  const attachments = await uploadAttachments(id, input.attachments);
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
    attachments,
    comments: [],
    history,
  };

  if (!supabase) return request;
  const { error } = await supabase.from('requests').insert(request);
  if (error) throw new Error(error.message);
  return request;
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
  const { error } = await supabase.from('requests').upsert(nextRequest, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return nextRequest;
}

export async function openRequestAttachment(path?: string, url?: string) {
  if (path) return createRequestAttachmentSignedUrl(path);
  if (url) return url;
  throw new Error('Anexo sem caminho válido para abertura.');
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
