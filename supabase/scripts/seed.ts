import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const initialPassword = process.env.INITIAL_PASSWORD!;

if (!url || !serviceKey || !initialPassword) {
  console.error('Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INITIAL_PASSWORD');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const FAKE_USER_EMAIL = 'dashboard@local';
const FAKE_USER_PASSWORD_PLACEHOLDER = 'never-used-directly'; // user never logs in with this
const BCRYPT_ROUNDS = 12;

async function main() {
  // 1. Ensure the fake Supabase user exists.
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === FAKE_USER_EMAIL);

  if (!found) {
    const { error } = await admin.auth.admin.createUser({
      email: FAKE_USER_EMAIL,
      password: FAKE_USER_PASSWORD_PLACEHOLDER,
      email_confirm: true,
    });
    if (error) throw error;
    console.log(`Created fake user ${FAKE_USER_EMAIL}`);
  } else {
    console.log(`Fake user ${FAKE_USER_EMAIL} already exists`);
  }

  // 2. Upsert hashed password into app_auth.
  const hash = await bcrypt.hash(initialPassword, BCRYPT_ROUNDS);
  const { error: upsertErr } = await admin
    .from('app_auth')
    .upsert({ id: 1, password_hash: hash, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (upsertErr) throw upsertErr;
  console.log('Password hash written to app_auth');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
