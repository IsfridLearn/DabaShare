# Deployment

Status: local development only. The production steps are finalised in Phase 10.

## Environments

| | Dev | Production |
|---|---|---|
| Supabase project | `DabaShare` (ref `zxjerdapfbufuimqhcgp`, Singapore, free tier). Linked and migrated 2026-11-22. | New project, created in Phase 10 |
| App | `npm run dev` on localhost:3000 | Vercel, from the `main` branch |
| Env file | `.env.local` (git-ignored) | Vercel project environment variables |

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in from Supabase → Project Settings → API: the **Project URL** and the **publishable / anon** key.
3. Link the CLI to the dev project. You do this once, in your own terminal, because the login and database password are yours:
   ```
   npx supabase login
   npx supabase link --project-ref <dev project ref>
   ```
4. Run `npm run db:push` to apply the migrations to dev.
5. Run `npm run db:types` to generate `src/lib/supabase/database.types.ts`, then `npm run db:test:rls`. You should see "55 passed, 0 failed".
6. Run `npm run dev`, then open http://localhost:3000/status. While signed out, all three lines should show ✓: universities 15, categories 14, and skills "members only".

## Supabase dashboard settings (dev; repeat for prod)

- Authentication → URL Configuration: Site URL `http://localhost:3000`, redirect URLs `http://localhost:3000/**`.
- Authentication → Sign In / Providers → Email: confirm email **on**, minimum password length **8**.

## Production checklist (Phase 10)

- [ ] Create the prod Supabase project in the nearest region (Singapore).
- [ ] Run `supabase link` to prod, then `supabase db push`. Review the migration list first.
- [ ] **Set up custom SMTP for auth emails.** The built-in sender only delivers to Supabase org members, so students can't sign up without it. Once it works, enable the branded templates in `supabase/config.toml` (and the POST step in `/auth/confirm`).
- [ ] Set the auth Site URL and redirect URLs to the production domain: `https://<domain>/**`, plus the Vercel preview pattern for previews.
- [ ] Create the Vercel project from GitHub and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL`. The app refuses to start in production without the site URL.
- [ ] Set up backups. The free tier has no point-in-time recovery, so this needs a decision.
- [ ] Set up error monitoring.
- [ ] Publish the privacy notice and terms, reviewed.
