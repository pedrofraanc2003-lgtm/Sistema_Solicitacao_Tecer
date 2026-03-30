import React, { useMemo } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Equipment, MaintenanceRequest, User } from '../../types';
import { buildRequestMetrics } from '../../domains/requests/selectors';
import { RequestCreateInput, RequestUpdateInput, openRequestAttachment } from '../../services/data/requestApi';
import { validateRequestAttachmentBatch } from '../../services/requestAttachments';
import { useToast } from '../../ui/ToastProvider';
import Button from '../../ui/Button';
import { RequestModal } from './components/RequestModal';
import { RequestsFiltersBar } from './components/RequestsFiltersBar';
import { RequestsTable } from './components/RequestsTable';
import { useRequestFilters } from './hooks/useRequestFilters';
import { useRequestForm } from './hooks/useRequestForm';
import { RequestMetrics, RequestViewMode } from './types';

interface RequestsPageProps {
  user: User;
  requests: MaintenanceRequest[];
  equipments: Equipment[];
  onCreateRequest: (input: RequestCreateInput) => Promise<void>;
  onUpdateRequest: (current: MaintenanceRequest, input: RequestUpdateInput) => Promise<void>;
  viewMode?: RequestViewMode;
}

const viewConfig: Record<RequestViewMode, { title: string; subtitle: string }> = {
  new: { title: 'Novas Solicitações', subtitle: 'Abertura e triagem de demandas recém-criadas.' },
  mine: { title: 'Minhas Solicitações', subtitle: 'Demandas registradas pelo usuário autenticado.' },
  inProgress: { title: 'Solicitações em Andamento', subtitle: 'Fluxo operacional em cadastro, SC emitida ou aguardando entrega.' },
  all: { title: 'Todas as Solicitações', subtitle: 'Visão administrativa completa das solicitações do sistema.' },
};

export function RequestsPage({ user, requests, equipments, onCreateRequest, onUpdateRequest, viewMode = 'new' }: RequestsPageProps) {
  const { pushToast } = useToast();
  const { filters, setFilters, filteredRequests, clearFilters } = useRequestFilters(requests, equipments, user.id, user.role === 'Admin', viewMode);
  const form = useRequestForm(user, onCreateRequest, onUpdateRequest);
  const metrics: RequestMetrics = useMemo(() => buildRequestMetrics(filteredRequests), [filteredRequests]);

  const handleFilesSelected = (files: FileList | null) => {
    const nextFiles = Array.from(files || []);
    try {
      validateRequestAttachmentBatch(form.formValues.attachments.length, nextFiles);
      form.setFilesToUpload(current => [...current, ...nextFiles]);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Arquivos inválidos para upload.', 'error');
    }
  };

  const handleOpenAttachment = async (attachment: MaintenanceRequest['attachments'][number]) => {
    if (form.openingAttachmentId) return;
    try {
      form.setOpeningAttachmentId(attachment.id);
      const targetUrl = await openRequestAttachment(attachment);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(targetUrl), 60_000);
    } catch (error) {
      pushToast(error instanceof Error ? error.message : 'Não foi possível abrir o anexo.', 'error');
    } finally {
      form.setOpeningAttachmentId(null);
    }
  };

  return (
    <div className="tecer-page space-y-6">
      <div className="tecer-view-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="tecer-view-headline">
            <p className="tecer-view-kicker">Fluxo operacional</p>
            <h2 className="font-display text-3xl font-extrabold text-tecer-grayDark dark:text-white">{viewConfig[viewMode].title}</h2>
            <p className="text-sm text-tecer-grayMed">{viewConfig[viewMode].subtitle}</p>
          </div>
          {viewMode === 'new' ? (
            <Button onClick={form.openCreateModal}>
              <Plus size={18} />
              Nova Solicitação
            </Button>
          ) : null}
        </div>

        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Registros</span>
            <span className="tecer-view-stat-value">{metrics.total}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Atrasadas</span>
            <span className="tecer-view-stat-value">{metrics.overdue}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Sem prazo</span>
            <span className="tecer-view-stat-value">{metrics.withoutDeadline}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Alta urgência</span>
            <span className="tecer-view-stat-value">{metrics.highUrgency}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Críticas</span>
            <span className="tecer-view-stat-value">{metrics.criticalImpact}</span>
          </div>
        </div>
      </div>

      {viewMode === 'all' && user.role !== 'Admin' ? (
        <div className="rounded-[24px] border border-red-100 bg-red-50 p-5 text-red-700">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={16} />
            Acesso negado
          </div>
          <p className="mt-2 text-sm">Apenas administradores podem visualizar todas as solicitações.</p>
        </div>
      ) : (
        <>
          <RequestsFiltersBar filters={filters} setFilters={setFilters} clearFilters={clearFilters} />
          <RequestsTable requests={filteredRequests} onView={form.openViewModal} onEdit={form.openEditModal} onOpenAttachment={handleOpenAttachment} openingAttachmentId={form.openingAttachmentId} />
        </>
      )}

      <RequestModal
        userRole={user.role}
        modalMode={form.modalMode}
        isOpen={form.isModalOpen}
        title={form.modalMode === 'create' ? 'Nova solicitação' : form.modalMode === 'edit' ? `Editar ${form.selectedRequest?.id}` : form.selectedRequest?.id || 'Solicitação'}
        subtitle={form.modalMode === 'create' ? 'Registro de demanda operacional' : 'Detalhes completos da solicitação'}
        equipments={equipments}
        request={form.selectedRequest}
        formValues={form.formValues}
        setFormValues={form.setFormValues}
        insumoDraft={form.insumoDraft}
        setInsumoDraft={form.setInsumoDraft}
        filesToUpload={form.filesToUpload}
        codeLookupMessage={form.codeLookupMessage}
        isCodeLookupLoading={form.isCodeLookupLoading}
        onFilesSelected={handleFilesSelected}
        onLookupCode={form.lookupCode}
        onAddInsumo={form.addInsumo}
        onRemoveInsumo={id => {
          try {
            form.removeInsumo(id);
          } catch (error) {
            pushToast(error instanceof Error ? error.message : 'Falha ao remover item.', 'error');
          }
        }}
        onChangeItemDeadline={form.changeInsumoDeadline}
        onClose={() => {
          form.setIsModalOpen(false);
          form.resetForm();
        }}
        onSubmit={async () => {
          try {
            await form.save();
          } catch (error) {
            pushToast(error instanceof Error ? error.message : 'Falha ao salvar a solicitação.', 'error');
          }
        }}
        onOpenAttachment={handleOpenAttachment}
        openingAttachmentId={form.openingAttachmentId}
      />
    </div>
  );
}

export default RequestsPage;
