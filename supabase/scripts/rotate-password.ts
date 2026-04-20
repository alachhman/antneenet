import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const url = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const newPassword = process.env.INITIAL_PASSWORD!;
const forceLogout = process.argv.includes('--force-logout');

if (!url || !serviceKey || !newPassword) {
  console.error('Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INITIAL_PASSWORD');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const FAKE_USER_EMAIL = 'dashboard@local';

async function main() {
  const hash = await bcrypt.hash(newPassword, 12);
  const { error } = await admin
    .from('app_auth')
    .update({ password_hash: hash, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
  console.log('Password rotated.');

  if (forceLogout) {
    const { data: users } = await admin.auth.admin.listUsers();
    const fake = users.users.find((u) => u.email === FAKE_USER_EMAIL);
    if (fake) {
      await admin.auth.admin.signOut(fake.id);
      console.log('All existing sessions invalidated.');
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
