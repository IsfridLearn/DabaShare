# Architecture

## Overview

```
Browser ──> Next.js 16 on Vercel
              src/proxy.ts          refreshes the Supabase session cookie on every request
              Server Components     read data as the signed-in user (inside <Suspense>)
              Server Actions        validate input (zod) and write data as the signed-in user
              Client Components     realtime subscriptions, uploads, interactive UI
                     │
                     ▼ publishable key + user's JWT (never the service-role key)
              Supabase
              ├─ Auth        email + password, email verification, password reset
              ├─ Postgres    tables, RLS policies, triggers, RPC functions
              ├─ Storage     "avatars" bucket
              └─ Realtime    messages, notifications
```

The database is the security boundary. Whatever path a request takes (the app, a hand-written API call, a modified client), Postgres row-level security and triggers decide what the user may do. The app layer adds validation for friendly errors, plus UX.

## Folder layout

```
src/
  app/                 routes (App Router). One folder per feature from Phase 3.
  components/ui/       shared primitives: Button, Field/Input/Select/Textarea, Card, Alert, Tag, EmptyState, Logo
  components/<feature>/ feature components (from Phase 3)
  lib/env.ts           validated public environment variables
  lib/supabase/        server.ts, client.ts, proxy.ts (+ database.types.ts once generated)
  lib/<feature>/       data access and Server Actions per feature
  proxy.ts             Next.js proxy (formerly middleware)
supabase/
  config.toml          local-stack config (also documents the intended auth settings)
  migrations/          ordered SQL migrations; the only way the schema changes
prototype/             archived vanilla-JS prototype (visual reference only)
docs/                  project documentation
```

## Decisions

| # | Decision | Reason |
|---|---|---|
| A1 | Replace the vanilla-JS prototype with Next.js, TypeScript, Tailwind and Supabase (approved 2026-11-22) | The prototype had no backend, routing, persistence or escaping. Only about 600 lines of UI glue were lost. |
| A2 | Keep Next.js **Cache Components** enabled | It becomes mandatory in the next major version. Nothing is cached unless code opts in with `'use cache'`, so per-user data can't leak by accident. The cost is wrapping session reads in `<Suspense>`, which doubles as the loading states. |
| A3 | RLS and triggers enforce the rules; no service-role key in the app | One enforcement point that holds no matter how the API is called. |
| A4 | Internal SQL helpers go in a `private` schema | PostgREST doesn't expose that schema, so the helpers can't be called as RPCs. |
| A5 | Canonical `skills` table with generated slugs, and new skills created through `add_student_skill()` | Free-text tags never match each other. Slugs make "c++" and "C++" the same skill. |
| A6 | Meeting links in a separate `study_session_links` table | RLS is row-level. A separate table lets only the host and accepted participants see the link. |
| A7 | Notifications are written only by triggers | Clients can't create notifications for other users. |
| A8 | All app data requires sign-in. Only universities and categories are public. | Many users are students, some possibly minors, so profiles and listings aren't exposed to search engines or anonymous scraping. |
| A9 | Paid courses: the price is shown and enrollment is a request the owner accepts. No payment handling. | Payment collection is deferred until legal and age requirements are evaluated (your requirement). |
| A10 | Webinars use host-provided meeting links (Meet, Zoom, Jitsi), not built-in video | Built-in video would need paid media infrastructure. |
| A11 | Signup is open to any email with a self-declared university | Many Davao students use personal email addresses. Domain verification can be added later. |
| A12 | Members must confirm they are 18 or older | Keeps minors off a platform with open messaging, and avoids parental-consent handling under the Data Privacy Act. Revisit if senior-high or 17-year-old freshmen need access. |
| A13 | Auth emails use Supabase's default templates (PKCE `?code=` links) for now | The free tier rejects custom templates without custom SMTP. `/auth/confirm` supports both `?code=` and `?token_hash=`, and the branded templates in `supabase/templates/` are ready for when SMTP is set up. |
| A14 | The server Supabase client calls `connection()`, and signed-in pages set `instant = false` | Session data must never be prerendered. supabase-js reads the clock (token expiry), which Cache Components forbids during prerendering. Per-user pages block on the server and show `loading.tsx` instead of an instant static shell. |
| A16 | Course browsing uses one SQL function, `search_courses()` (security invoker), with GET-form filters | Combined filters, tutor and skill search and the total count in one round trip, with RLS still applied. GET URLs are shareable and work without JavaScript. |
| A17 | Courses (`/courses`) is the signed-in home. No star ratings are shown. | Browsing is the main activity. The prototype's ratings were made up, and showing them would mislead students. |
| A15 | Avatars are resized in the browser to a 512px WebP before upload | It keeps uploads under 2 MB on mobile data, and image transformations aren't available on the free tier. |

## Dependencies

| Package | Why |
|---|---|
| `next`, `react`, `react-dom` | Framework |
| `@supabase/supabase-js`, `@supabase/ssr` | Supabase client with cookie-based sessions for SSR |
| `zod` | Input validation in Server Actions, and env validation |
| `server-only` | Build error if a server module is imported into client code |
| `tailwindcss`, `@tailwindcss/turbopack` | Styling (scaffold default) |
| `vitest` (dev) | Unit tests |
| `supabase` (dev) | CLI for migrations and type generation (`npx supabase`) |
