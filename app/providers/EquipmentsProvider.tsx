import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Equipment } from '../../types';
import { listEquipments, saveEquipment, type EquipmentInput } from '../../services/data/equipmentApi';
import { useAppSync } from './AppSyncProvider';
import { useToast } from '../../ui/ToastProvider';

type EquipmentsContextValue = {
  equipments: Equipment[];
  refreshEquipments: () => Promise<void>;
  saveEquipmentAction: (input: Equipment | EquipmentInput) => Promise<Equipment>;
};

const EquipmentsContext = createContext<EquipmentsContextValue | null>(null);

export function EquipmentsProvider({ children }: { children: React.ReactNode }) {
  const { pushToast } = useToast();
  const { registerRefresher } = useAppSync();
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const refreshEquipments = async () => {
    setEquipments(await listEquipments());
  };

  useEffect(() => registerRefresher('equipments', refreshEquipments), [registerRefresher]);

  const value = useMemo<EquipmentsContextValue>(
    () => ({
      equipments,
      refreshEquipments,
      saveEquipmentAction: async input => {
        const saved = await saveEquipment(input);
        setEquipments(prev => {
          const exists = prev.some(item => item.id === saved.id);
          return exists ? prev.map(item => (item.id === saved.id ? saved : item)) : [...prev, saved];
        });
        pushToast(`Equipamento ${saved.tag} salvo com sucesso.`, 'success');
        return saved;
      },
    }),
    [pushToast]
  );

  return <EquipmentsContext.Provider value={value}>{children}</EquipmentsContext.Provider>;
}

export function useEquipmentsData() {
  const context = useContext(EquipmentsContext);
  if (!context) {
    throw new Error('useEquipmentsData must be used within EquipmentsProvider');
  }

  return context;
}
