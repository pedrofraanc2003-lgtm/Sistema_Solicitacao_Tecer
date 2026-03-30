import React, { useState } from 'react';
import { AlertTriangle, Edit, Key, Mail, Plus, Search, Shield, User as UserIcon, XCircle } from 'lucide-react';
import { useAuditLogsData, useUsersData } from '../app/hooks';
import { AuditLog, User, UserRole, UserStatus } from '../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Toolbar from '../ui/Toolbar';

interface UsersProps {
  users: User[];
  onSaveUser: (input: {
    id?: string;
    name: string;
    email: string;
    username: string;
    role: User['role'];
    status: User['status'];
    password?: string;
  }) => Promise<User>;
  onAudit: (input: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<void>;
}

const UsersView: React.FC<UsersProps> = ({ users, onSaveUser, onAudit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    username: '',
    role: UserRole.LIDERANCA,
    status: UserStatus.ATIVO,
    password: '',
  });

  const filteredUsers = users.filter(user =>
    [user.name, user.email || '', user.username, user.role].some(value => value.toLowerCase().includes(search.toLowerCase()))
  );

  const activeUsers = users.filter(user => user.status === UserStatus.ATIVO).length;

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      username: '',
      role: UserRole.LIDERANCA,
      status: UserStatus.ATIVO,
      password: '',
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      id: editingUser?.id,
      name: String(formData.name || '').trim(),
      email: String(formData.email || '').trim().toLowerCase(),
      username: String(formData.username || '').trim().toLowerCase(),
      role: formData.role as UserRole,
      status: formData.status as UserStatus,
      password: String(formData.password || '').trim() || undefined,
    };

    if (!payload.name || !payload.email || !payload.username) {
      return;
    }

    if (!editingUser && !payload.password) {
      return;
    }

    setIsSubmitting(true);
    try {
      const savedUser = await onSaveUser(payload);
      await onAudit({
        actionType: editingUser ? 'Edição' : 'Criação',
        entity: 'Usuário',
        entityId: editingUser?.username || savedUser.username,
        summary: editingUser
          ? `Alterou perfil/dados do usuário ${editingUser.username}`
          : `Cadastrou novo perfil no sistema: ${savedUser.name}`,
      });
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tecer-page space-y-6">
      <div className="tecer-view-header">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="tecer-view-headline">
            <p className="tecer-view-kicker">Administração</p>
            <h2 className="font-display text-3xl font-extrabold text-tecer-grayDark dark:text-white">Gestão de usuários</h2>
            <p className="text-sm text-tecer-grayMed">Controle de perfis, acessos e situação operacional dos usuários do sistema.</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={20} />
            Cadastrar perfil
          </Button>
        </div>
        <div className="tecer-view-summary">
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Usuários</span>
            <span className="tecer-view-stat-value">{users.length}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Ativos</span>
            <span className="tecer-view-stat-value">{activeUsers}</span>
          </div>
          <div className="tecer-view-stat">
            <span className="tecer-view-stat-label">Filtrados</span>
            <span className="tecer-view-stat-value">{filteredUsers.length}</span>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-orange-200 bg-orange-50 p-4 text-sm text-tecer-grayDark">
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <span>Esta tela cria e atualiza o usuário no Supabase Authentication e sincroniza o perfil de acesso do sistema.</span>
        </div>
      </div>

      <Toolbar>
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" size={18} />
          <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Pesquisar por nome, e-mail, login ou função..." className="pl-10" />
        </div>
      </Toolbar>

      <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-md dark:border-gray-700 dark:bg-tecer-darkCard">
        <div className="overflow-x-auto">
          <table className="tecer-table w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-bold uppercase text-tecer-grayMed dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Login</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-tecer-grayDark dark:divide-gray-700 dark:text-gray-300">
              {filteredUsers.map(user => (
                <tr key={user.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-tecer-primary/10 font-bold text-tecer-primary">
                        {user.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-tecer-grayMed">{user.email || 'N/D'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-tecer-grayMed">{user.username}</td>
                  <td className="px-6 py-4">
                    <Badge tone={user.role === UserRole.ADMIN ? 'info' : user.role === UserRole.COMPRAS ? 'warning' : 'default'}>{user.role}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge tone={user.status === UserStatus.ATIVO ? 'success' : 'danger'}>{user.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        setEditingUser(user);
                        setFormData({ ...user, password: '' });
                        setIsModalOpen(true);
                      }}
                      className="rounded-full p-2 text-tecer-primary transition-colors hover:bg-tecer-bgLight dark:hover:bg-gray-700"
                    >
                      <Edit size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen ? (
        <Modal title={editingUser ? 'Editar perfil' : 'Novo perfil'} onClose={closeModal} className="max-w-md">
          <form onSubmit={handleSubmit} className="space-y-6 p-8">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Nome completo</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                <Input required value={formData.name || ''} onChange={event => setFormData(prev => ({ ...prev, name: event.target.value }))} placeholder="Ex: João da Silva" className="pl-10" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">E-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                <Input required type="email" value={formData.email || ''} onChange={event => setFormData(prev => ({ ...prev, email: event.target.value.toLowerCase().trim() }))} placeholder="usuario@empresa.com" className="pl-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Login</label>
                <Input required value={formData.username || ''} onChange={event => setFormData(prev => ({ ...prev, username: event.target.value.toLowerCase().trim() }))} placeholder="joao.silva" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Função</label>
                <Select required value={formData.role} onChange={event => setFormData(prev => ({ ...prev, role: event.target.value as UserRole }))}>
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">Status</label>
                <Select required value={formData.status} onChange={event => setFormData(prev => ({ ...prev, status: event.target.value as UserStatus }))}>
                  {Object.values(UserStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase text-tecer-grayMed">{editingUser ? 'Nova senha' : 'Senha inicial'}</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tecer-grayMed" />
                  <Input required={!editingUser} type="password" value={formData.password || ''} onChange={event => setFormData(prev => ({ ...prev, password: event.target.value }))} placeholder={editingUser ? 'Opcional para redefinir senha' : 'Mínimo de 8 caracteres'} className="pl-10" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                <Shield size={18} />
                {isSubmitting ? 'Salvando...' : editingUser ? 'Salvar perfil' : 'Criar perfil'}
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
};

export default function Users() {
  const { users, saveManagedUserAction } = useUsersData();
  const { appendAuditAction } = useAuditLogsData();

  return <UsersView users={users} onSaveUser={saveManagedUserAction} onAudit={appendAuditAction} />;
}
