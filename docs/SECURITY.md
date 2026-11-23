# Security

Status: designed and hardened in Phase 2, with a database-level smoke test (55 checks, see the test log). That covers the database rules, **not** the app: auth flows, Server Actions, storage uploads and realtime are tested in their phases and in Phase 9. Don't treat this document as a security certification.

## Model

- **Identity:** Supabase Auth. Email and password, email confirmation required, minimum 8 characters with letters and digits.
- **Keys:** the app uses only the publishable (anon) key. The service-role key never goes into the app or any `NEXT_PUBLIC_` variable, and isn't needed for normal features.
- **Enforcement:** RLS is on for every table, policies apply to the `authenticated` role only, and `anon` can read universities and categories only.
- **Column grants:** users can only **insert** and **update** the columns they're meant to set. IDs, timestamps, owners after creation, statuses and counters come from defaults and triggers, so they can't be forged; for example, nobody can backdate a message or change `courses.owner_id` or `study_sessions.accepted_count`. TRUNCATE, REFERENCES and TRIGGER are revoked.
- **Private flags:** `is_admin` and `accepted_terms_at` live in `private.accounts`, which no API role can read.
- **Secure defaults:** tables and functions created by future migrations get no anon access, no insert or update rights and no EXECUTE until a migration grants them explicitly.
- **Triggers:** status transitions, capacity, dates, notifications and report snapshots are enforced in Postgres (see `DATABASE.md`).
- **Helpers:** `security definer` functions live in the `private` schema with `search_path = ''`. Trigger functions aren't executable by API roles.

## Access rules

| Data | Who can read | Who can change |
|---|---|---|
| Profile | Self, plus any signed-in user if the profile is onboarded and there's no block either way | Self only, on allowed columns |
| Skills and interests of a profile | Same as the profile | Self only. Skills are added through the RPC. |
| Course | Owner, plus signed-in users for published courses with no block | Owner (create requires an onboarded profile) |
| Enrollment | The student and the course owner | Insert by the student for themselves. Status changes follow the trigger rules. |
| Conversation, members, messages | Members only | Messages: a member, as themselves, with no block in the conversation. Members update only their own `last_read_at`. |
| Study session | Signed-in users with no block toward the host | Host only. No deletes. |
| Meeting link | Host and accepted participants | Host |
| Participation | The participant and the host | Trigger rules |
| Notifications | Recipient | Recipient: mark read or delete. Only triggers create them. |
| Posts | Anyone who can see the author's profile (so blocks and unfinished profiles hide them) | Author: create (onboarded only), edit the body, delete. Author can't change. |
| Post likes | Anyone who can see the post | Like as yourself on a post you can see; remove your own like |
| Follows | The follower and the followee | Follow as yourself someone you can see; unfollow your own follows. Blocking removes both directions. |
| Blocks | Blocker | Blocker |
| Reports | Reporter and admins | Insert by the reporter, who must be able to see the target. Admins update the status. |
| Avatars (storage) | Anyone with the URL (public bucket) | Owner, inside `avatars/<user id>/`, at most 2 MB, JPEG, PNG or WebP. `profiles.avatar_path` must point into the owner's folder. |

**Blocking** hides profiles, courses and sessions in both directions. It stops new messages, enrollments, joins and re-requests, and it cancels the pair's existing enrollments and participations silently. A blocked user gets the same "not found" or "not open" message as for a missing item, so the block isn't revealed. Report snapshots respect blocks too.

**Abuse limits (all enforced in the database):**
- Posts: 30 a day per student. New follows: 200 a day. Like and follow notifications are deduplicated (one unread per post / per follower).
- New conversations: 30 a day per student. Messages: 20 a minute. Reports: 20 a day.
- Active courses: 20 per student. Upcoming sessions: 20 per host. Session invitations: 50 a day per host.
- Recipients can **hide** a conversation (it comes back only if a new message arrives) or block the sender.

Earlier limits:
- Skills: up to 20 per list, and up to 50 new canonical skills per user.
- Courses: up to 10 skill tags per course.
- Invitations: up to 50 per host per day.
- Notifications: at most one unread notification per enrollment, per session participant, and per conversation.

## Known limitations and open items

- **No full script CSP.** Next.js injects inline scripts, so only the nonce-free directives are set (no framing, no plugins, `form-action` and `base-uri` limited to self). React escaping and the absence of `dangerouslySetInnerHTML` are the XSS defences.
- **Leaked-password protection is off.** The HaveIBeenPwned check is a Supabase Pro feature. Decide at launch.
- **Search and matching scale linearly** with the number of courses and students (`ilike` and per-profile subqueries). That's fine at campus scale. Add `pg_trgm` indexes or cached match scores if it gets slow.
- **Account deletion doesn't require a recent sign-in.** The typed "DELETE" confirmation is in the app, and `delete_my_account()` trusts any valid session. Acceptable today with no XSS vector; revisit if third-party scripts are ever added.
- **Auth rate limits are per IP**, at Supabase's default of 30 sign-ins or sign-ups per 5 minutes. A class on shared campus Wi-Fi could hit that, so raise it for production (see DEPLOYMENT.md).

- **Avatars are public by URL.** File names are unguessable, but anyone who has a URL can view it.
- **Rate limits:** messages are capped at 20 a minute and reports at 20 a day per student, in the database. Signup and login throttling relies on Supabase Auth's built-in limits, to be reviewed in Phase 9.
- **Read receipts:** conversation members can see each other's `last_read_at`. This is intentional, for a future "Seen" indicator.
- **Bulk updates:** accepting several session requests in one statement can hit the capacity constraint (`23514`) instead of the friendly "This session is full" message. There's no overfill. The app should accept requests one at a time and map `23514` to "full".
- **No moderation UI.** Admins review `reports` in the Supabase dashboard until one is built.
- **Data Privacy Act (RA 10173).** The privacy notice, consent checkbox and account deletion come in Phase 3. Have a qualified person review them before a public launch.
- **Possible minors.** An age confirmation at signup comes in Phase 3. Payments stay disabled.
- **Built-in email is rate-limited and restricted.** Supabase's default sender sends only a few emails per hour, and **only delivers to members of the Supabase organization**. Real students can't receive confirmation or reset emails until custom SMTP is configured. That has to happen before anyone outside the team signs up.
- **Cross-device email links:** with the default templates, opening the confirmation link on another device still confirms the email, but the student has to sign in manually. The reset link has to be opened on the device that requested it.
- **No-JS fallback:** without JavaScript, the login form doesn't refill the email after an error. In local dev mode only, a no-JS submit of the skill form can hang; production builds are unaffected.

## Test log

| Date | What was tested | Result |
|---|---|---|
| 2026-11-22 | Static review of all migrations by `qa-security-reviewer` (Sonnet) | 0 critical, 0 high, 3 medium and 12 low findings. Every medium and the actionable low ones were fixed in `20261122100000_security_hardening.sql`. |
| 2026-11-22 | Anonymous probe with the publishable key against every table and RPC on dev | Only universities and categories are readable. All 16 other tables, both RPCs and the `private` schema are denied. |
| 2026-11-22 | `supabase/tests/rls_smoke.sql` on dev (`npm run db:test:rls`), rolled back | **55 passed, 0 failed.** It covers profiles, private flags, avatar paths, skills, course ownership, forged timestamps, enrollment states, notifications, conversation privacy, forged senders, reports, blocks, session capacity, meeting links and cancellation. |
| 2026-11-22 | Supabase security advisor (`supabase db advisors`) | Only the 2 expected warnings remain: the two RPCs that signed-in users are meant to call. |
| 2026-11-23 | `npm run db:test:rls` extended with onboarding, interests, skills and account deletion | **65 passed, 0 failed** (rolled back; 0 rows left) |
| 2026-11-23 | No-JS end-to-end run of the real forms against a **production build** with 2 temporary confirmed users (deleted afterwards) | **34 passed, 0 failed.** Covers route protection, guest redirects, the email-link handler (invalid, foreign code, expired, external `next`), wrong and correct login, onboarding gate and validation, skills, interests, public profile with HTML escaping, safe `next`, the discoverable toggle, logout, and account deletion (the account can't sign in afterwards). |
| 2026-11-23 | Storage policies with a real signed-in user | Own-folder upload OK. Another user's folder denied. SVG denied (MIME allow-list). Over 2 MB denied. Public URL serves WebP. The owner can delete. `avatar_path` pointing at another folder is denied. |
| 2026-11-23 | Static review of the Phase 3 auth and profile code by `qa-security-reviewer` (Sonnet) | 0 critical, 0 high, 5 medium and 9 low findings. One low finding was incorrect: `is_admin` and consent timestamps already live in `private.accounts`. Everything else is fixed (see below). |
| 2026-11-23 | Production-build E2E after the fixes (2 temporary users, deleted afterwards) | **43 passed, 0 failed.** Adds: password change needs the current password, the old password stops working, a reset without a recovery link is refused, and a deleted account's other-device session is cleared via `/auth/signout`. |
| 2026-11-24 | `npm run db:test:rls` extended for the marketplace | **78 passed, 0 failed.** Search hides drafts and tutors who blocked you. Filters work, including the tutor's university. Skill, partial-name and wildcard-escaping search checks pass. Only owners can tag courses, with a cap of 10. Deleting a course notifies its students. |
| 2026-11-24 | Production-build E2E with the marketplace scenario (2 temporary users, deleted afterwards) | **71 passed, 0 failed.** Adds: create (with paid-amount validation), drafts hidden from others, search and filters, invalid and junk URLs, a non-owner blocked from the edit page, free and paid enrollment, the request note, owner accept, leave and re-enroll, edit, and delete with confirmation. |
| 2026-11-25 | `npm run db:test:rls` extended for matching | **88 passed, 0 failed.** Matches exclude you, unfinished profiles, non-discoverable students and anyone in a block. Reasons cover both directions, swaps rank first, and the filters work. |
| 2026-11-25 | Production-build E2E with the matching scenario | **79 passed, 0 failed.** Adds: the no-skills prompt, a swap with its reasons, profile links, filters, symmetry, and a hidden student disappearing from matches. |
| 2026-11-26 | `npm run db:test:rls` extended for messaging | **101 passed, 0 failed.** Covers unread counts, mark-read (and its notification), `can_send` false after a block, the inbox hiding a blocker's profile, `my_blocks` never revealing who blocked you, outsiders seeing nothing and unable to join by marking read, the message rate limit, and empty-conversation cleanup. |
| 2026-11-26 | Realtime under RLS with 3 real users (supabase-js) | The member received the new message live on both the conversation channel and the inbox channel (about 1.3 s). The outsider's channel received nothing, and their direct read returned 0 rows. |
| 2026-11-26 | Production-build E2E with the messaging scenario | **103 passed, 0 failed.** Adds: the Message button opens or reuses a conversation, empty messages are rejected, messages are HTML-escaped, the unread badge and mark-read work, replies show up, report (needs a reason, de-duplicated, unknown targets give 404), block (neither side can reply, the profile is hidden, the blocker is anonymised), and unblock restores visibility. |
| 2026-11-27 | `npm run db:test:rls` extended for sessions and notifications | **110 passed, 0 failed.** Cancelled sessions leave Upcoming, My sessions shows your place, blocked hosts' sessions are hidden, approval turns a join into a request, notifications carry the actor, title and host flag, and students only see their own notifications. |
| 2026-11-27 | Production-build E2E with the sessions and notifications scenario | **134 passed, 0 failed.** Adds: link validation, the database refusing past starts, PH-time display and editing, the link hidden until you join, seats and leave/rejoin, invites (unknown and duplicate), non-host edit gives 404, approval flow, notifications (open goes to the target, mark all as read), the My sessions and Live tabs, and cancellation notices. One E2E failure led to a fix: the meeting URL is no longer sent to the browser after a session is cancelled or ended. |
| 2026-11-23 | Real signup by the project owner (org member email) | The confirmation email was delivered, the address confirmed, and onboarding completed. |
| 2026-11-28 | Independent security review of Phases 4–7 (`qa-security-reviewer`, Sonnet) | **0 critical, 0 high, 2 medium, 11 low; no RLS bypass, IDOR or privilege escalation.** Both mediums were fixed (notification links no longer prefetched; conversation caps, hide and a bounded inbox), along with 9 of the lows. L7 (trigram indexes for search) and L11 (recent sign-in before account deletion) are documented below. |
| 2026-11-28 | `npm audit` | 0 vulnerabilities (production and dev dependencies) |
| 2026-11-28 | Security headers on every response (`curl -I`) | CSP `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`, X-Frame-Options DENY, nosniff, a strict Referrer-Policy, a Permissions-Policy, HSTS, and no X-Powered-By |
| 2026-11-28 | `npm run db:test:rls` | **119 passed, 0 failed** |
| 2026-11-28 | `npm run test:e2e` (repo script, production build) | **138 passed, 0 failed**, exit code 0, and its own users removed |
| 2026-11-28 | Supabase security advisor | Only expected items remain: 5 intended `security definer` RPCs, each checking `auth.uid()`, and leaked-password protection (a Pro-plan feature; see the limitations) |
| — | Password-reset email to a real inbox, the in-browser avatar upload UI and realtime in a real browser tab | UNTESTED |

### Phase 3 auth hardening (from review)

- Account deletion removes **every** avatar file, paging through the folder and checking each removal, and aborts before deleting anything if a file remains.
- `NEXT_PUBLIC_SITE_URL` is required in production. Vercel previews build email links from `VERCEL_URL`.
- Password reset works only within 15 minutes of following a recovery link (httpOnly cookie holding the user id). The Settings change requires the current password. Both sign out other sessions.
- Reset and resend return the same neutral message even when rate-limited, so they can't reveal registered emails.
- Sign-out is local to the device. A token whose account was deleted is cleared through `/auth/signout`, and destructive actions re-verify with `getUser()`.
- The proxy doesn't redirect Server Action POSTs, and its redirects keep Supabase's no-store headers.
- The email-link handler accepts only signup, email, recovery and email_change types.
- Bound action arguments are validated. Interests are added before old ones are removed. Avatar paths are checked to exist, and the client deletes its upload if saving fails.
- Passwords are limited to 72 bytes, bcrypt's real limit.
- Accepted risk: `/auth/signout` is a GET route, so a malicious link could sign someone out. Session cookies are SameSite=Lax, so it only works through a top-level navigation, and it can't sign anyone in.
- Before enabling custom `token_hash` templates, `/auth/confirm` must render a POST "Continue" step so email scanners can't consume the token.
