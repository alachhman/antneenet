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
