# Design Audit — UI/UX Polish, Phase 1

Date: 2026-11-28. Scope: the whole frontend (25 routes and 37 components), measured against the "Modern Academic Editorial" brief, with Notion × Linear as the direction. No code was changed in this phase.

## What exists (and works)

- **Stack:** Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, Supabase. No UI library; 10 small primitives in `src/components/ui`.
- **Routes:**
  - Auth: `/login`, `/signup`, `/check-email`, `/forgot-password`, `/reset-password`.
  - App: `/courses` (+ `new`, `[id]`, `edit`, `mine`), `/matches`, `/sessions` (+ `new`, `[id]`, `edit`), `/messages` (+ `[id]`), `/notifications`, `/profile`, `/u/[username]`, `/settings`, `/onboarding`, `/report`.
  - Other: `/` (landing), `/privacy`.
- **Functionality and quality to keep:**
  - Every feature is real and tested: 138 E2E checks and 119 RLS checks.
  - Accessibility work from Phase 8: labels, `aria-describedby`, `role=log` in chat, a skip link, focus rings, 16px inputs on mobile.
  - Dark mode (System / Light / Dark).

## Design problems

| # | Problem | Evidence |
|---|---|---|
| D1 | **The clichés the brief calls out are present.** The blue→violet gradient hero on Courses, gradient backgrounds and blurred "blobs" on the landing and every auth page, and a hover "lift" on cards. | 3 gradients, 4 blur blobs, 2 `hover:-translate-y` |
| D2 | **Everything is a card.** Pages are stacks of bordered, shadowed, rounded boxes, sometimes nested (host panel inside a grid of cards). There's no reading surface like Notion\'s and no structured lists like Linear\'s. | 36 `<Card>`, 15 shadows, 14px radius everywhere |
| D3 | **Weak typographic hierarchy.** Sora (geometric "startup" display) plus DM Sans. Every page title is the same `text-2xl`, semibold is overused, and there\'s no type scale, only one-off sizes. | 22× `text-2xl` titles, 58 `font-semibold`, 10 arbitrary `text-[…rem]` sizes |
| D4 | **Pill overload and colour overload.** Tags, filters, badges and statuses are all green, blue or violet pills, and colour meaning collides (green = "free" and "can teach"; violet = "paid" and "skill swap"). Brand blue marks links, buttons, active nav, unread, badges and focus, so nothing stands out. | 22 `rounded-full`, 30 `<Tag>` |
| D5 | **Three pages share one layout.** Courses, matches and sessions are the same card grid. | `CourseCard`, `MatchCard`, `SessionCard` |
| D6 | **No icon system.** There are 5 hand-drawn SVGs (nav and logo), and emoji do the work elsewhere ("🗓", "🔴 Live now"); screen readers read the emoji out loud. | 5 `<svg>` |
| D7 | **Page widths are inconsistent:** 5 different max widths, chosen ad hoc. | `max-w-xl/2xl/3xl/5xl/6xl` |
| D8 | **The auth pages are a generic centred card on a gradient** (exactly what the brief rules out), with no product context beside the form. | `auth-shell.tsx` |

## UX problems

| # | Problem |
|---|---|
| U1 | **There's no home or dashboard.** After sign-in you land on Courses. There's no place that answers "what needs my attention?" (requests to accept, upcoming sessions, unread messages, new matches). |
| U2 | **Navigation is split:** "My courses" is a separate top-level item next to "Courses". Settings and Profile live in the avatar menu, which is fine. |
| U3 | **Feedback is inconsistent.** Sometimes it's an inline alert at the form bottom, sometimes a `?notice=` banner at the top of the next page; there are no toasts. |
| U4 | **Every route uses the same skeleton** (three grey boxes), so loading doesn't preview the real layout. |
| U5 | **Long single-column forms** (signup, profile, course, session) with server-only validation: every mistake costs a round trip. There's no show-password toggle. |
| U6 | **Detail pages lack structure.** Course and session pages are a description blob plus a side card. There's no scannable "what you'll learn / format / schedule / tutor" layout. |

## Technical problems

| # | Problem |
|---|---|
| T1 | **The token layer is half-built.** Colours are tokens, but dark mode works by *remapping Tailwind\'s gray/blue/emerald scales*, so `text-gray-900` is light in dark mode. It works, but it\'s confusing to maintain. A semantic layer (`canvas`, `surface`, `fg`, `fg-muted`, `border`, `accent`…) is the right foundation. |
| T2 | **Duplicated UI patterns:** filter or tab pills in 3 places (courses, matches, sessions), pagination in 4 (courses component plus inline copies in matches, sessions and notifications), and the page header (title + description + action) hand-written in about 15 pages. |
| T3 | **The primitives are thin:** Button has no icon or loading support, there\'s no IconButton or Badge/Chip distinction (one `Tag` does both), and Card has one variant. |
| T4 | **Fonts:** two Google families (Sora + DM Sans, 7 weights in total). The swap is cheap with `next/font`. |

## Keep / improve

- **Keep as is:**
  - All server actions, queries and RLS.
  - Auth flows, `Field` (with automatic `aria-describedby`), `Menu`, `NavLink` active state.
  - The bottom tab bar on mobile, the chat window logic (realtime, scroll, composer), the theme mechanism, the avatar uploader and the `Avatar` initials.
- **Improve:**
  - Button, Tag (split into Badge and Chip), Card (fewer, flatter variants), EmptyState (add an icon), loading skeletons, auth shell, page headers.
  - The three list cards, and course and session detail layouts.

## Proposed direction: "Notion × Linear"

| | From Notion | From Linear | DabaShare decision |
|---|---|---|---|
| Canvas | Warm off-white, document feel | Near-black, precise dark mode | Light: warm neutral `#FBFBFA`. Dark: Linear-style `#0E0F11`. |
| Type | Editorial serif headings on reading pages | Tight, precise sans for UI | **Inter** for UI; a **serif display** (Newsreader) for page titles and editorial moments, which makes it feel academic and editorial |
| Structure | Pages as documents, generous reading width | Dense lists, hairline dividers | Detail pages read like documents; lists (inbox, notifications, my courses, participants) use Linear-style rows; discovery keeps a grid, but flat |
| Colour | Mostly monochrome | One accent | Ink-black or white text, warm grays, **one accent**: DabaShare blue, kept for continuity but used only for primary actions, links and focus. Status colours are muted and small. |
| Surfaces | Few borders | 1px hairlines, almost no shadows | Hairline borders, **no card shadows** (shadows only on menus, popovers and toasts), 6px controls / 10px containers |
| Motion | Quiet | Fast and crisp | 120–180 ms ease-out for colour and opacity only; no lifts or bounces; respects reduced motion |
| Icons | Simple line icons | Consistent 16px line icons | One line-icon set at 16 and 20px, replacing emoji |

## Recommended order

1. **Phase 2 — Design system:**
   - Semantic colour tokens (light and dark; this replaces the palette remap).
   - Inter + serif display, type and spacing scales.
   - The primitives: Button with icon and loading, IconButton, Input, Badge, Chip, Tabs/SegmentedControl, PageHeader, Pagination, Toast, Skeleton, EmptyState.
2. **Phase 3 — Auth:** a split layout. An editorial panel carries the identity and value; the form panel needs no card, gradients or blobs. Add show-password, inline validation and clear loading.
3. **Phase 4 — Screens:**
   1. Home (only if approved, see the decisions below), then Courses.
   2. Course detail, then Profile and Public profile.
   3. Matches, then Messages.
   4. Sessions, then Notifications.
4. **Phase 5:** toasts, route-shaped skeletons, and responsive passes at 360, 768, 1024 and 1440px.
5. **Phase 6:** check, build, the full E2E and RLS suites, and before/after screenshots at all widths in light and dark.

## Decisions needed before Phase 2

1. **Fonts:** replace Sora and DM Sans with **Inter + Newsreader** (serif titles)?
2. **Icons:** add **`lucide-react`** (MIT, tree-shaken, only the icons used get bundled), or keep hand-drawn SVGs?
3. **Home dashboard:** add a "Home" page built only from existing data (requests to review, upcoming sessions, unread messages, a few matches), or keep Courses as the landing page?
4. **Accent colour:** keep DabaShare blue `#2563EB`, or shift to a deeper ink blue for a more academic tone?

## Decisions taken (Phase 2)

1. **Fonts:** Inter (UI) + Newsreader (page titles). Done.
2. **Icons:** `lucide-react` added (reason in ARCHITECTURE.md). Used in the new shell and feed; emoji and hand-drawn icons in older screens are replaced in Phase 4.
3. **Home:** changed by the owner's direction. Home is now a **social feed** (posts, follows, likes, like LinkedIn), not a dashboard, and signed-in users land there instead of Courses.
4. **Accent:** DabaShare blue kept.

## Phase 2 result

- **Tokens:** neutral roles (`canvas`, `surface`, `subtle`, `fg`, `fg-muted`, `fg-subtle`, `line`, `line-strong`) in light and dark; a type scale (`text-display` … `text-caption`); 6px / 10px radii; flat cards (shadows only on overlays). Legacy grays now map to warm stone in light mode, so untouched screens already pick up the new neutrals.
- **Primitives:** `Button` (primary, secondary, ghost, danger; sm/md/lg; `loading`, `icon`), `IconButton`, `Badge`, `PageHeader`, `Tabs`, `Chip`, `Pagination`, `Skeleton`, `Section`, `EmptyState`.
- **Shell:** a Linear-style left sidebar on desktop (main places, a "You" group, account menu at the bottom); on phones a slim top bar (alerts, account) and five bottom tabs (Home, Courses, Sessions, People, Messages).
- **Social layer:** Home feed (Following / Everyone, composer with an optional session or course attachment, likes, delete, report, load more), post permalinks, follow buttons and follower counts on profiles, "People to follow" and "Upcoming sessions" on wide screens, and new-follower / post-liked notifications.
- Still on the old look until Phase 4: Courses, course detail, Matches, Messages, Sessions, Notifications, Profile and Settings (they already use the new neutrals and fonts).

## Phase 3 result (auth)

- **Layout:** a split editorial layout. On wide screens, a flat identity panel shows the serif headline and three real features (no stats or testimonials). The form sits on the plain canvas with no card, gradient or blobs. Phones get the logo and the form only.
- **Pages:** sign in, create account, forgot password, choose a new password, check your email (and the Settings change-password form) share one look: a serif title, quiet subtitle and a footer link row.
- **Fields (all forms in the app):** 1px `line-strong` borders, a brand focus ring, red border plus message when invalid, a `labelAside` slot (used for "Forgot password?").
- **Passwords:** a show/hide button (`aria-pressed`, `aria-controls`), and on new passwords a live checklist (8+ characters, a letter, a number) that ticks as you type, read as "Done" or "Needed" by screen readers. `PASSWORD_RULES` is unit-tested against the server schema.
- **Inline validation:** fields are checked when you leave them (empty fields aren't nagged), and a shown error re-checks as you type, so it clears the moment the value is fixed. The server still validates everything.
- **Loading:** buttons show a spinner and a "Signing in…" / "Creating account…" label and can't be double-submitted.

## Phase 4 result (core screens)

- **Courses:** a page header with "My courses" and "Post a course", a search bar with an icon, price chips, and the result count in one line. Cards are flat (hairline, no lift); price is plain text, not a coloured pill; skills read as a quiet line.
- **Course and session details:** a document layout. The title is a serif headline, the description is set at reading width, and a sticky side panel holds the price or join action, a Linear-style properties list and the tutor or host. Owner tools (enrollments, participants, invite, cancel) sit below as settings-style sections.
- **Sessions:** an agenda grouped by day (Philippine time) with a date tile per row, instead of the card grid. "Live now" is a small badge with a pulsing dot (still when reduced motion is on), not an emoji.
- **People (matches):** rows instead of cards. Each match explains itself in sentences ("Can teach you: Python, React"); a Skill swap badge is the only colour. Follow and Message buttons on every row.
- **My courses, Notifications, blocked students, enrollment requests:** Linear-style row lists in one bordered container.
- **Messages:** one full-height two-pane frame for the inbox and the conversation; quieter bubbles, a hairline day divider, the shared input style, and an icon send button.
- **My profile and Settings:** settings-style sections (title and description on the left, controls on the right) instead of stacked cards. Skills are neutral removable chips.
- **Public profile:** a page header (photo, serif name, program, follower counts, actions), posts in the main column, and skills, courses and interests in a side column.
- **Also:** onboarding, report, error and not-found pages, the privacy notice, and the landing page (now editorial, with no gradient or blurred blobs and only real features).
- **Icons:** lucide icons replace the remaining emoji and hand-drawn SVGs.
- Next (Phase 5): toasts, route-shaped skeletons, and responsive passes.

## Phase 5 result (interactions and responsive)

- **Feedback rule:** a page-level outcome after a redirect (course posted, changes saved, session cancelled, conversation hidden, password updated) and a form that stays on screen (profile, interests, privacy, password, invitation) show a **toast**: bottom-right on desktop, above the tab bar on phones, auto-hides after 5 seconds, dismissable, announced to screen readers, and rendered on the server so it also works without JavaScript. Errors stay **inline** next to the form. Onboarding guidance (the welcome note) stays on the page.
- **Loading:** every signed-in route has a placeholder shaped like its page (feed, course grid, document detail, agenda, rows, two-pane messages, settings sections, profile, forms) instead of the same three grey boxes (U4).
- **Responsive pass** at 360, 768, 1024 and 1440px:
  - Course and session pages on phones put the Enroll / Join panel straight under the title (it was below the whole description).
  - Public profiles on phones show skills, "why you match" and courses before the posts.
  - Course filters on tablets get their own row for search, so the dropdown labels aren't cut off.
  - The session date tile no longer stretches to the row height; the filter divider on People is hidden on phones; interests use two columns on phones; the landing page header buttons fit at 360px.
- Next (Phase 6): final QA (full check, build, E2E and RLS suites, and a last look at light and dark at all widths).
