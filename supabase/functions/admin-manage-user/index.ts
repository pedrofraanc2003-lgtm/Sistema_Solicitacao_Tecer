import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('PROJECT_URL') ?? '';
const supabaseAnonKey = Deno.env.get('PROJECT_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('PROJECT_SERVICE_ROLE_KEY') ?? '';

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
});

const userClient = (authHeader: string) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeEmail = (value: string) => value.trim().toLowerCase();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { error: 'Missing authorization header' });
  }

  const callerClient = userClient(authHeader);
  const {
    data: { user: callerAuthUser },
    error: callerAuthError,
  } = await callerClient.auth.getUser();

  if (callerAuthError || !callerAuthUser?.email) {
    return json(401, { error: 'Invalid authenticated session' });
  }

  const { data: callerProfile, error: callerProfileError } = await adminClient
    .from('users')
    .select('role, status')
    .eq('email', normalizeEmail(callerAuthUser.email))
    .limit(1)
    .maybeSingle();

  if (callerProfileError) {
    return json(500, { error: callerProfileError.message });
  }

  if (!callerProfile || callerProfile.role !== 'Admin' || callerProfile.status !== 'Ativo') {
    return json(403, { error: 'Only active admins can manage users' });
  }

  const payload = await req.json();
  const action = String(payload.action || '');
  const profile = payload.profile || {};
  const name = String(profile.name || '').trim();
  const email = normalizeEmail(String(profile.email || ''));
  const username = String(profile.username || '').trim().toLowerCase();
  const role = String(profile.role || '');
  const status = String(profile.status || '');
  const password = String(payload.password || '');

  if (!name || !email || !username || !role || !status) {
    return json(400, { error: 'Missing required profile fields' });
  }

  if (action === 'create') {
    if (!password || password.length < 8) {
      return json(400, { error: 'Password must have at least 8 characters' });
    }

    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        username,
        role,
      },
    });

    if (createAuthError || !createdAuth.user) {
      return json(400, { error: createAuthError?.message || 'Failed to create auth user' });
    }

    const profileRow = {
      id: createdAuth.user.id,
      name,
      email,
      username,
      role,
      status,
    };

    const { error: profileError } = await adminClient.from('users').upsert(profileRow, { onConflict: 'id' });
    if (profileError) {
      return json(400, { error: profileError.message });
    }

    return json(200, { user: profileRow });
  }

  if (action === 'update') {
    const userId = String(payload.userId || '').trim();
    if (!userId) {
      return json(400, { error: 'Missing userId for update' });
    }

    const authUpdate: Record<string, unknown> = {
      email,
      user_metadata: {
        name,
        username,
        role,
      },
    };

    if (password) {
      if (password.length < 8) {
        return json(400, { error: 'Password must have at least 8 characters' });
      }
      authUpdate.password = password;
    }

    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(userId, authUpdate);
    if (updateAuthError) {
      return json(400, { error: updateAuthError.message });
    }

    const profileRow = {
      id: userId,
      name,
      email,
      username,
      role,
      status,
    };

    const { error: profileError } = await adminClient.from('users').upsert(profileRow, { onConflict: 'id' });
    if (profileError) {
      return json(400, { error: profileError.message });
    }

    return json(200, { user: profileRow });
  }

  return json(400, { error: 'Unsupported action' });
});
