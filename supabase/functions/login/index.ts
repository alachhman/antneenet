import { createClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FAKE_USER_EMAIL = 'dashboard@local';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

export function rateLimitOk(
  attemptTimestampsMs: number[],
  nowMs: number,
  max: number,
  windowMs: number,
): boolean {
  const recent = attemptTimestampsMs.filter((t) => nowMs - t < windowMs);
  return recent.length < max;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Load recent attempts for this IP
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: attempts } = await admin
    .from('login_attempts')
    .select('at')
    .eq('ip', ip)
    .gte('at', windowStart);
  const tsList = (attempts ?? []).map((a) => new Date(a.at).getTime());
  if (!rateLimitOk(tsList, Date.now(), RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS)) {
    return json({ error: 'too many attempts, try again later' }, 429);
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  const password = body.password ?? '';
  if (!password) return json({ error: 'password required' }, 400);

  const { data: authRow, error: authErr } = await admin
    .from('app_auth')
    .select('password_hash')
    .eq('id', 1)
    .single();
  if (authErr || !authRow) return json({ error: 'auth not configured' }, 500);

  const match = await bcrypt.compare(password, authRow.password_hash);
  if (!match) {
    await admin.from('login_attempts').insert({ ip });
    return json({ error: 'invalid password' }, 401);
  }

  // Generate a session for the fake user via admin magic link, then exchange the token hash.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: FAKE_USER_EMAIL,
  });
  if (linkErr || !linkData) return json({ error: 'failed to mint session' }, 500);

  const { hashed_token } = linkData.properties;
  const { data: verified, error: verifyErr } = await admin.auth.verifyOtp({
    type: 'magiclink',
    token_hash: hashed_token,
  });
  if (verifyErr || !verified.session) return json({ error: 'failed to verify session' }, 500);

  // Clear attempts on success
  await admin.from('login_attempts').delete().eq('ip', ip);

  return json({
    access_token: verified.session.access_token,
    refresh_token: verified.session.refresh_token,
    expires_at: verified.session.expires_at,
  });
});
