# Phase 1 — Repository Audit

Audit date: 2026-11-22. Commit audited: `d48231a`.

## 1. What exists

A static, client-only single-page prototype. There's no build step, no package manager, no backend, no tests.

| File | Lines | Role |
|---|---|---|
| `Main.html` | 434 | All 5 pages and 2 modals in one document. Pages are toggled with a CSS class. |
| `style.css` | 887 | All styling. Design tokens on `:root`. **No `@media` queries.** |
| `App.js` | 167 | Entry point. Nav switching and all event wiring. |
| `auth.js` | 40 | Fake login, signup and logout. |
| `courses.js` | 131 | Course rendering, filtering and posting. Also holds webinar modal stubs. |
| `profile.js` | 50 | Hardcoded match list and skill-tag add/remove. |
| `messages.js` | 90 | In-memory chat with random auto-replies. |
| `webinars.js` | 56 | Static webinar tabs. |
| `data.js` | 73 | All sample data: 9 courses, 4 people, 6 sessions, 3 conversations. |
| `state.js`, `dom.js` | 44 | Shared mutable state and DOM helpers. |

Stack: vanilla ES modules, Google Fonts (Sora for headings, DM Sans for body), and inline SVG icons. Nothing is persisted, so a page refresh logs the user out and loses all changes.

## 2. Functionality classification

| Feature | Status | Notes |
|---|---|---|
| Page navigation | **Functional** (client-only) | No URLs or routing. The back button and refresh don't work. |
| Course search and filtering | **Functional** on sample data | Search checks only the title and level. Price and university filters work. |
| Skill tag add/remove (profile) | **Functional** (DOM only) | Tags aren't saved anywhere. |
| Webinar tab switching | **Functional** on sample data | |
| Modal open/close, toasts | **Functional** | |
| Login | **Simulated** | Any email and password is accepted. The username comes from the email prefix. |
| Signup | **Simulated** | Inputs have no IDs and are never read. It only shows a toast. |
| Logout | **Simulated** | Clears an in-memory variable. |
| Post a course | **Partial** | Adds to an in-memory array and assigns a fabricated `rating: 4.5`. It's lost on refresh and has no owner. |
| Enroll | **Simulated** | Toast only. |
| Profile save | **Simulated** | Toast only. The form fields have no IDs, and "JD" / "Juan Dela Cruz" are hardcoded. |
| Matching | **Simulated** | 4 hardcoded people. The profile has no effect on results. |
| Messaging | **Simulated** | Hardcoded threads, random auto-replies, a fake "Online" status, and a hardcoded unread badge of "3". |
| Host a webinar | **Simulated** | The form isn't read. Toast only. |
| Join a webinar | **Simulated** | The toast says "opening video call…", but no video call exists. |
| Change photo | **Missing** | The button has no handler. |
| Conversation search | **Missing** | The input has no handler. |
| Email verification, password reset, notifications, blocking, reporting, course edit/delete | **Missing** | |
| Responsive layout | **Missing** | Zero media queries. |

## 3. Defects found

1. **Stored XSS pattern.** Course titles, descriptions, chat messages and skill tags are interpolated into `innerHTML` without escaping (`courses.js:38`, `messages.js:40`, `profile.js:34`). With a real backend, one user could run scripts in another user's browser. React's default escaping removes this class of bug.
2. **Duplicate listeners.** The course search and university filter are bound twice (`App.js:72-73` and `App.js:113-114`), so every keystroke renders twice.
3. **Duplicate code.** `joinWebinar` is defined in both `courses.js:129` and `webinars.js:54`, and the webinar modal logic lives in `courses.js`.
4. **Fabricated data shown as real.** Star ratings and review counts are made up, and new courses get a rating of 4.5. The "4 new" matches and "3" unread badges are hardcoded, and the initial "Showing 23 courses" is wrong.
5. **Inconsistent university lists.** Signup offers San Pedro College and "Other", but the filter and course form don't, so some users can never find their own university.
6. **Price badge bug.** It renders `$ ₱257`, mixing two currency symbols (`courses.js:29`).
7. **Markup duplication.** The navigation bar is copied four times in `Main.html`.
8. **Matching needs normalised skills.** Free-text tags such as "Web Dev" and "React" never match each other. A real matcher needs canonical skills.

## 4. What to preserve

- **Brand:** the logo SVG, the name, and the tagline "Learn Together, Grow Together".
- **Visual identity:** blue `#2563EB` primary with purple and green accents, Sora headings, DM Sans body text, 14px radius, soft shadows, and the gradient-blob auth background.
- **Information architecture:** the four main areas (Courses, Profile & Match, Webinars, Messages) and their layouts. These are sensible and will map directly onto routes.
- **Workflows:** teach/learn skill lists driving matching, free/paid course listings, the session types (Webinar, Study Group, Q&A), and tabs for Upcoming, Live and My Sessions.
- **Davao focus:** the university list (UM, AdDU, UP Mindanao, Holy Cross, San Pedro, and others).

## 5. What not to preserve

Global mutable state, `innerHTML` string templating, page toggling without URLs, sample data, simulated auth, and the auto-reply bot.

## 6. Stack evaluation

The prototype has no framework, so moving to Next.js discards almost no logic. Only about 600 lines of JS exist, all of it UI glue around sample data. The CSS tokens and layouts carry over to Tailwind. A rewrite costs less than retrofitting auth, routing, persistence and escaping onto the current code.

The recommended stack is the one you proposed: Next.js (App Router) with TypeScript and Tailwind, Supabase (Postgres, Auth, Storage, Realtime), and Vercel. Details and reasoning are in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md).

## 7. Local environment (checked 2026-11-22)

| Tool | Status |
|---|---|
| Node 24.21, npm 11.19, git 2.49 | Installed |
| Supabase CLI | Not installed (usable through `npx supabase` without a global install) |
| Docker | Not installed (needed only for a *local* Supabase stack) |
| Vercel CLI, GitHub CLI | Not installed (optional; GitHub integration on vercel.com works without them) |
| GitHub remote | `IsfridLearn/DabaShare` |
