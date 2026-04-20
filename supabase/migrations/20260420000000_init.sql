-- 20260420000000_init.sql
-- Personal Dashboard schema.
-- Enable pgcrypto for gen_random_uuid (available by default on Supabase).
create extension if not exists "pgcrypto";

-- Singleton: shared-password credential
create table public.app_auth (
  id int primary key default 1,
  password_hash text not null,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

-- Singleton: grid layout, keyed by breakpoint
create table public.layouts (
  id int primary key default 1,
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

-- Placed widgets
create table public.widget_instances (
  id uuid primary key default gen_random_uuid(),
  widget_type text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Habits + check-ins
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.habit_checkins (
  habit_id uuid not null references public.habits(id) on delete cascade,
  date date not null,
  primary key (habit_id, date)
);

-- Rate-limiting table for login attempts
create table public.login_attempts (
  ip text not null,
  at timestamptz not null default now()
);
create index login_attempts_ip_at on public.login_attempts (ip, at desc);

-- Enable RLS on every table
alter table public.app_auth enable row level security;
alter table public.layouts enable row level security;
alter table public.widget_instances enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;

-- app_auth: no direct client access (only service role via functions/scripts).
-- Omit policies -> deny by default for authenticated users.

-- layouts, widget_instances, habits, habit_checkins: authenticated = full CRUD.
create policy "layouts all for authenticated"
  on public.layouts for all to authenticated using (true) with check (true);

create policy "widgets all for authenticated"
  on public.widget_instances for all to authenticated using (true) with check (true);

create policy "habits all for authenticated"
  on public.habits for all to authenticated using (true) with check (true);

create policy "checkins all for authenticated"
  on public.habit_checkins for all to authenticated using (true) with check (true);

-- login_attempts: written by Edge Function (service role); no policies for clients.

-- Seed the singleton rows for layouts (app_auth gets seeded by script with password).
insert into public.layouts (id, layout) values (1, '{"lg":[],"md":[],"sm":[],"xs":[]}'::jsonb)
  on conflict (id) do nothing;
