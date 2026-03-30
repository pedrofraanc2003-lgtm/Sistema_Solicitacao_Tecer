import { supabase } from '../../../services/supabaseClient';

export async function lookupCatalogCode(rawCode: string) {
  const code = rawCode.trim();
  if (!code || !supabase) {
    return null;
  }

  const { data, error } = await supabase.from('code').select('descricao').eq('codigo', code).limit(1);
  if (error) {
    throw new Error(error.message);
  }

  const description = data?.[0]?.descricao;
  return description ? String(description) : null;
}
