import { AuditLog, User } from '../../types';
import { supabase } from '../supabaseClient';
import { sortByNewest, safeUuid } from './utils';

export type AuditInput = Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>;

export async function listAuditLogs() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('audit_logs').select('*');
  if (error) throw new Error(error.message);
  return sortByNewest((data || []) as AuditLog[]);
}

export async function appendAuditLog(actor: User, input: AuditInput) {
  const log: AuditLog = {
    id: safeUuid(),
    timestamp: new Date().toISOString(),
    userId: actor.id,
    userName: actor.name,
    userRole: actor.role,
    ...input,
  };

  if (!supabase) {
    return log;
  }

  const { error } = await supabase.from('audit_logs').upsert(log, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return log;
}
