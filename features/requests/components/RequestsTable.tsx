import React from 'react';
import { Calendar, Download, Edit, Eye, Paperclip } from 'lucide-react';
import { RequestStatus, UrgencyLevel } from '../../../types';
import { RequestWithDerivedFields } from '../../../domains/requests/selectors';
import Badge from '../../../ui/Badge';
import Button from '../../../ui/Button';
import EmptyState from '../../../ui/EmptyState';

type Props = {
  requests: RequestWithDerivedFields[];
  onView: (request: RequestWithDerivedFields) => void;
  onEdit: (request: RequestWithDerivedFields) => void;
  onOpenAttachment: (attachment: RequestWithDerivedFields['attachments'][number]) => Promise<void>;
  openingAttachmentId: string | null;
};

const urgencyTone: Record<UrgencyLevel, 'danger' | 'warning' | 'success'> = {
  [UrgencyLevel.ALTA]: 'danger',
  [UrgencyLevel.MEDIA]: 'warning',
  [UrgencyLevel.BAIXA]: 'success',
};

const statusTone: Record<RequestStatus, 'info' | 'success' | 'warning' | 'danger' | 'default'> = {
  [RequestStatus.NOVA]: 'info',
  [RequestStatus.CADASTRO]: 'default',
  [RequestStatus.EMITIDO_SC]: 'info',
  [RequestStatus.AGUARDANDO_ENTREGA]: 'warning',
  [RequestStatus.DISPONIVEL]: 'success',
  [RequestStatus.CANCELADA]: 'danger',
};

export const RequestsTable = React.memo(function RequestsTable({ requests, onView, onEdit, onOpenAttachment, openingAttachmentId }: Props) {
  if (!requests.length) {
    return <EmptyState icon={Paperclip} title="Nenhuma solicitacao encontrada" description="Ajuste os filtros ou registre uma nova demanda." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:hidden">
        {requests.map(request => {
          const canEdit = request.status !== RequestStatus.CANCELADA && request.status !== RequestStatus.DISPONIVEL;

          return (
            <div key={request.id} className="rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] p-5 shadow-[var(--shadow-card)] dark:border-[color:var(--color-border)] dark:bg-[color:var(--color-surface)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-primary">{request.id}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-tecer-grayDark dark:text-white">{request.description}</p>
                </div>
                <Badge tone={statusTone[request.status]}>{request.status}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={urgencyTone[request.urgency]}>{request.urgency}</Badge>
                <Badge>{request.equipmentTag || 'Sem equipamento'}</Badge>
              </div>

              <div className="mt-4 grid gap-3 text-sm">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-tecer-grayMed">Equipamento</p>
                  <p className="mt-1 font-medium">{request.equipmentName || 'Nao informado'}</p>
                </div>
                <div className="flex items-center gap-2 text-tecer-grayMed">
                  <Calendar size={14} />
                  <span>{request.displayDeadline ? new Date(request.displayDeadline).toLocaleDateString() : 'Prazo nao definido'}</span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => onView(request)} className="flex-1">
                  <Eye size={16} />
                  Visualizar
                </Button>
                {canEdit ? (
                  <Button type="button" variant="ghost" onClick={() => onEdit(request)} className="flex-1">
                    <Edit size={16} />
                    Editar
                  </Button>
                ) : null}
                {request.attachments[0] ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={openingAttachmentId === request.attachments[0].id}
                    onClick={() => void onOpenAttachment(request.attachments[0])}
                    className="w-full"
                  >
                    <Download size={16} />
                    {openingAttachmentId === request.attachments[0].id ? 'Abrindo anexo...' : 'Abrir anexo'}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] shadow-[var(--shadow-card)] dark:border-[color:var(--color-border)] dark:bg-[color:var(--color-surface)] lg:block">
        <div className="overflow-x-auto">
          <table className="tecer-table w-full text-left">
            <thead>
              <tr>
                <th className="px-5 py-4">Solicitacao</th>
                <th className="px-5 py-4">Equipamento</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Urgencia</th>
                <th className="px-5 py-4">Prazo</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(request => {
                const canEdit = request.status !== RequestStatus.CANCELADA && request.status !== RequestStatus.DISPONIVEL;

                return (
                  <tr key={request.id}>
                    <td className="px-5 py-4 align-top">
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.16em] text-tecer-primary">{request.id}</span>
                        <p className="max-w-[340px] text-sm font-semibold text-tecer-grayDark dark:text-white">{request.description}</p>
                        <span className="text-xs text-tecer-grayMed">{new Date(request.createdAt).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="text-sm font-semibold">{request.equipmentTag || 'Sem equipamento'}</div>
                      <div className="text-xs text-tecer-grayMed">{request.equipmentName || 'Nao informado'}</div>
                    </td>
                    <td className="px-5 py-4 align-top"><Badge tone={statusTone[request.status]}>{request.status}</Badge></td>
                    <td className="px-5 py-4 align-top"><Badge tone={urgencyTone[request.urgency]}>{request.urgency}</Badge></td>
                    <td className="px-5 py-4 align-top">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold">
                        <Calendar size={14} className="text-tecer-grayMed" />
                        <span>{request.displayDeadline ? new Date(request.displayDeadline).toLocaleDateString() : 'Nao definido'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => onView(request)} className="rounded-full p-2 text-tecer-primary transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Eye size={18} />
                        </button>
                        {canEdit ? (
                          <button type="button" onClick={() => onEdit(request)} className="rounded-full p-2 text-tecer-primary transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <Edit size={18} />
                          </button>
                        ) : null}
                        {request.attachments[0] ? (
                          <button
                            type="button"
                            disabled={openingAttachmentId === request.attachments[0].id}
                            onClick={() => void onOpenAttachment(request.attachments[0])}
                            className="rounded-full p-2 text-tecer-primary transition-colors hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-900/20"
                          >
                            <Download size={18} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
