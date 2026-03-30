import React from 'react';
import { Calendar, CheckCircle2, Download, Paperclip, Plus, Trash2 } from 'lucide-react';
import { Equipment, Insumo, MaintenanceRequest, RequestStatus, UserRole } from '../../../types';
import { getRequestPermissions } from '../../../domains/auth/permissions';
import { getAvailableStatusTransitions } from '../../../domains/requests/workflow';
import { REQUEST_ATTACHMENTS_ACCEPT_ATTRIBUTE } from '../../../services/requestAttachments';
import Badge from '../../../ui/Badge';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import Modal from '../../../ui/Modal';
import Select from '../../../ui/Select';

type FormValues = {
  type: string;
  classification?: string;
  equipmentId?: string;
  description: string;
  urgency: string;
  impact: string;
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

type Props = {
  userRole: UserRole;
  modalMode: 'create' | 'edit' | 'view';
  isOpen: boolean;
  title: string;
  subtitle: string;
  equipments: Equipment[];
  request: MaintenanceRequest | null;
  formValues: FormValues;
  setFormValues: React.Dispatch<React.SetStateAction<FormValues>>;
  insumoDraft: InsumoDraft;
  setInsumoDraft: React.Dispatch<React.SetStateAction<InsumoDraft>>;
  filesToUpload: File[];
  codeLookupMessage: string;
  isCodeLookupLoading: boolean;
  onFilesSelected: (files: FileList | null) => void;
  onLookupCode: (value: string) => Promise<void>;
  onAddInsumo: () => void;
  onRemoveInsumo: (id: string) => void;
  onChangeItemDeadline: (id: string, deadline: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  onOpenAttachment: (attachment: MaintenanceRequest['attachments'][number]) => Promise<void>;
  openingAttachmentId: string | null;
};

const fieldLabelClassName = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed';
const textareaClassName = 'min-h-32 w-full rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] px-4 py-3 text-sm text-[color:var(--color-text)] shadow-[var(--shadow-inset)] outline-none hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-tint)] focus:border-[color:var(--color-secondary)] focus:bg-[color:var(--color-surface-strong)] focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[color:var(--color-border)] dark:bg-[rgba(19,44,72,0.72)] dark:text-[color:var(--color-text)] dark:hover:bg-[rgba(24,53,85,0.88)] dark:focus:bg-[rgba(24,53,85,0.96)]';

export function RequestModal({
  userRole,
  modalMode,
  isOpen,
  title,
  subtitle,
  equipments,
  request,
  formValues,
  setFormValues,
  insumoDraft,
  setInsumoDraft,
  filesToUpload,
  codeLookupMessage,
  isCodeLookupLoading,
  onFilesSelected,
  onLookupCode,
  onAddInsumo,
  onRemoveInsumo,
  onChangeItemDeadline,
  onClose,
  onSubmit,
  onOpenAttachment,
  openingAttachmentId,
}: Props) {
  if (!isOpen) return null;

  const permissions = getRequestPermissions(userRole);
  const canEdit = modalMode !== 'view';
  const availableStatuses = request ? [request.status, ...getAvailableStatusTransitions(userRole, request.status).filter(status => status !== request.status)] : [RequestStatus.NOVA];

  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} className="max-w-6xl">
      <form onSubmit={event => { event.preventDefault(); void onSubmit(); }} className="grid grid-cols-1 gap-6 p-5 md:p-6 xl:grid-cols-12">
        <section className="space-y-5 xl:col-span-4">
          <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] p-5 dark:border-[color:var(--color-border)] dark:bg-[rgba(19,44,72,0.44)]">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClassName}>Tipo</label>
                <Select disabled={!canEdit || modalMode === 'edit'} value={formValues.type} onChange={event => setFormValues(current => ({ ...current, type: event.target.value }))}>
                  <option value="Peça">Peca</option>
                  <option value="Serviço">Servico</option>
                  <option value="Ferramenta">Ferramenta</option>
                </Select>
              </div>
              <div>
                <label className={fieldLabelClassName}>Classificacao</label>
                <Select disabled={!canEdit} value={formValues.classification || ''} onChange={event => setFormValues(current => ({ ...current, classification: event.target.value || undefined }))}>
                  <option value="">Selecionar</option>
                  <option value="Corretiva">Corretiva</option>
                  <option value="Preventiva">Preventiva</option>
                  <option value="Melhoria">Melhoria</option>
                  <option value="Inspeção">Inspecao</option>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <label className={fieldLabelClassName}>Equipamento</label>
              <Select disabled={!canEdit} value={formValues.equipmentId || ''} onChange={event => setFormValues(current => ({ ...current, equipmentId: event.target.value || undefined }))}>
                <option value="">Sem equipamento</option>
                {equipments.map(equipment => <option key={equipment.id} value={equipment.id}>{equipment.tag} · {equipment.name}</option>)}
              </Select>
            </div>

            <div className="mt-4">
              <label className={fieldLabelClassName}>Descricao</label>
              <textarea disabled={!canEdit} value={formValues.description} onChange={event => setFormValues(current => ({ ...current, description: event.target.value }))} className={textareaClassName} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClassName}>Urgencia</label>
                <Select disabled={!canEdit} value={formValues.urgency} onChange={event => setFormValues(current => ({ ...current, urgency: event.target.value }))}>
                  <option value="Alta">Alta</option>
                  <option value="Média">Media</option>
                  <option value="Baixa">Baixa</option>
                </Select>
              </div>
              <div>
                <label className={fieldLabelClassName}>Impacto</label>
                <Select disabled={!canEdit} value={formValues.impact} onChange={event => setFormValues(current => ({ ...current, impact: event.target.value }))}>
                  <option value="Sem impacto">Sem impacto</option>
                  <option value="Impacto parcial">Impacto parcial</option>
                  <option value="Equipamento parado">Equipamento parado</option>
                  <option value="Equipamento inoperante">Equipamento inoperante</option>
                </Select>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClassName}>Status</label>
                <Select disabled={modalMode !== 'edit'} value={formValues.status} onChange={event => setFormValues(current => ({ ...current, status: event.target.value as RequestStatus }))}>
                  {availableStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                </Select>
              </div>
              <div>
                <label className={fieldLabelClassName}>Prazo geral</label>
                <Input type="date" disabled={!permissions.canEditGeneralDeadline || modalMode !== 'edit'} value={formValues.deadline || ''} onChange={event => setFormValues(current => ({ ...current, deadline: event.target.value || undefined }))} />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] p-5 dark:border-[color:var(--color-border)] dark:bg-[rgba(19,44,72,0.44)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Arquivos</p>
                <h4 className="mt-2 font-display text-lg font-extrabold">Anexos da solicitacao</h4>
              </div>
              <Badge tone="info">{request?.attachments.length || 0} salvos</Badge>
            </div>

            {canEdit ? (
              <div className="mt-4">
                <Input type="file" multiple accept={REQUEST_ATTACHMENTS_ACCEPT_ATTRIBUTE} onChange={event => onFilesSelected(event.target.files)} />
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              {request?.attachments.map(attachment => (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => void onOpenAttachment(attachment)}
                  disabled={openingAttachmentId === attachment.id}
                  className="flex w-full items-center justify-between rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] px-3 py-3 text-left text-sm dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.04)]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Paperclip size={14} />
                    <span className="truncate">{attachment.name}</span>
                  </span>
                  <Download size={14} />
                </button>
              ))}

              {filesToUpload.map(file => (
                <div key={file.name} className="rounded-xl border border-dashed border-[color:var(--color-border)] px-3 py-3 text-sm text-tecer-grayMed dark:border-[color:var(--color-border)]">
                  {file.name}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5 xl:col-span-8">
          <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(244,249,255,0.88))] p-5 dark:border-[color:var(--color-border)] dark:bg-[linear-gradient(180deg,rgba(19,44,72,0.5),rgba(15,36,58,0.82))]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Insumos</p>
                <h4 className="mt-2 font-display text-2xl font-extrabold">Materiais vinculados</h4>
              </div>
              <Badge tone="info">{formValues.insumos.length} itens</Badge>
            </div>

            {canEdit ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <Input value={insumoDraft.code} onChange={event => setInsumoDraft(current => ({ ...current, code: event.target.value, catalogStatus: 'Novo/Cadastro' }))} onBlur={event => { void onLookupCode(event.target.value); }} placeholder="Codigo" className="md:col-span-2" />
                <Input value={insumoDraft.description} onChange={event => setInsumoDraft(current => ({ ...current, description: event.target.value }))} placeholder="Descricao do item" className="md:col-span-4" />
                <Input type="number" min="1" value={insumoDraft.quantity} onChange={event => setInsumoDraft(current => ({ ...current, quantity: Number(event.target.value) || 0 }))} className="md:col-span-1" />
                <Input value={insumoDraft.unit} onChange={event => setInsumoDraft(current => ({ ...current, unit: event.target.value }))} className="md:col-span-1" />
                <Input type="date" disabled={!permissions.canEditItemDeadline} value={insumoDraft.deadline} onChange={event => setInsumoDraft(current => ({ ...current, deadline: event.target.value }))} className="md:col-span-2" />
                <Button type="button" onClick={onAddInsumo} className="md:col-span-2">
                  <Plus size={16} />
                  {isCodeLookupLoading ? 'Buscando...' : 'Adicionar'}
                </Button>
              </div>
            ) : null}

            {codeLookupMessage ? <p className="mt-3 text-xs font-semibold text-tecer-grayMed">{codeLookupMessage}</p> : null}

            <div className="mt-5 space-y-3">
              {formValues.insumos.map((insumo, index) => (
                <div key={insumo.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] p-4 dark:border-[color:var(--color-border)] dark:bg-[color:var(--color-surface)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.14em] text-tecer-primary">{insumo.code || `ITEM ${index + 1}`}</div>
                      <h5 className="mt-1 text-sm font-bold">{insumo.description}</h5>
                      <p className="mt-1 text-xs text-tecer-grayMed">Qtd: {insumo.quantity} {insumo.unit}</p>
                    </div>
                    {canEdit ? (
                      <button type="button" onClick={() => onRemoveInsumo(insumo.id)} className="rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs font-semibold">
                    <Calendar size={14} className="text-tecer-grayMed" />
                    {permissions.canEditItemDeadline && modalMode === 'edit' ? (
                      <Input type="date" value={insumo.deadline ? insumo.deadline.split('T')[0] : ''} onChange={event => onChangeItemDeadline(insumo.id, event.target.value)} className="max-w-[220px]" />
                    ) : (
                      <span>{insumo.deadline ? new Date(insumo.deadline).toLocaleDateString() : 'Sem prazo'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {request ? (
            <div className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] p-5 dark:border-[color:var(--color-border)] dark:bg-[color:var(--color-surface)]">
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed">Historico</p>
                <h4 className="mt-2 font-display text-2xl font-extrabold">Movimentacoes</h4>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {request.history.slice().reverse().map(entry => (
                  <div key={entry.id} className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] p-4 dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.04)]">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase text-tecer-primary">{entry.newStatus}</span>
                      <span className="text-xs text-tecer-grayMed">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{entry.userName}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end xl:col-span-12">
          <Button type="button" variant="secondary" onClick={onClose}>Fechar</Button>
          {canEdit ? (
            <Button type="submit">
              <CheckCircle2 size={18} />
              {modalMode === 'create' ? 'Criar solicitacao' : 'Salvar alteracoes'}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
