# Personal Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a self-hosted, widget-based personal dashboard with shared-password auth, cross-device sync, and five MVP widgets (bookmarks, weather, habits, stocks, tech feed).

**Architecture:** Vite + React + TypeScript frontend with a `react-grid-layout` bento grid and a plugin-style widget framework. Supabase (Postgres + Edge Functions + Auth) powers data, shared-password login via a "fake single user" pattern, and external-API proxies. GitHub Pages hosts the static frontend, deployed via GitHub Actions.

**Tech Stack:** Vite, React 19, TypeScript, TanStack Query, Zustand, react-grid-layout, react-router-dom, Supabase JS SDK, bcryptjs (edge), Vitest + React Testing Library, Deno (Edge Functions).

**Spec:** [`docs/superpowers/specs/2026-04-20-personal-dashboard-design.md`](../specs/2026-04-20-personal-dashboard-design.md)

---

## Phase Map

| Phase | Focus | Tasks | Outcome |
|---|---|---|---|
| 0 | Project setup | 0.1 – 0.3 | Deps installed, Vitest configured, Vite base path set |
| 1 | Design system | 1.1 – 1.5 | Tokens + 4 neumorphic primitives, tested |
| 2 | Supabase backend | 2.1 – 2.5 | Schema, seed, login function, rotate-password |
| 3 | Frontend infra | 3.1 – 3.4 | Supabase client, auth helpers, query client, edit-mode store |
| 4 | App shell & auth UI | 4.1 – 4.3 | Router, AuthGate, Login page, TopBar |
| 5 | Widget framework | 5.1 – 5.7 | Definition contract, registry, WidgetCard, grid, layout persistence, settings drawer, add-widget picker |
| 6 | Widgets | 6.1 – 6.5 | Bookmarks, weather, habits, stocks, tech feed |
| 7 | Deployment | 7.1 – 7.2 | GitHub Actions, setup docs |

Checkpoints to consider: end of Phase 2 (backend runnable locally), end of Phase 5 (empty shell with a demo widget working), end of Phase 6 (feature-complete locally), end of Phase 7 (live).

---

## Phase 0: Project Setup

### Task 0.1: Install runtime and dev dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install @supabase/supabase-js @tanstack/react-query zustand react-grid-layout react-router-dom
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/react-grid-layout tsx dotenv
```

- [ ] **Step 3: Verify `package.json` reflects the versions installed**

Run: `cat package.json | jq '.dependencies, .devDependencies'`

Expected: sees `@supabase/supabase-js`, `@tanstack/react-query`, `zustand`, `react-grid-layout`, `react-router-dom` under dependencies; sees `vitest`, `@testing-library/*`, `jsdom`, `@types/react-grid-layout`, `tsx`, `dotenv` under devDependencies.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add core runtime + test dependencies"
```

---

### Task 0.2: Configure Vitest + global test setup

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add test scripts)
- Modify: `tsconfig.app.json` (include test types)

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
});
```

- [ ] **Step 2: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add scripts to `package.json`**

Under `"scripts"`, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Add Vitest globals to `tsconfig.app.json` compilerOptions.types**

Find `"compilerOptions"` in `tsconfig.app.json` and add:

```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

- [ ] **Step 5: Sanity-check by writing a tiny test**

Create `src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest is wired up', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: 1 test passes.

- [ ] **Step 6: Delete the smoke test (served its purpose) and commit**

```bash
rm src/test/smoke.test.ts
git add vitest.config.ts src/test/setup.ts package.json tsconfig.app.json
git commit -m "chore: configure Vitest + React Testing Library"
```

---

### Task 0.3: Configure Vite base path for GitHub Pages

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Replace `vite.config.ts` contents**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH ?? '/antneenet/',
});
```

- [ ] **Step 2: Verify dev server still starts**

Run: `npm run dev` (let it start, then Ctrl-C)
Expected: server starts on port 5173 without errors.

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "chore: set Vite base path for GitHub Pages deploy"
```

---

## Phase 1: Design System

### Task 1.1: Add design tokens and global styles

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Modify: `src/main.tsx` (import styles, remove scaffold CSS)
- Delete: `src/App.css`, `src/index.css`, `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`

- [ ] **Step 1: Create `src/styles/tokens.css`**

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
  --raised:
    6px 6px 14px var(--shadow-dark),
    -6px -6px 14px var(--shadow-light);
  --raised-sm:
    3px 3px 8px var(--shadow-dark),
    -3px -3px 8px var(--shadow-light);
  --inset:
    inset 3px 3px 6px var(--shadow-dark),
    inset -3px -3px 6px var(--shadow-light);

  /* type + spacing */
  --font-sans: -apple-system, system-ui, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 18px;
  --space-5: 24px;
  --radius-card: 12px;
  --radius-inset: 8px;
}
```

- [ ] **Step 2: Create `src/styles/global.css`**

```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.4;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: none; cursor: pointer; }
input, textarea { font: inherit; color: inherit; background: transparent; border: none; outline: none; }
```

- [ ] **Step 3: Replace `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Simplify `src/App.tsx` to a placeholder**

```tsx
export default function App() {
  return <div style={{ padding: 24 }}>Dashboard shell — work in progress.</div>;
}
```

- [ ] **Step 5: Delete scaffold assets**

```bash
rm src/App.css src/index.css src/assets/react.svg src/assets/vite.svg src/assets/hero.png
rmdir src/assets 2>/dev/null || true
```

- [ ] **Step 6: Run `npm run dev` and confirm the page renders plain text on dark navy**

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(design): add tokens + global styles, strip scaffold CSS"
```

---

### Task 1.2: `<Raised>` primitive (neumorphic card)

**Files:**
- Create: `src/ui/Raised.tsx`
- Create: `src/ui/Raised.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/ui/Raised.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Raised } from './Raised';

describe('<Raised>', () => {
  it('renders children', () => {
    render(<Raised>hello</Raised>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('applies raised box-shadow via inline style or class', () => {
    const { container } = render(<Raised data-testid="card">x</Raised>);
    const el = container.firstElementChild as HTMLElement;
    const style = getComputedStyle(el);
    // jsdom does not resolve var(), but the property should be set
    expect(el.style.boxShadow || style.boxShadow).toBeTruthy();
  });

  it('forwards className and extra props', () => {
    render(<Raised className="extra" aria-label="card">x</Raised>);
    const el = screen.getByLabelText('card');
    expect(el.className).toContain('extra');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Raised`
Expected: FAIL with "Cannot find module './Raised'".

- [ ] **Step 3: Implement `src/ui/Raised.tsx`**

```tsx
import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Raised({
  className = '',
  style,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...rest}
      className={`neu-raised ${className}`.trim()}
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--radius-card)',
        boxShadow: 'var(--raised)',
        padding: 'var(--space-3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Raised`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Raised.tsx src/ui/Raised.test.tsx
git commit -m "feat(ui): add <Raised> neumorphic primitive"
```

---

### Task 1.3: `<Inset>` primitive

**Files:**
- Create: `src/ui/Inset.tsx`
- Create: `src/ui/Inset.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Inset } from './Inset';

describe('<Inset>', () => {
  it('renders children and applies inset shadow', () => {
    render(<Inset>x</Inset>);
    const el = screen.getByText('x').parentElement!;
    expect(el.style.boxShadow).toContain('--inset');
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npm test -- Inset`

- [ ] **Step 3: Implement `src/ui/Inset.tsx`**

```tsx
import type { HTMLAttributes, PropsWithChildren } from 'react';

export function Inset({
  className = '',
  style,
  children,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...rest}
      className={`neu-inset ${className}`.trim()}
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--radius-inset)',
        boxShadow: 'var(--inset)',
        padding: 'var(--space-2) var(--space-3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/ui/Inset.tsx src/ui/Inset.test.tsx
git commit -m "feat(ui): add <Inset> neumorphic primitive"
```

---

### Task 1.4: `<Label>` primitive (widget header)

**Files:**
- Create: `src/ui/Label.tsx`
- Create: `src/ui/Label.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from './Label';

describe('<Label>', () => {
  it('renders the bar glyph and uppercase text', () => {
    render(<Label>stocks</Label>);
    const el = screen.getByText(/stocks/i);
    expect(el.textContent).toMatch(/▮/);
    expect(el).toHaveStyle({ textTransform: 'uppercase' });
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/ui/Label.tsx`**

```tsx
import type { PropsWithChildren } from 'react';

export function Label({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        color: 'var(--accent)',
        fontSize: 10,
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: 'var(--space-2)',
      }}
    >
      ▮ {children}
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/ui/Label.tsx src/ui/Label.test.tsx
git commit -m "feat(ui): add <Label> widget-header primitive"
```

---

### Task 1.5: `<DataRow>` primitive + ui barrel

**Files:**
- Create: `src/ui/DataRow.tsx`
- Create: `src/ui/DataRow.test.tsx`
- Create: `src/ui/index.ts`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataRow } from './DataRow';

describe('<DataRow>', () => {
  it('renders label and value', () => {
    render(<DataRow label="AAPL" value="232.14" />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('232.14')).toBeInTheDocument();
  });

  it('colors up and down correctly', () => {
    const { rerender } = render(<DataRow label="x" value="1" trend="up" />);
    expect(screen.getByText('1')).toHaveStyle({ color: 'var(--up)' });

    rerender(<DataRow label="x" value="1" trend="down" />);
    expect(screen.getByText('1')).toHaveStyle({ color: 'var(--down)' });
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/ui/DataRow.tsx`**

```tsx
import type { ReactNode } from 'react';

type Props = {
  label: ReactNode;
  value: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
};

export function DataRow({ label, value, trend = 'neutral' }: Props) {
  const color =
    trend === 'up' ? 'var(--up)' : trend === 'down' ? 'var(--down)' : 'var(--text)';
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        padding: '3px 0',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span>{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/ui/index.ts` barrel**

```ts
export { Raised } from './Raised';
export { Inset } from './Inset';
export { Label } from './Label';
export { DataRow } from './DataRow';
```

- [ ] **Step 5: Run tests, expect PASS**

Run: `npm test`

- [ ] **Step 6: Commit**

```bash
git add src/ui/
git commit -m "feat(ui): add <DataRow> + barrel export"
```

---

## Phase 2: Supabase Backend

### Task 2.1: Initialize Supabase CLI + project scaffolding

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/.gitignore`
- Create: `.env.local.example`
- Create: `supabase/README.md`
- Modify: `.gitignore` (add `.env.local`, `supabase/.temp`)

- [ ] **Step 1: Install Supabase CLI if missing**

```bash
brew install supabase/tap/supabase 2>/dev/null || supabase --version
```

Expected: prints a version number.

- [ ] **Step 2: Run `supabase init`**

```bash
supabase init
```

This creates `supabase/config.toml`, `supabase/.gitignore`, and `supabase/seed.sql` (delete `seed.sql` — we're writing our own seed script).

```bash
rm -f supabase/seed.sql
```

- [ ] **Step 3: Create `.env.local.example` in repo root**

```
# Copy to .env.local and fill in values from Supabase dashboard
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Server-side only (used by seed/rotate scripts and Edge Functions). Never commit .env.local.
SUPABASE_SERVICE_ROLE_KEY=
INITIAL_PASSWORD=
```

- [ ] **Step 4: Append to `.gitignore`**

```
# env
.env.local

# supabase CLI state
supabase/.temp
supabase/.branches
```

- [ ] **Step 5: Create `supabase/README.md`** with setup instructions

```md
# Supabase setup

One-time setup for a new Supabase project:

1. Create a Supabase project in the dashboard.
2. Copy the project's URL, anon key, and service role key into `../.env.local` (use `../.env.local.example` as template). Pick an `INITIAL_PASSWORD`.
3. Link CLI: `supabase link --project-ref <project-ref>`
4. Push schema: `npm run db:push`
5. Seed fake user + password: `npm run db:seed`
6. Set function secrets:

   ```bash
   supabase secrets set \
     SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
     OPENWEATHER_API_KEY="..." \
     FINNHUB_API_KEY="..."
   ```

7. Deploy functions: `npm run fn:deploy`

## Rotating the dashboard password

```bash
INITIAL_PASSWORD=newpass npm run rotate-password
```

Pass `--force-logout` to invalidate existing sessions.
```

- [ ] **Step 6: Commit**

```bash
git add supabase/ .gitignore .env.local.example
git commit -m "chore(supabase): init CLI + add setup docs"
```

---

### Task 2.2: Write init migration (tables + RLS)

**Files:**
- Create: `supabase/migrations/20260420000000_init.sql`

- [ ] **Step 1: Create the migration file**

```sql
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
```

- [ ] **Step 2: Apply the migration locally to verify it parses**

```bash
supabase db reset 2>/dev/null || true
```

If you have Docker + local Supabase running, this will apply the migration. If not, push to a remote project:

```bash
npm run db:push  # (added in task 2.5; for now, skip validation if no DB is linked)
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420000000_init.sql
git commit -m "feat(db): initial schema with RLS"
```

---

### Task 2.3: Seed script (fake user + initial password)

**Files:**
- Create: `supabase/scripts/seed.ts`
- Modify: `package.json` (add `db:seed` script)

- [ ] **Step 1: Install bcryptjs for the seed script**

```bash
npm install -D bcryptjs @types/bcryptjs
```

- [ ] **Step 2: Create `supabase/scripts/seed.ts`**

```ts
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
```

- [ ] **Step 3: Add scripts to `package.json`**

```json
"db:push": "supabase db push",
"db:seed": "tsx supabase/scripts/seed.ts"
```

- [ ] **Step 4: Commit**

```bash
git add supabase/scripts/seed.ts package.json package-lock.json
git commit -m "feat(supabase): add seed script for fake user + password hash"
```

---

### Task 2.4: Login Edge Function (password → session)

**Files:**
- Create: `supabase/functions/login/index.ts`
- Create: `supabase/functions/login/deno.json`
- Create: `supabase/functions/login/index.test.ts`

- [ ] **Step 1: Create `supabase/functions/login/deno.json`**

```json
{
  "imports": {
    "@supabase/supabase-js": "jsr:@supabase/supabase-js@2",
    "bcrypt": "https://deno.land/x/bcrypt@v0.4.1/mod.ts"
  }
}
```

- [ ] **Step 2: Write the failing test `supabase/functions/login/index.test.ts`**

```ts
import { assertEquals } from 'jsr:@std/assert';
import { rateLimitOk } from './index.ts';

Deno.test('rateLimitOk allows first 5 attempts, rejects 6th within window', () => {
  const now = Date.now();
  const attempts = Array.from({ length: 5 }, (_, i) => now - i * 1000);
  assertEquals(rateLimitOk(attempts, now, 5, 10 * 60 * 1000), false);

  const attempts4 = attempts.slice(1); // 4 attempts
  assertEquals(rateLimitOk(attempts4, now, 5, 10 * 60 * 1000), true);
});

Deno.test('rateLimitOk ignores attempts outside the window', () => {
  const now = Date.now();
  const old = now - 20 * 60 * 1000;
  const attempts = Array.from({ length: 10 }, () => old);
  assertEquals(rateLimitOk(attempts, now, 5, 10 * 60 * 1000), true);
});
```

- [ ] **Step 3: Run test, expect FAIL**

```bash
cd supabase/functions/login && deno test --allow-all
```

Expected: FAIL — "Module not found" for `./index.ts` or `rateLimitOk` not exported.

- [ ] **Step 4: Write `supabase/functions/login/index.ts`**

```ts
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
```

- [ ] **Step 5: Run test, expect PASS**

```bash
cd supabase/functions/login && deno test --allow-all
```

- [ ] **Step 6: Add deploy script to `package.json`**

```json
"fn:deploy": "supabase functions deploy login weather stocks tech-feed"
```

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/login/ package.json
git commit -m "feat(supabase): login Edge Function with rate limiting + tests"
```

---

### Task 2.5: Rotate-password script

**Files:**
- Create: `supabase/scripts/rotate-password.ts`
- Modify: `package.json` (add `rotate-password` script)

- [ ] **Step 1: Create `supabase/scripts/rotate-password.ts`**

```ts
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
```

- [ ] **Step 2: Add script to `package.json`**

```json
"rotate-password": "tsx supabase/scripts/rotate-password.ts"
```

- [ ] **Step 3: Commit**

```bash
git add supabase/scripts/rotate-password.ts package.json
git commit -m "feat(supabase): rotate-password script with optional force-logout"
```

---

## Phase 3: Frontend Infrastructure

### Task 3.1: Supabase client + generated types stub

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/database-types.ts`

- [ ] **Step 1: Create `src/lib/database-types.ts`**

```ts
// Hand-written subset of the schema. Replace with `supabase gen types typescript` later
// (script: `npm run types` — see future task). For MVP, these are sufficient.

export type WidgetType = 'bookmarks' | 'weather' | 'habits' | 'stocks' | 'tech-feed';

export type Breakpoint = 'lg' | 'md' | 'sm' | 'xs';

export type GridLayoutItem = {
  i: string; // widget_instance id
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export type LayoutsByBreakpoint = Record<Breakpoint, GridLayoutItem[]>;

export type WidgetInstance = {
  id: string;
  widget_type: WidgetType;
  config: Record<string, unknown>;
  created_at: string;
};

export type LayoutRow = {
  id: 1;
  layout: LayoutsByBreakpoint;
  updated_at: string;
};

export type Habit = { id: string; name: string; position: number; created_at: string };

export type HabitCheckin = { habit_id: string; date: string };
```

- [ ] **Step 2: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in env.');
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts src/lib/database-types.ts
git commit -m "feat(lib): add Supabase client + hand-written types"
```

---

### Task 3.2: Auth helpers + `useSession` hook

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { login, logout } from './auth';

vi.mock('./supabase', () => {
  const setSession = vi.fn().mockResolvedValue({ error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  return {
    supabase: {
      auth: { setSession, signOut },
    },
  };
});

// Mock fetch for the login function
const originalFetch = globalThis.fetch;

beforeEach(() => {
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

describe('login()', () => {
  it('calls the login function and sets the session on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'a', refresh_token: 'r', expires_at: 123 }),
    }) as any;

    const { supabase } = await import('./supabase');
    await login('hunter2');
    expect(globalThis.fetch).toHaveBeenCalled();
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'a',
      refresh_token: 'r',
    });
  });

  it('throws on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'invalid password' }),
    }) as any;

    await expect(login('wrong')).rejects.toThrow(/invalid password/i);
  });
});

describe('logout()', () => {
  it('calls supabase signOut', async () => {
    const { supabase } = await import('./supabase');
    await logout();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL (`./auth` not found)**

Run: `npm test -- auth.test`

- [ ] **Step 3: Create `src/lib/auth.ts`**

```ts
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function login(password: string): Promise<void> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `login failed (${res.status})`);
  }
  const { error } = await supabase.auth.setSession({
    access_token: body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit -m "feat(auth): login/logout helpers + useSession hook"
```

---

### Task 3.3: Query client + provider setup

**Files:**
- Create: `src/lib/query-client.ts`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create `src/lib/query-client.ts`**

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

- [ ] **Step 2: Wire provider into `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from './lib/query-client';
import './styles/tokens.css';
import './styles/global.css';
import App from './App.tsx';

const basename = import.meta.env.BASE_URL;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: Run `npm run dev`, confirm app still renders**

- [ ] **Step 4: Commit**

```bash
git add src/lib/query-client.ts src/main.tsx
git commit -m "feat(app): wire QueryClient + BrowserRouter"
```

---

### Task 3.4: Zustand store for edit mode

**Files:**
- Create: `src/app/store.ts`
- Create: `src/app/store.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useEditMode } from './store';

describe('useEditMode', () => {
  beforeEach(() => {
    useEditMode.setState({ editMode: false });
  });

  it('defaults to false', () => {
    expect(useEditMode.getState().editMode).toBe(false);
  });

  it('toggle flips the flag', () => {
    useEditMode.getState().toggle();
    expect(useEditMode.getState().editMode).toBe(true);
    useEditMode.getState().toggle();
    expect(useEditMode.getState().editMode).toBe(false);
  });

  it('setEditMode sets explicitly', () => {
    useEditMode.getState().setEditMode(true);
    expect(useEditMode.getState().editMode).toBe(true);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/app/store.ts`**

```ts
import { create } from 'zustand';

type EditModeState = {
  editMode: boolean;
  toggle: () => void;
  setEditMode: (v: boolean) => void;
};

export const useEditMode = create<EditModeState>((set) => ({
  editMode: false,
  toggle: () => set((s) => ({ editMode: !s.editMode })),
  setEditMode: (v) => set({ editMode: v }),
}));
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/store.ts src/app/store.test.ts
git commit -m "feat(app): edit-mode zustand store"
```

---

## Phase 4: App Shell & Auth UI

### Task 4.1: Router + AuthGate

**Files:**
- Create: `src/app/AuthGate.tsx`
- Create: `src/app/AuthGate.test.tsx`
- Modify: `src/App.tsx` (set up routes)

- [ ] **Step 1: Write failing test for AuthGate**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthGate } from './AuthGate';

vi.mock('../lib/auth', () => ({
  useSession: vi.fn(),
}));

import { useSession } from '../lib/auth';

describe('<AuthGate>', () => {
  it('shows loading indicator while session is loading', () => {
    (useSession as any).mockReturnValue({ session: null, loading: true });
    render(
      <MemoryRouter>
        <AuthGate><div>secret</div></AuthGate>
      </MemoryRouter>,
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to /login when no session', () => {
    (useSession as any).mockReturnValue({ session: null, loading: false });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AuthGate><div>secret</div></AuthGate>} />
          <Route path="/login" element={<div>login-page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('login-page')).toBeInTheDocument();
  });

  it('renders children when session present', () => {
    (useSession as any).mockReturnValue({ session: { user: { id: 'u' } }, loading: false });
    render(
      <MemoryRouter>
        <AuthGate><div>secret</div></AuthGate>
      </MemoryRouter>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/app/AuthGate.tsx`**

```tsx
import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '../lib/auth';

export function AuthGate({ children }: PropsWithChildren) {
  const { session, loading } = useSession();
  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--text-dim)' }}>Loading…</div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Update `src/App.tsx` with routes (Dashboard component is a stub for now)**

```tsx
import { Routes, Route } from 'react-router-dom';
import { AuthGate } from './app/AuthGate';
import { Login } from './app/Login';
import { Dashboard } from './app/Dashboard';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AuthGate><Dashboard /></AuthGate>} />
    </Routes>
  );
}
```

- [ ] **Step 6: Commit (Login + Dashboard will be created in next tasks — app may not build yet, and that's fine)**

```bash
git add src/app/AuthGate.tsx src/app/AuthGate.test.tsx src/App.tsx
git commit -m "feat(app): add AuthGate + route skeleton"
```

---

### Task 4.2: Login page

**Files:**
- Create: `src/app/Login.tsx`
- Create: `src/app/Login.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Login } from './Login';

vi.mock('../lib/auth', () => ({
  login: vi.fn(),
}));
import { login } from '../lib/auth';

describe('<Login>', () => {
  it('submits the password to login()', async () => {
    (login as any).mockResolvedValueOnce(undefined);
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('hunter2'));
  });

  it('shows an error message on failure', async () => {
    (login as any).mockRejectedValueOnce(new Error('invalid password'));
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/password/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/invalid password/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/app/Login.tsx`**

```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inset, Raised } from '../ui';
import { login } from '../lib/auth';

export function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 'var(--space-4)',
    }}>
      <Raised style={{ width: 360, padding: 'var(--space-5)' }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--space-4)' }}>
          Dashboard
        </div>
        <form onSubmit={onSubmit}>
          <label htmlFor="pwd" style={{ display: 'block', marginBottom: 'var(--space-2)', color: 'var(--text-dim)', fontSize: 12 }}>
            Password
          </label>
          <Inset>
            <input
              id="pwd"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
              autoFocus
            />
          </Inset>
          {error && (
            <div role="alert" style={{ color: 'var(--down)', fontSize: 12, marginTop: 'var(--space-2)' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting || !password}
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-2) var(--space-4)',
              color: 'var(--accent)',
              boxShadow: 'var(--raised-sm)',
              borderRadius: 'var(--radius-inset)',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </Raised>
    </div>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/Login.tsx src/app/Login.test.tsx
git commit -m "feat(app): Login page with password form"
```

---

### Task 4.3: TopBar + Dashboard stub

**Files:**
- Create: `src/app/TopBar.tsx`
- Create: `src/app/Dashboard.tsx`

- [ ] **Step 1: Implement `src/app/TopBar.tsx`**

```tsx
import { Inset } from '../ui';
import { useEditMode } from './store';
import { logout } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { editMode, toggle } = useEditMode();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-4)',
    }}>
      <div style={{ fontSize: 18, fontWeight: 600 }}>Dashboard</div>
      <Inset style={{ flex: 1, maxWidth: 360, color: 'var(--text-dim)' }}>
        <span style={{ fontSize: 11 }}>⌕ search ⌘K</span>
      </Inset>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button
          onClick={toggle}
          style={{
            padding: 'var(--space-1) var(--space-3)',
            boxShadow: editMode ? 'var(--inset)' : 'var(--raised-sm)',
            borderRadius: 'var(--radius-inset)',
            color: editMode ? 'var(--accent)' : 'var(--text)',
            fontSize: 12,
          }}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={onLogout}
          style={{
            padding: 'var(--space-1) var(--space-3)',
            boxShadow: 'var(--raised-sm)',
            borderRadius: 'var(--radius-inset)',
            fontSize: 12,
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement a stub `src/app/Dashboard.tsx`** (real grid comes in Phase 5)

```tsx
import { TopBar } from './TopBar';

export function Dashboard() {
  return (
    <div>
      <TopBar />
      <div style={{ padding: 'var(--space-4)', color: 'var(--text-dim)' }}>
        Widget grid will render here.
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run the app end-to-end**

Run: `npm run dev`. Navigate to `/login`, enter password, verify redirect to `/`. (This requires Supabase set up; if not, the login call will fail. Verify the UI renders correctly in either case.)

- [ ] **Step 4: Commit**

```bash
git add src/app/TopBar.tsx src/app/Dashboard.tsx
git commit -m "feat(app): TopBar + Dashboard stub"
```

---

## Phase 5: Widget Framework

### Task 5.1: WidgetDefinition type

**Files:**
- Create: `src/lib/widget-types.ts`

- [ ] **Step 1: Create the type file**

```ts
import type { ComponentType } from 'react';
import type { WidgetType } from './database-types';

export type WidgetDefinition<Config = unknown> = {
  type: WidgetType;
  displayName: string;
  defaultConfig: Config;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  View: ComponentType<{ instanceId: string; config: Config }>;
  Settings: ComponentType<{ config: Config; onChange: (next: Config) => void }>;
};

export type AnyWidgetDefinition = WidgetDefinition<any>;
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/widget-types.ts
git commit -m "feat(widgets): WidgetDefinition contract"
```

---

### Task 5.2: Widget registry + demo widget

**Files:**
- Create: `src/lib/widget-registry.ts`
- Create: `src/lib/widget-registry.test.ts`
- Create: `src/widgets/demo/index.tsx`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { registry, getDefinition, listWidgetTypes } from './widget-registry';

describe('widget registry', () => {
  it('contains the demo widget', () => {
    expect(listWidgetTypes()).toContain('demo');
    expect(getDefinition('demo')).toBeDefined();
  });

  it('returns undefined for unknown types', () => {
    // @ts-expect-error intentional
    expect(getDefinition('bogus')).toBeUndefined();
  });

  it('every registered definition has required fields', () => {
    for (const def of Object.values(registry)) {
      expect(def.type).toBeTruthy();
      expect(def.displayName).toBeTruthy();
      expect(def.defaultSize.w).toBeGreaterThan(0);
      expect(def.defaultSize.h).toBeGreaterThan(0);
      expect(def.View).toBeDefined();
      expect(def.Settings).toBeDefined();
    }
  });
});
```

> **Note:** the demo widget uses `type: 'demo'` for scaffolding. The `WidgetType` union in `database-types.ts` includes only MVP widget types; update the union to include `'demo'` temporarily, and remove it in Phase 6 after the real widgets land.

- [ ] **Step 2: Add `'demo'` to the `WidgetType` union temporarily**

Edit `src/lib/database-types.ts`:

```ts
export type WidgetType = 'bookmarks' | 'weather' | 'habits' | 'stocks' | 'tech-feed' | 'demo';
```

- [ ] **Step 3: Create `src/widgets/demo/index.tsx`**

```tsx
import { Label } from '../../ui';
import type { WidgetDefinition } from '../../lib/widget-types';

type Config = { message: string };

const View: WidgetDefinition<Config>['View'] = ({ config }) => (
  <div>
    <Label>Demo</Label>
    <div style={{ fontSize: 12 }}>{config.message}</div>
  </div>
);

const Settings: WidgetDefinition<Config>['Settings'] = ({ config, onChange }) => (
  <label style={{ display: 'block', fontSize: 12 }}>
    Message
    <input
      type="text"
      value={config.message}
      onChange={(e) => onChange({ message: e.target.value })}
      style={{ display: 'block', marginTop: 4, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6, width: '100%' }}
    />
  </label>
);

export const demoDefinition: WidgetDefinition<Config> = {
  type: 'demo',
  displayName: 'Demo',
  defaultConfig: { message: 'Hello, world.' },
  defaultSize: { w: 3, h: 2 },
  View,
  Settings,
};
```

- [ ] **Step 4: Create `src/lib/widget-registry.ts`**

```ts
import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { demoDefinition } from '../widgets/demo';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  // MVP widgets are added in Phase 6.
  demo: demoDefinition,
} as Record<WidgetType, AnyWidgetDefinition>;

export function getDefinition(type: WidgetType): AnyWidgetDefinition | undefined {
  return registry[type];
}

export function listWidgetTypes(): WidgetType[] {
  return Object.keys(registry) as WidgetType[];
}
```

- [ ] **Step 5: Run test, expect PASS**

- [ ] **Step 6: Commit**

```bash
git add src/lib/widget-registry.ts src/lib/widget-registry.test.ts src/widgets/demo/ src/lib/database-types.ts
git commit -m "feat(widgets): registry + demo widget for scaffolding"
```

---

### Task 5.3: `<WidgetCard>` wrapper

**Files:**
- Create: `src/app/WidgetCard.tsx`
- Create: `src/app/WidgetCard.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WidgetCard } from './WidgetCard';
import { useEditMode } from './store';

describe('<WidgetCard>', () => {
  it('renders children inside a raised card', () => {
    useEditMode.setState({ editMode: false });
    render(<WidgetCard instanceId="i1" onGear={() => {}}>hello</WidgetCard>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('shows gear button in edit mode', () => {
    useEditMode.setState({ editMode: true });
    render(<WidgetCard instanceId="i1" onGear={() => {}}>x</WidgetCard>);
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
  });

  it('hides gear button outside edit mode', () => {
    useEditMode.setState({ editMode: false });
    render(<WidgetCard instanceId="i1" onGear={() => {}}>x</WidgetCard>);
    expect(screen.queryByRole('button', { name: /settings/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/app/WidgetCard.tsx`**

```tsx
import type { PropsWithChildren } from 'react';
import { Raised } from '../ui';
import { useEditMode } from './store';

type Props = PropsWithChildren<{
  instanceId: string;
  onGear: () => void;
}>;

export function WidgetCard({ instanceId, onGear, children }: Props) {
  const editMode = useEditMode((s) => s.editMode);
  return (
    <Raised style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {editMode && (
        <button
          aria-label={`settings for ${instanceId}`}
          onClick={onGear}
          style={{
            position: 'absolute',
            top: 8, right: 8,
            fontSize: 12,
            boxShadow: 'var(--raised-sm)',
            borderRadius: 6,
            padding: '2px 8px',
            color: 'var(--accent)',
          }}
        >
          ⚙
        </button>
      )}
      {children}
    </Raised>
  );
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/app/WidgetCard.tsx src/app/WidgetCard.test.tsx
git commit -m "feat(widgets): WidgetCard wrapper with edit-mode gear"
```

---

### Task 5.4: Grid + instances data hooks

**Files:**
- Create: `src/lib/dashboard-queries.ts`
- Create: `src/lib/dashboard-queries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defaultLayoutsFor } from './dashboard-queries';

describe('defaultLayoutsFor', () => {
  beforeEach(() => {});

  it('produces a grid item for each instance in each breakpoint', () => {
    const layouts = defaultLayoutsFor([
      { id: 'a', widget_type: 'demo', config: {}, created_at: '' },
      { id: 'b', widget_type: 'demo', config: {}, created_at: '' },
    ], { demo: { w: 3, h: 2 } });
    expect(layouts.lg.length).toBe(2);
    expect(layouts.xs.length).toBe(2);
    expect(layouts.lg[0].i).toBe('a');
  });

  it('stacks widgets on xs with w=2', () => {
    const layouts = defaultLayoutsFor([
      { id: 'a', widget_type: 'demo', config: {}, created_at: '' },
    ], { demo: { w: 3, h: 2 } });
    expect(layouts.xs[0].w).toBe(2);
  });
});
```

- [ ] **Step 2: Run test, expect FAIL**

- [ ] **Step 3: Implement `src/lib/dashboard-queries.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import type {
  WidgetInstance,
  LayoutsByBreakpoint,
  Breakpoint,
  GridLayoutItem,
  WidgetType,
} from './database-types';

type DefaultSize = { w: number; h: number };
type DefaultSizeMap = Partial<Record<WidgetType, DefaultSize>>;

const COLS: Record<Breakpoint, number> = { lg: 12, md: 10, sm: 6, xs: 2 };

export function defaultLayoutsFor(
  instances: WidgetInstance[],
  sizes: DefaultSizeMap,
): LayoutsByBreakpoint {
  const out: LayoutsByBreakpoint = { lg: [], md: [], sm: [], xs: [] };
  const cursors: Record<Breakpoint, { x: number; y: number; rowH: number }> = {
    lg: { x: 0, y: 0, rowH: 0 },
    md: { x: 0, y: 0, rowH: 0 },
    sm: { x: 0, y: 0, rowH: 0 },
    xs: { x: 0, y: 0, rowH: 0 },
  };

  for (const inst of instances) {
    const size = sizes[inst.widget_type] ?? { w: 3, h: 2 };
    for (const bp of Object.keys(COLS) as Breakpoint[]) {
      const cols = COLS[bp];
      const w = bp === 'xs' ? 2 : Math.min(size.w, cols);
      const h = size.h;
      const c = cursors[bp];
      if (c.x + w > cols) {
        c.x = 0;
        c.y += c.rowH;
        c.rowH = 0;
      }
      const item: GridLayoutItem = { i: inst.id, x: c.x, y: c.y, w, h };
      out[bp].push(item);
      c.x += w;
      c.rowH = Math.max(c.rowH, h);
    }
  }
  return out;
}

// --- React Query hooks ---

export function useWidgetInstances() {
  return useQuery({
    queryKey: ['widget_instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widget_instances')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as WidgetInstance[];
    },
  });
}

export function useLayouts() {
  return useQuery({
    queryKey: ['layouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('layouts')
        .select('*')
        .eq('id', 1)
        .single();
      if (error) throw error;
      return data.layout as LayoutsByBreakpoint;
    },
  });
}

export function useSaveLayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layout: LayoutsByBreakpoint) => {
      const { error } = await supabase
        .from('layouts')
        .update({ layout, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['layouts'] }),
  });
}

export function useAddWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { type: WidgetType; config: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from('widget_instances')
        .insert({ widget_type: args.type, config: args.config })
        .select()
        .single();
      if (error) throw error;
      return data as WidgetInstance;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['widget_instances'] });
      qc.invalidateQueries({ queryKey: ['layouts'] });
    },
  });
}

export function useRemoveWidget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('widget_instances').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widget_instances'] }),
  });
}

export function useUpdateWidgetConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; config: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('widget_instances')
        .update({ config: args.config })
        .eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['widget_instances'] }),
  });
}
```

- [ ] **Step 4: Run test, expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-queries.ts src/lib/dashboard-queries.test.ts
git commit -m "feat(widgets): query hooks + default layout generator"
```

---

### Task 5.5: Dashboard grid rendering

**Files:**
- Modify: `src/app/Dashboard.tsx`
- Create: `src/styles/grid.css`
- Modify: `src/main.tsx` (import grid.css)

- [ ] **Step 1: Install react-grid-layout CSS**

Create `src/styles/grid.css` with imports for the library's required CSS:

```css
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

.react-grid-item.react-grid-placeholder {
  background: var(--accent) !important;
  opacity: 0.15 !important;
  border-radius: var(--radius-card);
}
```

- [ ] **Step 2: Import grid.css in `src/main.tsx`** (add between global.css and App import)

```tsx
import './styles/grid.css';
```

- [ ] **Step 3: Install react-resizable types**

```bash
npm install -D @types/react-resizable
```

- [ ] **Step 4: Replace `src/app/Dashboard.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { TopBar } from './TopBar';
import { WidgetCard } from './WidgetCard';
import { SettingsDrawer } from './SettingsDrawer';
import { AddWidgetPicker } from './AddWidgetPicker';
import {
  useWidgetInstances,
  useLayouts,
  useSaveLayouts,
  defaultLayoutsFor,
} from '../lib/dashboard-queries';
import { getDefinition, registry } from '../lib/widget-registry';
import { useEditMode } from './store';
import type { Breakpoint, LayoutsByBreakpoint, WidgetType } from '../lib/database-types';

const ResponsiveGrid = WidthProvider(Responsive);
const COLS = { lg: 12, md: 10, sm: 6, xs: 2 } as const;
const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 0 } as const;

export function Dashboard() {
  const { data: instances = [] } = useWidgetInstances();
  const { data: storedLayouts } = useLayouts();
  const saveLayouts = useSaveLayouts();
  const editMode = useEditMode((s) => s.editMode);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const defaultSizes = useMemo(() => {
    return Object.fromEntries(
      (Object.keys(registry) as WidgetType[]).map((t) => [t, registry[t].defaultSize]),
    ) as Record<WidgetType, { w: number; h: number }>;
  }, []);

  const layouts: LayoutsByBreakpoint = useMemo(() => {
    const hasContent =
      storedLayouts &&
      (Object.keys(COLS) as Breakpoint[]).some((bp) => (storedLayouts[bp]?.length ?? 0) > 0);
    if (hasContent) return storedLayouts as LayoutsByBreakpoint;
    return defaultLayoutsFor(instances, defaultSizes);
  }, [storedLayouts, instances, defaultSizes]);

  function handleLayoutChange(_cur: Layout[], all: { [bp: string]: Layout[] }) {
    if (!editMode) return;
    const next: LayoutsByBreakpoint = {
      lg: (all.lg ?? []).map(toItem),
      md: (all.md ?? []).map(toItem),
      sm: (all.sm ?? []).map(toItem),
      xs: (all.xs ?? []).map(toItem),
    };
    saveLayouts.mutate(next);
  }

  return (
    <div>
      <TopBar />
      {editMode && (
        <div style={{ padding: 'var(--space-2) var(--space-4)' }}>
          <button
            onClick={() => setPickerOpen(true)}
            style={{
              boxShadow: 'var(--raised-sm)',
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 6,
              color: 'var(--accent)',
              fontSize: 12,
            }}
          >
            + Add widget
          </button>
        </div>
      )}
      <ResponsiveGrid
        className="dashboard-grid"
        layouts={layouts as any}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={60}
        margin={[14, 14]}
        containerPadding={[14, 14]}
        isDraggable={editMode}
        isResizable={editMode}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        {instances.map((inst) => {
          const def = getDefinition(inst.widget_type);
          if (!def) return null;
          const View = def.View;
          return (
            <div key={inst.id}>
              <WidgetCard instanceId={inst.id} onGear={() => setSettingsFor(inst.id)}>
                <div className="drag-handle" style={{ height: 18, cursor: editMode ? 'move' : 'default' }} />
                <View instanceId={inst.id} config={inst.config} />
              </WidgetCard>
            </div>
          );
        })}
      </ResponsiveGrid>
      {settingsFor && (
        <SettingsDrawer
          instanceId={settingsFor}
          onClose={() => setSettingsFor(null)}
        />
      )}
      {pickerOpen && (
        <AddWidgetPicker onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function toItem(l: Layout) {
  return { i: l.i, x: l.x, y: l.y, w: l.w, h: l.h };
}
```

- [ ] **Step 5: Commit (SettingsDrawer + AddWidgetPicker still to come, app won't build yet — that's fine, we're about to add them)**

```bash
git add src/app/Dashboard.tsx src/styles/grid.css src/main.tsx package.json package-lock.json
git commit -m "feat(widgets): render responsive grid from Supabase state"
```

---

### Task 5.6: SettingsDrawer

**Files:**
- Create: `src/app/SettingsDrawer.tsx`

- [ ] **Step 1: Implement `src/app/SettingsDrawer.tsx`**

```tsx
import { Raised } from '../ui';
import {
  useWidgetInstances,
  useUpdateWidgetConfig,
  useRemoveWidget,
} from '../lib/dashboard-queries';
import { getDefinition } from '../lib/widget-registry';

type Props = {
  instanceId: string;
  onClose: () => void;
};

export function SettingsDrawer({ instanceId, onClose }: Props) {
  const { data: instances = [] } = useWidgetInstances();
  const update = useUpdateWidgetConfig();
  const remove = useRemoveWidget();
  const inst = instances.find((i) => i.id === instanceId);
  if (!inst) return null;
  const def = getDefinition(inst.widget_type);
  if (!def) return null;
  const Settings = def.Settings;

  return (
    <div
      role="dialog"
      aria-label="widget settings"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', justifyContent: 'flex-end',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <Raised
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 340, maxWidth: '100%', height: '100%',
          borderRadius: 0,
          padding: 'var(--space-4)',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <div style={{ fontWeight: 600 }}>{def.displayName} settings</div>
          <button onClick={onClose}>×</button>
        </div>
        <Settings
          config={inst.config as any}
          onChange={(next) => update.mutate({ id: inst.id, config: next as Record<string, unknown> })}
        />
        <div style={{ marginTop: 'var(--space-5)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 'var(--space-3)' }}>
          <button
            onClick={() => {
              if (confirm(`Remove ${def.displayName}?`)) {
                remove.mutate(inst.id);
                onClose();
              }
            }}
            style={{ color: 'var(--down)', fontSize: 12 }}
          >
            Remove widget
          </button>
        </div>
      </Raised>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/SettingsDrawer.tsx
git commit -m "feat(widgets): SettingsDrawer opens widget.Settings with remove action"
```

---

### Task 5.7: AddWidgetPicker

**Files:**
- Create: `src/app/AddWidgetPicker.tsx`

- [ ] **Step 1: Implement `src/app/AddWidgetPicker.tsx`**

```tsx
import { Raised } from '../ui';
import { registry } from '../lib/widget-registry';
import { useAddWidget } from '../lib/dashboard-queries';
import type { WidgetType } from '../lib/database-types';

export function AddWidgetPicker({ onClose }: { onClose: () => void }) {
  const add = useAddWidget();
  const types = Object.keys(registry) as WidgetType[];

  function pick(type: WidgetType) {
    const def = registry[type];
    add.mutate({ type, config: def.defaultConfig as Record<string, unknown> });
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-label="add widget"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <Raised
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: '90vw', padding: 'var(--space-4)' }}
      >
        <div style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>Add a widget</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
          {types.map((t) => (
            <button
              key={t}
              onClick={() => pick(t)}
              style={{
                boxShadow: 'var(--raised-sm)',
                borderRadius: 'var(--radius-inset)',
                padding: 'var(--space-3)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500 }}>{registry[t].displayName}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t}</div>
            </button>
          ))}
        </div>
      </Raised>
    </div>
  );
}
```

- [ ] **Step 2: End-to-end sanity check**

Run: `npm run dev`. Log in. Toggle edit mode. Click "+ Add widget". Add the demo widget. Drag it around. Open settings via gear, change the message. Reload — confirm persistence.

- [ ] **Step 3: Commit**

```bash
git add src/app/AddWidgetPicker.tsx
git commit -m "feat(widgets): add-widget picker"
```

---

## Phase 6: Widgets

### Task 6.1: Bookmarks widget

**Files:**
- Create: `src/widgets/bookmarks/index.tsx`
- Create: `src/widgets/bookmarks/View.tsx`
- Create: `src/widgets/bookmarks/Settings.tsx`
- Create: `src/widgets/bookmarks/Bookmarks.test.tsx`
- Modify: `src/lib/widget-registry.ts`

- [ ] **Step 1: Create `src/widgets/bookmarks/View.tsx`**

```tsx
import { Label, Inset } from '../../ui';

export type BookmarksConfig = { items: Array<{ name: string; url: string }> };

function faviconFor(url: string) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?sz=32&domain=${host}`;
  } catch {
    return null;
  }
}

export function View({ config }: { instanceId: string; config: BookmarksConfig }) {
  if (!config.items.length) {
    return (
      <div>
        <Label>Bookmarks</Label>
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to add bookmarks.
        </div>
      </div>
    );
  }
  return (
    <div>
      <Label>Bookmarks</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {config.items.map((b, i) => (
          <a key={i} href={b.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
            <Inset style={{ textAlign: 'center', padding: 8 }}>
              <img src={faviconFor(b.url) ?? ''} alt="" width={18} height={18} style={{ display: 'block', margin: '0 auto 4px' }} />
              <div style={{ fontSize: 10, color: 'var(--text)' }}>{b.name}</div>
            </Inset>
          </a>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/widgets/bookmarks/Settings.tsx`**

```tsx
import type { BookmarksConfig } from './View';

export function Settings({
  config,
  onChange,
}: {
  config: BookmarksConfig;
  onChange: (c: BookmarksConfig) => void;
}) {
  function update(i: number, patch: Partial<{ name: string; url: string }>) {
    const items = config.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    onChange({ items });
  }
  function remove(i: number) {
    onChange({ items: config.items.filter((_, idx) => idx !== i) });
  }
  function add() {
    onChange({ items: [...config.items, { name: 'New', url: 'https://' }] });
  }
  return (
    <div>
      {config.items.map((it, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, marginBottom: 6 }}>
          <input
            aria-label="name"
            value={it.name}
            onChange={(e) => update(i, { name: e.target.value })}
            style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
          />
          <input
            aria-label="url"
            value={it.url}
            onChange={(e) => update(i, { url: e.target.value })}
            style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
          />
          <button onClick={() => remove(i)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
      <button
        onClick={add}
        style={{ boxShadow: 'var(--raised-sm)', padding: '4px 10px', borderRadius: 6, fontSize: 12, color: 'var(--accent)' }}
      >
        + Add bookmark
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write failing test `src/widgets/bookmarks/Bookmarks.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { View } from './View';
import { Settings } from './Settings';

describe('bookmarks view', () => {
  it('shows placeholder when empty', () => {
    render(<View instanceId="x" config={{ items: [] }} />);
    expect(screen.getByText(/add bookmarks/i)).toBeInTheDocument();
  });

  it('renders tiles with favicon img and label', () => {
    render(<View instanceId="x" config={{ items: [{ name: 'GH', url: 'https://github.com' }] }} />);
    expect(screen.getByText('GH')).toBeInTheDocument();
    const img = screen.getByRole('img', { hidden: true });
    expect(img.getAttribute('src')).toContain('google.com/s2/favicons');
  });
});

describe('bookmarks settings', () => {
  it('adds a bookmark when + clicked', async () => {
    const onChange = vi.fn();
    render(<Settings config={{ items: [] }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /add bookmark/i }));
    expect(onChange).toHaveBeenCalledWith({
      items: [{ name: 'New', url: 'https://' }],
    });
  });
});
```

- [ ] **Step 4: Create `src/widgets/bookmarks/index.tsx`**

```tsx
import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type BookmarksConfig } from './View';
import { Settings } from './Settings';

export const bookmarksDefinition: WidgetDefinition<BookmarksConfig> = {
  type: 'bookmarks',
  displayName: 'Bookmarks',
  defaultConfig: { items: [] },
  defaultSize: { w: 3, h: 2 },
  View,
  Settings,
};
```

- [ ] **Step 5: Register it in `src/lib/widget-registry.ts`**

```ts
import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { demoDefinition } from '../widgets/demo';
import { bookmarksDefinition } from '../widgets/bookmarks';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  demo: demoDefinition,
  bookmarks: bookmarksDefinition,
} as Record<WidgetType, AnyWidgetDefinition>;

// ... (rest unchanged)
```

- [ ] **Step 6: Run tests, expect PASS**

- [ ] **Step 7: Commit**

```bash
git add src/widgets/bookmarks/ src/lib/widget-registry.ts
git commit -m "feat(widget): bookmarks"
```

---

### Task 6.2: Weather widget + Edge Function

**Files:**
- Create: `supabase/functions/weather/index.ts`
- Create: `supabase/functions/weather/deno.json`
- Create: `src/widgets/weather/View.tsx`
- Create: `src/widgets/weather/Settings.tsx`
- Create: `src/widgets/weather/index.tsx`
- Create: `src/widgets/weather/Weather.test.tsx`
- Modify: `src/lib/widget-registry.ts`

- [ ] **Step 1: Create `supabase/functions/weather/deno.json`**

```json
{ "imports": {} }
```

- [ ] **Step 2: Create `supabase/functions/weather/index.ts`**

```ts
// Proxy to OpenWeatherMap. Needs OPENWEATHER_API_KEY secret.
const API = 'https://api.openweathermap.org/data/2.5/weather';
const GEO = 'https://api.openweathermap.org/geo/1.0/direct';
const KEY = Deno.env.get('OPENWEATHER_API_KEY')!;

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') ?? 'current';

  if (mode === 'geocode') {
    const q = url.searchParams.get('q') ?? '';
    const r = await fetch(`${GEO}?q=${encodeURIComponent(q)}&limit=5&appid=${KEY}`);
    return new Response(await r.text(), { status: r.status, headers: cors() });
  }

  // current weather
  const lat = url.searchParams.get('lat');
  const lon = url.searchParams.get('lon');
  const units = url.searchParams.get('units') === 'C' ? 'metric' : 'imperial';
  if (!lat || !lon) return new Response(JSON.stringify({ error: 'lat/lon required' }), { status: 400, headers: cors() });
  const r = await fetch(`${API}?lat=${lat}&lon=${lon}&units=${units}&appid=${KEY}`);
  return new Response(await r.text(), { status: r.status, headers: cors() });
});
```

- [ ] **Step 3: Create `src/widgets/weather/View.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Label, Inset } from '../../ui';

export type WeatherConfig = {
  city: string;
  lat: number;
  lon: number;
  units: 'F' | 'C';
};

async function fetchWeather(cfg: WeatherConfig) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?lat=${cfg.lat}&lon=${cfg.lon}&units=${cfg.units}`;
  const r = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
  });
  if (!r.ok) throw new Error('weather failed');
  return r.json();
}

export function View({ config }: { instanceId: string; config: WeatherConfig }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['weather', config.lat, config.lon, config.units],
    queryFn: () => fetchWeather(config),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    enabled: Number.isFinite(config.lat) && Number.isFinite(config.lon),
  });
  return (
    <div>
      <Label>Weather · {config.city}</Label>
      {isLoading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--down)' }}>Error loading weather</div>}
      {data && (
        <>
          <div style={{ fontSize: 28, fontWeight: 300, margin: '4px 0' }}>
            {Math.round(data.main.temp)}°{config.units}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {data.weather?.[0]?.description} · {Math.round(data.wind?.speed ?? 0)}mph
          </div>
          <Inset style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span>H {Math.round(data.main.temp_max)}°</span>
            <span>L {Math.round(data.main.temp_min)}°</span>
            <span>{data.main.humidity}%☁</span>
          </Inset>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/widgets/weather/Settings.tsx`**

```tsx
import { useState } from 'react';
import type { WeatherConfig } from './View';

type GeoResult = { name: string; state?: string; country: string; lat: number; lon: number };

async function geocode(q: string): Promise<GeoResult[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather?mode=geocode&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, {
    headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string },
  });
  if (!r.ok) return [];
  return r.json();
}

export function Settings({
  config,
  onChange,
}: {
  config: WeatherConfig;
  onChange: (c: WeatherConfig) => void;
}) {
  const [q, setQ] = useState(config.city);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function onSearch() {
    setSearching(true);
    setResults(await geocode(q));
    setSearching(false);
  }

  function pick(r: GeoResult) {
    onChange({
      city: [r.name, r.state, r.country].filter(Boolean).join(', '),
      lat: r.lat,
      lon: r.lon,
      units: config.units,
    });
    setResults([]);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          aria-label="city"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={onSearch} style={{ color: 'var(--accent)' }} disabled={searching}>
          Search
        </button>
      </div>
      {results.map((r, i) => (
        <button
          key={i}
          onClick={() => pick(r)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: 6, fontSize: 12 }}
        >
          {r.name}{r.state ? `, ${r.state}` : ''}, {r.country}
        </button>
      ))}
      <div style={{ marginTop: 8 }}>
        <label style={{ fontSize: 12 }}>
          Units:
          <select
            value={config.units}
            onChange={(e) => onChange({ ...config, units: e.target.value as 'F' | 'C' })}
            style={{ marginLeft: 6, padding: 4, borderRadius: 6, boxShadow: 'var(--inset)' }}
          >
            <option value="F">°F</option>
            <option value="C">°C</option>
          </select>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/widgets/weather/index.tsx`**

```tsx
import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type WeatherConfig } from './View';
import { Settings } from './Settings';

export const weatherDefinition: WidgetDefinition<WeatherConfig> = {
  type: 'weather',
  displayName: 'Weather',
  defaultConfig: { city: 'San Francisco', lat: 37.77, lon: -122.42, units: 'F' },
  defaultSize: { w: 2, h: 2 },
  View,
  Settings,
};
```

- [ ] **Step 6: Write a render test**

```tsx
// src/widgets/weather/Weather.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('weather view', () => {
  it('renders the header', () => {
    render(wrap(<View instanceId="x" config={{ city: 'SF', lat: NaN, lon: NaN, units: 'F' }} />));
    expect(screen.getByText(/weather · sf/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Register the widget**

Edit `src/lib/widget-registry.ts` to add `weatherDefinition`.

- [ ] **Step 8: Run tests, expect PASS**

- [ ] **Step 9: Commit**

```bash
git add supabase/functions/weather/ src/widgets/weather/ src/lib/widget-registry.ts
git commit -m "feat(widget): weather + OpenWeatherMap edge proxy"
```

---

### Task 6.3: Habits widget

**Files:**
- Create: `src/widgets/habits/View.tsx`
- Create: `src/widgets/habits/Settings.tsx`
- Create: `src/widgets/habits/queries.ts`
- Create: `src/widgets/habits/index.tsx`
- Create: `src/widgets/habits/Habits.test.tsx`
- Modify: `src/lib/widget-registry.ts`

- [ ] **Step 1: Create `src/widgets/habits/queries.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Habit, HabitCheckin } from '../../lib/database-types';

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .order('position');
      if (error) throw error;
      return (data ?? []) as Habit[];
    },
  });
}

export function useCheckins(days = 7) {
  return useQuery({
    queryKey: ['habit_checkins', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('habit_checkins')
        .select('*')
        .gte('date', since);
      if (error) throw error;
      return (data ?? []) as HabitCheckin[];
    },
  });
}

export function useToggleCheckin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { habitId: string; date: string; on: boolean }) => {
      if (args.on) {
        await supabase.from('habit_checkins').upsert({ habit_id: args.habitId, date: args.date });
      } else {
        await supabase.from('habit_checkins').delete().eq('habit_id', args.habitId).eq('date', args.date);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_checkins'] }),
  });
}

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { data: existing } = await supabase.from('habits').select('position').order('position', { ascending: false }).limit(1);
      const position = (existing?.[0]?.position ?? 0) + 1;
      const { error } = await supabase.from('habits').insert({ name, position });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}
```

- [ ] **Step 2: Create `src/widgets/habits/View.tsx`**

```tsx
import { Label } from '../../ui';
import { useHabits, useCheckins, useToggleCheckin, todayISO } from './queries';

export type HabitsConfig = Record<string, never>;

export function View(_: { instanceId: string; config: HabitsConfig }) {
  const { data: habits = [] } = useHabits();
  const { data: checkins = [] } = useCheckins(7);
  const toggle = useToggleCheckin();
  const today = todayISO();
  const doneToday = new Set(checkins.filter((c) => c.date === today).map((c) => c.habit_id));

  return (
    <div>
      <Label>Habits · {doneToday.size}/{habits.length} today</Label>
      {habits.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          Enter edit mode → gear icon to add habits.
        </div>
      )}
      {habits.map((h) => {
        const done = doneToday.has(h.id);
        return (
          <button
            key={h.id}
            onClick={() => toggle.mutate({ habitId: h.id, date: today, on: !done })}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', padding: '4px 0', fontSize: 11,
            }}
          >
            <span>{h.name}</span>
            <span style={{ color: done ? 'var(--up)' : 'var(--text-dim)' }}>{done ? '●' : '○'}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create `src/widgets/habits/Settings.tsx`**

```tsx
import { useState } from 'react';
import { useHabits, useCreateHabit, useDeleteHabit } from './queries';
import type { HabitsConfig } from './View';

export function Settings(_: { config: HabitsConfig; onChange: (c: HabitsConfig) => void }) {
  const { data: habits = [] } = useHabits();
  const create = useCreateHabit();
  const del = useDeleteHabit();
  const [name, setName] = useState('');

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          aria-label="habit name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ flex: 1, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button
          onClick={() => {
            if (name.trim()) {
              create.mutate(name.trim());
              setName('');
            }
          }}
          style={{ color: 'var(--accent)' }}
        >
          Add
        </button>
      </div>
      {habits.map((h) => (
        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 4, fontSize: 12 }}>
          <span>{h.name}</span>
          <button onClick={() => del.mutate(h.id)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/widgets/habits/index.tsx`**

```tsx
import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type HabitsConfig } from './View';
import { Settings } from './Settings';

export const habitsDefinition: WidgetDefinition<HabitsConfig> = {
  type: 'habits',
  displayName: 'Habits',
  defaultConfig: {} as HabitsConfig,
  defaultSize: { w: 3, h: 3 },
  View,
  Settings,
};
```

- [ ] **Step 5: Write a render test**

```tsx
// src/widgets/habits/Habits.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { View } from './View';

vi.mock('./queries', () => ({
  useHabits: () => ({ data: [] }),
  useCheckins: () => ({ data: [] }),
  useToggleCheckin: () => ({ mutate: vi.fn() }),
  todayISO: () => '2026-04-20',
}));

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('habits view', () => {
  it('shows placeholder when no habits', () => {
    render(wrap(<View instanceId="x" config={{}} />));
    expect(screen.getByText(/add habits/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Register + run tests + commit**

Register in `src/lib/widget-registry.ts`. Run `npm test`.

```bash
git add src/widgets/habits/ src/lib/widget-registry.ts
git commit -m "feat(widget): habits with daily check-offs"
```

---

### Task 6.4: Stocks widget + Edge Function

**Files:**
- Create: `supabase/functions/stocks/index.ts`
- Create: `supabase/functions/stocks/deno.json`
- Create: `src/widgets/stocks/View.tsx`
- Create: `src/widgets/stocks/Settings.tsx`
- Create: `src/widgets/stocks/index.tsx`
- Create: `src/widgets/stocks/Stocks.test.tsx`
- Modify: `src/lib/widget-registry.ts`

- [ ] **Step 1: Create `supabase/functions/stocks/deno.json`**

```json
{ "imports": {} }
```

- [ ] **Step 2: Create `supabase/functions/stocks/index.ts`**

```ts
// Finnhub proxy. Supports equity symbols + XAU (gold) via OANDA:XAU_USD.
const KEY = Deno.env.get('FINNHUB_API_KEY')!;
const QUOTE = 'https://finnhub.io/api/v1/quote';
const FOREX = 'https://finnhub.io/api/v1/forex/rates';

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'GET, OPTIONS',
    'content-type': 'application/json',
  };
}

type Quote = { symbol: string; price: number; changePct: number };

async function fetchOne(sym: string): Promise<Quote | null> {
  if (sym === 'XAU') {
    const r = await fetch(`${FOREX}?base=XAU&token=${KEY}`);
    if (!r.ok) return null;
    const j = await r.json();
    // price of 1 XAU in USD = 1 / j.quote.USD (quote is base->target)
    const usd = j.quote?.USD ? 1 / Number(j.quote.USD) : null;
    if (!usd) return null;
    return { symbol: 'XAU', price: usd, changePct: 0 };
  }
  const r = await fetch(`${QUOTE}?symbol=${encodeURIComponent(sym)}&token=${KEY}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (typeof j.c !== 'number' || j.c === 0) return null;
  return { symbol: sym, price: j.c, changePct: j.dp ?? 0 };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  const url = new URL(req.url);
  const symbols = (url.searchParams.get('symbols') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!symbols.length) return new Response(JSON.stringify({ quotes: [] }), { headers: cors() });
  const quotes = (await Promise.all(symbols.map(fetchOne))).filter(Boolean);
  return new Response(JSON.stringify({ quotes }), { headers: cors() });
});
```

- [ ] **Step 3: Create `src/widgets/stocks/View.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Label, DataRow } from '../../ui';

export type StocksConfig = { tickers: string[] };

function isMarketHours(d = new Date()) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  // 13:30–20:00 UTC = 9:30–16:00 ET (ignoring DST nuance; close enough for refetch cadence)
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  return mins >= 13 * 60 + 30 && mins <= 20 * 60;
}

async function fetchQuotes(tickers: string[]) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stocks?symbols=${tickers.join(',')}`;
  const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string } });
  if (!r.ok) throw new Error('stocks failed');
  const j = await r.json();
  return j.quotes as Array<{ symbol: string; price: number; changePct: number }>;
}

export function View({ config }: { instanceId: string; config: StocksConfig }) {
  const live = isMarketHours();
  const { data = [] } = useQuery({
    queryKey: ['stocks', config.tickers.join(',')],
    queryFn: () => fetchQuotes(config.tickers),
    staleTime: live ? 60_000 : 15 * 60_000,
    refetchInterval: live ? 60_000 : 15 * 60_000,
    enabled: config.tickers.length > 0,
  });

  return (
    <div>
      <Label>Stocks</Label>
      {config.tickers.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Add tickers via settings.</div>
      )}
      {data.map((q) => (
        <DataRow
          key={q.symbol}
          label={q.symbol}
          value={`${q.price.toFixed(2)} ${q.changePct >= 0 ? '▲' : '▼'}${q.changePct.toFixed(2)}%`}
          trend={q.changePct > 0 ? 'up' : q.changePct < 0 ? 'down' : 'neutral'}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/widgets/stocks/Settings.tsx`**

```tsx
import { useState } from 'react';
import type { StocksConfig } from './View';

export function Settings({ config, onChange }: { config: StocksConfig; onChange: (c: StocksConfig) => void }) {
  const [sym, setSym] = useState('');
  function add() {
    const v = sym.trim().toUpperCase();
    if (!v || config.tickers.includes(v)) return;
    onChange({ tickers: [...config.tickers, v] });
    setSym('');
  }
  function remove(t: string) {
    onChange({ tickers: config.tickers.filter((x) => x !== t) });
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          aria-label="ticker"
          value={sym}
          onChange={(e) => setSym(e.target.value)}
          placeholder="AAPL, XAU, ..."
          style={{ flex: 1, boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={add} style={{ color: 'var(--accent)' }}>Add</button>
      </div>
      {config.tickers.map((t) => (
        <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: 4, fontSize: 12 }}>
          <span>{t}</span>
          <button onClick={() => remove(t)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/widgets/stocks/index.tsx`**

```tsx
import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type StocksConfig } from './View';
import { Settings } from './Settings';

export const stocksDefinition: WidgetDefinition<StocksConfig> = {
  type: 'stocks',
  displayName: 'Stocks',
  defaultConfig: { tickers: ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'XAU'] },
  defaultSize: { w: 2, h: 3 },
  View,
  Settings,
};
```

- [ ] **Step 6: Render test**

```tsx
// src/widgets/stocks/Stocks.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, enabled: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('stocks view', () => {
  it('shows placeholder when no tickers', () => {
    render(wrap(<View instanceId="x" config={{ tickers: [] }} />));
    expect(screen.getByText(/add tickers/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Register + run tests + commit**

```bash
git add supabase/functions/stocks/ src/widgets/stocks/ src/lib/widget-registry.ts
git commit -m "feat(widget): stocks + Finnhub edge proxy (supports XAU gold)"
```

---

### Task 6.5: Tech Feed widget + Edge Function

**Files:**
- Create: `supabase/functions/tech-feed/index.ts`
- Create: `supabase/functions/tech-feed/deno.json`
- Create: `src/widgets/tech-feed/View.tsx`
- Create: `src/widgets/tech-feed/Settings.tsx`
- Create: `src/widgets/tech-feed/index.tsx`
- Create: `src/widgets/tech-feed/TechFeed.test.tsx`
- Modify: `src/lib/widget-registry.ts`

- [ ] **Step 1: Create `supabase/functions/tech-feed/deno.json`**

```json
{
  "imports": {
    "fast-xml-parser": "npm:fast-xml-parser@4"
  }
}
```

- [ ] **Step 2: Create `supabase/functions/tech-feed/index.ts`**

```ts
import { XMLParser } from 'fast-xml-parser';

type Item = { title: string; url: string; source: 'hn' | 'rss' | 'rdt'; label: string; timestamp: number };
type Source = { type: 'hn' | 'reddit' | 'rss'; value: string };

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json',
  };
}

async function fetchHN(): Promise<Item[]> {
  const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  const ids: number[] = (await topRes.json()).slice(0, 20);
  const items = await Promise.all(
    ids.map(async (id) => {
      const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const s = await r.json();
      if (!s || !s.title) return null;
      return {
        title: s.title,
        url: s.url ?? `https://news.ycombinator.com/item?id=${id}`,
        source: 'hn' as const,
        label: 'hn',
        timestamp: (s.time ?? 0) * 1000,
      };
    }),
  );
  return items.filter(Boolean) as Item[];
}

async function fetchReddit(sub: string): Promise<Item[]> {
  const r = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=15&t=day`, {
    headers: { 'user-agent': 'antneenet-dashboard/0.1' },
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.data?.children ?? []).map((c: any) => ({
    title: c.data.title,
    url: `https://reddit.com${c.data.permalink}`,
    source: 'rdt' as const,
    label: `r/${sub}`,
    timestamp: (c.data.created_utc ?? 0) * 1000,
  }));
}

async function fetchRSS(feed: string): Promise<Item[]> {
  const r = await fetch(feed);
  if (!r.ok) return [];
  const text = await r.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const doc = parser.parse(text);
  const entries = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
  return (Array.isArray(entries) ? entries : [entries]).slice(0, 15).map((e: any) => {
    const link = typeof e.link === 'string' ? e.link : e.link?.['@_href'] ?? e.link?.[0]?.['@_href'];
    const pub = e.pubDate ?? e.published ?? e.updated;
    return {
      title: (e.title?.['#text'] ?? e.title) ?? '',
      url: link ?? '',
      source: 'rss' as const,
      label: 'rss',
      timestamp: pub ? Date.parse(pub) : 0,
    } satisfies Item;
  }).filter((i: Item) => i.title && i.url);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: cors() });
  let body: { sources?: Source[] };
  try { body = await req.json(); } catch { return new Response('{}', { status: 400, headers: cors() }); }
  const sources = body.sources ?? [];
  const results = await Promise.all(sources.map((s) => {
    if (s.type === 'hn') return fetchHN();
    if (s.type === 'reddit') return fetchReddit(s.value);
    return fetchRSS(s.value);
  }));
  const merged = results.flat().sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
  return new Response(JSON.stringify({ items: merged }), { headers: cors() });
});
```

- [ ] **Step 3: Create `src/widgets/tech-feed/View.tsx`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { Label } from '../../ui';

type FeedSource = { type: 'hn' | 'reddit' | 'rss'; value: string };
export type TechFeedConfig = { sources: FeedSource[] };

type Item = { title: string; url: string; source: string; label: string; timestamp: number };

async function fetchFeed(sources: FeedSource[]): Promise<Item[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tech-feed`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ sources }),
  });
  if (!r.ok) throw new Error('feed failed');
  const j = await r.json();
  return j.items ?? [];
}

function ago(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function View({ config }: { instanceId: string; config: TechFeedConfig }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['tech-feed', JSON.stringify(config.sources)],
    queryFn: () => fetchFeed(config.sources),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    enabled: config.sources.length > 0,
  });

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <Label>Tech Feed · {data.length}</Label>
      {isLoading && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Loading…</div>}
      {data.map((i, idx) => (
        <a
          key={idx}
          href={i.url}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11, borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span>
            <span style={{ color: 'var(--text-dim)', marginRight: 6 }}>{i.label}</span>
            {i.title}
          </span>
          <span style={{ color: 'var(--text-dim)' }}>{ago(i.timestamp)}</span>
        </a>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Create `src/widgets/tech-feed/Settings.tsx`**

```tsx
import { useState } from 'react';
import type { TechFeedConfig } from './View';

export function Settings({ config, onChange }: { config: TechFeedConfig; onChange: (c: TechFeedConfig) => void }) {
  const [type, setType] = useState<'hn' | 'reddit' | 'rss'>('reddit');
  const [value, setValue] = useState('');

  function add() {
    if (type !== 'hn' && !value.trim()) return;
    onChange({ sources: [...config.sources, { type, value: value.trim() }] });
    setValue('');
  }
  function remove(i: number) {
    onChange({ sources: config.sources.filter((_, idx) => idx !== i) });
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 6, marginBottom: 8 }}>
        <select value={type} onChange={(e) => setType(e.target.value as any)} style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}>
          <option value="hn">HN top</option>
          <option value="reddit">subreddit</option>
          <option value="rss">RSS url</option>
        </select>
        <input
          aria-label="source value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={type === 'hn' ? 'n/a' : type === 'reddit' ? 'programming' : 'https://...'}
          disabled={type === 'hn'}
          style={{ boxShadow: 'var(--inset)', padding: 6, borderRadius: 6 }}
        />
        <button onClick={add} style={{ color: 'var(--accent)' }}>Add</button>
      </div>
      {config.sources.map((s, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 4, fontSize: 12 }}>
          <span>{s.type === 'hn' ? 'HN top' : s.type === 'reddit' ? `r/${s.value}` : s.value}</span>
          <button onClick={() => remove(i)} style={{ color: 'var(--down)' }}>×</button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `src/widgets/tech-feed/index.tsx`**

```tsx
import type { WidgetDefinition } from '../../lib/widget-types';
import { View, type TechFeedConfig } from './View';
import { Settings } from './Settings';

export const techFeedDefinition: WidgetDefinition<TechFeedConfig> = {
  type: 'tech-feed',
  displayName: 'Tech Feed',
  defaultConfig: {
    sources: [
      { type: 'hn', value: '' },
      { type: 'reddit', value: 'programming' },
      { type: 'reddit', value: 'rust' },
      { type: 'rss', value: 'https://www.anthropic.com/news/rss.xml' },
    ],
  },
  defaultSize: { w: 4, h: 5 },
  View,
  Settings,
};
```

- [ ] **Step 6: Render test**

```tsx
// src/widgets/tech-feed/TechFeed.test.tsx
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import { View } from './View';

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

describe('tech feed', () => {
  it('renders the header', () => {
    render(wrap(<View instanceId="x" config={{ sources: [] }} />));
    expect(screen.getByText(/tech feed/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Register + run tests + commit**

```bash
git add supabase/functions/tech-feed/ src/widgets/tech-feed/ src/lib/widget-registry.ts
git commit -m "feat(widget): tech feed with HN + Reddit + RSS aggregator"
```

- [ ] **Step 8: Remove the demo widget now that real widgets are registered**

Edit `src/lib/database-types.ts` to remove `'demo'` from `WidgetType`:

```ts
export type WidgetType = 'bookmarks' | 'weather' | 'habits' | 'stocks' | 'tech-feed';
```

Delete the demo widget and drop it from the registry:

```bash
rm -rf src/widgets/demo
```

Edit `src/lib/widget-registry.ts`:

```ts
import type { WidgetType } from './database-types';
import type { AnyWidgetDefinition } from './widget-types';
import { bookmarksDefinition } from '../widgets/bookmarks';
import { weatherDefinition } from '../widgets/weather';
import { habitsDefinition } from '../widgets/habits';
import { stocksDefinition } from '../widgets/stocks';
import { techFeedDefinition } from '../widgets/tech-feed';

export const registry: Record<WidgetType, AnyWidgetDefinition> = {
  bookmarks: bookmarksDefinition,
  weather: weatherDefinition,
  habits: habitsDefinition,
  stocks: stocksDefinition,
  'tech-feed': techFeedDefinition,
};

export function getDefinition(type: WidgetType): AnyWidgetDefinition | undefined {
  return registry[type];
}

export function listWidgetTypes(): WidgetType[] {
  return Object.keys(registry) as WidgetType[];
}
```

Update `src/lib/widget-registry.test.ts` to expect the MVP widgets instead of demo:

```ts
it('contains all MVP widgets', () => {
  expect(listWidgetTypes().sort()).toEqual(
    ['bookmarks', 'habits', 'stocks', 'tech-feed', 'weather'],
  );
});
```

Run: `npm test` — all pass.

```bash
git add -A
git commit -m "chore(widgets): drop demo widget now that MVP widgets exist"
```

---

## Phase 7: Deployment

### Task 7.1: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: Add SPA routing support for GitHub Pages**

GitHub Pages serves files statically, so a client-side route like `/login` would 404 on refresh. Add a `public/404.html` that redirects to the SPA:

Create `public/404.html`:

```html
<!doctype html>
<meta charset="utf-8">
<title>Redirecting…</title>
<script>
  // Redirect to the SPA root, preserving the path after the base.
  const base = '/antneenet/';
  const rest = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname;
  location.replace(base + '?redirect=' + encodeURIComponent(rest + location.search + location.hash));
</script>
```

And handle the `?redirect=` in `src/main.tsx` right before creating the root:

```tsx
const params = new URLSearchParams(location.search);
const redirect = params.get('redirect');
if (redirect) {
  history.replaceState(null, '', import.meta.env.BASE_URL + redirect);
}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml public/404.html src/main.tsx
git commit -m "chore: GitHub Actions deploy + SPA 404 redirect"
```

---

### Task 7.2: End-to-end setup docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace `README.md` content**

```md
# antneenet — personal dashboard

A self-hosted widget-based personal dashboard. Deep-navy + cyan neumorphic UI, draggable bento grid, five MVP widgets (bookmarks, weather, habits, stocks, tech feed), shared-password auth, cross-device sync via Supabase.

## Architecture

- **Frontend**: Vite + React + TypeScript, hosted on GitHub Pages
- **Backend**: Supabase (Postgres + Edge Functions + Auth)
- **Auth**: Single shared password → fake single user → Supabase session

See `docs/superpowers/specs/2026-04-20-personal-dashboard-design.md` for the full spec.

## Setup

### 1. Supabase

Create a Supabase Pro project, then follow `supabase/README.md`:

```bash
cp .env.local.example .env.local
# fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, INITIAL_PASSWORD
supabase link --project-ref <ref>
npm run db:push
npm run db:seed
supabase secrets set OPENWEATHER_API_KEY="..." FINNHUB_API_KEY="..." SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
npm run fn:deploy
```

### 2. GitHub Pages

- Create a GitHub repo, push this code.
- In repo Settings → Pages, enable "GitHub Actions" as the source.
- Add repo secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Push to `main` — deploy runs automatically.

## Dev

```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm test           # unit tests
npm run typecheck  # tsc --noEmit
```

## Rotating the password

```bash
INITIAL_PASSWORD=newpass npm run rotate-password
# Add --force-logout to invalidate existing sessions:
INITIAL_PASSWORD=newpass npm run rotate-password -- --force-logout
```

## Adding a new widget

1. `src/widgets/<name>/` — create `index.tsx`, `View.tsx`, `Settings.tsx`, `<Name>.test.tsx`.
2. Export a `WidgetDefinition` from `index.tsx`.
3. Add the type to `src/lib/database-types.ts`'s `WidgetType` union.
4. Register the definition in `src/lib/widget-registry.ts`.
5. If the widget needs a server-side data source, add an Edge Function under `supabase/functions/<name>/`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: project README with setup + dev instructions"
```

- [ ] **Step 3: Final sanity**

Run: `npm run typecheck && npm test && npm run build`
Expected: all green.

---

## Self-Review

### Spec coverage
- ✔️ Architecture overview — Phase 0-4 scaffolds the stack described in the spec.
- ✔️ Data model — Task 2.2 migration matches the spec's six tables + RLS.
- ✔️ Auth flow — Tasks 2.3, 2.4, 3.2, 4.1, 4.2 cover seed, Edge Function, helpers, gate, login UI.
- ✔️ Widget system — Tasks 5.1-5.7 implement the contract, registry, card, grid, persistence, settings, picker.
- ✔️ Layout and theme — Tasks 1.1-1.5 ship tokens + primitives; Task 5.5 wires grid breakpoints.
- ✔️ Deployment — Tasks 7.1, 7.2 cover GitHub Actions + README. Supabase deploy commands live in `supabase/README.md` (Task 2.1) + root README (Task 7.2).
- ✔️ Per-widget specs — Tasks 6.1-6.5 each widget. Stocks includes `XAU` support per spec.

### Placeholder scan
No `TBD` / `TODO` / "implement later". Every code step contains complete code the engineer runs as-is.

### Type consistency
- `WidgetType` union updated consistently (demo added in 5.2, removed in 6.5 final).
- `WidgetDefinition<Config>` signature stable across 5.1 and every widget 6.1-6.5.
- `LayoutsByBreakpoint`, `GridLayoutItem` consistent between `database-types.ts` and usage in 5.4, 5.5.
- `supabase` export consistent across `src/lib/supabase.ts` and every consumer.

No drift detected.
