import { User } from '../../types';
import { MOCK_USERS } from '../mockData';
import { manageSupabaseUser } from '../supabase';
import { supabase } from '../supabaseClient';

export async function listUsers() {
  if (!supabase) return MOCK_USERS;
  const { data, error } = await supabase.from('users').select('*').order('name');
  if (error) throw new Error(error.message);
  return (data || []) as User[];
}

export async function saveManagedUser(input: {
  id?: string;
  name: string;
  email: string;
  username: string;
  role: User['role'];
  status: User['status'];
  password?: string;
}) {
  return manageSupabaseUser(input.id ? 'update' : 'create', input);
}
