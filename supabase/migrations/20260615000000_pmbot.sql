-- pmbot dashboard: snapshot (singleton) + trade history.
-- Reads by the logged-in app user (authenticated). Writes come from the
-- laptop-side exporter via the service role, which bypasses RLS.

create table public.pmbot_snapshot (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.pmbot_trades (
  order_id text primary key,
  strategy text not null,
  market_id text not null,
  outcome text not null,
  side text not null,
  price double precision not null,
  size double precision not null,
  status text not null,
  filled_size double precision,
  realized_pnl double precision,
  created_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index pmbot_trades_created_at_idx on public.pmbot_trades (created_at desc);

alter table public.pmbot_snapshot enable row level security;
alter table public.pmbot_trades  enable row level security;

-- authenticated may READ only; no insert/update/delete policies (service-role writes).
create policy "pmbot_snapshot read for authenticated"
  on public.pmbot_snapshot for select to authenticated using (true);

create policy "pmbot_trades read for authenticated"
  on public.pmbot_trades for select to authenticated using (true);

insert into public.pmbot_snapshot (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;
