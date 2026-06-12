import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  if (!SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Service key not available' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const jwt = authHeader.slice(7);
  const authClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: { user }, error: userError } = await authClient.auth.getUser(jwt);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const { data: profile } = await authClient.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const { username, password, name, group_name } = body;
  if (!username || !password || !name) {
    return new Response(JSON.stringify({ error: 'username, password, and name are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const email = `${username.toLowerCase()}@porra.fake`;

  const { data: newUser, error: createError } = await authClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError || !newUser?.user) {
    return new Response(JSON.stringify({ error: createError?.message || 'Failed to create user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  if (group_name) {
    const { error: updateError } = await authClient.from('profiles').update({ group_name }).eq('id', newUser.user.id);
    if (updateError) {
      console.error('Failed to set group:', updateError);
    }
  }

  return new Response(JSON.stringify({ ok: true, user_id: newUser.user.id }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
