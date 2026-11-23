# DabaShare — instructions for Claude Code

@AGENTS.md

## Project

DabaShare is a skill-sharing platform for college students in Davao City. Students offer and take courses, find learning partners, message each other, and run study sessions and webinars. It is built as a real product, not a demo, so there is no fake data, no simulated features and no buttons that do nothing.

**Current phase:** see `docs/DEVELOPMENT_PROGRESS.md`. Plan: `docs/DEVELOPMENT_ROADMAP.md`.

## Stack

- Next.js 16 (App Router, **Cache Components on**, `src/proxy.ts`, not middleware), React 19, TypeScript strict, Tailwind v4
- Supabase: Postgres + RLS, Auth, Storage, Realtime. Clients are in `src/lib/supabase/`.
- zod for validation, Vitest for tests
- Vercel for hosting. Separate Supabase projects for dev and prod.

The prototype in `prototype/` is the archived original UI. It's a visual reference only; never import from it.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000. `/status` checks Supabase (dev only). |
| `npm run check` | Typecheck (with `next typegen`), lint and unit tests. Run it before every commit. |
| `npm run build` | Production build. It must pass before a phase is marked done. |
| `npm run db:push` | Apply `supabase/migrations` to the **linked** project. Check which project is linked first. |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` after a schema change. |
| `E2E_PROJECT_REF=<dev ref> npm run test:e2e` | Full end-to-end suite against a running server (`npm run build && npm run start`). It creates and always deletes its own test users, and refuses to run unless the ref matches the linked project. Expect "N passed, 0 failed". |
| `npm run db:test:rls` | Run the RLS and business-rule smoke test on the linked **dev** database (always rolled back). Expect "N passed, 0 failed". |

The linked project is **DabaShare** (`zxjerdapfbufuimqhcgp`, Singapore). It's the dev database. Don't touch the other project in this account (IsfridVerse).

## Conventions

- **Security lives in the database.** Every table has RLS. A new table needs policies, column grants and an entry in `docs/SECURITY.md` in the same migration. Server Actions validate with zod for good error messages, but they aren't the security boundary.
- **Never use the service-role key in app code.** Cross-user side effects (notifications, counters) are Postgres triggers or `security definer` functions in the `private` schema, with `set search_path = ''`.
- **Schema changes go through new migration files only.** Never edit an applied migration and never change the schema from the dashboard.
- **Cache Components:** any component that reads cookies or the session (that is, the Supabase server client) must sit inside `<Suspense>`. Never add `'use cache'` to code that queries Supabase with the user's session, because cached results could leak between users.
- Next.js 16 APIs differ from older versions. Check `node_modules/next/dist/docs/` before using an API you're not sure of. Error boundaries take `{ error, retry }`.
- UI: use `src/components/ui/*` and the tokens in `src/app/globals.css` (`brand`, `accent`, `success`, `danger`, `font-display`, `rounded-card`, `rounded-control`). It's mobile-first, and every list needs loading, empty and error states.
- Keep files small and logic out of components: data access in `src/lib/<feature>/`, UI in `src/app/...` and `src/components/<feature>/`.
- No `any`. No new dependency without a reason written in `docs/ARCHITECTURE.md`.
- Commit on a branch with descriptive messages. Never commit `.env*` files except `.env.example`.

## Testing requirements

- Every change: `npm run check`. Every phase: `npm run build` as well.
- Database changes: test the RLS behaviour with two real test users on the **dev** project (Phase 9 automates this).
- Record what was actually run in `docs/DEVELOPMENT_PROGRESS.md`. Anything not executed is written as UNTESTED.

## Subagents and cost

- At most two custom agents: `fullstack-engineer` (Sonnet) and `qa-security-reviewer` (Haiku; pass `model: sonnet` for deep RLS or auth reviews). Definitions are in `.claude/agents/`.
- The main agent owns the schema, RLS, auth plumbing, integration and final decisions, and does small tasks itself.
- Delegate only large, independent work, and give each agent an explicit list of files it owns. Two agents never edit the same file.
- Ask for short reports with file:line references. Don't rescan the repo; reuse earlier findings.
