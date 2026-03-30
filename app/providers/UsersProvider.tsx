import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../../types';
import { listUsers, saveManagedUser } from '../../services/data/userApi';
import { useAppSync } from './AppSyncProvider';
import { useToast } from '../../ui/ToastProvider';

type UsersContextValue = {
  users: User[];
  refreshUsers: () => Promise<void>;
  saveManagedUserAction: (input: Parameters<typeof saveManagedUser>[0]) => Promise<User>;
};

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const { pushToast } = useToast();
  const { registerRefresher } = useAppSync();
  const [users, setUsers] = useState<User[]>([]);

  const refreshUsers = async () => {
    setUsers(await listUsers());
  };

  useEffect(() => registerRefresher('users', refreshUsers), [registerRefresher]);

  const value = useMemo<UsersContextValue>(
    () => ({
      users,
      refreshUsers,
      saveManagedUserAction: async input => {
        const saved = await saveManagedUser(input);
        setUsers(prev => {
          const exists = prev.some(item => item.id === saved.id);
          return exists ? prev.map(item => (item.id === saved.id ? saved : item)) : [...prev, saved];
        });
        pushToast(`Usuário ${saved.name} salvo com sucesso.`, 'success');
        return saved;
      },
    }),
    [pushToast]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsersData() {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsersData must be used within UsersProvider');
  }

  return context;
}
