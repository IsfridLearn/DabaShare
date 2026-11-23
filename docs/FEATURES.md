# Features

Status key: **Done** means it works end to end and was tested. **Built** means the code exists but hasn't been tested end to end. **DB only** means the schema and rules exist but there's no UI. **Planned** means nothing has been built.

| Area | Feature | Status | Phase |
|---|---|---|---|
| Foundation | Landing page | Built | 2 |
| Foundation | Dev status page (`/status`) | Built | 2 |
| Auth | Register (age and consent), log in and out, session persistence, protected routes, guest-only pages | Done (E2E on a production build) | 3 |
| Auth | Email confirmation and password-reset emails | Built. Link handling is tested; **real email delivery is UNTESTED**, because the built-in sender only delivers to org members (see SECURITY.md). | 3 |
| Profiles | Onboarding, profile edit, teach and learn skills (canonical autocomplete), interests, public profile `/u/<username>` | Done (E2E) | 3 |
| Profiles | Avatar upload (browser-resized WebP), remove photo | Built. Storage rules tested with a real user; **the browser upload UI is UNTESTED**. | 3 |
| Settings | Discoverable toggle, change password, delete account | Done (E2E) | 3 |
| Legal | Privacy notice page (draft, needs review) | Built | 3 |
| Courses | Create, edit and delete (with confirmation); draft, published and archived visibility; up to 10 skill tags | Done (E2E) | 4 |
| Courses | Browse with search (title, description, skills, tutor name), filters (university, price, category, level) and pagination, using shareable GET URLs | Done (E2E) | 4 |
| Courses | Detail page with tutor card. Free courses enroll instantly; paid courses send a request with an optional note. Students can leave or cancel and re-enroll. | Done (E2E) | 4 |
| Courses | Owner request queue (accept, decline, remove), and My courses (teaching with pending counts, learning with statuses) | Done (E2E) | 4 |
| Courses | Ratings and reviews | Not built. The prototype's ratings were fabricated, so none are shown until a real review feature exists. | — |
| Matching | Skill and interest based suggestions with reasons, public profiles, "Message" button | Planned | 5 |
| Messaging | One-to-one conversations, realtime messages, unread indicators | DB only | 6 |
| Safety | Block and report | DB only | 6 |
| Sessions | Create, edit and cancel; join or request; invitations; capacity; meeting link for participants | DB only | 7 |
| Notifications | Notification centre with read and unread states | DB only | 7 |
| Payments | Collecting money for paid courses | Deferred (needs legal and age review) | — |
