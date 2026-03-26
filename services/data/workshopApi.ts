import { Equipment, WorkshopKanbanItem } from '../../types';
import { supabase } from '../supabaseClient';
import { safeUuid, sortByNewest } from './utils';

const table = 'workshop_kanban_items';

const mapRowToItem = (row: any): WorkshopKanbanItem => ({
  id: String(row.id),
  equipmentId: String(row.equipment_id),
  tag: String(row.tag),
  equipmentName: String(row.equipment_name),
  maintenanceType: row.maintenance_type,
  description: String(row.description),
  status: row.status,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
});

const mapItemToRow = (item: WorkshopKanbanItem) => ({
  id: item.id,
  equipment_id: item.equipmentId,
  tag: item.tag,
  equipment_name: item.equipmentName,
  maintenance_type: item.maintenanceType,
  description: item.description,
  status: item.status,
  created_at: item.createdAt,
  updated_at: item.updatedAt,
});

export async function listWorkshopItems() {
  if (!supabase) return [];
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(error.message);
  return sortByNewest((data || []).map(mapRowToItem));
}

export async function createWorkshopItem(input: Omit<WorkshopKanbanItem, 'id' | 'createdAt' | 'updatedAt' | 'tag' | 'equipmentName'>, equipment: Equipment) {
  const now = new Date().toISOString();
  const item: WorkshopKanbanItem = {
    id: safeUuid(),
    equipmentId: equipment.id,
    tag: equipment.tag,
    equipmentName: equipment.name,
    maintenanceType: input.maintenanceType,
    description: input.description,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  if (!supabase) return item;
  const { error } = await supabase.from(table).upsert(mapItemToRow(item), { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return item;
}

export async function saveWorkshopItem(item: WorkshopKanbanItem) {
  const nextItem = { ...item, updatedAt: new Date().toISOString() };
  if (!supabase) return nextItem;
  const { error } = await supabase.from(table).upsert(mapItemToRow(nextItem), { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return nextItem;
}

export async function removeWorkshopItem(itemId: string) {
  if (!supabase) return true;
  const { error } = await supabase.from(table).delete().eq('id', itemId);
  if (error) throw new Error(error.message);
  return true;
}
