# pmbot Dashboard Widget — Design

**Date:** 2026-06-15
**Status:** Approved (data-flow Approach A, comprehensive metrics)
**Owner:** Anthony
**Spans two repos:** `polymarket-bot` (exporter) and `antneenet` (Supabase migration + widget)

## 1. Goal

Monitor the Polymarket trading bot from antnee.net: money/P&L, live trades & orders,
per-strategy activity, and bot health — in a dashboard widget that matches the existing
antneenet widget system.

## 2. Architecture & data flow

```
polymarket-bot laptop                          Supabase (rkavbrtqszefaayzurgl)        antnee.net
─────────────────────                          ──────────────────────────────        ──────────
pmbot.sqlite ─┐                                                                       pmbot widget
PM US balance ─┼─> exporter (every 60s) ─REST─> pmbot_snapshot (singleton JSONB) ─┬─> View (React Query,
pid/KILL files┘   (service-role key)            pmbot_trades   (history rows)     │   polls 30s)
                                                                                  └─> reads via anon key,
                                                                                      behind login gate
```

A browser widget on the deployed site cannot read the laptop's SQLite and must not hold
PM US secret keys. So a laptop-side **exporter** assembles a snapshot and pushes it to
Supabase; the widget only reads Supabase — the same pattern as the existing `habits` widget.

**Exporter placement: Approach A** — standalone script on a launchd 60s timer, separate
from the trading daemons (zero risk to the live trading loop). Dies on laptop sleep like
the bot; that's acceptable and visible (stale `updated_at` → widget shows "stale").

## 3. Supabase schema (new migration in antneenet)

`supabase/migrations/2026XXXX_pmbot.sql`:

```sql
create table public.pmbot_snapshot (
  id int primary key default 1 check (id = 1),   -- singleton
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.pmbot_trades (
  order_id text primary key,                      -- client order id (idempotent upsert)
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

alter table public.pmbot_snapshot enable row level security;
alter table public.pmbot_trades  enable row level security;

-- authenticated (logged-in app user) may READ; writes come from the exporter via the
-- service role, which bypasses RLS. No client insert/update/delete policies.
create policy "pmbot_snapshot read for authenticated"
  on public.pmbot_snapshot for select to authenticated using (true);
create policy "pmbot_trades read for authenticated"
  on public.pmbot_trades for select to authenticated using (true);

insert into public.pmbot_snapshot (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;
```

This matches the init migration's model (RLS on, `authenticated`-scoped policies,
service-role-only writes — same as `app_auth`/`login_attempts`).

### Snapshot JSON shape (`pmbot_snapshot.data`)

```jsonc
{
  "generated_at": "2026-06-15T20:00:00Z",
  "balance": { "current": 20.009, "buying_power": 20.009, "currency": "USD" },
  "pnl": { "today_realized": 0.0, "daily_loss_limit": 10.0 },
  "risk": { "max_order_usd": 5, "max_total_notional_usd": 40, "open_notional": 0 },
  "strategies": [
    { "name": "basket_arb",  "live": true, "run_started_at": "...", "last_activity": "..." },
    { "name": "news_signal", "live": true, "run_started_at": "...", "last_activity": "..." }
  ],
  "open_orders": [ { "market_id": "...", "side": "BUY", "outcome": "YES",
                    "price": 0.5, "size": 5, "strategy": "...", "created_at": "..." } ],
  "recent_fills": [ /* last 20, newest first */ ],
  "news_decisions": [ /* last 20: market_slug, outcome, true_prob, confidence,
                        reasoning (truncated), placed (bool), ts */ ],
  "health": {
    "daemons": [ { "name": "basket_arb", "up": true, "pid": 719 },
                 { "name": "news_signal", "up": true, "pid": 6674 } ],
    "kill_switch": false,
    "feeds_ok": 5
  }
}
```

`news_decisions` is sourced **only from data the bot already persists** for MVP — the
exporter reads the existing `news_articles` table (and derives "placed" bets from `orders`
where `strategy = 'news_signal'`). The live `NewsSignalStrategy`/`Decider` code is **not
modified** (it is trading with real money; we don't touch it for a dashboard). If
`news_articles` lacks the decision detail we want, the section degrades gracefully to
"recent news_signal orders" + an empty-state note, and richer decision capture becomes a
separate, independently-reviewed change later.

## 4. Exporter (polymarket-bot repo)

`src/pmbot/dashboard/exporter.py` + console entry `pmbot-export` (one-shot: build snapshot
→ upsert). Plus `scripts/com.antnee.pmbot-exporter.plist` (launchd, `StartInterval=60`).

- Reads SQLite (orders, fills, strategy_runs, news_decisions) read-only.
- Live balance via existing `RestClient.get_balance()`.
- Daemon liveness via `logs/pmbot.pid` / `logs/news.pid` + `os.kill(pid, 0)`.
- Kill switch via `KILL` file existence; daily PnL via `compute_today_realized_pnl`.
- Upserts `pmbot_snapshot` (id=1) and new `pmbot_trades` rows via Supabase REST
  (`POST /rest/v1/...` with `apikey`/`Authorization: Bearer <service_role>`,
  `Prefer: resolution=merge-duplicates`).
- Config from bot `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (operator-provided;
  service-role key is a secret, added to `.env` only — gitignored).
- Failures log + exit non-zero (launchd retries next interval); never touches trading state.

## 5. Widget (antneenet repo) — `src/widgets/pmbot/`

Follows the `habits` pattern exactly:

- `index.tsx` — `pmbotDefinition: WidgetDefinition<PmbotConfig>` (`type: 'pmbot'`,
  `displayName: 'Trading Bot'`, `defaultSize: { w: 4, h: 4 }`, `minSize: { w: 3, h: 3 }`).
- `queries.ts` — `usePmbotSnapshot()` (React Query, `refetchInterval: 30_000`, reads
  `pmbot_snapshot` row 1) and `usePmbotTrades(limit)` (reads `pmbot_trades`).
- `View.tsx` — four sections using the existing design system (`Raised`, `Inset`,
  `DataRow`, `Label`, `ScrollableArea`, `tokens.css`):
  1. **P&L** — balance, today's realized, daily-loss gauge vs $10, open notional vs $40.
  2. **Trades** — open orders + recent fills (from snapshot; full history scrolls `pmbot_trades`).
  3. **Strategies** — basket_arb / news_signal live badges + latest `news_decisions`.
  4. **Health** — per-daemon up/down, kill-switch state, feeds_ok, "data N s ago" staleness.
- `Settings.tsx` — minimal (no config needed for MVP; empty `PmbotConfig`). Optional toggle
  to hide sections later (YAGNI for now).

Registration: add `'pmbot'` to `WidgetType` in `database-types.ts`; add snapshot/trade row
types; register `pmbotDefinition` in `widget-registry.ts`. It then appears in
`AddWidgetPicker` automatically.

## 6. Staleness & empty states

- Widget computes `age = now - generated_at`. If `age > 180s` → amber "stale (laptop asleep?)".
- Empty `open_orders`/`recent_fills`/`news_decisions` render friendly "nothing yet" rows
  (the bot has placed 0 real trades so far — the dashboard must look correct at zero).

## 7. Testing

- **antneenet:** Vitest + Testing Library, mock `supabase` (as existing widget tests do):
  View renders P&L/trades/strategies/health from a fixture snapshot; staleness banner appears
  when `generated_at` is old; empty-state rows when arrays are empty. `queries.ts` shape test.
- **polymarket-bot:** unit-test snapshot assembly (`build_snapshot(conn, ...)` → dict) against
  a seeded in-memory SQLite (fills/orders/strategy_runs); assert balance/pnl/health fields and
  that the Supabase POST payload is well-formed (mock the HTTP client). TDD, matching the
  repo's existing test style.

## 8. Out of scope (future)

- Real-time (websocket) updates — 30s polling is enough.
- Charts/equity curve — add once there's trade history worth plotting.
- Multi-bot / multi-account.
- Structured per-decision capture in the live `news_signal` strategy (separate change —
  not done while it trades real money).
- `supabase gen types` — keep hand-written types per the repo's current convention.

## 9. Operator steps (one-time)

1. Apply migration: `npm run db:push` (antneenet).
2. Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to polymarket-bot `.env`.
3. `launchctl load` the exporter plist.
4. Deploy antneenet (existing deploy flow) with the new widget.
5. Add the "Trading Bot" widget on the dashboard.
