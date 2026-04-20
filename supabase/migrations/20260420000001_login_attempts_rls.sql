-- Enable RLS on login_attempts. No client-facing policies → deny-by-default.
-- The login Edge Function writes/reads using the service-role key which bypasses RLS.
alter table public.login_attempts enable row level security;
