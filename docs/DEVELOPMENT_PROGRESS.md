# DabaShare Development Progress

Last updated: 2026-11-28

**Current Phase:** Phase 10 — Deployment. **Live at https://dabashare.vercel.app.** Remaining: Gmail SMTP so every student receives emails (DEPLOYMENT.md §2).

**Overall Progress:** 9/10 phases completed.

## Phase Status

- [x] Phase 1 — Repository Audit
- [x] Phase 2 — Architecture and Foundation
- [x] Phase 3 — Authentication and Profiles
- [x] Phase 4 — Course Marketplace
- [x] Phase 5 — Student Matching
- [x] Phase 6 — Messaging
- [x] Phase 7 — Study Sessions and Notifications
- [x] Phase 8 — UI/UX Refinement
- [x] Phase 9 — Security and Testing
- [ ] Phase 10 — Deployment

## Phase 3 sign-off

Your real account (created 2026-11-23) proves the end-to-end email flow: signup through the real form, a delivered confirmation email, a confirmed address, onboarding done, and 7 skills (including 2 new canonical skills). The in-browser photo upload is still UNTESTED; the storage rules behind it were tested on 2026-11-23.

## Log

### 2026-11-28 — Course space and reviews, on branch `course-space`

- After enrolling, learning now happens on DabaShare: lessons with places or meeting links, tutor updates with materials, completion, and reviews from students who finished. Ratings show in the catalogue and on profiles. Plan and result are in COURSE_SPACE.md.
- Migrations `20261202090000_course_space.sql` and `20261202100000_course_space_hardening.sql` were applied to the shared database. Both are additive; the live app is unaffected until the screens ship.
- Tested: check (114 unit tests), build, RLS **170/0**, E2E **167/0**, and an accessibility and overflow sweep (44 screenshots, 0 issues). Independent security review: 0 critical, 0 high; the 4 medium findings are fixed.
- Not deployed. Waiting for the owner's go-ahead.

### 2026-12-02 — Design v3 "The Commons", on branch `design-v3`

- A full redesign after a study of the product and the four references (Linear, Are.na, Notion, an academic editorial site), with two subagent reviews of the rendered UI. The decisions and the result are in DESIGN_V3.md.
- No database, API or Server Action changes. No new dependencies: Instrument Sans is loaded through `next/font`.
- Tested: `npm run check` (103 unit tests), `npm run build`, E2E 158 passed and 0 failed, and an accessibility and overflow sweep (146 screenshots, 0 issues). RLS: UNTESTED this round, since no database changes were made. Demo data seeded for screenshots was always deleted afterwards (0 test users left).
- The accent was changed to DabaShare blue at the owner's request (`a2cc017`; contrast rechecked, E2E 158/0).
- **Deployed 2026-11-28:** `design-v3` was fast-forwarded into `main` and published by Vercel. Live smoke test: public pages 200, protected pages redirect to sign-in, and temporary signed-in students saw Home, Courses, People and Messages (deleted afterwards; 0 test users left).

### 2026-12-01 — Design refresh, Phase 6 (final QA), on branch `design-refresh`

- **Security review** of the social layer by `qa-security-reviewer` (Sonnet): 0 critical, 0 high, 1 medium, 6 low. Fixed the medium and 3 low ones in migration `20261201090000_social_feed_hardening.sql`, plus stricter feed cursor validation; the rest are documented in SECURITY.md. The 5 new RLS checks failed before the migration and pass after it.
- The dev push went through the HTTPS query API (`supabase db query`) and was recorded in `supabase_migrations.schema_migrations`, because this network blocks the direct database port that `supabase db push` uses.
- **QA sweep** with an automatic horizontal-overflow check and an accessibility audit (unnamed buttons and links, unlabelled fields, one h1 per page, duplicate ids, images without alt, page title): 17 signed-in pages at 360, 768, 1024 and 1440px in light mode, 11 in dark mode at 360 and 1440px, and 8 signed-out pages in both themes at all four widths. Found and fixed: a duplicate `password` id on Settings, and the course Visibility dropdown truncating its descriptions on phones (now radio cards).
- Tested: `npm run check` (101 unit tests), `npm run build`, `npm run db:test:rls` **144 passed, 0 failed**, E2E **158 passed, 0 failed** (self-cleaned).
- **Database:** there is only one Supabase project (`zxjerdapfbufuimqhcgp`, see DEPLOYMENT.md), so both social migrations were applied to the live database when they were tested. Both are additive; the old site kept working.
- **Deployed:** `design-refresh` fast-forwarded into `main` (`f3d4d8e`) and Vercel published it to https://dabashare.vercel.app. Live smoke test: public pages 200, protected pages redirect to sign-in, and a temporary signed-in student saw the Home feed and a profile (deleted afterwards). Vercel preview builds of other branches fail because the Preview environment has no Supabase variables; production is unaffected.

### 2026-12-01 — Design refresh, Phase 5 (interactions + responsive), on branch `design-refresh`

- **Toasts:** new `Toast`, `NoticeToast` (for `?notice=` redirects; removes the notice from the address bar) and `ResultToast` (for form results). `FormMessage` takes `successAs="toast"`. Errors always stay inline.
- **Skeletons:** `src/components/ui/skeletons.tsx` and a `loading.tsx` for each of the 21 signed-in routes, shaped like the page they stand in for.
- **Responsive fixes:** see DESIGN_AUDIT.md "Phase 5 result".
- Tested: `npm run check` (101 unit tests), `npm run build`, E2E 158 passed, 0 failed (self-cleaned). Screenshots of 13 signed-in screens at 360, 768, 1024 and 1440px (plus host views, the landing page, and dark mode samples), with an automatic horizontal-overflow check: no page scrolls sideways at any width.

### 2026-11-30 — Design refresh, Phase 4 (core screens), on branch `design-refresh`

- Every signed-in screen now uses the design system v2 (details in DESIGN_AUDIT.md "Phase 4 result"). The old `Tag` component and the course-only pagination are removed.
- New shared pieces: `BackLink`, `Properties`, `PanelSection`, `RowList`, `MessagesFrame`, and a quieter `Alert` with an icon.
- New pure helpers `sessionDay`, `clockRange` and `groupByDay` (Philippine-time day grouping), with unit tests.
- No database or server-action changes.
- Tested: `npm run check` (101 unit tests), `npm run build`, and the full E2E suite (158 passed, 0 failed, self-cleaned). Screenshots: UNTESTED this phase (skipped at the owner's request).

### 2026-11-29 — Design refresh, Phase 3 (auth screens), on branch `design-refresh`

- Sign in, create account, forgot password, new password and check email now share a split editorial layout with no cards or gradients (details in DESIGN_AUDIT.md "Phase 3 result").
- New `PasswordInput` (show/hide, live requirement checklist) and `useInlineErrors` (check on leaving a field, clear while fixing). Form fields across the app use the new tokens.
- The E2E suite now fails a stuck request after 30 seconds and names it, instead of hanging.


### 2026-11-29 — Design refresh, Phase 2 (design system + social layer), on branch `design-refresh`

Following the owner's direction, students now land on a LinkedIn-style **Home feed** instead of the course list, can post about their work and events, follow each other and like posts.

- **Migration** `20261129090000_social_feed.sql` (applied to dev): the `posts`, `post_likes` and `follows` tables with RLS and column grants; triggers for the post and follow limits, attachment ownership, the `edited_at` stamp, follower and like notifications (deduplicated), and blocks removing follows; post reports; the `feed_posts` and `profile_social` RPCs.
- **App:**
  - The design tokens and primitives, and the new sidebar shell (see DESIGN_AUDIT.md "Phase 2 result").
  - `/home` (feed, composer, tabs, rail) and `/posts/[id]`.
  - Follow and posts on `/u/[username]`.
  - The notification texts and targets, and post reporting.
  - Like, follow and delete are real forms, so they also work without JavaScript and are covered by the E2E suite.
- **Not done yet:** the rest of the screens move to the new look in Phase 4. Nothing is merged to `main` or deployed.


### 2026-11-28 — Phase 9 complete

Completion criterion met: critical workflows work, access controls are tested, and no known critical (or high) issues are open.

- **Independent security review** of everything since Phase 3: 0 critical and 0 high findings, and no RLS bypass, IDOR or escalation. 2 medium and 9 low findings are fixed; 2 low findings are documented as known limitations in SECURITY.md.
- **Migrations:** `20261128090000_phase9_hardening.sql` and `20261128100000_open_hidden_conversation.sql`. These add the abuse caps (conversations, courses, sessions), hide-a-conversation, de-duplicated session updates, no replies to deleted accounts, a bounded inbox, and input bounds.
- **App:**
  - Security headers, notification links no longer prefetched, and a "Hide" button in chat.
  - Strict cursor and filter validation, an inline retry for older messages, and limited owner lists.
- **Repeatable tests in the repo:** `npm run test:e2e` (138 checks, self-cleaning, guarded to the dev project) and `npm run db:test:rls` (119 checks).
- **Dependency audit:** 0 vulnerabilities.

### 2026-11-28 — Phase 8 complete

Completion criterion met: the major screens are cohesive, accessible and usable at phone (390px) and desktop (1280px) widths. This was verified with real headless-Chrome screenshots of seeded content, plus the full production E2E suite.

- **Independent review:** `qa-security-reviewer` (Sonnet) reviewed UI, UX and accessibility and found 7 high, 14 medium and 4 low issues. The high ones and nearly all the others are fixed; the rest are listed below.
- **Shell:**
  - A bottom tab bar on phones with always-visible badges, and current-page highlighting (`aria-current`).
  - An account menu (closes on outside click, Escape and navigation), a skip link, and an `(app)/error.tsx` that keeps the navigation.
  - The viewport tracks the keyboard (`interactive-widget`), and the landing page sends signed-in users to Courses.
- **Forms:** 16px inputs on mobile (no iOS zoom), hints linked to inputs (`aria-describedby`), save and error messages next to the submit button, and placeholder and help-text contrast raised.
- **Messages:**
  - Full-screen chat on phones with a 44px back button.
  - An auto-growing composer that keeps the keyboard open, and Enter-to-send only with a physical keyboard, never while sending.
  - Scrolling that keeps your place, with a "New messages ↓" button.
  - `role=log`, sender names for screen readers, bigger Report targets, and a clearer blocked-conversation message.
  - An inbox empty state with a button and unread dots.
- **Profile:**
  - A completeness checklist with anchor links, and skills first on mobile.
  - Bigger remove buttons on skills (long names wrap), and "Photo updated" / "Photo removed" feedback; the hidden file input is out of the tab order.
  - Public profiles show "Why you two match" and the student's courses, with a full-width Message button on phones.
  - Block requires a second confirmation, and the menu can't open off-screen.
- **Elsewhere:**
  - Join and Enroll cards come first on mobile, long links and descriptions wrap, and course filters use two columns on phones.
  - Correct heading order (h1 then h2), reduced-motion support, card padding on phones, and darker avatar colours.
- **Deferred:**
  - A show-password toggle, an optimistic "sending" bubble with retry, a per-conversation tab title, and a dedicated inbox skeleton.
  - Interests and other pages already use the generic skeleton.

### 2026-11-27 — Phase 7 complete

Completion criterion met: students organise sessions and webinars and get relevant notifications. It was verified end to end with two real accounts.

- **Migrations:** `20261127090000_sessions_notifications.sql` and `20261127100000_participant_status_default.sql`.
- **Sessions:**
  - `/sessions` with Upcoming, Live now and My sessions tabs.
  - `/sessions/new` and `/sessions/[id]/edit`, with times entered in PH time and impossible dates rejected.
  - `/sessions/[id]`: join, request, invitation responses, leave, the meeting link for accepted participants, and host tools (participants, invite by username, cancel).
- **Notifications:** `/notifications` with a sentence for each event, open-and-mark-read (`/notifications/open/[id]`) and mark all as read.
- **Navigation:** reorganised to Courses, My courses, Matches, Sessions, Messages and Notifications, with unread badges. Your profile is reached from the avatar, and Settings sits next to Log out.
- **Fix found by E2E:** the meeting link is no longer sent to the browser for cancelled or ended sessions.

### 2026-11-26 — Phase 6 complete

Completion criterion met: two authenticated students communicate securely, with persistent messages and realtime delivery, and no dummy data.

- **Migrations:** `20261126090000_messaging.sql` (inbox, unread, mark-read, my_blocks, rate limits) and `20261126100000_conversation_cleanup.sql`.
- **Pages:**
  - `/messages`: the inbox, which updates live.
  - `/messages/[id]`: chat with realtime, load-earlier, day separators, Enter to send, a "Report" link on messages, and a profile menu with Report and Block.
  - `/report`.
  - Settings: a "Blocked students" list with Unblock.
- **Message buttons** on match cards, public profiles and course tutor cards. The Messages nav item shows an unread badge.
- **Fixed during cleanup:** empty conversations were left behind when both students deleted their accounts.
- **Subagents:** none. RLS tests, a realtime isolation test and the E2E run covered the risks. The full independent review is planned for Phase 9.

### 2026-11-25 — Phase 5 complete

Completion criterion met: students discover relevant learning partners from real profile data, and every suggestion explains why it was made.

- **Migration** `20261125090000_student_matching.sql`: `suggest_matches()`, a security-invoker function with an explainable score (see DATABASE.md).
- **Page:** `/matches` with match cards showing the reasons, a skill-swap badge, the number of courses offered and a profile link; filter pills; a prompt when skills are missing; empty states; pagination.
- **Navigation:** Matches added to the nav. The courses hero has "Find learning partners", and the profile skills card links to matches.
- **Deferred to Phase 6:** the "Message" button. It needs real conversations, and a button that leads nowhere isn't allowed.

### 2026-11-24 — Phase 4 complete

Completion criterion met: students can publish, discover, manage and enroll in courses. It was verified end to end on a production build with two real accounts.

- **Migration** `20261124090000_course_marketplace.sql`: `search_courses()` (RLS-aware search, filters and count), `set_course_skills()` (owner only, max 10), and `course_removed` notifications.
- **Pages:**
  - `/courses` (now the signed-in home): hero, GET-form filters, price pills, results grid, empty states, pagination.
  - `/courses/new`, `/courses/[id]`, `/courses/[id]/edit` and `/courses/mine`.
- **Enrollment:** free courses are instant; paid courses send a request with an optional note, and the owner accepts or declines. Students can leave or cancel and re-enroll. Paid courses explain that payment is arranged with the tutor and that DabaShare handles no money.
- **Prototype defects fixed:** the "$ ₱" badge is now pesos only, no fabricated ratings are shown, and the university filter and form use the full university list.


### 2026-11-23 — Phase 3

- **Auth config on dev:**
  - Localhost redirect URLs, and passwords of 8+ characters with letters and digits.
  - Custom email templates were rejected by the free tier without SMTP, so the default PKCE templates are used for now (ARCHITECTURE.md A13).
- **Auth flows:**
  - Signup with an 18+ confirmation and privacy consent.
  - Check-email page with resend.
  - Login with safe `next`, and local logout.
  - Forgot and reset password, restricted to recovery-link sessions.
  - Settings password change with the current password.
  - `/auth/confirm` for both link formats.
  - Proxy route protection: protected by default, plus guest-only pages.
- **Profiles:**
  - Onboarding (username, university, program, bio).
  - Profile editor with browser-resized avatar upload, teach and learn skills with canonical autocomplete, and interests.
  - Public profile at `/u/<username>`.
  - Settings: discoverable toggle, password change, account deletion.
- **New migration:** `20261123090000_account_deletion.sql` adds `delete_my_account()`.
- **Next 16 fixes:**
  - The server Supabase client calls `connection()`, so session reads are request-time.
  - Per-user pages use `instant = false` (A14).
- **Draft privacy notice** at `/privacy`, written against RA 10173. It needs review before launch.

## Testing status

| Date | Check | Result |
|---|---|---|
| 2026-11-29 | Design 3: `npm run check` | Passed: 0 type errors, 0 lint problems, 98/98 unit tests |
| 2026-11-29 | Design 3: `npm run build` | Passed |
| 2026-11-29 | Design 3: `npm run test:e2e` | **158 passed, 0 failed**. One earlier run hung with no output after a stale server was killed mid-run; it didn't recur, and requests now time out after 30 s with the path named. |
| 2026-11-29 | Design 3: headless-Chrome interaction check on `/signup` | Invalid email shows its error on blur and clears while fixing; the checklist ticks rules as you type; show/hide switches the input type |
| 2026-11-29 | Design 3: screenshots of sign in, create account and check email | Checked at 390px and 1280px in light and dark mode |
| 2026-11-29 | Design 2: `npm run check` | Passed: 0 type errors, 0 lint problems, 97/97 unit tests |
| 2026-11-29 | Design 2: `npm run db:test:rls` | **139 passed, 0 failed** (22 new social checks: visibility, blocks, attachment ownership, likes, follows, feed scopes, counts, notifications, reports, edit stamp, deletes) |
| 2026-11-29 | Design 2: `npm run build` | Passed |
| 2026-11-29 | Design 2: `npm run test:e2e` | **158 passed, 0 failed** (22 new checks for posting, attachments, feed scopes, follow, like, notifications, permalink, report and delete, and blocks removing follows). Self-cleaned. |
| 2026-11-29 | Screenshots of Home, Everyone, a public profile and Notifications at 390px and 1280px, light and dark, with seeded content | Checked visually. The demo users were deleted afterwards (0 test users, 0 posts, 0 follows left). |
| 2026-11-28 | Phase 9: `npm run check` | Passed: 87/87 unit tests |
| 2026-11-28 | Phase 9: `npm run db:test:rls` | **119 passed, 0 failed** |
| 2026-11-28 | Phase 9: `npm run test:e2e` | **138 passed, 0 failed** (exit 0, self-cleaned) |
| 2026-11-28 | Phase 9: `npm audit`, headers, advisors | 0 vulnerabilities; headers present; only expected advisor items |
| 2026-11-28 | `npm run check` | Passed: 0 type errors, 0 lint problems, 86/86 unit tests |
| 2026-11-28 | `npm run build` | Passed |
| 2026-11-28 | Screenshots (headless Chrome, 390px and 1280px) of profile, public profile, chat, inbox, courses and session pages with seeded content | Checked visually before and after: the phone header overflow and the clipped nav are gone, the chat fills the screen, the profile order is right, and the overlap section renders |
| 2026-11-28 | Production-build E2E (all phases) | **134 passed, 0 failed**, after updating the two checks that referred to old copy or old markup. Test data was removed; your account was untouched. |
| 2026-11-27 | `npm run check` | Passed: 0 type errors, 0 lint problems, 82/82 unit tests |
| 2026-11-27 | `npm run build` | Passed |
| 2026-11-27 | `npm run db:test:rls` | **110 passed, 0 failed** (rolled back) |
| 2026-11-27 | Production-build E2E (all phases so far) | **134 passed, 0 failed.** Dev data was removed afterwards. |
| 2026-11-26 | `npm run check` | Passed: 0 type errors, 0 lint problems, 64/64 unit tests |
| 2026-11-26 | `npm run build` | Passed |
| 2026-11-26 | `npm run db:test:rls` | **101 passed, 0 failed** (rolled back) |
| 2026-11-26 | Realtime delivery and isolation (3 real users) | Member received live; the outsider got nothing |
| 2026-11-26 | Production-build E2E (all phases so far) | **103 passed, 0 failed.** Dev data was removed afterwards. |
| 2026-11-25 | `npm run check` | Passed: 0 type errors, 0 lint problems, 58/58 unit tests |
| 2026-11-25 | `npm run build` | Passed |
| 2026-11-25 | `npm run db:test:rls` | **88 passed, 0 failed** (rolled back) |
| 2026-11-25 | Production-build E2E (auth, profiles, marketplace, matching) | **79 passed, 0 failed.** Dev data was removed afterwards. |
| 2026-11-24 | `npm run check` | Passed: 0 type errors, 0 lint problems, 52/52 unit tests |
| 2026-11-24 | `npm run build` | Passed |
| 2026-11-24 | `npm run db:test:rls` | **78 passed, 0 failed** (rolled back) |
| 2026-11-24 | Production-build E2E (auth, profiles and marketplace) | **71 passed, 0 failed.** Dev data was removed afterwards: 0 users, courses or notifications, and 55 seed skills. |
| 2026-11-23 | `npm run build` | Passed |
| 2026-11-23 | `npm run db:test:rls` (extended for Phase 3) | **65 passed, 0 failed** (rolled back) |
| 2026-11-23 | No-JS E2E of the real forms on a **production build** | **43 passed, 0 failed** (details in SECURITY.md). The test users were deleted, and dev is back to 0 users. |
| 2026-11-23 | Storage policies with a real signed-in user | Own-folder only, no SVG, 2 MB cap, owner delete. All as designed. |
| 2026-11-23 | Dev-server run | Found a dev-only hang on a no-JS bound-action submit. Production is unaffected (documented). |
| — | Real email delivery, the in-browser avatar upload UI | UNTESTED. This needs your manual check. |

## Subagent activity

- `qa-security-reviewer` (Sonnet), Phase 3 code review: 0 critical, 0 high, 5 medium and 9 low findings. 13 are fixed. 1 was incorrect (it assumed admin flags were still on `profiles`). Nothing is unresolved.

## Next steps

Phase 10, deployment and production preparation. It needs your decisions and accounts:

1. **Email (SMTP) provider** for real students (for example Resend or Brevo; free tiers exist, and some need a domain).
2. **Production Supabase project:** create it and apply the migrations. It needs the same org and free tier, or Pro if you want leaked-password protection, daily backups and no pausing.
3. **Vercel project** linked to the GitHub repo, with production environment variables and optionally a domain.
4. Merge `phase-2-foundation` into `main`.
5. Error monitoring, a backup plan, and a release checklist.

## Blockers

- Custom SMTP provider: needed before public signups. Not needed for Phase 4 development.
