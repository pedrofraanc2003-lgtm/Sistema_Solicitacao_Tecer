import React, { useState } from 'react';
import { Plus, Search, User as UserIcon, Edit, Shield, XCircle, Mail, AlertTriangle, Key } from 'lucide-react';
import { User, UserRole, UserStatus, AuditLog } from '../types';
import { manageSupabaseUser } from '../services/supabase';

interface UsersProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setIsEditing: (editing: boolean) => void;
  addAuditLog: (logData: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
}

const Users: React.FC<UsersProps> = ({ users, setUsers, setIsEditing, addAuditLog }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    username: '',
    role: UserRole.LIDERANCA,
    status: UserStatus.ATIVO,
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedPayload = {
      id: editingUser?.id,
      name: String(formData.name || '').trim(),
      email: String(formData.email || '').trim().toLowerCase(),
      username: String(formData.username || '').trim().toLowerCase(),
      role: formData.role as UserRole,
      status: formData.status as UserStatus,
      password: String(formData.password || '').trim() || undefined,
    };

    if (!normalizedPayload.name || !normalizedPayload.email || !normalizedPayload.username) {
      alert('Preencha nome, e-mail e login.');
      return;
    }

    if (!editingUser && !normalizedPayload.password) {
      alert('Informe uma senha inicial para o novo usuário.');
      return;
    }

    setIsSubmitting(true);
    try {
      const managedUser = await manageSupabaseUser(editingUser ? 'update' : 'create', normalizedPayload);

      if (editingUser) {
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? managedUser : u)));
      } else {
        setUsers((prev) => [...prev, managedUser]);
      }

      if (editingUser) {
        addAuditLog({
          actionType: 'Edição',
          entity: 'Usuário',
          entityId: editingUser.username,
          summary: `Alterou perfil/dados do usuário ${editingUser.username}`,
        });
      } else {
        addAuditLog({
          actionType: 'Criação',
          entity: 'Usuário',
          entityId: managedUser.username,
          summary: `Cadastrou novo perfil no sistema: ${managedUser.name}`,
        });
      }

      closeModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Falha ao administrar usuário no Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setIsEditing(false);
    setFormData({ name: '', email: '', username: '', role: UserRole.LIDERANCA, status: UserStatus.ATIVO, password: '' });
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
    setIsEditing(true);
  };

  const getRoleBadge = (role: UserRole) => {
    const styles: Record<UserRole, string> = {
      [UserRole.ADMIN]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      [UserRole.PCM]: 'bg-tecer-primary text-white',
      [UserRole.LIDERANCA]: 'bg-tecer-secondary text-white',
      [UserRole.COMPRAS]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[role]}`}>{role}</span>;
  };

  return (
    <div className="tecer-page space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-tecer-grayMed font-bold">Administração</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold text-tecer-grayDark dark:text-white">Gestão de Usuários</h2>
          <p className="text-tecer-grayMed text-sm mt-2">Controle de perfis e permissões do sistema</p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setIsEditing(true);
          }}
          className="flex items-center justify-center gap-2 bg-tecer-primary hover:bg-[#1a2e5e] text-white px-6 py-3 rounded-xl shadow-md transition-all font-semibold"
        >
          <Plus size={20} />
          Cadastrar Perfil
        </button>
      </div>

      <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm text-tecer-grayDark">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>Esta tela cria e atualiza o usuario no Supabase Authentication e sincroniza o perfil de acesso do sistema.</span>
        </div>
      </div>

      <div className="bg-white dark:bg-tecer-darkCard p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <input
            type="text"
            placeholder="Pesquisar por nome, e-mail, login ou função..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-tecer-primary text-tecer-grayDark dark:text-white"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-tecer-darkCard rounded-[24px] shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tecer-table w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-tecer-grayMed text-[10px] uppercase font-bold border-b border-gray-100 dark:border-gray-700">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Login</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-tecer-grayDark dark:text-gray-300">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-tecer-primary/10 text-tecer-primary flex items-center justify-center font-bold">
                        {u.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-tecer-grayDark dark:text-gray-200">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-tecer-grayMed">{u.email || 'N/D'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-tecer-grayMed">{u.username}</td>
                  <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${u.status === UserStatus.ATIVO ? 'text-green-500' : 'text-red-500'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === UserStatus.ATIVO ? 'bg-green-500' : 'bg-red-500'}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleEdit(u)} className="p-2 hover:bg-tecer-bgLight dark:hover:bg-gray-700 rounded-full text-tecer-primary transition-colors">
                        <Edit size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="tecer-modal-backdrop fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-tecer-darkCard w-full max-w-md rounded-[28px] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-tecer-grayDark dark:text-white">{editingUser ? 'Editar Perfil' : 'Novo Perfil'}</h3>
              <button onClick={closeModal} className="text-tecer-grayMed hover:text-red-500 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">Nome Completo</label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Joao da Silva"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-tecer-primary text-tecer-grayDark dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                  <input
                    required
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
                    placeholder="usuario@empresa.com"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-tecer-primary text-tecer-grayDark dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">Login (Username)</label>
                  <input
                    required
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
                    placeholder="joao.silva"
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-tecer-primary text-tecer-grayDark dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">Função</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg focus:ring-2 focus:ring-tecer-primary text-tecer-grayDark dark:text-white"
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-tecer-grayMed mb-2">
                  {editingUser ? 'Nova Senha' : 'Senha Inicial'}
                </label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                  <input
                    required={!editingUser}
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Opcional para redefinir senha' : 'Minimo de 8 caracteres'}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-tecer-primary text-tecer-grayDark dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-tecer-grayDark dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 rounded-lg bg-tecer-primary hover:bg-[#1a2e5e] text-white font-bold shadow-lg shadow-tecer-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={18} />
                  {isSubmitting ? 'Salvando...' : editingUser ? 'Salvar Perfil' : 'Criar Perfil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
