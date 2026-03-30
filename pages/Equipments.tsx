import React, { useState } from 'react';
import { Activity, CheckCircle2, Edit, Hash, Plus, Search, Tag, Wrench, XCircle } from 'lucide-react';
import { useAuditLogsData, useAuth, useEquipmentsData } from '../app/hooks';
import { AuditLog, Equipment, User, UserRole, UserStatus } from '../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Toolbar from '../ui/Toolbar';

interface EquipmentsProps {
  user: User;
  equipments: Equipment[];
  onSaveEquipment: (input: Equipment | Omit<Equipment, 'id'>, audit?: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<Equipment>;
  onAudit: (input: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<void>;
}

const fieldLabelClassName = 'mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-tecer-grayMed';
const textareaClassName = 'h-24 w-full resize-none rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] px-4 py-3 text-sm text-[color:var(--color-text)] shadow-[var(--shadow-inset)] outline-none hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-surface-tint)] focus:border-[color:var(--color-secondary)] focus:bg-[color:var(--color-surface-strong)] focus:shadow-[var(--shadow-focus)] dark:border-[color:var(--color-border)] dark:bg-[rgba(19,44,72,0.72)] dark:text-[color:var(--color-text)] dark:hover:bg-[rgba(24,53,85,0.88)] dark:focus:bg-[rgba(24,53,85,0.96)]';

const EquipmentsView: React.FC<EquipmentsProps> = ({ user, equipments, onSaveEquipment, onAudit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formData, setFormData] = useState<Partial<Equipment>>({
    tag: '',
    name: '',
    type: '',
    status: UserStatus.ATIVO,
    notes: '',
  });

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.PCM;
  const filteredEquipments = equipments.filter(equipment =>
    [equipment.tag, equipment.name, equipment.type].some(value => value.toLowerCase().includes(search.toLowerCase()))
  );
  const activeCount = equipments.filter(equipment => equipment.status === UserStatus.ATIVO).length;

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    setFormData({ tag: '', name: '', type: '', status: UserStatus.ATIVO, notes: '' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = editingEquipment
      ? ({ ...editingEquipment, ...formData } as Equipment)
      : ({
          tag: String(formData.tag || '').toUpperCase(),
          name: String(formData.name || ''),
          type: String(formData.type || ''),
          status: (formData.status as UserStatus) || UserStatus.ATIVO,
          notes: String(formData.notes || ''),
        } as Omit<Equipment, 'id'>);

    const saved = await onSaveEquipment(payload);
    await onAudit({
      actionType: editingEquipment ? 'Edição' : 'Criação',
      entity: 'Equipamento',
      entityId: saved.tag,
      summary: editingEquipment
        ? `Atualizou informacoes do equipamento ${saved.tag}`
        : `Cadastrou novo equipamento: ${saved.name}`,
    });
    closeModal();
  };

  const toggleStatus = async (equipment: Equipment) => {
    if (!canManage) return;
    const nextStatus = equipment.status === UserStatus.ATIVO ? UserStatus.INATIVO : UserStatus.ATIVO;
    await onSaveEquipment({ ...equipment, status: nextStatus });
    await onAudit({
      actionType: 'Status',
      entity: 'Equipamento',
      entityId: equipment.tag,
      summary: `Alterou status do equipamento para ${nextStatus}`,
    });
  };

  return (
    <div className="tecer-page space-y-6">
      <div className="tecer-view-header">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="tecer-view-headline">
            <p className="tecer-view-kicker">Ativos operacionais</p>
            <h2 className="font-display text-3xl font-extrabold">Base de equipamentos</h2>
            <p className="text-sm text-tecer-grayMed">Gerenciamento de TAGs, categorias e disponibilidade operacional dos ativos.</p>
          </div>
          {canManage ? (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />
              Cadastrar equipamento
            </Button>
          ) : null}
        </div>
        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Total</span>
            <span className="tecer-view-stat-value">{equipments.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Ativos</span>
            <span className="tecer-view-stat-value">{activeCount}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Filtrados</span>
            <span className="tecer-view-stat-value">{filteredEquipments.length}</span>
          </div>
        </div>
      </div>

      <Toolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar por TAG, nome ou categoria..." className="pl-10" />
        </div>
      </Toolbar>

      {filteredEquipments.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredEquipments.map(equipment => (
            <div key={equipment.id} className="group rounded-[24px] border border-[color:var(--color-border)] bg-[color:var(--color-surface-strong)] p-5 shadow-[var(--shadow-card)] transition-all duration-150 hover:-translate-y-0.5 dark:border-[color:var(--color-border)] dark:bg-[color:var(--color-surface)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--color-primary-ghost)] text-tecer-primary dark:bg-[rgba(72,163,255,0.14)]">
                    <Wrench size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-tecer-secondary">
                      <Tag size={12} />
                      {equipment.tag}
                    </div>
                    <h4 className="mt-2 text-lg font-bold leading-tight text-tecer-grayDark dark:text-white">{equipment.name}</h4>
                    <p className="mt-1 text-sm text-tecer-grayMed">{equipment.type}</p>
                  </div>
                </div>
                <Badge tone={equipment.status === UserStatus.ATIVO ? 'success' : 'danger'}>{equipment.status}</Badge>
              </div>

              {equipment.notes ? (
                <p className="mt-4 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-soft)] px-4 py-3 text-sm leading-6 text-tecer-grayMed dark:border-[color:var(--color-border)] dark:bg-[rgba(255,255,255,0.04)]">
                  {equipment.notes}
                </p>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-4 dark:border-[color:var(--color-border)]">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-tecer-grayMed">
                  <Activity size={14} />
                  Pronto para manutencao
                </span>

                {canManage ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEquipment(equipment);
                        setFormData(equipment);
                        setIsModalOpen(true);
                      }}
                      className="rounded-full p-2 text-tecer-primary transition-colors hover:bg-[color:var(--color-primary-ghost)] dark:hover:bg-[rgba(72,163,255,0.14)]"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleStatus(equipment)}
                      className={`rounded-full p-2 transition-colors hover:bg-[color:var(--color-surface-soft)] dark:hover:bg-[rgba(255,255,255,0.06)] ${equipment.status === UserStatus.ATIVO ? 'text-orange-500' : 'text-green-500'}`}
                    >
                      {equipment.status === UserStatus.ATIVO ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Wrench} title="Nenhum equipamento localizado" description="Ajuste os filtros ou cadastre um novo ativo operacional." action={canManage ? <Button onClick={() => setIsModalOpen(true)}>Cadastrar equipamento</Button> : null} />
      )}

      {isModalOpen ? (
        <Modal title={editingEquipment ? 'Editar equipamento' : 'Novo equipamento'} onClose={closeModal} className="max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6 md:p-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabelClassName}>TAG / Codigo</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                  <Input required value={formData.tag || ''} onChange={event => setFormData(prev => ({ ...prev, tag: event.target.value.toUpperCase() }))} placeholder="Ex: EMP-001" className="pl-10" />
                </div>
              </div>
              <div>
                <label className={fieldLabelClassName}>Categoria</label>
                <Input value={formData.type || ''} onChange={event => setFormData(prev => ({ ...prev, type: event.target.value }))} placeholder="Ex: Movimentacao" />
              </div>
            </div>

            <div>
              <label className={fieldLabelClassName}>Nome do equipamento</label>
              <Input required value={formData.name || ''} onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))} placeholder="Ex: Empilhadeira Reach Stacker" />
            </div>

            <div>
              <label className={fieldLabelClassName}>Observacoes</label>
              <textarea value={formData.notes || ''} onChange={event => setFormData(prev => ({ ...prev, notes: event.target.value }))} placeholder="Informacoes tecnicas relevantes..." className={textareaClassName} />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeModal} className="sm:min-w-[140px]">Cancelar</Button>
              <Button type="submit" className="sm:min-w-[180px]">{editingEquipment ? 'Salvar alteracoes' : 'Cadastrar equipamento'}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default function Equipments() {
  const { user } = useAuth();
  const { equipments, saveEquipmentAction } = useEquipmentsData();
  const { appendAuditAction } = useAuditLogsData();

  if (!user) {
    return null;
  }

  return <EquipmentsView user={user} equipments={equipments} onSaveEquipment={saveEquipmentAction} onAudit={appendAuditAction} />;
}
