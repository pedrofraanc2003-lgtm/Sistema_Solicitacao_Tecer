import React, { useState } from 'react';
import { Activity, CheckCircle2, Edit, Hash, Plus, Search, Tag, Wrench, XCircle } from 'lucide-react';
import { AuditLog, Equipment, User, UserRole, UserStatus } from '../types';
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

const Equipments: React.FC<EquipmentsProps> = ({ user, equipments, onSaveEquipment, onAudit }) => {
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
        ? `Atualizou informações do equipamento ${saved.tag}`
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEquipments.map(equipment => (
          <div key={equipment.id} className="group relative overflow-hidden rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-tecer-darkCard">
            <div className={`absolute right-0 top-0 rounded-bl-xl px-3 py-1 text-[10px] font-bold uppercase ${equipment.status === UserStatus.ATIVO ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {equipment.status}
            </div>
            <div className="mb-4 flex items-start gap-4">
              <div className="rounded-lg bg-tecer-bgLight p-3 text-tecer-primary dark:bg-gray-800">
                <Wrench size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-tecer-secondary">
                  <Tag size={12} />
                  {equipment.tag}
                </div>
                <h4 className="mt-1 text-lg font-bold leading-tight">{equipment.name}</h4>
                <p className="mt-1 text-xs text-tecer-grayMed">{equipment.type}</p>
              </div>
            </div>

            {equipment.notes ? (
              <p className="mb-4 rounded bg-gray-50 p-2 text-xs italic text-tecer-grayMed dark:bg-gray-800/50">"{equipment.notes}"</p>
            ) : null}

            <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-700">
              <span className="flex items-center gap-1 text-[10px] text-tecer-grayMed">
                <Activity size={12} />
                Pronto para manutenção
              </span>
              {canManage ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingEquipment(equipment);
                      setFormData(equipment);
                      setIsModalOpen(true);
                    }}
                    className="rounded-full p-2 text-tecer-primary transition-colors hover:bg-tecer-bgLight dark:hover:bg-gray-700"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => void toggleStatus(equipment)}
                    className={`rounded-full p-2 transition-colors hover:bg-tecer-bgLight dark:hover:bg-gray-700 ${equipment.status === UserStatus.ATIVO ? 'text-orange-500' : 'text-green-500'}`}
                  >
                    {equipment.status === UserStatus.ATIVO ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {!filteredEquipments.length ? (
        <EmptyState icon={Wrench} title="Nenhum equipamento localizado" description="Ajuste os filtros ou cadastre um novo ativo operacional." />
      ) : null}

      {isModalOpen ? (
        <Modal title={editingEquipment ? 'Editar equipamento' : 'Novo equipamento'} onClose={closeModal} className="max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">TAG / Código</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                  <Input required value={formData.tag || ''} onChange={event => setFormData(prev => ({ ...prev, tag: event.target.value.toUpperCase() }))} placeholder="Ex: EMP-001" className="pl-10" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Categoria</label>
                <Input value={formData.type || ''} onChange={event => setFormData(prev => ({ ...prev, type: event.target.value }))} placeholder="Ex: Movimentação" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Nome do equipamento</label>
              <Input required value={formData.name || ''} onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))} placeholder="Ex: Empilhadeira Reach Stacker" />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Observações</label>
              <textarea value={formData.notes || ''} onChange={event => setFormData(prev => ({ ...prev, notes: event.target.value }))} placeholder="Informações técnicas relevantes..." className="h-24 w-full resize-none rounded-lg bg-gray-50 p-3 dark:bg-gray-800" />
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1">{editingEquipment ? 'Salvar alterações' : 'Cadastrar'}</Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default Equipments;
