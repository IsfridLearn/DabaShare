# Features

Status key: **Done** means it works end to end and was tested. **Built** means the code exists but hasn't been tested end to end. **DB only** means the schema and rules exist but there's no UI. **Planned** means nothing has been built.

| Area | Feature | Status | Phase |
|---|---|---|---|
| Foundation | Landing page | Built | 2 |
| Foundation | Dev status page (`/status`) | Built | 2 |
| Auth | Register (age and consent), log in and out, session persistence, protected routes, guest-only pages | Done (E2E on a production build) | 3 |
| Auth | Email confirmation and password-reset emails | Confirmation done: a real signup on 2026-11-23 received the email and confirmed. The reset email is UNTESTED with a real inbox. Only Supabase org members receive email until SMTP is set up. | 3 |
| Profiles | Onboarding, profile edit, teach and learn skills (canonical autocomplete), interests, public profile `/u/<username>` | Done (E2E) | 3 |
| Profiles | Avatar upload (browser-resized WebP), remove photo | Built. Storage rules tested with a real user; **the browser upload UI is UNTESTED**. | 3 |
| Settings | Discoverable toggle, change password, delete account | Done (E2E) | 3 |
| Legal | Privacy notice page (draft, needs review) | Built | 3 |
| Courses | Create, edit and delete (with confirmation); draft, published and archived visibility; up to 10 skill tags | Done (E2E) | 4 |
| Courses | Browse with search (title, description, skills, tutor name), filters (university, price, category, level) and pagination, using shareable GET URLs | Done (E2E) | 4 |
| Courses | Detail page with tutor card. Free courses enroll instantly; paid courses send a request with an optional note. Students can leave or cancel and re-enroll. | Done (E2E) | 4 |
| Courses | Owner request queue (accept, decline, remove), and My courses (teaching with pending counts, learning with statuses) | Done (E2E) | 4 |
| Courses | Ratings and reviews | Not built. The prototype's ratings were fabricated, so none are shown until a real review feature exists. | — |
| Matching | Ranked suggestions from teach/learn overlap in both directions, skill-swap bonus, shared interests, course categories and university, with the reasons shown on every card | Done (E2E) | 5 |
| Matching | Filters (can teach me, wants to learn from me, my university only), prompt when skills are missing, respects the discoverable setting and blocks | Done (E2E) | 5 |
| Matching | "Message" button on match cards, profiles and course tutor cards | Done (E2E) | 6 |
| Messaging | Inbox with last message, unread counts and an unread badge in the nav; one-to-one chat with history (load earlier), day separators and Manila-time timestamps | Done (E2E) | 6 |
| Messaging | Realtime delivery (chat and inbox); the send form also works without JavaScript | Done (realtime tested with 3 real users) | 6 |
| Safety | Report messages, profiles and courses (reason and details, de-duplicated); block and unblock (Settings); rate limits on messages (20/min) and reports (20/day) | Done (E2E) | 6 |
| Safety | Moderator review UI for reports | Not built. Admins use the Supabase dashboard. | 9 |
| Sessions | Host webinars, study groups and Q&A sessions (PH-time date and time, duration, capacity, optional approval and subject); edit; cancel with confirmation, which notifies participants | Done (E2E) | 7 |
| Sessions | Upcoming, Live now and My sessions tabs; join instantly or request; invitations by username; host accept, decline and remove; leave and rejoin; live seat count | Done (E2E) | 7 |
| Sessions | Meeting link shown only to the host and accepted participants, and only while the session is upcoming or live | Done (E2E) | 7 |
| Notifications | Notification centre with readable sentences for every type, an unread badge in the nav, opening an item marks it read and goes to its page, mark all as read | Done (E2E) | 7 |
| Notifications | Email or push notifications | Not built (needs SMTP and a push provider) | — |
| UI | Mobile bottom tab bar with badges; current page highlighted (`aria-current`); account menu; skip link; in-app error screen that keeps the navigation | Done (screenshots + E2E) | 8 |
| UI | Profile: completeness checklist, skills first on mobile, "Why you two match" and the student's courses on public profiles, photo upload feedback | Done (screenshots + E2E) | 8 |
| UI | Messages: full-screen chat on mobile with a back button, auto-growing composer, Enter-to-send only with a physical keyboard, no double sends, scroll that keeps your place with a "new messages" button, screen-reader log | Done (screenshots + E2E) | 8 |
| Social | Home feed at `/home` (where students land after signing in): Following and Everyone tabs, newest first with "Load more" | Done (E2E + RLS) | Design 2 |
| Social | Posts (text up to 3,000 characters) with an optional attachment of your own upcoming session or published course; delete your own; report others; permalink `/posts/<id>` | Done (E2E + RLS) | Design 2 |
| Social | Follow and unfollow, follower and following counts, "Follows you", a student's posts on their profile; likes with counts; new-follower and post-liked notifications | Done (E2E + RLS) | Design 2 |
| Social | Editing posts, comments, images in posts | Not built. Editing is supported by the database (marked "edited") but has no UI yet. | — |
| UI | Design system v2 (Notion × Linear tokens, Inter + Newsreader, primitives) and the new sidebar app shell | Done (screenshots light and dark, phone and desktop) | Design 2 |
| Payments | Collecting money for paid courses | Deferred (needs legal and age review) | — |
