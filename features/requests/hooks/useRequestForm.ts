import { useMemo, useState } from 'react';
import { DemandClassification, Insumo, MaintenanceRequest, OperationalImpact, RequestStatus, RequestType, UrgencyLevel, User } from '../../../types';
import { RequestCreateInput, RequestUpdateInput } from '../../../services/data/requestApi';
import { safeUuid } from '../../../services/data/utils';
import { lookupCatalogCode } from '../services/catalogLookup';
import { getRequestPermissions } from '../../../domains/auth/permissions';

type ModalMode = 'create' | 'edit' | 'view';

type RequestFormValues = {
  type: RequestType;
  classification?: DemandClassification;
  equipmentId?: string;
  description: string;
  urgency: UrgencyLevel;
  impact: OperationalImpact;
  status: RequestStatus;
  deadline?: string;
  insumos: Insumo[];
  attachments: MaintenanceRequest['attachments'];
};

type InsumoDraft = {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  deadline: string;
  catalogStatus: 'Cadastrado' | 'Novo/Cadastro';
};

const emptyDraft: InsumoDraft = {
  code: '',
  description: '',
  quantity: 1,
  unit: 'UN',
  deadline: '',
  catalogStatus: 'Novo/Cadastro',
};

const initialFormValues: RequestFormValues = {
  type: RequestType.PECA,
  classification: undefined,
  equipmentId: undefined,
  description: '',
  urgency: UrgencyLevel.MEDIA,
  impact: OperationalImpact.SEM_IMPACTO,
  status: RequestStatus.NOVA,
  deadline: undefined,
  insumos: [],
  attachments: [],
};

const mapRequestToFormValues = (request: MaintenanceRequest): RequestFormValues => ({
  type: request.type,
  classification: request.classification,
  equipmentId: request.equipmentId,
  description: request.description,
  urgency: request.urgency,
  impact: request.impact,
  status: request.status,
  deadline: request.deadline ? request.deadline.split('T')[0] : undefined,
  insumos: request.insumos,
  attachments: request.attachments,
});

export function useRequestForm(user: User, onCreateRequest: (input: RequestCreateInput) => Promise<void>, onUpdateRequest: (current: MaintenanceRequest, input: RequestUpdateInput) => Promise<void>) {
  const permissions = useMemo(() => getRequestPermissions(user), [user]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<RequestFormValues>(initialFormValues);
  const [insumoDraft, setInsumoDraft] = useState<InsumoDraft>(emptyDraft);
  const [isCodeLookupLoading, setIsCodeLookupLoading] = useState(false);
  const [codeLookupMessage, setCodeLookupMessage] = useState('');

  const resetForm = () => {
    setSelectedRequest(null);
    setModalMode('create');
    setFilesToUpload([]);
    setFormValues(initialFormValues);
    setInsumoDraft(emptyDraft);
    setCodeLookupMessage('');
    setOpeningAttachmentId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode('create');
    setIsModalOpen(true);
  };

  const openViewModal = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setFormValues(mapRequestToFormValues(request));
    setFilesToUpload([]);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const openEditModal = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setFormValues(mapRequestToFormValues(request));
    setFilesToUpload([]);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const addInsumo = () => {
    if (!insumoDraft.description || insumoDraft.quantity <= 0 || modalMode === 'view') return;

    const nextInsumo: Insumo = {
      id: safeUuid(),
      code: insumoDraft.code || undefined,
      description: insumoDraft.description,
      quantity: insumoDraft.quantity,
      unit: insumoDraft.unit,
      catalogStatus: insumoDraft.catalogStatus,
      deadline: permissions.canEditItemDeadline && insumoDraft.deadline ? new Date(insumoDraft.deadline).toISOString() : undefined,
    };

    setFormValues(current => ({ ...current, insumos: [...current.insumos, nextInsumo] }));
    setInsumoDraft(emptyDraft);
  };

  const removeInsumo = (insumoId: string) => {
    if (modalMode === 'view') return;
    if (!permissions.canRemoveExistingInsumo && selectedRequest?.insumos.some(item => item.id === insumoId)) {
      throw new Error('Liderança não possui permissão para remover insumos já cadastrados.');
    }
    setFormValues(current => ({ ...current, insumos: current.insumos.filter(item => item.id !== insumoId) }));
  };

  const changeInsumoDeadline = (insumoId: string, deadline: string) => {
    setFormValues(current => ({
      ...current,
      insumos: current.insumos.map(item => (item.id === insumoId ? { ...item, deadline: deadline ? new Date(deadline).toISOString() : undefined } : item)),
    }));
  };

  const lookupCode = async (value: string) => {
    const code = value.trim();
    if (!code) {
      setInsumoDraft(current => ({ ...current, code: '', catalogStatus: 'Novo/Cadastro' }));
      setCodeLookupMessage('');
      return;
    }

    setIsCodeLookupLoading(true);
    setCodeLookupMessage('');
    try {
      const description = await lookupCatalogCode(code);
      if (description) {
        setInsumoDraft(current => ({ ...current, code, description, catalogStatus: 'Cadastrado' }));
        setCodeLookupMessage('Código encontrado. Descrição preenchida automaticamente.');
      } else {
        setInsumoDraft(current => ({ ...current, code, catalogStatus: 'Novo/Cadastro' }));
        setCodeLookupMessage('Código não encontrado no cadastro. Descrição manual liberada.');
      }
    } catch (error) {
      setInsumoDraft(current => ({ ...current, code, catalogStatus: 'Novo/Cadastro' }));
      setCodeLookupMessage(error instanceof Error ? error.message : 'Falha ao consultar o catálogo.');
    } finally {
      setIsCodeLookupLoading(false);
    }
  };

  const save = async () => {
    const needsClassification = formValues.type === RequestType.PECA || formValues.type === RequestType.SERVICO;
    if (needsClassification && !formValues.classification) {
      throw new Error(`O campo "Classificação" é obrigatório para solicitações de ${formValues.type}.`);
    }

    if (modalMode === 'create') {
      if (!formValues.insumos.length) {
        throw new Error('É obrigatório adicionar ao menos um insumo para criar a solicitação.');
      }
      await onCreateRequest({
        type: formValues.type,
        classification: formValues.classification,
        equipmentId: formValues.equipmentId,
        description: formValues.description,
        urgency: formValues.urgency,
        impact: formValues.impact,
        insumos: formValues.insumos,
        attachments: filesToUpload,
      });
    }

    if (modalMode === 'edit' && selectedRequest) {
      await onUpdateRequest(selectedRequest, {
        classification: formValues.classification,
        equipmentId: formValues.equipmentId,
        description: formValues.description,
        urgency: formValues.urgency,
        impact: formValues.impact,
        status: formValues.status,
        deadline: formValues.deadline ? new Date(formValues.deadline).toISOString() : undefined,
        insumos: formValues.insumos,
        attachments: filesToUpload,
      });
    }

    setIsModalOpen(false);
    resetForm();
  };

  return {
    permissions,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    selectedRequest,
    filesToUpload,
    setFilesToUpload,
    openingAttachmentId,
    setOpeningAttachmentId,
    formValues,
    setFormValues,
    insumoDraft,
    setInsumoDraft,
    isCodeLookupLoading,
    codeLookupMessage,
    openCreateModal,
    openViewModal,
    openEditModal,
    resetForm,
    addInsumo,
    removeInsumo,
    changeInsumoDeadline,
    lookupCode,
    save,
  };
}
