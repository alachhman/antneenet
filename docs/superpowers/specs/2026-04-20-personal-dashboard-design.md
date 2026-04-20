# Personal Dashboard — Design

**Date:** 2026-04-20
**Status:** Draft, awaiting review
**Repo:** `antneenet`

## Summary

A personal, self-hosted web dashboard that acts as a start page, quantified-self tracker, and info aggregator in one. Built on the already-scaffolded Vite + React + TypeScript project. Data syncs across devices via Supabase. Gated by a single shared password (no accounts). Visual direction: dense, information-rich UI rendered on a deep-navy / cyan neumorphic base.

The MVP ships five widgets (bookmarks, weather, habits, stocks, tech feed) placed on a draggable bento grid. The architecture is deliberately widget-centric so new categories of information get added as new widgets later, without reshaping the shell.

## Goals and non-goals

**Goals**
- One dashboard the user opens every day that replaces their browser new-tab page.
- Five useful widgets on day one, each carrying its weight.
- Cross-device sync (laptop, phone) with low-friction auth.
- Design that makes it obvious how to add more widgets later.

**Non-goals (MVP)**
- Multi-user or account management.
- Rich charts / historical views inside widgets.
- X/Twitter integration (dropped — API costs out of proportion to value).
- Preview deploys per PR, CI test suite, PWA install flow.
- Multi-page / tabbed dashboards.

## Architecture overview

**Stack**
- **Frontend**: Vite + React + TypeScript (already scaffolded). Bento grid via `react-grid-layout`. Server state via TanStack Query; small client state (edit mode, etc.) via Zustand. Styling via CSS Modules plus a small in-house neumorphic primitive library.
- **Backend**: Supabase (Pro tier) — Postgres for data, Edge Functions for login + external-API proxies, Auth for session handling.
- **Hosting**: GitHub Pages, deployed via GitHub Actions on push to `main`.

**Repo shape**

```
src/
  app/                    # shell: layout, routing, auth guard, top bar
  widgets/                # one folder per widget, each self-contained
    bookmarks/
    weather/
    habits/
    stocks/
    tech-feed/
  lib/
    supabase.ts           # client
    auth.ts               # login/logout/session
    widget-registry.ts    # central list of available widgets
    widget-types.ts       # WidgetDefinition contract
  ui/                     # neumorphic primitives
  styles/                 # tokens, theme
supabase/
  functions/
    login/                # Edge Function: password → session
    weather/              # Edge Function: OpenWeatherMap proxy
    stocks/               # Edge Function: Finnhub proxy
    tech-feed/            # Edge Function: HN/Reddit/RSS aggregator
  migrations/             # SQL migrations
  scripts/                # seed, rotate-password
docs/superpowers/specs/   # design docs
.github/workflows/        # deploy.yml
```

**Key architectural rule:** every widget is a self-contained unit with a declared interface. The shell doesn't know any widget's internals — it reads the registry and renders whatever's placed. Each widget can be understood, changed, and tested without touching the shell.

## Data model

Six tables in Postgres. Because there is effectively one user, no `user_id` columns are needed; each singleton table enforces `id = 1`.

```sql
-- auth credential (one row, ever)
create table app_auth (
  id int primary key default 1,
  password_hash text not null,
  updated_at timestamptz default now(),
  check (id = 1)
);

-- react-grid-layout state, keyed by breakpoint
create table layouts (
  id int primary key default 1,
  layout jsonb not null,   -- { lg: [...], md: [...], sm: [...], xs: [...] }
  updated_at timestamptz default now(),
  check (id = 1)
);

-- placed widgets (ordered by created_at for initial grid population)
create table widget_instances (
  id uuid primary key default gen_random_uuid(),
  widget_type text not null,   -- 'bookmarks' | 'weather' | 'habits' | 'stocks' | 'tech-feed'
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

-- habits: definitions + daily check-offs
create table habits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position int not null,
  created_at timestamptz default now()
);

create table habit_checkins (
  habit_id uuid references habits(id) on delete cascade,
  date date not null,
  primary key (habit_id, date)
);

-- login rate-limiting (rolling window)
create table login_attempts (
  ip text not null,
  at timestamptz not null default now()
);
create index login_attempts_ip_at on login_attempts (ip, at desc);
```

**Widget config examples** (stored in `widget_instances.config` as JSONB):
- Bookmarks: `{ items: [{ name: string, url: string }] }`
- Weather: `{ city: string, lat: number, lon: number, units: 'F' | 'C' }` (lat/lon resolved once in Settings via geocoding so we don't re-geocode on every refresh)
- Stocks: `{ tickers: string[] }`  (supports equity symbols and `XAU` for gold)
- Tech feed: `{ sources: Array<{ type: 'hn' | 'reddit' | 'rss', value: string }> }`
- Habits: `{}` — actual habits live in `habits`

**RLS:** one policy per table — "authenticated users may do anything." Because of the fake-single-user pattern, "authenticated" equals "knew the password."

## Auth flow

**Setup (one-time)**
- A seed script creates one permanent Supabase user: `dashboard@local`. The end user never sees this address.
- The dashboard password is bcrypt-hashed and stored in `app_auth.password_hash`. Raw password is never persisted.
- The Supabase service-role key is a secret on the `login` Edge Function. Never shipped to the browser.

**Login sequence**
1. User lands on `/login`, types the password, submits.
2. Frontend POSTs `{ password }` to the `login` Edge Function.
3. Edge Function:
   - Rate-limits via `login_attempts` (reject after 5 attempts in 10 minutes per IP).
   - Fetches `password_hash` and runs `bcrypt.compare`.
   - On match: uses admin SDK to generate a session for `dashboard@local`, returns `{ access_token, refresh_token }`.
   - On miss: returns 401 and records the attempt.
4. Frontend calls `supabase.auth.setSession({ access_token, refresh_token })`. Subsequent Supabase client calls are authenticated; RLS grants full access.
5. Session persists in localStorage (default Supabase behavior). Token refresh happens automatically on visit.

**Logout:** `supabase.auth.signOut()` clears the session.

**Password rotation:** `npm run rotate-password` updates `app_auth.password_hash`. Existing sessions continue working until their refresh token expires (30 days default). To force-logout, the same script calls `auth.admin.signOut(userId)`.

**Route guard:** `<AuthGate>` wraps all dashboard routes. Missing session → redirect to `/login`.

## Widget system

**Contract** — every widget exports a single `WidgetDefinition`:

```ts
// src/lib/widget-types.ts
export type WidgetDefinition<Config = unknown> = {
  type: string;                                    // 'bookmarks', 'weather', ...
  displayName: string;                             // "Bookmarks"
  defaultConfig: Config;
  defaultSize: { w: number; h: number };           // grid cells
  minSize?: { w: number; h: number };
  View: React.FC<{ instanceId: string; config: Config }>;
  Settings: React.FC<{ config: Config; onChange: (c: Config) => void }>;
};
```

**Registry** — `src/lib/widget-registry.ts` imports each widget's definition and exports a `Record<type, WidgetDefinition>`. Adding a new widget = one folder + one line in the registry.

**Rendering flow**
1. Shell reads `widget_instances` and `layouts` via TanStack Query.
2. For each instance, it looks up the definition by `widget_type`, renders `<def.View instanceId={id} config={config} />` inside a `<Raised>` card at the grid position for the active breakpoint.
3. Each widget owns its own data fetching (TanStack Query keys scoped to `instanceId`).

**Edit mode** (toggled via a top-bar button)
- `react-grid-layout` becomes draggable/resizable; new positions persist to `layouts` on drop.
- Each widget shows a gear icon opening a `<Settings>` drawer rendering `def.Settings`. `onChange` writes to `widget_instances.config`.
- An "Add widget" button opens a picker showing registry entries.
- Edit mode disabled on `xs` breakpoint (mobile) to avoid fighting with scroll.

**Data fetching rules**
- External APIs (weather, stocks, tech feed) are called from Edge Functions, not directly from the browser — keeps API keys off the client, centralizes caching, avoids CORS surprises.
- Refetch cadences:
  - Weather: 15 minutes
  - Stocks: 1 minute during US market hours (9:30am–4pm ET weekdays), 15 minutes otherwise
  - Tech feed: 5 minutes
  - Bookmarks, habits: on mutation only (no polling)

## Layout and theme

**Tokens** — `src/styles/tokens.css`:

```css
:root {
  /* palette: deep navy + cyan */
  --bg: #1a2332;
  --accent: #22d3ee;
  --text: #cbd5e1;
  --text-dim: #64748b;
  --up: #34d399;
  --down: #fb7185;

  /* neumorphic shadows derived from --bg */
  --shadow-dark: #0f1826;
  --shadow-light: #253041;
  --raised:  6px 6px 14px var(--shadow-dark),
            -6px -6px 14px var(--shadow-light);
  --inset: inset 3px 3px 6px var(--shadow-dark),
           inset -3px -3px 6px var(--shadow-light);
  --raised-sm: 3px 3px 8px var(--shadow-dark),
              -3px -3px 8px var(--shadow-light);

  /* type + spacing */
  --font-sans: -apple-system, system-ui, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 18px;
  --radius-card: 12px; --radius-inset: 8px;
}
```

**Primitives** — `src/ui/`:
- `<Raised>` — card with `box-shadow: var(--raised)` and `border-radius: var(--radius-card)`. Every widget sits in one.
- `<Inset>` — inverse shadows; used for inputs, search bar, status pills.
- `<Label>` — small uppercase cyan widget header (e.g., `▮ STOCKS`).
- `<DataRow>` — left label + right value, with up/down color prop.

Widgets consume primitives and tokens only — never hardcode colors or shadows. Re-theming later means swapping the token file.

**Grid breakpoints** (`react-grid-layout`):
- `lg` ≥ 1200px: 12 columns
- `md` ≥ 996px: 10 columns
- `sm` ≥ 768px: 6 columns
- `xs` < 768px: 2 columns (one widget per row — mobile mode)

Each widget declares `defaultSize` in grid cells. User-edited positions persist per-breakpoint.

**Top bar** — dashboard title on the left; `<Inset>` search input (wired to `⌘K` / `/`) center; edit-mode toggle and logout on the right.

## Deployment and dev workflow

**Environments**
- **Local**: `npm run dev` → Vite on `http://localhost:5173`. `.env.local` carries `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Edge Functions run via `supabase functions serve`.
- **Prod**: `https://<user>.github.io/antneenet/` (or custom domain). Supabase URL + anon key injected at build time via repo secrets.

**Supabase project setup** (documented in `supabase/README.md`):
1. `supabase init` locally, `supabase link` to the Pro project.
2. `supabase db push` applies migrations (tables + RLS).
3. `npm run db:seed` creates the fake user and sets the initial password (read from `INITIAL_PASSWORD` env).
4. `npm run fn:deploy` deploys all Edge Functions.
5. `supabase secrets set OPENWEATHER_API_KEY=... FINNHUB_API_KEY=...` populates function secrets.

**GitHub Actions** — `.github/workflows/deploy.yml`:
- Triggers on push to `main`.
- Installs, builds with `VITE_*` repo secrets injected, publishes `dist/` to `gh-pages` via the official Pages action.

**Vite config** — `base: '/antneenet/'` (parameterized via env for custom-domain flexibility later).

**Package scripts**
- `dev`, `build`, `preview` (Vite)
- `db:push` → `supabase db push`
- `db:seed` → `tsx supabase/scripts/seed.ts`
- `fn:deploy` → `supabase functions deploy login weather stocks tech-feed`
- `rotate-password` → `tsx supabase/scripts/rotate-password.ts`

## Per-widget MVP specs

### Bookmarks
- **Shows**: tile grid, each tile = favicon (via `https://www.google.com/s2/favicons?domain=...`) + short label. Click opens in new tab.
- **Config**: ordered list of `{ name, url }`. Settings = editable list, drag-to-reorder, add/remove.
- **Data**: stored inline in `widget_instances.config`. No server calls beyond favicon fetches (client-direct, no secret involved).
- **Default size**: 3×2. **Default config**: empty list with a "+" placeholder.

### Weather
- **Shows**: current temperature, condition label, wind, daily high/low, rain chance.
- **Config**: `{ city, lat, lon, units }`. Settings = city search (debounced query to OpenWeatherMap geocoding via Edge Function).
- **Data**: `weather` Edge Function proxies OpenWeatherMap. Cached 15 minutes.
- **Default size**: 2×2. **Default config**: `{ city: 'San Francisco', lat: 37.77, lon: -122.42, units: 'F' }`.

### Habits
- **Shows**: list of habits with today's check-off state (filled / hollow circle). Header reads `3/5 today`. Hover a habit = 7-day streak dots.
- **Config**: `{}` — habits live in the `habits` table, managed via the Settings panel (add, reorder, delete).
- **Data**: `habits` + `habit_checkins` tables. Toggling writes a row in `habit_checkins`. No external API.
- **Default size**: 3×3. **Default**: zero habits; settings prompt user to add some.

### Stocks
- **Shows**: one row per symbol — symbol, price, day-change %, colored up/down. No charts in MVP.
- **Config**: `{ tickers: string[] }`. Supports equity tickers and commodities (e.g., `XAU` for gold). Settings = add/remove list.
- **Data**: `stocks` Edge Function proxies Finnhub (free tier). Function translates friendly symbols to Finnhub format (`XAU` → `OANDA:XAU_USD`). Cached 1 minute during market hours, 15 minutes otherwise.
- **Default size**: 2×3. **Default tickers**: `['AAPL', 'NVDA', 'MSFT', 'TSLA', 'XAU']`.

### Tech feed
- **Shows**: chronological list — source badge (`hn` / `rss` / `rdt`), title, age. Click opens source URL in new tab.
- **Config**: `{ sources: Array<{ type: 'hn' | 'reddit' | 'rss', value: string }> }`. Sources: HN (fixed top-stories), Reddit subreddit slugs, RSS feed URLs.
- **Data**: `tech-feed` Edge Function fetches all configured sources server-side, normalizes into `{ title, url, source, timestamp }`, merges chronologically, returns top 50. Cached 5 minutes.
- **Default size**: 4×5 (tall, primary widget). **Default sources**: HN top stories, `r/programming`, `r/rust`, one RSS (Anthropic blog or similar).

## Out of scope (for future iterations)

- Additional widgets: calendar, tasks, quick note, RSS folders, sports scores.
- X/Twitter integration (blocked on API cost).
- Rich charts in stocks / weather.
- PWA install prompt and offline support.
- Multi-dashboard / tabs.
- CI test suite (add when logic in Edge Functions grows non-trivial).
- Preview deploys per PR (would require moving off GitHub Pages).

## Open questions

None remaining at spec time. Any ambiguity discovered during implementation should be raised before coding, not resolved silently.
