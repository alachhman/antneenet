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
