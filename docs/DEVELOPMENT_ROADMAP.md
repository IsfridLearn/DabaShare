# Development Roadmap

Status: **approved 2026-11-22**. Section 7 records the decisions.

## 1. Target architecture

```
Browser ──> Next.js on Vercel (App Router, React Server Components)
              │  Server Components: read data with the user's session
              │  Server Actions: validated mutations (zod)
              │  Proxy/middleware: refresh session, guard routes
              ▼
           Supabase
              ├─ Auth: email+password, verification, password reset
              ├─ Postgres: tables + RLS (the real security boundary) + RPC functions
              ├─ Storage: avatars bucket, per-user folder policies
              └─ Realtime: new messages and notifications
```

Principles:

- **RLS enforces security.** Server Actions validate input for good error messages, and the database refuses anything a policy doesn't allow, even when the call bypasses the app.
- **No service-role key in the app** for normal features. Cross-user side effects, such as creating a notification for someone else, run as Postgres triggers or `security definer` functions with narrow checks.
- **Plain, readable code.** No state library, ORM or component kit beyond what's needed. Supabase's generated TypeScript types provide type safety.

Dependencies planned: `next`, `react`, `typescript`, `tailwindcss`, `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `vitest`. Playwright is proposed at Phase 9 and needs its own approval then.

### Route map (prototype page → new route)

| Prototype | New route |
|---|---|
| `page-login` | `/login` |
| `page-signup` | `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` |
| (new) | `/onboarding` |
| `page-dashboard` | `/courses`, `/courses/new`, `/courses/[id]`, `/courses/[id]/edit` |
| `page-profile` | `/profile/edit`, `/u/[username]` (public), `/matches` |
| `page-webinar` | `/sessions`, `/sessions/new`, `/sessions/[id]` |
| `page-messages` | `/messages`, `/messages/[conversationId]` |
| (new) | `/notifications`, `/settings` |

### Initial schema (to be finalised in Phase 2)

- `universities` (seeded with the Davao list, plus "Other")
- `profiles` (1:1 with `auth.users`): username, display_name, avatar_path, university_id, program, bio, visibility
- `skills` (canonical, with a unique slug and a category) and `student_skills` (profile_id, skill_id, kind `teach|learn`)
- `categories`
- `courses`: owner_id, title, description, category_id, level, price_php (0 = free), university_id, status
- `course_enrollments`: course_id, student_id, status `requested|accepted|declined|cancelled`, unique (course, student)
- `conversations`, `conversation_members` (with `last_read_at` for unread counts), `messages`
- `study_sessions`: host_id, type `webinar|study_group|qa`, starts_at, ends_at, capacity, meeting_url, status, plus `session_participants` with a unique constraint
- `notifications`: recipient, type, payload, read_at. Written by triggers.
- `reports`, `blocks`

**Matching** is a Postgres function, `suggest_matches(limit)`. It scores the overlap between my learn list and their teach list in both directions, plus shared interests, same university and shared course categories. It returns the score **and the reasons**, so the UI can explain each match ("Teaches Accounting, which you want to learn"). Blocked users and private profiles are excluded.

## 2. Migration strategy

1. Scaffold Next.js in the repository root. Move the prototype unchanged into `prototype/` as a visual reference. Nothing is deleted.
2. Port design tokens from `style.css` into the Tailwind theme, and build shared components (Nav, Button, Input, Card, Modal, Toast, Tag, Avatar, EmptyState).
3. Build feature by feature in phase order. Each feature replaces its prototype screen against real data.
4. Delete `prototype/` only after Phase 8 reaches visual parity, and only with your approval.

## 3. Phases

| # | Phase | Main output |
|---|---|---|
| 1 | Repository audit | `AUDIT.md`, this roadmap |
| 2 | Architecture and foundation | Next.js app, Supabase wiring, schema migrations, shared UI, `CLAUDE.md`, docs |
| 3 | Authentication and profiles | Signup, verification, login, reset, onboarding, profile editing, avatars, privacy |
| 4 | Course marketplace | CRUD, search, filters, details, enrollment requests |
| 5 | Student matching | `suggest_matches`, matches page, public profiles, "Message" button |
| 6 | Messaging | Conversations, realtime, unread counts, block, report |
| 7 | Sessions and notifications | Session CRUD, join, capacity, cancellation, notification centre |
| 8 | UI/UX and responsiveness | Mobile layouts, loading, empty and error states, accessibility |
| 9 | Security and testing | RLS tests with two real users, workflow tests, independent review |
| 10 | Deployment | Production Supabase, Vercel, SMTP, backups, monitoring, runbook |

## 4. Testing approach

- **Every phase:** `tsc --noEmit`, `next lint` and `next build` must pass, and Vitest covers pure logic (validation schemas, match-reason formatting).
- **RLS tests:** a Vitest suite that signs in as two real test users against the **dev** Supabase project and asserts that each one can't read or change the other's data. This works without Docker.
- **Manual workflow checks** are written down in `DEVELOPMENT_PROGRESS.md`. Anything not checked is marked UNTESTED.

## 5. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase's built-in email is heavily rate-limited (a few emails per hour) | Signups stall in production | Custom SMTP in Phase 10, for example Resend's free tier. This needs an account. |
| Supabase free projects pause after about a week without activity | Dev or demo site goes down | Acceptable for dev. Production may need the Pro plan (paid, your decision). |
| Philippine Data Privacy Act (RA 10173) | Collecting student personal data requires a privacy notice and consent | Privacy notice and consent checkbox at signup, data deletion in settings. I can't give legal advice; have it reviewed before a public launch. |
| Some users may be minors (senior high students) | Messaging safety, payments | Age confirmation at signup, plus block and report from day one. Payments stay deferred, as you requested. |
| Abuse and spam in messages and listings | Moderation load | Rate limits in actions, reports table, admin review queue (a simple role flag). |
| No Docker, so no local Supabase | Migrations are tested against a hosted dev project | Use separate dev and prod projects and never test against prod. |
| Free-text skills don't match each other | Matching quality | Canonical skills table with autocomplete. Users can add new skills, which get normalised slugs. |

## 6. Subagent plan

You set a limit of two custom agents. Both are defined in `.claude/agents/`.

| Agent | Model | Owns | Never |
|---|---|---|---|
| `fullstack-engineer` | Sonnet | Feature code in the files the main agent assigns for that task | Schema/RLS design decisions, files outside its assignment |
| `qa-security-reviewer` | Haiku (the main agent passes `model: sonnet` for deep RLS or auth reviews) | Read-only review reports | Editing files, redesigning the architecture |

The main agent (Opus) owns the schema, RLS policies, auth plumbing, integration and every final decision. Small changes stay in the main agent. Delegation is used only for large, independent features with clear file ownership.

## 7. Decisions (resolved 2026-11-22: all as proposed; see ARCHITECTURE.md A1, A9–A11)

1. Approve replacing the vanilla-JS prototype with Next.js, TypeScript, Tailwind and Supabase. The prototype is kept in `prototype/`.
2. Supabase account: create a **dev** project (free) and provide the project URL and anon key.
3. Webinar video: the prototype implies built-in video calls. The proposal is that hosts paste a Google Meet, Zoom or Jitsi link, which DabaShare shows only to accepted participants. Built-in video would be a large paid-infrastructure project.
4. Signup eligibility: open to any email with a self-declared university (proposed), or restricted to university email domains (fewer fakes, but many students use Gmail).
5. Paid courses: until payments are evaluated, paid listings show a price and enrollment is a request the creator accepts, with payment arranged outside DabaShare (proposed). Alternatively, hide paid listings for now.
