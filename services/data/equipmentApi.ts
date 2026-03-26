import { Equipment } from '../../types';
import { MOCK_EQUIPMENTS } from '../mockData';
import { supabase } from '../supabaseClient';
import { safeUuid } from './utils';

export type EquipmentInput = Omit<Equipment, 'id'>;

export async function listEquipments() {
  if (!supabase) return MOCK_EQUIPMENTS;
  const { data, error } = await supabase.from('equipments').select('*').order('tag');
  if (error) throw new Error(error.message);
  return (data || []) as Equipment[];
}

export async function saveEquipment(input: Equipment | EquipmentInput) {
  const equipment: Equipment = 'id' in input ? input : { ...input, id: safeUuid() };
  if (!supabase) return equipment;
  const { error } = await supabase.from('equipments').upsert(equipment, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return equipment;
}
