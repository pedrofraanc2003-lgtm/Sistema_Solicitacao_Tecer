
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Wrench, 
  Edit, 
  Trash2, 
  Tag, 
  Activity,
  CheckCircle2,
  XCircle,
  Hash
} from 'lucide-react';
import { Equipment, User, UserRole, UserStatus, AuditLog } from '../types';

interface EquipmentsProps {
  user: User;
  equipments: Equipment[];
  setEquipments: React.Dispatch<React.SetStateAction<Equipment[]>>;
  setIsEditing: (editing: boolean) => void;
  addAuditLog: (logData: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
}

const Equipments: React.FC<EquipmentsProps> = ({ user, equipments, setEquipments, setIsEditing, addAuditLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [formData, setFormData] = useState<Partial<Equipment>>({
    tag: '',
    name: '',
    type: '',
    status: UserStatus.ATIVO,
    notes: ''
  });

  const canManage = user.role === UserRole.ADMIN || user.role === UserRole.PCM;

  const filteredEquipments = equipments.filter(eq => 
    eq.tag.toLowerCase().includes(search.toLowerCase()) || 
    eq.name.toLowerCase().includes(search.toLowerCase()) ||
    eq.type.toLowerCase().includes(search.toLowerCase())
  );
  const activeCount = equipments.filter(eq => eq.status === UserStatus.ATIVO).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEquipment) {
      setEquipments(prev => prev.map(eq => eq.id === editingEquipment.id ? { ...eq, ...formData } as Equipment : eq));
      
      // Audit log
      addAuditLog({
        actionType: 'Edição',
        entity: 'Equipamento',
        entityId: editingEquipment.tag,
        summary: `Atualizou informações do equipamento ${editingEquipment.tag}`
      });
    } else {
      const newEquipment: Equipment = {
        ...formData as Equipment,
        id: Math.random().toString()
      };
      setEquipments(prev => [...prev, newEquipment]);
      
      // Audit log
      addAuditLog({
        actionType: 'Criação',
        entity: 'Equipamento',
        entityId: newEquipment.tag,
        summary: `Cadastrou novo equipamento: ${newEquipment.name}`
      });
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEquipment(null);
    setIsEditing(false);
    setFormData({ tag: '', name: '', type: '', status: UserStatus.ATIVO, notes: '' });
  };

  const handleEdit = (eq: Equipment) => {
    setEditingEquipment(eq);
    setFormData(eq);
    setIsModalOpen(true);
    setIsEditing(true);
  };

  const toggleStatus = (eq: Equipment) => {
    if (!canManage) return;
    const newStatus = eq.status === UserStatus.ATIVO ? UserStatus.INATIVO : UserStatus.ATIVO;
    setEquipments(prev => prev.map(item => item.id === eq.id ? { ...item, status: newStatus } : item));
    
    // Audit log
    addAuditLog({
      actionType: 'Status',
      entity: 'Equipamento',
      entityId: eq.tag,
      summary: `Alterou status do equipamento para ${newStatus}`
    });
  };

  return (
    <div className="tecer-page space-y-6">
      <div className="tecer-view-header">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="tecer-view-headline">
            <p className="tecer-view-kicker">Ativos operacionais</p>
            <h2 className="font-display text-3xl font-extrabold">Base de Equipamentos</h2>
            <p className="text-tecer-grayMed text-sm">Gerenciamento de TAGs, categorias e disponibilidade operacional dos ativos.</p>
          </div>
          {canManage && (
            <button 
              onClick={() => { setIsModalOpen(true); setIsEditing(true); }}
              className="flex items-center justify-center gap-2 bg-tecer-primary hover:bg-[#1a2e5e] text-white px-6 py-3 rounded-xl shadow-md transition-all font-semibold"
            >
              <Plus size={20} />
              Cadastrar Equipamento
            </button>
          )}
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

      <div className="tecer-toolbar bg-white dark:bg-tecer-darkCard p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por TAG, nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipments.map(eq => (
          <div key={eq.id} className="bg-white dark:bg-tecer-darkCard rounded-[24px] p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-bold uppercase rounded-bl-xl ${eq.status === UserStatus.ATIVO ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {eq.status}
            </div>
            
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-tecer-bgLight dark:bg-gray-800 rounded-lg text-tecer-primary">
                <Wrench size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-tecer-secondary font-bold text-xs">
                  <Tag size={12} />
                  {eq.tag}
                </div>
                <h4 className="font-bold text-lg leading-tight mt-1">{eq.name}</h4>
                <p className="text-xs text-tecer-grayMed mt-1">{eq.type}</p>
              </div>
            </div>

            {eq.notes && (
              <p className="text-xs text-tecer-grayMed line-clamp-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded mb-4 italic">
                "{eq.notes}"
              </p>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-tecer-grayMed flex items-center gap-1">
                <Activity size={12} />
                Pronto para manutenção
              </span>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEdit(eq)}
                    className="p-2 hover:bg-tecer-bgLight dark:hover:bg-gray-700 rounded-full text-tecer-primary transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => toggleStatus(eq)}
                    className={`p-2 hover:bg-tecer-bgLight dark:hover:bg-gray-700 rounded-full transition-colors ${eq.status === UserStatus.ATIVO ? 'text-orange-500' : 'text-green-500'}`}
                    title={eq.status === UserStatus.ATIVO ? "Inativar" : "Ativar"}
                  >
                    {eq.status === UserStatus.ATIVO ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {filteredEquipments.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <Wrench size={48} className="mx-auto mb-4" />
            <p>Nenhum equipamento localizado.</p>
          </div>
        )}
      </div>

      {/* Equipment Modal */}
      {isModalOpen && (
        <div className="tecer-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-tecer-darkCard w-full max-w-lg rounded-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold">{editingEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}</h3>
              <button onClick={closeModal} className="text-tecer-grayMed hover:text-red-500 transition-colors">
                <XCircle size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">TAG / Código <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                    <input 
                      required
                      type="text"
                      placeholder="Ex: EMP-001"
                      value={formData.tag}
                      onChange={(e) => setFormData({...formData, tag: e.target.value.toUpperCase()})}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-tecer-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">Categoria</label>
                  <input 
                    type="text"
                    placeholder="Ex: Movimentação"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-tecer-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">Nome do Equipamento <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="text"
                  placeholder="Ex: Empilhadeira Reach Stacker"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-tecer-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">Observações</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Informações técnicas relevantes..."
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg h-24 resize-none focus:ring-2 focus:ring-tecer-primary"
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 rounded-lg bg-tecer-primary hover:bg-[#1a2e5e] text-white font-bold shadow-lg shadow-tecer-primary/20 transition-all"
                >
                  {editingEquipment ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Equipments;

