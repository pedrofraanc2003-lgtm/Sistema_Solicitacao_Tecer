import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  GripVertical,
  Plus,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  AuditLog,
  Equipment,
  User,
  UserRole,
  WorkshopKanbanItem,
  WorkshopKanbanStatus,
  WorkshopMaintenanceType,
} from '../types';

interface WorkshopKanbanProps {
  user: User;
  equipments: Equipment[];
  items: WorkshopKanbanItem[];
  setItems: React.Dispatch<React.SetStateAction<WorkshopKanbanItem[]>>;
  setIsEditing: (editing: boolean) => void;
  addAuditLog: (logData: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
}

type FormState = {
  equipmentId: string;
  maintenanceType: WorkshopMaintenanceType;
  description: string;
};

const STATUS_ORDER = [
  WorkshopKanbanStatus.PENDENTE,
  WorkshopKanbanStatus.EM_ANDAMENTO,
  WorkshopKanbanStatus.LIBERADO,
];

const STATUS_STYLES: Record<
  WorkshopKanbanStatus,
  {
    accent: string;
    count: string;
    columnBorder: string;
    columnBg: string;
    cardBorder: string;
    tag: string;
  }
> = {
  [WorkshopKanbanStatus.PENDENTE]: {
    accent: 'bg-orange-500',
    count: 'bg-orange-100 text-orange-700',
    columnBorder: 'border-orange-200',
    columnBg: 'bg-orange-50/60 dark:bg-orange-500/5',
    cardBorder: 'border-l-orange-500',
    tag: 'bg-orange-500 text-white',
  },
  [WorkshopKanbanStatus.EM_ANDAMENTO]: {
    accent: 'bg-blue-500',
    count: 'bg-blue-100 text-blue-700',
    columnBorder: 'border-blue-200',
    columnBg: 'bg-blue-50/60 dark:bg-blue-500/5',
    cardBorder: 'border-l-blue-500',
    tag: 'bg-blue-500 text-white',
  },
  [WorkshopKanbanStatus.LIBERADO]: {
    accent: 'bg-green-500',
    count: 'bg-green-100 text-green-700',
    columnBorder: 'border-green-200',
    columnBg: 'bg-green-50/60 dark:bg-green-500/5',
    cardBorder: 'border-l-green-500',
    tag: 'bg-green-500 text-white',
  },
};

const createId = () => `KANBAN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const WorkshopKanban: React.FC<WorkshopKanbanProps> = ({
  user,
  equipments,
  items,
  setItems,
  setIsEditing,
  addAuditLog,
}) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>({
    equipmentId: '',
    maintenanceType: WorkshopMaintenanceType.MECANICA,
    description: '',
  });

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.PCM;

  const equipmentOptions = useMemo(
    () => [...equipments].sort((a, b) => a.tag.localeCompare(b.tag)),
    [equipments]
  );

  const selectedEquipment = equipmentOptions.find(
    equipment => equipment.id === formData.equipmentId
  );

  const itemsByStatus = useMemo(
    () =>
      STATUS_ORDER.reduce((acc, status) => {
        acc[status] = items.filter(item => item.status === status);
        return acc;
      }, {} as Record<WorkshopKanbanStatus, WorkshopKanbanItem[]>),
    [items]
  );

  const totalItems = items.length;

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      maintenanceType: WorkshopMaintenanceType.MECANICA,
      description: '',
    });
    setIsFormOpen(false);
    setIsEditing(false);
  };

  const resolveEquipmentName = (item: WorkshopKanbanItem) => {
    const equipment = equipments.find(current => current.id === item.equipmentId);
    return equipment?.name || item.equipmentName;
  };

  const resolveEquipmentTag = (item: WorkshopKanbanItem) => {
    const equipment = equipments.find(current => current.id === item.equipmentId);
    return equipment?.tag || item.tag;
  };

  const updateItemStatus = (itemId: string, status: WorkshopKanbanStatus) => {
    let movedItem: WorkshopKanbanItem | undefined;

    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId || item.status === status) {
          return item;
        }

        movedItem = {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
        };

        return movedItem;
      })
    );

    if (movedItem) {
      addAuditLog({
        actionType: 'Status',
        entity: 'Kanban Oficina',
        entityId: resolveEquipmentTag(movedItem),
        summary: `Movimentou ${resolveEquipmentTag(movedItem)} para ${status} no Kanban da Oficina`,
      });
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEquipment) {
      return;
    }

    const alreadyInKanban = items.some(item => item.equipmentId === selectedEquipment.id);
    if (alreadyInKanban) {
      window.alert('Este equipamento já está no Kanban da Oficina.');
      return;
    }

    const now = new Date().toISOString();
    const newItem: WorkshopKanbanItem = {
      id: createId(),
      equipmentId: selectedEquipment.id,
      tag: selectedEquipment.tag,
      equipmentName: selectedEquipment.name,
      maintenanceType: formData.maintenanceType,
      description: formData.description.trim(),
      status: WorkshopKanbanStatus.PENDENTE,
      createdAt: now,
      updatedAt: now,
    };

    setItems(prev => [newItem, ...prev]);
    addAuditLog({
      actionType: 'Criação',
      entity: 'Kanban Oficina',
      entityId: selectedEquipment.tag,
      summary: `Inseriu ${selectedEquipment.tag} no Kanban da Oficina como Pendente`,
    });
    resetForm();
  };

  const handleRemove = (item: WorkshopKanbanItem) => {
    if (item.status !== WorkshopKanbanStatus.LIBERADO) {
      return;
    }

    setItems(prev => prev.filter(current => current.id !== item.id));
    addAuditLog({
      actionType: 'Exclusão',
      entity: 'Kanban Oficina',
      entityId: resolveEquipmentTag(item),
      summary: `Removeu ${resolveEquipmentTag(item)} do Kanban da Oficina após liberação`,
    });
  };

  const moveItem = (item: WorkshopKanbanItem, direction: 'previous' | 'next') => {
    const currentIndex = STATUS_ORDER.indexOf(item.status);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    const targetStatus = STATUS_ORDER[targetIndex];

    if (!targetStatus) {
      return;
    }

    updateItemStatus(item.id, targetStatus);
  };

  return (
    <div className="tecer-page space-y-6">
      <section className="rounded-[24px] border border-gray-100 dark:border-gray-700 bg-white dark:bg-tecer-darkCard px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-tecer-grayMed font-bold">
              Oficina
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Kanban da Oficina</h2>
            <p className="mt-1 text-sm text-tecer-grayMed">
              Visualização rápida do fluxo da oficina.
            </p>
          </div>

          <div className="flex items-center gap-3 xl:min-w-[540px] xl:justify-end">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[18px] border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-tecer-grayMed font-bold">
                  Total
                </p>
                <p className="mt-1 text-2xl font-display font-extrabold text-tecer-primary">
                  {totalItems}
                </p>
              </div>
              {STATUS_ORDER.map(status => (
                <div
                  key={status}
                  className={`rounded-[18px] border px-4 py-3 ${STATUS_STYLES[status].columnBorder} ${STATUS_STYLES[status].columnBg}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-tecer-grayMed font-bold">
                    {status}
                  </p>
                  <p className="mt-1 text-2xl font-display font-extrabold text-tecer-grayDark">
                    {itemsByStatus[status].length}
                  </p>
                </div>
              ))}
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(prev => !prev)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tecer-primary text-white shadow-lg shadow-tecer-primary/20"
                title={isFormOpen ? 'Fechar formulário' : 'Adicionar equipamento'}
              >
                {isFormOpen ? <X size={22} /> : <Plus size={24} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 dark:border-gray-700 bg-white/70 dark:bg-tecer-darkCard p-5 lg:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-tecer-grayMed font-bold">
              Painel operacional
            </p>
            <h3 className="mt-1 text-3xl font-display font-extrabold">Status dos equipamentos</h3>
          </div>
          <p className="text-xs text-tecer-grayMed">
            {canManage ? 'Arraste os cards ou use os botões para mover o equipamento.' : 'Consulta visual do fluxo da oficina.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {STATUS_ORDER.map(status => (
            <div
              key={status}
              onDragOver={event => {
                if (!canManage) return;
                event.preventDefault();
              }}
              onDrop={event => {
                if (!canManage) return;
                event.preventDefault();
                const itemId = event.dataTransfer.getData('text/plain') || draggedItemId;
                if (itemId) {
                  updateItemStatus(itemId, status);
                }
                setDraggedItemId(null);
              }}
              className={`rounded-[28px] border-2 bg-white dark:bg-tecer-darkCard p-4 lg:p-5 shadow-lg ${STATUS_STYLES[status].columnBorder}`}
            >
              <div className={`mb-4 rounded-[22px] p-4 border ${STATUS_STYLES[status].columnBorder} ${STATUS_STYLES[status].columnBg}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-4 w-4 rounded-full shadow-sm ${STATUS_STYLES[status].accent}`} />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-tecer-grayMed font-bold">
                        Status
                      </p>
                      <h4 className="text-[2.1rem] leading-none font-display font-extrabold">{status}</h4>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase ${STATUS_STYLES[status].count}`}>
                    {itemsByStatus[status].length}
                  </span>
                </div>
              </div>

              <div className="space-y-3 min-h-[420px]">
                {itemsByStatus[status].map(item => (
                  <article
                    key={item.id}
                    draggable={canManage}
                    onDragStart={event => {
                      if (!canManage) return;
                      event.dataTransfer.setData('text/plain', item.id);
                      setDraggedItemId(item.id);
                    }}
                    onDragEnd={() => setDraggedItemId(null)}
                    className={`rounded-[22px] border border-gray-100 dark:border-gray-700 border-l-4 bg-white dark:bg-tecer-darkCard p-4 shadow-sm ${STATUS_STYLES[status].cardBorder}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {canManage && <GripVertical size={14} className="text-tecer-grayMed shrink-0" />}
                          <span className={`inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] shadow-sm ${STATUS_STYLES[status].tag}`}>
                            {resolveEquipmentTag(item)}
                          </span>
                        </div>
                        <h5 className="mt-3 text-lg font-bold leading-tight text-tecer-grayDark">
                          {resolveEquipmentName(item)}
                        </h5>
                      </div>

                      {status === WorkshopKanbanStatus.LIBERADO && canManage && (
                        <button
                          type="button"
                          onClick={() => handleRemove(item)}
                          className="rounded-full p-2 text-red-500 hover:bg-red-50"
                          title="Remover do Kanban"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-tecer-grayDark">
                      <ClipboardList size={15} className="text-tecer-grayMed" />
                      <span>{item.maintenanceType}</span>
                    </div>

                    <p className="mt-3 line-clamp-3 text-sm text-tecer-grayMed">
                      {item.description}
                    </p>

                    {canManage && (
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                        <button
                          type="button"
                          disabled={status === WorkshopKanbanStatus.PENDENTE}
                          onClick={() => moveItem(item, 'previous')}
                          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft size={16} />
                          Voltar
                        </button>
                        <button
                          type="button"
                          disabled={status === WorkshopKanbanStatus.LIBERADO}
                          onClick={() => moveItem(item, 'next')}
                          className="flex items-center gap-2 rounded-xl bg-tecer-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Avançar
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    )}
                  </article>
                ))}

                {itemsByStatus[status].length === 0 && (
                  <div className={`flex min-h-[180px] flex-col items-center justify-center rounded-[22px] border border-dashed p-6 text-center ${STATUS_STYLES[status].columnBorder} ${STATUS_STYLES[status].columnBg}`}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-tecer-darkCard">
                      <Wrench size={20} className="text-tecer-grayMed" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-tecer-grayDark">
                      Nenhum equipamento neste status
                    </p>
                    <p className="mt-2 text-xs text-tecer-grayMed">
                      {canManage
                        ? 'Adicione um novo item ou mova um card para esta coluna.'
                        : 'Aguardando atualização do quadro da oficina.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isFormOpen && (
        <div className="tecer-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-5xl rounded-[28px] border border-gray-100 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-tecer-darkCard">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-tecer-grayMed font-bold">
                  Novo equipamento no fluxo
                </p>
                <h3 className="mt-1 text-2xl font-display font-extrabold">Adicionar item ao Kanban</h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 text-tecer-grayMed hover:text-tecer-primary dark:border-gray-700"
                title="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {!canManage && (
              <div className="mb-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3 text-sm text-tecer-grayMed">
                Apenas Admin e PCM podem adicionar e movimentar cards.
              </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 xl:grid-cols-12">
              <div className="xl:col-span-3">
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">
                  Tag <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={!canManage}
                  value={formData.equipmentId}
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                  onChange={event => setFormData(prev => ({ ...prev, equipmentId: event.target.value }))}
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 p-3"
                >
                  <option value="">Selecionar</option>
                  {equipmentOptions.map(equipment => (
                    <option key={equipment.id} value={equipment.id}>
                      {equipment.tag}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-4">
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">
                  Nome do equipamento
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedEquipment?.name || ''}
                  placeholder="Preenchido automaticamente"
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 p-3"
                />
              </div>

              <div className="xl:col-span-2">
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">
                  Manutenção <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={!canManage}
                  value={formData.maintenanceType}
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                  onChange={event =>
                    setFormData(prev => ({
                      ...prev,
                      maintenanceType: event.target.value as WorkshopMaintenanceType,
                    }))
                  }
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 p-3"
                >
                  {Object.values(WorkshopMaintenanceType).map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="xl:col-span-3">
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">
                  Descrição <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  disabled={!canManage}
                  type="text"
                  value={formData.description}
                  onFocus={() => setIsEditing(true)}
                  onBlur={() => setIsEditing(false)}
                  onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))}
                  placeholder="Serviço a executar"
                  className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 p-3"
                />
              </div>

              <div className="xl:col-span-12 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold dark:border-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!canManage}
                  className="flex items-center justify-center gap-3 rounded-2xl bg-tecer-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-tecer-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                  Novo item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkshopKanban;
