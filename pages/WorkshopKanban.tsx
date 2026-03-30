import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardList, Edit3, GripVertical, Plus, Trash2, Wrench, X } from 'lucide-react';
import { useAuth, useEquipmentsData, useWorkshopData } from '../app/hooks';
import { AuditLog, Equipment, User, UserRole, WorkshopKanbanItem, WorkshopKanbanStatus, WorkshopMaintenanceType } from '../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import Select from '../ui/Select';

interface WorkshopKanbanProps {
  user: User;
  equipments: Equipment[];
  items: WorkshopKanbanItem[];
  onCreateItem: (
    input: Omit<WorkshopKanbanItem, 'id' | 'createdAt' | 'updatedAt' | 'tag' | 'equipmentName'>,
    equipmentId: string
  ) => Promise<void>;
  onSaveItem: (item: WorkshopKanbanItem, audit?: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<void>;
  onRemoveItem: (item: WorkshopKanbanItem, audit?: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<void>;
}

const STATUS_ORDER = [WorkshopKanbanStatus.PENDENTE, WorkshopKanbanStatus.EM_ANDAMENTO, WorkshopKanbanStatus.LIBERADO];

const WorkshopKanbanView: React.FC<WorkshopKanbanProps> = ({ user, equipments, items, onCreateItem, onSaveItem, onRemoveItem }) => {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WorkshopKanbanItem | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [formData, setFormData] = useState({
    equipmentId: '',
    maintenanceType: WorkshopMaintenanceType.MECANICA,
    description: '',
  });

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.PCM;
  const equipmentOptions = useMemo(() => [...equipments].sort((a, b) => a.tag.localeCompare(b.tag)), [equipments]);
  const itemsByStatus = useMemo(
    () =>
      STATUS_ORDER.reduce((acc, status) => {
        acc[status] = items.filter(item => item.status === status);
        return acc;
      }, {} as Record<WorkshopKanbanStatus, WorkshopKanbanItem[]>),
    [items]
  );

  const resetForm = () => {
    setFormData({
      equipmentId: '',
      maintenanceType: WorkshopMaintenanceType.MECANICA,
      description: '',
    });
    setIsFormOpen(false);
  };

  const updateItemStatus = async (item: WorkshopKanbanItem, nextStatus: WorkshopKanbanStatus) => {
    if (item.status === nextStatus) return;
    await onSaveItem(
      { ...item, status: nextStatus, updatedAt: new Date().toISOString() },
      {
        actionType: 'Status',
        entity: 'Kanban Oficina',
        entityId: item.tag,
        summary: `Movimentou ${item.tag} para ${nextStatus} no Kanban da Oficina`,
      }
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.equipmentId) return;

    const alreadyInKanban = items.some(item => item.equipmentId === formData.equipmentId);
    if (alreadyInKanban) return;

    await onCreateItem(
      {
        equipmentId: formData.equipmentId,
        maintenanceType: formData.maintenanceType,
        description: formData.description.trim(),
        status: WorkshopKanbanStatus.PENDENTE,
      },
      formData.equipmentId
    );
    resetForm();
  };

  const handleSaveDescription = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingItem) return;
    const nextDescription = editDescription.trim();
    if (!nextDescription || nextDescription === editingItem.description) {
      setEditingItem(null);
      return;
    }

    await onSaveItem(
      { ...editingItem, description: nextDescription, updatedAt: new Date().toISOString() },
      {
        actionType: 'Edição',
        entity: 'Kanban Oficina',
        entityId: editingItem.tag,
        summary: `Atualizou a descrição do serviço do equipamento ${editingItem.tag} no Kanban da Oficina`,
      }
    );
    setEditingItem(null);
  };

  const moveItem = async (item: WorkshopKanbanItem, direction: 'previous' | 'next') => {
    const currentIndex = STATUS_ORDER.indexOf(item.status);
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    const targetStatus = STATUS_ORDER[targetIndex];
    if (!targetStatus) return;
    await updateItemStatus(item, targetStatus);
  };

  return (
    <div className="tecer-page space-y-6">
      <section className="rounded-[24px] border border-gray-100 bg-white px-6 py-5 dark:border-gray-700 dark:bg-tecer-darkCard">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-tecer-grayMed">Oficina</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Kanban da oficina</h2>
            <p className="mt-1 text-sm text-tecer-grayMed">Visualização rápida do fluxo operacional da oficina.</p>
          </div>
          <div className="flex items-center gap-3 xl:min-w-[540px] xl:justify-end">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[18px] border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Total</p>
                <p className="mt-1 font-display text-2xl font-extrabold text-tecer-primary">{items.length}</p>
              </div>
              {STATUS_ORDER.map(status => (
                <div key={status} className="rounded-[18px] border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/40">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">{status}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold text-tecer-primary">{itemsByStatus[status].length}</p>
                </div>
              ))}
            </div>
            <div className="shrink-0">
              <button type="button" onClick={() => setIsFormOpen(prev => !prev)} className="flex h-14 w-14 items-center justify-center rounded-2xl bg-tecer-primary text-white shadow-lg shadow-tecer-primary/20">
                {isFormOpen ? <X size={22} /> : <Plus size={24} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-gray-100 bg-white/70 p-5 shadow-md dark:border-gray-700 dark:bg-tecer-darkCard lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-tecer-grayMed">Painel operacional</p>
            <h3 className="mt-1 font-display text-3xl font-extrabold">Status dos equipamentos</h3>
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
                const item = items.find(current => current.id === itemId);
                if (item) {
                  void updateItemStatus(item, status);
                }
                setDraggedItemId(null);
              }}
              className="rounded-[28px] border border-gray-100 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-tecer-darkCard lg:p-5"
            >
              <div className="mb-4 rounded-[22px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 rounded-full bg-tecer-primary shadow-sm" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-tecer-grayMed">Status</p>
                      <h4 className="font-display text-[2.1rem] font-extrabold leading-none">{status}</h4>
                    </div>
                  </div>
                  <span className="rounded-full bg-tecer-primary/10 px-3 py-1 text-[11px] font-bold uppercase text-tecer-primary">
                    {itemsByStatus[status].length}
                  </span>
                </div>
              </div>

              <div className="min-h-[420px] space-y-3">
                {itemsByStatus[status].map(item => (
                  <article
                    key={item.id}
                    draggable={canManage}
                    onDragStart={event => {
                      event.dataTransfer.setData('text/plain', item.id);
                      setDraggedItemId(item.id);
                    }}
                    onDragEnd={() => setDraggedItemId(null)}
                    className="rounded-[22px] border border-gray-100 border-l-4 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-tecer-darkCard"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {canManage ? <GripVertical size={14} className="shrink-0 text-tecer-grayMed" /> : null}
                          <span className="inline-flex items-center rounded-xl bg-tecer-primary px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-white shadow-sm">
                            {item.tag}
                          </span>
                        </div>
                        <h5 className="mt-3 text-lg font-bold leading-tight text-tecer-grayDark">{item.equipmentName}</h5>
                      </div>
                      <div className="flex items-center gap-1">
                        {canManage ? (
                          <button onClick={() => { setEditingItem(item); setEditDescription(item.description); }} className="rounded-full p-2 text-tecer-primary hover:bg-blue-50 dark:hover:bg-blue-900/20">
                            <Edit3 size={17} />
                          </button>
                        ) : null}
                        {status === WorkshopKanbanStatus.LIBERADO && canManage ? (
                          <button
                            onClick={() =>
                              void onRemoveItem(item, {
                                actionType: 'Exclusão',
                                entity: 'Kanban Oficina',
                                entityId: item.tag,
                                summary: `Removeu ${item.tag} do Kanban da Oficina após liberação`,
                              })
                            }
                            className="rounded-full p-2 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-tecer-grayDark">
                      <ClipboardList size={15} className="text-tecer-grayMed" />
                      <span>{item.maintenanceType}</span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-tecer-grayMed">{item.description}</p>

                    {canManage ? (
                      <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                        <button type="button" disabled={status === WorkshopKanbanStatus.PENDENTE} onClick={() => void moveItem(item, 'previous')} className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700">
                          <ArrowLeft size={16} />
                          Voltar
                        </button>
                        <button type="button" disabled={status === WorkshopKanbanStatus.LIBERADO} onClick={() => void moveItem(item, 'next')} className="flex items-center gap-2 rounded-xl bg-tecer-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
                          Avançar
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}

                {!itemsByStatus[status].length ? <EmptyState icon={Wrench} title="Nenhum equipamento neste status" description="Adicione um novo item ou mova um card para esta coluna." /> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      {isFormOpen ? (
        <Modal title="Adicionar item ao Kanban" subtitle="Novo equipamento no fluxo" onClose={resetForm} className="max-w-5xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 p-6 xl:grid-cols-12">
            <div className="xl:col-span-3">
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Tag</label>
              <Select required disabled={!canManage} value={formData.equipmentId} onChange={event => setFormData(prev => ({ ...prev, equipmentId: event.target.value }))}>
                <option value="">Selecionar</option>
                {equipmentOptions.map(equipment => (
                  <option key={equipment.id} value={equipment.id}>{equipment.tag}</option>
                ))}
              </Select>
            </div>
            <div className="xl:col-span-4">
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Nome do equipamento</label>
              <input type="text" readOnly value={equipmentOptions.find(item => item.id === formData.equipmentId)?.name || ''} className="w-full rounded-xl bg-gray-50 p-3 dark:bg-gray-800" />
            </div>
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Manutenção</label>
              <Select required disabled={!canManage} value={formData.maintenanceType} onChange={event => setFormData(prev => ({ ...prev, maintenanceType: event.target.value as WorkshopMaintenanceType }))}>
                {Object.values(WorkshopMaintenanceType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Select>
            </div>
            <div className="xl:col-span-3">
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Descrição</label>
              <input required disabled={!canManage} type="text" value={formData.description} onChange={event => setFormData(prev => ({ ...prev, description: event.target.value }))} placeholder="Serviço a executar" className="w-full rounded-xl bg-gray-50 p-3 dark:bg-gray-800" />
            </div>
            <div className="xl:col-span-12 flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={resetForm}>Cancelar</Button>
              <Button type="submit" disabled={!canManage}><Plus size={18} />Novo item</Button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingItem ? (
        <Modal title={`${editingItem.tag} - ${editingItem.equipmentName}`} subtitle="Editar serviço" onClose={() => setEditingItem(null)} className="max-w-2xl">
          <form onSubmit={handleSaveDescription} className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Descrição do serviço</label>
              <textarea required value={editDescription} onChange={event => setEditDescription(event.target.value)} className="min-h-32 w-full rounded-xl bg-gray-50 p-3 dark:bg-gray-800" placeholder="Descreva o serviço a executar" />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setEditingItem(null)}>Cancelar</Button>
              <Button type="submit"><Edit3 size={16} />Salvar descrição</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default function WorkshopKanban() {
  const { user } = useAuth();
  const { equipments } = useEquipmentsData();
  const { workshopItems, createWorkshopCardAction, saveWorkshopItemAction, removeWorkshopItemAction } = useWorkshopData();

  if (!user) {
    return null;
  }

  return (
    <WorkshopKanbanView
      user={user}
      equipments={equipments}
      items={workshopItems}
      onCreateItem={createWorkshopCardAction}
      onSaveItem={saveWorkshopItemAction}
      onRemoveItem={removeWorkshopItemAction}
    />
  );
}
