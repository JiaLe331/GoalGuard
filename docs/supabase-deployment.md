# Supabase deployment

GoalGuard uses Supabase as PostgreSQL infrastructure only. It does not use Supabase Auth or expose a Supabase key in the browser.

1. Set Vercel and Render `DATABASE_URL` to the Supabase transaction pooler URI on port 6543.
2. Set migration tooling `DATABASE_DIRECT_URL` to a direct IPv6-capable connection or session pooler URI on port 5432.
3. Run `pnpm db:migrate` once before deploying the app and worker. Do not add migration commands to either startup command.
4. Keep the generated row-level-security setting enabled on every GoalGuard table. No browser-facing RLS policies are created because all access is server-side.
5. In Supabase API settings, disable the Data API for the `public` schema when available. If it must remain enabled, revoke table access from browser roles:

```sql
revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
```

6. Never create `NEXT_PUBLIC_SUPABASE_*` variables for this P0. Confirm that only Vercel server functions and the Render worker can read the database credentials.

Use the Supabase SQL editor or a controlled migration connection for the privilege revocation. PGlite tests validate schema behavior without production credentials.
