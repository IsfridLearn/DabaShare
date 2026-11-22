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
| Blocks | Blocker | Blocker |
| Reports | Reporter and admins | Insert by the reporter, who must be able to see the target. Admins update the status. |
| Avatars (storage) | Anyone with the URL (public bucket) | Owner, inside `avatars/<user id>/`, at most 2 MB, JPEG, PNG or WebP. `profiles.avatar_path` must point into the owner's folder. |

**Blocking** hides profiles, courses and sessions in both directions. It stops new messages, enrollments, joins and re-requests, and it cancels the pair's existing enrollments and participations silently. A blocked user gets the same "not found" or "not open" message as for a missing item, so the block isn't revealed. Report snapshots respect blocks too.

**Abuse limits:**
- Skills: up to 20 per list, and up to 50 new canonical skills per user.
- Courses: up to 10 skill tags per course.
- Invitations: up to 50 per host per day.
- Notifications: at most one unread notification per enrollment, per session participant, and per conversation.

## Known limitations and open items

- **Avatars are public by URL.** File names are unguessable, but anyone who has a URL can view it.
- **No time-based rate limiting yet.** Message, report and signup throttling is planned before launch (Phases 6 and 9).
- **Read receipts:** conversation members can see each other's `last_read_at`. This is intentional, for a future "Seen" indicator.
- **Bulk updates:** accepting several session requests in one statement can hit the capacity constraint (`23514`) instead of the friendly "This session is full" message. There's no overfill. The app should accept requests one at a time and map `23514` to "full".
- **No moderation UI.** Admins review `reports` in the Supabase dashboard until one is built.
- **Data Privacy Act (RA 10173).** The privacy notice, consent checkbox and account deletion come in Phase 3. Have a qualified person review them before a public launch.
- **Possible minors.** An age confirmation at signup comes in Phase 3. Payments stay disabled.
- **Built-in email is rate-limited.** Supabase's default SMTP sends only a few emails per hour. Production needs custom SMTP (Phase 10).

## Test log

| Date | What was tested | Result |
|---|---|---|
| 2026-11-22 | Static review of all migrations by `qa-security-reviewer` (Sonnet) | 0 critical, 0 high, 3 medium and 12 low findings. Every medium and the actionable low ones were fixed in `20261122100000_security_hardening.sql`. |
| 2026-11-22 | Anonymous probe with the publishable key against every table and RPC on dev | Only universities and categories are readable. All 16 other tables, both RPCs and the `private` schema are denied. |
| 2026-11-22 | `supabase/tests/rls_smoke.sql` on dev (`npm run db:test:rls`), rolled back | **55 passed, 0 failed.** It covers profiles, private flags, avatar paths, skills, course ownership, forged timestamps, enrollment states, notifications, conversation privacy, forged senders, reports, blocks, session capacity, meeting links and cancellation. |
| 2026-11-22 | Supabase security advisor (`supabase db advisors`) | Only the 2 expected warnings remain: the two RPCs that signed-in users are meant to call. |
| — | Storage policies, realtime delivery under RLS, auth flows | UNTESTED (Phases 3, 6 and 9) |
