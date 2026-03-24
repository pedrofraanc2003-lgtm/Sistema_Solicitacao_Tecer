
import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Paperclip,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Package,
  History,
  FileText,
  Image as ImageIcon,
  Upload,
  Download,
  ShieldAlert,
  RotateCcw,
  Calendar
} from 'lucide-react';
import { 
  MaintenanceRequest, 
  User, 
  UserRole, 
  RequestStatus, 
  UrgencyLevel, 
  RequestType, 
  Equipment, 
  DemandClassification, 
  OperationalImpact,
  HistoryEntry,
  Comment as CommentType,
  Insumo,
  UserStatus,
  AuditLog
} from '../types';
import { supabase, uploadRequestAttachment, createRequestAttachmentSignedUrl } from '../services/supabase';

interface RequestsProps {
  user: User;
  requests: MaintenanceRequest[];
  setRequests: React.Dispatch<React.SetStateAction<MaintenanceRequest[]>>;
  equipments: Equipment[];
  setIsEditing: (editing: boolean) => void;
  addAuditLog: (logData: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
  addNotification: (message: string, requestId: string) => void;
  viewMode?: 'new' | 'mine' | 'inProgress' | 'all';
}

const IN_PROGRESS_STATUSES: RequestStatus[] = [
  RequestStatus.CADASTRO,
  RequestStatus.EMITIDO_SC,
  RequestStatus.AGUARDANDO_ENTREGA
];

const Requests: React.FC<RequestsProps> = ({ user, requests, setRequests, equipments, setIsEditing, addAuditLog, addNotification, viewMode = 'new' }) => {
  const canManageDeadlinesByRole = user.role === UserRole.ADMIN || user.role === UserRole.PCM;
  const [isCodeLookupLoading, setIsCodeLookupLoading] = useState(false);
  const [codeLookupMessage, setCodeLookupMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  
  // States para Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');
  const [classificationFilter, setClassificationFilter] = useState<DemandClassification | 'All'>('All');
  const [impactFilter, setImpactFilter] = useState<OperationalImpact | 'All'>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [sortField, setSortField] = useState<keyof MaintenanceRequest>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Partial<MaintenanceRequest>>({
    type: RequestType.PECA,
    classification: undefined,
    urgency: UrgencyLevel.MEDIA,
    impact: OperationalImpact.SEM_IMPACTO,
    status: RequestStatus.NOVA,
    description: '',
    insumos: [],
    attachments: [],
  });

  const [insumoForm, setInsumoForm] = useState({
    code: '',
    description: '',
    quantity: 1,
    unit: 'UN',
    deadline: '',
    catalogStatus: 'Novo/Cadastro' as 'Cadastrado' | 'Novo/Cadastro'
  });

  // Helper para identificar o prazo mais próximo para exibição na tabela
  const getDisplayDeadline = (req: MaintenanceRequest): string | undefined => {
    const itemDeadlines = req.insumos
      .filter(i => i.deadline)
      .map(i => new Date(i.deadline!).getTime());

    if (itemDeadlines.length > 0) {
      return new Date(Math.min(...itemDeadlines)).toISOString();
    }
    return req.deadline;
  };

  const handleSort = (field: keyof MaintenanceRequest) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setClassificationFilter('All');
    setImpactFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Filtro base por visão selecionada no menu de solicitações
    if (viewMode === 'new') {
      result = result.filter(r => r.status === RequestStatus.NOVA);
    }

    if (viewMode === 'mine') {
      result = result.filter(r => r.requesterId === user.id);
    }

    if (viewMode === 'inProgress') {
      result = result.filter(r => IN_PROGRESS_STATUSES.includes(r.status));
    }

    // Defesa adicional: apenas Admin pode consumir a visão "Todas"
    if (viewMode === 'all' && user.role !== UserRole.ADMIN) {
      return [];
    }

    // Busca Textual
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(r => 
        r.id.toLowerCase().includes(s) || 
        r.description.toLowerCase().includes(s) ||
        equipments.find(e => e.id === r.equipmentId)?.tag.toLowerCase().includes(s)
      );
    }

    // Filtro por Status
    if (statusFilter !== 'All') {
      result = result.filter(r => r.status === statusFilter);
    }

    // Filtro por Classificação
    if (classificationFilter !== 'All') {
      result = result.filter(r => r.classification === classificationFilter);
    }

    // Filtro por Impacto
    if (impactFilter !== 'All') {
      result = result.filter(r => r.impact === impactFilter);
    }

    // Filtro por Período
    if (startDate) {
      const start = new Date(startDate).getTime();
      result = result.filter(r => new Date(r.createdAt).getTime() >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(r => new Date(r.createdAt).getTime() <= end.getTime());
    }

    // Ordenação
    result.sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      
      if (sortField === 'deadline') {
        const deadlineA = getDisplayDeadline(a);
        const deadlineB = getDisplayDeadline(b);
        const timeA = deadlineA ? new Date(deadlineA).getTime() : Number.MAX_SAFE_INTEGER;
        const timeB = deadlineB ? new Date(deadlineB).getTime() : Number.MAX_SAFE_INTEGER;
        return (timeA - timeB) * factor;
      }

      if (sortField === 'createdAt') {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return (timeA - timeB) * factor;
      }

      let valA = a[sortField];
      let valB = b[sortField];
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();

      if (strA < strB) return -1 * factor;
      if (strA > strB) return 1 * factor;
      return 0;
    });

    return result;
  }, [requests, search, statusFilter, classificationFilter, impactFilter, startDate, endDate, sortField, sortOrder, equipments, viewMode, user.id, user.role]);

  const viewConfig = useMemo(() => {
    if (viewMode === 'mine') {
      return {
        title: 'Minhas Solicitações',
        subtitle: 'Exibe apenas solicitações criadas pelo usuário logado'
      };
    }

    if (viewMode === 'inProgress') {
      return {
        title: 'Solicitações Em Andamento',
        subtitle: 'Exibe solicitações em processamento (Cadastro, Emitido SC, Aguardando entrega)'
      };
    }

    if (viewMode === 'all') {
      return {
        title: 'Todas as Solicitações',
        subtitle: 'Visão administrativa completa de solicitações registradas'
      };
    }

    return {
      title: 'Novas Solicitações',
      subtitle: 'Exibe solicitações recém-criadas no sistema (status Nova)'
    };
  }, [viewMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = (formData.attachments?.length || 0) + filesToUpload.length + newFiles.length;
      
      if (totalFiles > 10) {
        alert("Limite total de 10 arquivos atingido.");
        return;
      }
      
      setFilesToUpload(prev => [...prev, ...newFiles]);
    }
  };

  const removeFileToUpload = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenAttachment = async (attachment: MaintenanceRequest['attachments'][number]) => {
    if (openingAttachmentId) return;

    try {
      setOpeningAttachmentId(attachment.id);
      const targetUrl = attachment.path
        ? await createRequestAttachmentSignedUrl(attachment.path)
        : attachment.url;

      if (!targetUrl) {
        throw new Error('Anexo sem caminho válido para abertura.');
      }

      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível abrir o anexo.';
      alert(message);
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'view') return;

    const needsClassification = formData.type === RequestType.PECA || formData.type === RequestType.SERVICO;
    if (needsClassification && !formData.classification) {
      alert(`O campo 'Classificação' é obrigatório para solicitações de ${formData.type}.`);
      return;
    }

    if (modalMode === 'create') {
      if (!formData.insumos || formData.insumos.length === 0) {
        alert("É obrigatório adicionar ao menos 1 (um) insumo para criar a solicitação.");
        return;
      }

      const newId = `SOL-MNT-${(requests.length + 1).toString().padStart(6, '0')}`;

      let uploadedAttachments = [];
      try {
        uploadedAttachments = await Promise.all(
          filesToUpload.map(file => uploadRequestAttachment(newId, file))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao enviar anexos para o Supabase.';
        alert(message);
        return;
      }

      const newRequest: MaintenanceRequest = {
        ...(formData as MaintenanceRequest),
        id: newId,
        requesterId: user.id,
        createdAt: new Date().toISOString(),
        deadline: undefined,
        comments: [],
        history: [{
          id: Math.random().toString(),
          newStatus: RequestStatus.NOVA,
          userId: user.id,
          userName: user.name,
          timestamp: new Date().toISOString()
        }],
        insumos: formData.insumos || [],
        attachments: uploadedAttachments
      };
      setRequests(prev => [newRequest, ...prev]);
      
      addAuditLog({
        actionType: 'Criação',
        entity: 'Solicitação',
        entityId: newId,
        summary: `Criou nova solicitação (${newRequest.type})`
      });

    } else if (modalMode === 'edit' && selectedRequest) {
      const isLideranca = user.role === UserRole.LIDERANCA;

      let newUploaded = [];
      try {
        newUploaded = await Promise.all(
          filesToUpload.map(file => uploadRequestAttachment(selectedRequest.id, file))
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao enviar anexos para o Supabase.';
        alert(message);
        return;
      }
      
      const hasStatusChanged = formData.status !== selectedRequest.status;
      const sanitizedInsumos = (formData.insumos || []).map(i => {
        const existing = selectedRequest.insumos.find(s => s.id === i.id);
        if (!canManageDeadlinesByRole) {
          return { ...i, deadline: existing?.deadline };
        }
        return i;
      });
      
      const updatedRequest: MaintenanceRequest = {
        ...selectedRequest,
        ...formData,
        deadline: canManageDeadlinesByRole ? (formData.deadline || selectedRequest.deadline) : selectedRequest.deadline,
        insumos: sanitizedInsumos,
        attachments: [...(selectedRequest.attachments || []), ...newUploaded],
        history: hasStatusChanged ? [
          ...selectedRequest.history,
          {
            id: Math.random().toString(),
            oldStatus: selectedRequest.status,
            newStatus: formData.status as RequestStatus,
            userId: user.id,
            userName: user.name,
            timestamp: new Date().toISOString()
          }
        ] : selectedRequest.history
      } as MaintenanceRequest;

      setRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedRequest : r));
      
      if (isLideranca) {
        const addedInsumosCount = (formData.insumos?.length || 0) - (selectedRequest.insumos?.length || 0);
        const addedFilesCount = newUploaded.length;
        
        let actions = [];
        if (addedInsumosCount > 0) actions.push(`${addedInsumosCount} novos insumos`);
        if (addedFilesCount > 0) actions.push(`${addedFilesCount} novos anexos`);
        
        if (actions.length > 0) {
          addNotification(
            `Liderança ${user.name} atualizou a ${selectedRequest.id}: adicionou ${actions.join(' e ')}.`,
            selectedRequest.id
          );
        }
      }

      addAuditLog({
        actionType: hasStatusChanged ? 'Status' : 'Edição',
        entity: 'Solicitação',
        entityId: selectedRequest.id,
        summary: hasStatusChanged 
          ? `Alterou status para ${formData.status}`
          : isLideranca ? `Complementou solicitação com insumos/anexos` : `Atualizou detalhes da solicitação`
      });
    }

    setIsModalOpen(false);
    setIsEditing(false);
    resetForm();
  };

  const handleViewRequest = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setFormData(req);
    setModalMode('view');
    setIsModalOpen(true);
    setIsEditing(true);
  };

  const handleEditRequest = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setFormData(req);
    setModalMode('edit');
    setIsModalOpen(true);
    setIsEditing(true);
  };

  const resetForm = () => {
    setFormData({
      type: RequestType.PECA,
      classification: undefined,
      urgency: UrgencyLevel.MEDIA,
      impact: OperationalImpact.SEM_IMPACTO,
      status: RequestStatus.NOVA,
      description: '',
      insumos: [],
      attachments: [],
    });
    setSelectedRequest(null);
    setFilesToUpload([]);
    setCodeLookupMessage('');
    setInsumoForm({ code: '', description: '', quantity: 1, unit: 'UN', deadline: '', catalogStatus: 'Novo/Cadastro' });
  };

  const handleInsumoCodeLookup = async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      setCodeLookupMessage('');
      setInsumoForm(prev => ({ ...prev, code: '', catalogStatus: 'Novo/Cadastro' }));
      return;
    }
    
    setIsCodeLookupLoading(true);
    setCodeLookupMessage('');
    try {
      const { data, error } = await supabase
        .from('code')
        .select('descricao')
        .eq('codigo', code)
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0]?.descricao) {
        setInsumoForm(prev => ({
          ...prev,
          code,
          description: String(data[0].descricao),
          catalogStatus: 'Cadastrado'
        }));
        setCodeLookupMessage('Código encontrado. Descrição preenchida automaticamente.');
        return;
      }
      
      setCodeLookupMessage('Código não encontrado no cadastro de produtos. Você pode inserir a descrição manualmente.');
    } catch (err) {
      console.warn('Falha ao buscar código no catálogo do Supabase:', err);
      setCodeLookupMessage('Erro ao consultar código no Supabase. Você pode inserir a descrição manualmente.');
    } finally {
      setIsCodeLookupLoading(false);
    }

    setInsumoForm(prev => ({ ...prev, code, catalogStatus: 'Novo/Cadastro' }));
  };

  const addInsumo = () => {
    if (!insumoForm.description || insumoForm.quantity <= 0 || modalMode === 'view') return;
    const newInsumo: Insumo = { 
      id: Math.random().toString(),
      code: insumoForm.code || undefined,
      description: insumoForm.description,
      quantity: insumoForm.quantity,
      unit: insumoForm.unit,
      catalogStatus: insumoForm.catalogStatus,
      deadline: canManageDeadlinesByRole && modalMode === 'edit' && insumoForm.deadline
        ? new Date(insumoForm.deadline).toISOString()
        : undefined
    };
    setFormData(prev => ({ ...prev, insumos: [...(prev.insumos || []), newInsumo] }));
    setInsumoForm({ code: '', description: '', quantity: 1, unit: 'UN', deadline: '', catalogStatus: 'Novo/Cadastro' });
  };

  const removeInsumo = (id: string) => {
    if (modalMode === 'view') return;
    
    if (user.role === UserRole.LIDERANCA && modalMode === 'edit') {
      const isExisting = selectedRequest?.insumos.some(i => i.id === id);
      if (isExisting) {
        alert("Liderança não possui permissão para remover insumos já cadastrados.");
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, insumos: prev.insumos?.filter(i => i.id !== id) }));
  };

  const handleInsumoDeadlineChange = (id: string, newDeadline: string) => {
    setFormData(prev => ({
      ...prev,
      insumos: prev.insumos?.map(i => i.id === id ? { ...i, deadline: newDeadline ? new Date(newDeadline).toISOString() : undefined } : i)
    }));
  };

  const getUrgencyColor = (level: UrgencyLevel) => {
    switch (level) {
      case UrgencyLevel.ALTA: return 'text-red-500 bg-red-50 dark:bg-red-900/10';
      case UrgencyLevel.MEDIA: return 'text-orange-500 bg-orange-50 dark:bg-orange-900/10';
      case UrgencyLevel.BAIXA: return 'text-green-500 bg-green-50 dark:bg-green-900/10';
    }
  };

  const getStatusBadge = (status: RequestStatus) => {
    const styles: Record<RequestStatus, string> = {
      [RequestStatus.NOVA]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [RequestStatus.CADASTRO]: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      [RequestStatus.EMITIDO_SC]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      [RequestStatus.AGUARDANDO_ENTREGA]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      [RequestStatus.DISPONIVEL]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      [RequestStatus.CANCELADA]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${styles[status]}`}>{status}</span>;
  };

  const SortIndicator = ({ field }: { field: keyof MaintenanceRequest }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} className="inline ml-1" /> : <ChevronDown size={14} className="inline ml-1" />;
  };

  const isFieldDisabled = modalMode === 'view' || (modalMode === 'edit' && user.role === UserRole.LIDERANCA);
  const canEditGeneralDeadline = canManageDeadlinesByRole && modalMode === 'edit';
  // Apenas Admin e PCM podem editar prazo de item, e somente após criação (modo edição).
  const canEditItemDeadline = canManageDeadlinesByRole && modalMode === 'edit';
  const nextRequestNumber = String(requests.length + 1).padStart(5, '0');
  const overdueFilteredCount = filteredRequests.filter((req) => {
    const deadline = getDisplayDeadline(req);
    return deadline && new Date(deadline).getTime() < Date.now() && req.status !== RequestStatus.DISPONIVEL && req.status !== RequestStatus.CANCELADA;
  }).length;

  if (viewMode === 'all' && user.role !== UserRole.ADMIN) {
    return (
      <div className="tecer-page">
        <div className="bg-white dark:bg-tecer-darkCard p-6 rounded-xl border border-red-100 dark:border-red-900/20">
          <h2 className="text-lg font-bold text-red-600">Acesso negado</h2>
          <p className="text-sm text-tecer-grayMed mt-2">
            Apenas usuários com perfil Administrador podem visualizar "Todas as Solicitações".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tecer-page space-y-6">
      <div className="tecer-view-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="tecer-view-headline">
            <p className="tecer-view-kicker">Fluxo operacional</p>
            <h2 className="font-display text-3xl font-extrabold text-tecer-grayDark dark:text-white">{viewConfig.title}</h2>
            <p className="text-tecer-grayMed text-sm">{viewConfig.subtitle}</p>
          </div>
          {viewMode === 'new' && (
            <button 
              onClick={() => { setModalMode('create'); setIsModalOpen(true); setIsEditing(true); }}
              className="flex items-center justify-center gap-2 bg-tecer-primary hover:bg-[#1a2e5e] text-white px-6 py-3 rounded-xl shadow-md transition-all font-semibold"
            >
              <Plus size={20} />
              Nova Solicitação
            </button>
          )}
        </div>
        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Registros</span>
            <span className="tecer-view-stat-value">{filteredRequests.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Novas</span>
            <span className="tecer-view-stat-value">{filteredRequests.filter((req) => req.status === RequestStatus.NOVA).length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Atrasadas</span>
            <span className="tecer-view-stat-value">{overdueFilteredCount}</span>
          </div>
        </div>
      </div>

      <div className="tecer-toolbar bg-white dark:bg-tecer-darkCard p-6 rounded-[28px] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary text-xs text-tecer-grayDark dark:text-white"
            />
          </div>
          
          <div>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:outline-none text-xs text-tecer-grayDark dark:text-white"
            >
              <option value="All">Todos Status</option>
              {Object.values(RequestStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <select 
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:outline-none text-xs text-tecer-grayDark dark:text-white"
            >
              <option value="All">Classificação (Todas)</option>
              {Object.values(DemandClassification).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <select 
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value as any)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:outline-none text-xs text-tecer-grayDark dark:text-white"
            >
              <option value="All">Impacto (Todos)</option>
              {Object.values(OperationalImpact).map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:outline-none text-xs text-tecer-grayDark dark:text-white"
              title="Data de Criação (Início)"
            />
          </div>

          <div>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg py-2 px-3 focus:outline-none text-xs text-tecer-grayDark dark:text-white"
              title="Data de Criação (Fim)"
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase text-tecer-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
          >
            <RotateCcw size={14} />
            Limpar Filtros
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-tecer-darkCard rounded-[28px] shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
          <table className="tecer-table w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 shadow-sm">
              <tr className="text-tecer-grayMed text-xs uppercase font-bold border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4 cursor-pointer hover:text-tecer-primary transition-colors" onClick={() => handleSort('id')}>
                  Solicitação <SortIndicator field="id" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-tecer-primary transition-colors" onClick={() => handleSort('status')}>
                  Status <SortIndicator field="status" />
                </th>
                <th className="px-6 py-4">Equipamento</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 cursor-pointer hover:text-tecer-primary transition-colors" onClick={() => handleSort('urgency')}>
                  Urgência <SortIndicator field="urgency" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-tecer-primary transition-colors" onClick={() => handleSort('deadline')}>
                  Prazo <SortIndicator field="deadline" />
                </th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-tecer-grayDark dark:text-gray-300">
              {filteredRequests.map(req => {
                const equipment = equipments.find(e => e.id === req.equipmentId);
                const displayDeadline = getDisplayDeadline(req);
                const isOverdue = !!displayDeadline && new Date(displayDeadline) < new Date() && req.status !== RequestStatus.DISPONIVEL && req.status !== RequestStatus.CANCELADA;
                
                return (
                  <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-tecer-primary dark:text-tecer-secondary">{req.id}</td>
                    <td className="px-6 py-4">{getStatusBadge(req.status)}</td>
                    <td className="px-6 py-4 text-xs font-bold">{equipment?.tag || 'N/A'}</td>
                    <td className="px-6 py-4 max-w-xs truncate text-xs">{req.description}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getUrgencyColor(req.urgency)}`}>{req.urgency}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold">
                      <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                        <Clock size={12} />
                        {displayDeadline ? new Date(displayDeadline).toLocaleDateString() : 'PRAZO NÃO DEFINIDO'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleViewRequest(req)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-tecer-primary transition-colors"><Eye size={16} /></button>
                        <button onClick={() => handleEditRequest(req)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-tecer-secondary transition-colors"><Edit size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Create/Edit/View */}
      {isModalOpen && (
        <div className="tecer-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-tecer-darkCard w-full rounded-[32px] shadow-2xl flex flex-col animate-in zoom-in duration-200 ${modalMode === 'create' ? 'max-w-5xl max-h-[88vh]' : 'max-w-7xl max-h-[95vh]'}`}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-t-[32px]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-tecer-grayMed font-bold mb-2">Solicitações</p>
                <h3 className="font-display text-xl font-extrabold text-tecer-grayDark dark:text-white flex items-center gap-3">
                  <FileText className="text-tecer-primary" size={24} />
                  {modalMode === 'create' ? 'Nova Solicitação' : modalMode === 'edit' ? `${user.role === UserRole.LIDERANCA ? 'Complementar' : 'Tratativa'} ${selectedRequest?.id}` : `Consulta ${selectedRequest?.id}`}
                </h3>
              </div>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); resetForm(); }} className="text-tecer-grayMed hover:text-red-500 transition-all hover:rotate-90">
                <XCircle size={28} />
              </button>
            </div>
            
            <form onSubmit={handleSaveRequest} className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className={`grid grid-cols-1 gap-10 ${modalMode === 'create' ? 'lg:grid-cols-1' : 'lg:grid-cols-12'}`}>
                
                {/* BLOCO SUPERIOR */}
                <div className="lg:col-span-12">
                  <div className="p-6 bg-white dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-sm">
                    <h4 className="text-[10px] font-bold uppercase text-tecer-grayMed mb-4 tracking-widest flex items-center gap-2">
                      <ShieldAlert size={14} /> Configuração da Solicitação
                    </h4>
                    <div className={`grid grid-cols-1 gap-4 ${modalMode === 'create' ? '' : 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-6'}`}>
                      {modalMode === 'create' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Número da Solicitação</label>
                            <input
                              type="text"
                              value={nextRequestNumber}
                              readOnly
                              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold text-tecer-grayDark dark:text-gray-200"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Número da SA</label>
                            <input
                              type="text"
                              value=""
                              readOnly
                              placeholder="Preenchido pelo PCM (6 dígitos)"
                              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold text-tecer-grayMed"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Tipo</label>
                        <select 
                          required disabled={modalMode !== 'create'}
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value as RequestType, classification: undefined})}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-tecer-primary disabled:opacity-60"
                        >
                          {Object.values(RequestType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Status</label>
                        {modalMode === 'create' ? (
                          <input
                            type="text"
                            value={RequestStatus.NOVA}
                            readOnly
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold text-tecer-grayDark dark:text-gray-200"
                          />
                        ) : (
                          <select 
                            required disabled={isFieldDisabled}
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value as RequestStatus})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-tecer-primary disabled:opacity-60"
                          >
                            {Object.values(RequestStatus).map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Classificação</label>
                        <select 
                          disabled={isFieldDisabled}
                          value={formData.classification || ''}
                          onChange={(e) => setFormData({...formData, classification: e.target.value as DemandClassification})}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-tecer-primary disabled:opacity-60"
                        >
                          <option value="">Selecione...</option>
                          {Object.values(DemandClassification).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Urgência</label>
                        <select 
                          required disabled={isFieldDisabled}
                          value={formData.urgency}
                          onChange={(e) => setFormData({...formData, urgency: e.target.value as UrgencyLevel})}
                          className={`w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-bold focus:ring-2 focus:ring-tecer-primary disabled:opacity-60 ${getUrgencyColor(formData.urgency as UrgencyLevel)}`}
                        >
                          {Object.values(UrgencyLevel).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="lg:col-span-1">
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Equipamento</label>
                        <select 
                          required={formData.type !== RequestType.FERRAMENTA}
                          disabled={modalMode !== 'create'}
                          value={formData.equipmentId || ''}
                          onChange={(e) => setFormData({...formData, equipmentId: e.target.value})}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-tecer-primary disabled:opacity-60"
                        >
                          <option value="">Equipamento...</option>
                          {equipments.filter(e => e.status === UserStatus.ATIVO || e.id === formData.equipmentId).map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.tag} - {eq.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Prazo Geral</label>
                        {modalMode === 'create' ? (
                          <div className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-xs font-semibold text-tecer-grayMed">
                            Definido posteriormente por PCM/Admin
                          </div>
                        ) : canEditGeneralDeadline ? (
                          <input 
                            type="date"
                            value={formData.deadline ? formData.deadline.split('T')[0] : ''}
                            onChange={(e) => setFormData({...formData, deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-tecer-primary"
                          />
                        ) : (
                          <div className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 rounded-lg text-xs font-semibold text-tecer-grayDark dark:text-gray-200">
                            {formData.deadline ? new Date(formData.deadline).toLocaleDateString() : 'PRAZO NÃO DEFINIDO'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Impacto</label>
                        <select 
                          disabled={isFieldDisabled}
                          value={formData.impact || ''}
                          onChange={(e) => setFormData({...formData, impact: e.target.value as OperationalImpact})}
                          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-tecer-primary disabled:opacity-60"
                        >
                          <option value="">Selecione...</option>
                          <option value={OperationalImpact.EQUIPAMENTO_INOPERANTE}>Inoperante</option>
                          <option value={OperationalImpact.SEM_IMPACTO}>Sem impacto</option>
                        </select>
                      </div>
                      {modalMode === 'create' && (
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-tecer-grayMed mb-1.5">Responsável / Solicitante</label>
                          <input
                            type="text"
                            value={user.name}
                            readOnly
                            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-lg text-xs font-semibold text-tecer-grayDark dark:text-gray-200"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* COLUNA ESQUERDA */}
                <div className={`space-y-8 ${modalMode === 'create' ? 'lg:col-span-12 order-3' : 'lg:col-span-4'}`}>
                  <div className="p-6 bg-white dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase text-tecer-grayMed mb-4 tracking-widest flex items-center gap-2">
                      <FileText size={14} /> {modalMode === 'create' ? 'Observações' : 'Detalhamento da Demanda'}
                    </h4>
                    <textarea 
                      required disabled={isFieldDisabled}
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Descreva detalhadamente o problema ou necessidade..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-xl h-48 resize-none focus:ring-2 focus:ring-tecer-primary text-xs leading-relaxed disabled:opacity-60"
                    />
                  </div>

                  <div className="p-6 bg-white dark:bg-gray-800/20 border border-gray-200 dark:border-gray-700 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase text-tecer-grayMed mb-4 tracking-widest flex items-center gap-2">
                      <Paperclip size={14} /> Documentação Técnica
                    </h4>
                    {modalMode !== 'view' && (
                      <button 
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-3 p-4 mb-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-tecer-primary hover:bg-white dark:hover:bg-gray-800 transition-all text-xs text-tecer-grayMed font-bold"
                      >
                        <Upload size={18} /> Selecionar Arquivos
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept=".jpg,.jpeg,.png,.pdf,.docx" onChange={handleFileChange} />
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                      {filesToUpload.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30">
                          <span className="text-[10px] font-bold truncate max-w-[150px]">{file.name}</span>
                          <button type="button" onClick={() => removeFileToUpload(idx)} className="text-red-500"><XCircle size={14} /></button>
                        </div>
                      ))}
                      {formData.attachments?.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            {att.type === 'photo' ? <ImageIcon size={14} className="text-tecer-secondary" /> : <FileText size={14} className="text-tecer-primary" />}
                            <span className="text-[10px] font-semibold truncate max-w-[150px]">{att.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { void handleOpenAttachment(att); }}
                            disabled={openingAttachmentId === att.id}
                            className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-full text-tecer-primary group-hover:scale-110 transition-transform disabled:opacity-50"
                          >
                            <Download size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BLOCO CENTRAL */}
                <div className={`${modalMode === 'create' ? 'lg:col-span-12 order-2' : 'lg:col-span-8'}`}>
                  <div className="h-full flex flex-col p-8 bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 rounded-[28px] shadow-inner">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h4 className="text-sm font-bold text-tecer-grayDark dark:text-white flex items-center gap-3 uppercase tracking-wider">
                          <Package size={24} className="text-tecer-primary" />
                          Materiais e Insumos Necessários
                        </h4>
                        <p className="text-[10px] text-tecer-grayMed mt-1 font-bold">MÍNIMO DE 1 ITEM OBRIGATÓRIO PARA CRIAÇÃO</p>
                      </div>
                      <div className="px-4 py-2 bg-tecer-primary/10 rounded-full text-tecer-primary font-bold text-xs">
                        {formData.insumos?.length || 0} Itens Adicionados
                      </div>
                    </div>

                    {modalMode !== 'view' && (
                      <>
                        {modalMode === 'create' ? (
                          <div className="mb-8 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                              <div className="md:col-span-2">
                                <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Código</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={insumoForm.code}
                                    onChange={(e) => setInsumoForm({ ...insumoForm, code: e.target.value, catalogStatus: 'Novo/Cadastro' })}
                                    onBlur={(e) => { void handleInsumoCodeLookup(e.target.value); }}
                                    placeholder="Ex.: 010200022"
                                    className="flex-1 text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => { void handleInsumoCodeLookup(insumoForm.code); }}
                                    disabled={!insumoForm.code.trim() || isCodeLookupLoading}
                                    className="px-3 text-[10px] font-bold uppercase bg-tecer-primary text-white rounded-xl disabled:opacity-50"
                                  >
                                    {isCodeLookupLoading ? '...' : 'Consultar'}
                                  </button>
                                </div>
                              </div>
                              <div className="md:col-span-5">
                                <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Descrição do Produto</label>
                                <input
                                  type="text"
                                  value={insumoForm.description}
                                  onChange={(e) => setInsumoForm({ ...insumoForm, description: e.target.value })}
                                  readOnly={insumoForm.catalogStatus === 'Cadastrado'}
                                  placeholder="Descrição manual quando não houver código cadastrado"
                                  className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary read-only:opacity-80"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Quantidade</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={insumoForm.quantity}
                                  onChange={(e) => setInsumoForm({ ...insumoForm, quantity: Number(e.target.value) || 0 })}
                                  className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Unidade</label>
                                <select
                                  value={insumoForm.unit}
                                  onChange={(e) => setInsumoForm({ ...insumoForm, unit: e.target.value })}
                                  className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary"
                                >
                                  <option value="UN">UN</option>
                                  <option value="KG">KG</option>
                                  <option value="G">G</option>
                                  <option value="L">L</option>
                                  <option value="ML">ML</option>
                                  <option value="M">M</option>
                                  <option value="CM">CM</option>
                                  <option value="MM">MM</option>
                                  <option value="CX">CX</option>
                                  <option value="PCT">PCT</option>
                                </select>
                              </div>
                              <div className="md:col-span-1 flex items-end">
                                <button
                                  type="button"
                                  onClick={addInsumo}
                                  className="w-full h-12 bg-tecer-primary text-white flex items-center justify-center rounded-xl hover:bg-[#1a2e5e] transition-all shadow-md"
                                  title="Adicionar novo item"
                                >
                                  <Plus size={20} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] font-bold text-tecer-grayMed uppercase">
                              Status do item: {insumoForm.catalogStatus}
                            </div>
                            <div className="text-[11px] font-semibold text-tecer-grayMed">
                              {codeLookupMessage}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap md:flex-nowrap gap-4 mb-8 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm">
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Item (Código/Descrição)</label>
                              <input
                                type="text"
                                placeholder="Nome do Insumo..."
                                value={insumoForm.description}
                                onChange={(e) => setInsumoForm({ ...insumoForm, description: e.target.value })}
                                className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary"
                              />
                            </div>
                            <div className="w-full md:w-24">
                              <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Qtd.</label>
                              <input
                                type="number"
                                min="1"
                                value={insumoForm.quantity}
                                onChange={(e) => setInsumoForm({ ...insumoForm, quantity: Number(e.target.value) })}
                                className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary"
                              />
                            </div>
                            <div className="w-full md:w-20">
                              <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">UN</label>
                              <input
                                type="text"
                                placeholder="UN"
                                value={insumoForm.unit}
                                onChange={(e) => setInsumoForm({ ...insumoForm, unit: e.target.value })}
                                className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary"
                              />
                            </div>
                            <div className="w-full md:w-36">
                              <label className="block text-[9px] font-bold uppercase text-tecer-grayMed mb-1">Prazo Item</label>
                              <input
                                type="date"
                                disabled={!canEditItemDeadline}
                                value={insumoForm.deadline}
                                onChange={(e) => setInsumoForm({ ...insumoForm, deadline: e.target.value })}
                                className="w-full text-sm p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-tecer-primary disabled:opacity-50"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={addInsumo}
                                className="w-full md:w-14 h-12 bg-tecer-primary text-white flex items-center justify-center rounded-xl hover:bg-[#1a2e5e] transition-all hover:scale-105 active:scale-95 shadow-md"
                              >
                                <Plus size={24} strokeWidth={3} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex-1 min-h-[400px] max-h-[600px] overflow-y-auto space-y-4 pr-3">
                      {modalMode === 'create' ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                          <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-tecer-grayMed bg-gray-50 dark:bg-gray-700 px-4 py-3">
                            <div className="col-span-2">Código</div>
                            <div className="col-span-5">Descrição do Produto</div>
                            <div className="col-span-2">Quantidade</div>
                            <div className="col-span-2">Unidade</div>
                            <div className="col-span-1 text-right">Ação</div>
                          </div>
                          {formData.insumos?.length ? (
                            formData.insumos.map((insumo) => (
                              <div key={insumo.id} className="grid grid-cols-12 px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-xs items-center">
                                <div className="col-span-2 font-semibold text-tecer-primary">{insumo.code || '-'}</div>
                                <div className="col-span-5">
                                  <div className="font-semibold">{insumo.description}</div>
                                  <span className={`text-[10px] font-bold uppercase ${insumo.catalogStatus === 'Cadastrado' ? 'text-green-600' : 'text-orange-600'}`}>
                                    {insumo.catalogStatus || 'Novo/Cadastro'}
                                  </span>
                                </div>
                                <div className="col-span-2">{insumo.quantity}</div>
                                <div className="col-span-2">{insumo.unit}</div>
                                <div className="col-span-1 text-right">
                                  <button 
                                    type="button" 
                                    onClick={() => removeInsumo(insumo.id)}
                                    className="text-red-400 hover:text-red-600 p-1 rounded-full"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-8 text-center text-xs text-tecer-grayMed">
                              Nenhum material adicionado.
                            </div>
                          )}
                        </div>
                      ) : (
formData.insumos?.map((insumo, index) => (
                        <div key={insumo.id} className="flex items-center justify-between p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-right duration-200">
                          <div className="flex items-center gap-6 flex-1">
                            <div className="w-10 h-10 bg-tecer-bgLight dark:bg-gray-700 rounded-full flex items-center justify-center font-bold text-tecer-primary text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <span className="text-sm font-bold text-tecer-grayDark dark:text-gray-100 block">{insumo.description}</span>
                              <div className="flex flex-wrap gap-4 mt-2 items-center">
                                <span className="text-[10px] uppercase font-bold text-tecer-grayMed px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Qtd: {insumo.quantity} {insumo.unit}</span>
                                
                                <div className="flex items-center gap-2">
                                  <Calendar size={12} className="text-tecer-primary" />
                                  {canEditItemDeadline ? (
                                    <input 
                                      type="date"
                                      value={insumo.deadline ? insumo.deadline.split('T')[0] : ''}
                                      onChange={(e) => handleInsumoDeadlineChange(insumo.id, e.target.value)}
                                      className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded px-1.5 py-0.5 text-[10px] font-bold text-tecer-primary focus:ring-1 focus:ring-tecer-primary outline-none"
                                    />
                                  ) : (
                                    <span className="text-[10px] uppercase font-bold text-tecer-primary px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center gap-1">
                                      {insumo.deadline ? new Date(insumo.deadline).toLocaleDateString() : 'PRAZO NÃO DEFINIDO'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {modalMode !== 'view' && (
                            <button 
                              type="button" onClick={() => removeInsumo(insumo.id)}
                              className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      ))
                      )}
                    </div>
                  </div>
                </div>

                {selectedRequest && (
                  <div className="lg:col-span-12 pt-10 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-[10px] font-bold uppercase text-tecer-grayMed mb-6 tracking-widest flex items-center gap-2">
                      <History size={14} /> Histórico de Alterações
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-x-auto pb-4">
                      {selectedRequest.history.slice().reverse().map(h => (
                        <div key={h.id} className="min-w-[200px] p-4 bg-white dark:bg-gray-800/40 rounded-xl border-l-4 border-tecer-primary shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-tecer-primary">{h.newStatus}</span>
                            <span className="text-[10px] text-tecer-grayMed">{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="text-[10px] text-tecer-grayDark dark:text-gray-200 font-semibold">{h.userName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 flex justify-end gap-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => { setIsModalOpen(false); setIsEditing(false); resetForm(); }} className="px-8 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs text-tecer-grayDark dark:text-white uppercase tracking-wider">
                  Sair
                </button>
                {modalMode !== 'view' && (
                  <button type="submit" className="px-12 py-3 rounded-xl bg-tecer-primary hover:bg-[#1a2e5e] text-white font-bold shadow-xl shadow-tecer-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 text-xs uppercase tracking-wider">
                    <CheckCircle2 size={20} />
                    {modalMode === 'create' ? 'Finalizar e Criar' : 'Salvar Alterações'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;
