import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WorkshopKanbanItem } from '../../types';
import { createWorkshopItem, listWorkshopItems, removeWorkshopItem, saveWorkshopItem } from '../../services/data/workshopApi';
import { useAppSync } from './AppSyncProvider';
import { useToast } from '../../ui/ToastProvider';
import { useAuditLogsData } from './AuditLogsProvider';
import { useAuth } from './AuthProvider';
import { useEquipmentsData } from './EquipmentsProvider';
import { buildEquipmentMap } from '../../domains/requests/selectors';

type WorkshopContextValue = {
  workshopItems: WorkshopKanbanItem[];
  refreshWorkshopItems: () => Promise<void>;
  createWorkshopCardAction: (
    input: Omit<WorkshopKanbanItem, 'id' | 'createdAt' | 'updatedAt' | 'tag' | 'equipmentName'>,
    equipmentId: string
  ) => Promise<void>;
  saveWorkshopItemAction: (item: WorkshopKanbanItem) => Promise<void>;
  removeWorkshopItemAction: (item: WorkshopKanbanItem) => Promise<void>;
};

const WorkshopContext = createContext<WorkshopContextValue | null>(null);

export function WorkshopProvider({ children }: { children: React.ReactNode }) {
  const { pushToast } = useToast();
  const { user } = useAuth();
  const { appendAuditAction } = useAuditLogsData();
  const { equipments } = useEquipmentsData();
  const { registerRefresher } = useAppSync();
  const [workshopItems, setWorkshopItems] = useState<WorkshopKanbanItem[]>([]);
  const equipmentMap = useMemo(() => buildEquipmentMap(equipments), [equipments]);

  const refreshWorkshopItems = useCallback(async () => {
    setWorkshopItems(await listWorkshopItems().catch(() => []));
  }, []);

  useEffect(() => registerRefresher('workshop', refreshWorkshopItems), [refreshWorkshopItems, registerRefresher]);

  const createWorkshopCardAction = useCallback<WorkshopContextValue['createWorkshopCardAction']>(async (input, equipmentId) => {
    const equipment = equipmentMap[equipmentId];
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
  }, [appendAuditAction, equipmentMap, pushToast, user]);

  const saveWorkshopItemAction = useCallback<WorkshopContextValue['saveWorkshopItemAction']>(async item => {
    const saved = await saveWorkshopItem(item);
    setWorkshopItems(prev => prev.map(current => (current.id === saved.id ? saved : current)));
    pushToast('Item do Kanban atualizado.', 'success');
  }, [pushToast]);

  const removeWorkshopItemAction = useCallback<WorkshopContextValue['removeWorkshopItemAction']>(async item => {
    await removeWorkshopItem(item.id);
    setWorkshopItems(prev => prev.filter(current => current.id !== item.id));
    pushToast('Item removido do Kanban.', 'success');
  }, [pushToast]);

  const value = useMemo<WorkshopContextValue>(
    () => ({
      workshopItems,
      refreshWorkshopItems,
      createWorkshopCardAction,
      saveWorkshopItemAction,
      removeWorkshopItemAction,
    }),
    [createWorkshopCardAction, refreshWorkshopItems, removeWorkshopItemAction, saveWorkshopItemAction, workshopItems]
  );

  return <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>;
}

export function useWorkshopData() {
  const context = useContext(WorkshopContext);
  if (!context) {
    throw new Error('useWorkshopData must be used within WorkshopProvider');
  }

  return context;
}
