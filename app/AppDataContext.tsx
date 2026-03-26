import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AuditLog,
  Equipment,
  MaintenanceRequest,
  Notification,
  User,
  UserRole,
  UserStatus,
  WorkshopKanbanItem,
} from '../types';
import { getDatabaseHealthStatus, hasSupabaseConfig } from '../services/supabase';
import { useToast } from '../ui/ToastProvider';
import { createRequest, listRequests, RequestCreateInput, RequestUpdateInput, updateRequest } from '../services/data/requestApi';
import { appendAuditLog, listAuditLogs, type AuditInput } from '../services/data/auditApi';
import { listEquipments, saveEquipment, type EquipmentInput } from '../services/data/equipmentApi';
import { listUsers, saveManagedUser } from '../services/data/userApi';
import { createWorkshopItem, listWorkshopItems, removeWorkshopItem, saveWorkshopItem } from '../services/data/workshopApi';
import { getSessionUser, signOut, subscribeToAuthChanges } from '../services/data/authApi';
import { safeUuid } from '../services/data/utils';

type CloudStatus = {
  online: boolean;
  syncing: boolean;
  message: string;
};

type AppDataContextValue = {
  user: User | null;
  isAuthLoading: boolean;
  requests: MaintenanceRequest[];
  equipments: Equipment[];
  users: User[];
  auditLogs: AuditLog[];
  workshopItems: WorkshopKanbanItem[];
  notifications: Notification[];
  theme: 'light' | 'dark';
  isRefreshing: boolean;
  cloudStatus: CloudStatus;
  setTheme: React.Dispatch<React.SetStateAction<'light' | 'dark'>>;
  refreshData: () => Promise<void>;
  setAuthenticatedUser: (user: User | null) => void;
  logout: () => Promise<void>;
  createRequestAction: (input: RequestCreateInput) => Promise<void>;
  updateRequestAction: (current: MaintenanceRequest, input: RequestUpdateInput) => Promise<void>;
  saveEquipmentAction: (input: Equipment | EquipmentInput, audit?: AuditInput) => Promise<Equipment>;
  saveManagedUserAction: (input: Parameters<typeof saveManagedUser>[0]) => Promise<User>;
  appendAuditAction: (input: AuditInput) => Promise<void>;
  pushNotification: (message: string, requestId: string) => void;
  markNotificationsRead: () => void;
  createWorkshopCardAction: (
    input: Omit<WorkshopKanbanItem, 'id' | 'createdAt' | 'updatedAt' | 'tag' | 'equipmentName'>,
    equipmentId: string
  ) => Promise<void>;
  saveWorkshopItemAction: (item: WorkshopKanbanItem, audit?: AuditInput) => Promise<void>;
  removeWorkshopItemAction: (item: WorkshopKanbanItem, audit?: AuditInput) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { pushToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [workshopItems, setWorkshopItems] = useState<WorkshopKanbanItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('tecer_theme') as 'light' | 'dark') || 'light');
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({
    online: hasSupabaseConfig,
    syncing: false,
    message: hasSupabaseConfig ? 'Pronto para sincronização com Supabase.' : 'Modo local ativo.',
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('tecer_theme', theme);
  }, [theme]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setCloudStatus(prev => ({ ...prev, syncing: true }));
    try {
      const [health, nextRequests, nextEquipments, nextUsers, nextAuditLogs, nextWorkshopItems] = await Promise.all([
        getDatabaseHealthStatus(),
        listRequests(),
        listEquipments(),
        listUsers(),
        listAuditLogs().catch(() => []),
        listWorkshopItems().catch(() => []),
      ]);

      setRequests(nextRequests);
      setEquipments(nextEquipments);
      setUsers(nextUsers);
      setAuditLogs(nextAuditLogs);
      setWorkshopItems(nextWorkshopItems);
      setCloudStatus({
        online: health.ok,
        syncing: false,
        message: [health.message, ...health.details].join(' | '),
      });
    } catch (error) {
      setCloudStatus({
        online: false,
        syncing: false,
        message: error instanceof Error ? error.message : 'Falha ao atualizar dados.',
      });
      pushToast(error instanceof Error ? error.message : 'Falha ao atualizar dados.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    let active = true;
    const loadingGuard = window.setTimeout(() => {
      if (!active) return;
      setUser(null);
      setIsAuthLoading(false);
    }, 7000);

    void getSessionUser().then(profile => {
      if (!active) return;
      setUser(profile);
      setIsAuthLoading(false);
      window.clearTimeout(loadingGuard);
    });

    const subscription = subscribeToAuthChanges(nextUser => {
      if (!active) return;
      setUser(nextUser);
      setIsAuthLoading(false);
      window.clearTimeout(loadingGuard);
    });

    return () => {
      active = false;
      window.clearTimeout(loadingGuard);
      subscription.unsubscribe();
    };
  }, []);

  const appendAuditAction = useCallback(
    async (input: AuditInput) => {
      if (!user) return;
      const log = await appendAuditLog(user, input);
      setAuditLogs(prev => [log, ...prev]);
    },
    [user]
  );

  const pushNotification = useCallback((message: string, requestId: string) => {
    setNotifications(prev => [
      {
        id: safeUuid(),
        message,
        requestId,
        timestamp: new Date().toISOString(),
        read: false,
      },
      ...prev,
    ]);
  }, []);

  const createRequestAction = useCallback(
    async (input: RequestCreateInput) => {
      if (!user) throw new Error('Usuário não autenticado.');
      const request = await createRequest(user, input);
      setRequests(prev => [request, ...prev]);
      await appendAuditAction({
        actionType: 'Criação',
        entity: 'Solicitação',
        entityId: request.id,
        summary: `Criou nova solicitação (${request.type})`,
      });
      pushToast(`Solicitação ${request.id} criada com sucesso.`, 'success');
    },
    [appendAuditAction, pushToast, user]
  );

  const updateRequestAction = useCallback(
    async (current: MaintenanceRequest, input: RequestUpdateInput) => {
      if (!user) throw new Error('Usuário não autenticado.');
      const updated = await updateRequest(user, current, input);
      setRequests(prev => prev.map(request => (request.id === current.id ? updated : request)));

      const statusChanged = updated.status !== current.status;
      await appendAuditAction({
        actionType: statusChanged ? 'Status' : 'Edição',
        entity: 'Solicitação',
        entityId: current.id,
        summary: statusChanged ? `Alterou status para ${updated.status}` : 'Atualizou detalhes da solicitação',
      });

      if (user.role === UserRole.LIDERANCA) {
        pushNotification(`Liderança ${user.name} atualizou a ${current.id}.`, current.id);
      }

      pushToast(`Solicitação ${current.id} atualizada.`, 'success');
    },
    [appendAuditAction, pushNotification, pushToast, user]
  );

  const saveEquipmentAction = useCallback(
    async (input: Equipment | EquipmentInput, audit?: AuditInput) => {
      const saved = await saveEquipment(input);
      setEquipments(prev => {
        const exists = prev.some(item => item.id === saved.id);
        return exists ? prev.map(item => (item.id === saved.id ? saved : item)) : [...prev, saved];
      });
      if (audit && user) {
        await appendAuditAction(audit);
      }
      pushToast(`Equipamento ${saved.tag} salvo com sucesso.`, 'success');
      return saved;
    },
    [appendAuditAction, pushToast, user]
  );

  const saveManagedUserAction = useCallback(
    async (input: Parameters<typeof saveManagedUser>[0]) => {
      const saved = await saveManagedUser(input);
      setUsers(prev => {
        const exists = prev.some(item => item.id === saved.id);
        return exists ? prev.map(item => (item.id === saved.id ? saved : item)) : [...prev, saved];
      });
      pushToast(`Usuário ${saved.name} salvo com sucesso.`, 'success');
      return saved;
    },
    [pushToast]
  );

  const createWorkshopCardAction = useCallback(
    async (
      input: Omit<WorkshopKanbanItem, 'id' | 'createdAt' | 'updatedAt' | 'tag' | 'equipmentName'>,
      equipmentId: string
    ) => {
      const equipment = equipments.find(item => item.id === equipmentId);
      if (!equipment) throw new Error('Equipamento não encontrado.');
      const item = await createWorkshopItem(input, equipment);
      setWorkshopItems(prev => [item, ...prev]);
      if (user) {
        await appendAuditAction({
          actionType: 'Criação',
          entity: 'Kanban Oficina',
          entityId: equipment.tag,
          summary: `Inseriu ${equipment.tag} no Kanban da Oficina como ${item.status}`,
        });
      }
      pushToast(`Item ${equipment.tag} adicionado ao Kanban.`, 'success');
    },
    [appendAuditAction, equipments, pushToast, user]
  );

  const saveWorkshopItemAction = useCallback(
    async (item: WorkshopKanbanItem, audit?: AuditInput) => {
      const saved = await saveWorkshopItem(item);
      setWorkshopItems(prev => prev.map(current => (current.id === saved.id ? saved : current)));
      if (audit && user) {
        await appendAuditAction(audit);
      }
      pushToast('Item do Kanban atualizado.', 'success');
    },
    [appendAuditAction, pushToast, user]
  );

  const removeWorkshopItemAction = useCallback(
    async (item: WorkshopKanbanItem, audit?: AuditInput) => {
      await removeWorkshopItem(item.id);
      setWorkshopItems(prev => prev.filter(current => current.id !== item.id));
      if (audit && user) {
        await appendAuditAction(audit);
      }
      pushToast('Item removido do Kanban.', 'success');
    },
    [appendAuditAction, pushToast, user]
  );

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      user,
      isAuthLoading,
      requests,
      equipments,
      users,
      auditLogs,
      workshopItems,
      notifications,
      theme,
      isRefreshing,
      cloudStatus,
      setTheme,
      refreshData,
      setAuthenticatedUser: setUser,
      logout,
      createRequestAction,
      updateRequestAction,
      saveEquipmentAction,
      saveManagedUserAction,
      appendAuditAction,
      pushNotification,
      markNotificationsRead: () => setNotifications(prev => prev.map(item => ({ ...item, read: true }))),
      createWorkshopCardAction,
      saveWorkshopItemAction,
      removeWorkshopItemAction,
    }),
    [
      user,
      isAuthLoading,
      requests,
      equipments,
      users,
      auditLogs,
      workshopItems,
      notifications,
      theme,
      isRefreshing,
      cloudStatus,
      refreshData,
      logout,
      createRequestAction,
      updateRequestAction,
      saveEquipmentAction,
      saveManagedUserAction,
      appendAuditAction,
      pushNotification,
      createWorkshopCardAction,
      saveWorkshopItemAction,
      removeWorkshopItemAction,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }

  return context;
}
