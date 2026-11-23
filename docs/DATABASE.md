# Database

The source of truth is `supabase/migrations/`. This document explains the model; if they ever disagree, the migrations win, and this document should be fixed.

| Migration | Contents |
|---|---|
| `20261122090000_schema.sql` | `private` schema, `slugify`, enums, tables, constraints, indexes, column grants |
| `20261122090100_rls.sql` | RLS helper functions and every policy |
| `20261122090200_triggers_and_rpc.sql` | Integrity triggers, notifications, and the RPCs `start_direct_conversation` and `add_student_skill` |
| `20261122090300_storage_and_realtime.sql` | `avatars` bucket and its policies, and the realtime publication |
| `20261122090400_reference_data.sql` | Universities, categories, starter skills (no users or demo content) |
| `20261122100000_security_hardening.sql` | Fixes from the security review: `private.accounts`, column-level insert grants, secure default privileges, block enforcement on every path, abuse caps, notification de-duplication, session edit fixes, FK indexes |

| `20261123090000_account_deletion.sql` | `delete_my_account()` |
| `20261128100000_open_hidden_conversation.sql` | `my_conversations(include_conversation)` so a hidden chat still opens by link |
| `20261128090000_phase9_hardening.sql` | Security review fixes: `conversations.created_by` with a cap of 30 new conversations a day, `conversation_members.hidden_at` (hide until a new message), `can_send` false when the other student deleted their account, an input cap on `set_course_skills`, de-duplicated `session_updated`, 20 active courses and 20 upcoming sessions per student, `my_blocks` limited to finished profiles |
| `20261127100000_participant_status_default.sql` | Default for `session_participants.status` (the trigger still sets it) |
| `20261127090000_sessions_notifications.sql` | `list_sessions()`, `my_notifications()`, `unread_notification_count()`, `mark_all_notifications_read()` |
| `20261126100000_conversation_cleanup.sql` | Deletes a conversation once its last member is gone |
| `20261126090000_messaging.sql` | `my_conversations()`, `unread_conversation_count()`, `mark_conversation_read()`, `my_blocks()`, message and report rate limits |
| `20261125090000_student_matching.sql` | `suggest_matches()` |
| `20261124090000_course_marketplace.sql` | `search_courses()`, `set_course_skills()`, `course_removed` notifications when an owner deletes a course |

Tests: `supabase/tests/rls_smoke.sql` (`npm run db:test:rls`) runs 55 rule checks as real impersonated users and always rolls back. Run it after every migration, **against dev only**.

## Entities

```
auth.users 1─1 profiles ─┬─< student_skills >── skills >── categories
                         ├─< profile_interests >── categories
                         ├─< courses ─┬─< course_skills >── skills
                         │            └─< course_enrollments (student = profile)
                         ├─< conversation_members >── conversations ─< messages
                         ├─< study_sessions ─┬── study_session_links (1─1)
                         │                   └─< session_participants (profile)
                         ├─< notifications (recipient)
                         ├─< posts ─< post_likes (profile)
                         ├─< follows (follower / followee)
                         ├─< blocks (blocker / blocked)
                         └─< reports (reporter)
profiles >── universities
```

## Tables

| Table | Key columns | Notes |
|---|---|---|
| `universities` | name, short_name | Seeded. "Other school" sorts last. |
| `categories` | slug, name | Seeded. Used by courses, sessions, skills and interests. |
| `profiles` | username (`^[a-z0-9_]{3,20}$`), display_name, university_id, program, bio, avatar_path (must be `<own id>/<file>`), discoverable, onboarded_at | Created by a trigger on signup. `onboarded_at` requires a username and university. |
| `private.accounts` | profile_id, is_admin, accepted_terms_at | Not exposed through the API. Grant admin with `update private.accounts set is_admin = true where profile_id = '…'` in the SQL editor. |
| `skills` | name, generated `slug` (unique) | Canonical. Created through `add_student_skill()`. |
| `student_skills` | (profile, skill, kind `teach/learn`) | Limit of 20 per kind, enforced in the RPC. |
| `profile_interests` | (profile, category) | "Learning interests", used for matching. |
| `courses` | owner_id, title, description, category, level, price_php (0 = free), status, generated `search` tsvector | `simple` text-search config, because content mixes English and Filipino. |
| `course_skills` | (course, skill) | Enables "search by skill". |
| `course_enrollments` | course, student, status `requested/accepted/declined/cancelled` | One row per (course, student). |
| `conversations` | direct_key (unique pair key), last_message_at | One-to-one only, for now. |
| `conversation_members` | (conversation, profile), last_read_at | Unread = messages after `last_read_at`. |
| `messages` | conversation, sender, body (1–2000 chars) | No editing or deleting yet. |
| `study_sessions` | host, type `webinar/study_group/qa`, starts_at, ends_at (≤12h), capacity, requires_approval, status, accepted_count | No deletes; hosts cancel. "Live" means `starts_at ≤ now < ends_at`. |
| `study_session_links` | session, meeting_url (`https://` only) | Only the host and accepted participants can read it. |
| `session_participants` | (session, profile), status `invited/requested/accepted/declined/cancelled` | |
| `notifications` | recipient, actor, type, data (jsonb), read_at | Written only by triggers. |
| `posts` | author_id, body (1–3000 chars), optional session_id **or** course_id, edited_at | The Home feed. At most one attachment; it must be the author's own session or published course. 30 posts a day. |
| `post_likes` | (post, profile) | One like per student per post. |
| `follows` | (follower, followee) | One-way, like LinkedIn. No self-follows; 200 new follows a day. A block removes follows both ways. |
| `blocks` | (blocker, blocked) | Hides profiles, courses and sessions both ways, and stops messages, enrollments and joins. |
| `reports` | reporter, target_type + target_id, reason, target_snapshot, status | The snapshot keeps the evidence for moderators. |

## State machines (enforced by triggers)

**Enrollment.** Insert requires an onboarded student: a free course becomes `accepted` and a paid course becomes `requested`. The student can cancel a `requested` or `accepted` enrollment, and can re-request after cancelling, unless there's a block. The owner can accept or decline a `requested` enrollment, and decline an `accepted` one. Creating a block cancels the pair's enrollments.

**Session participation.**
- A student joins: `accepted`, or `requested` if the session needs approval. A full session rejects the join.
- The host invites someone: `invited`.
- The invitee can accept or decline the invitation.
- The participant can cancel a `requested` or `accepted` place and rejoin after cancelling. They can also rejoin after declining an invitation, but not after the host declined them.
- Joining requires an onboarded profile and no block. Creating a block cancels the pair's participations.
- The host can accept or decline a `requested` participant and decline an `accepted` one.
- Capacity is checked while the session row is locked (`for update`), so concurrent joins can't overfill it.

**Session.** Every new session starts `scheduled` and must start in the future, at most a year ahead; the same limits apply to edits. A live session can be extended by moving `ends_at` later. Edits are refused once a session is cancelled or has ended. Cancelling notifies participants, and so does changing the time.

## RPC functions (callable by signed-in users)

| Function | Purpose |
|---|---|
| `start_direct_conversation(other_id uuid) → uuid` | Returns the existing one-to-one conversation or creates one. Refuses self-chats, unonboarded users and blocked pairs. |
| `add_student_skill(skill_name text, skill_kind skill_kind) → bigint` | Normalises the name, creates the canonical skill if needed, and adds it to the caller's list. |

| `search_courses(filter_text, filter_university, filter_price, filter_category, filter_level, page_size, page_offset)` | Published courses visible to the caller. Searches the title and description (full text and partial words), skill names and tutor name. Filters by the tutor's university, free or paid, category and level. Returns `total_count` for pagination (max 48 per page). LIKE wildcards in the search text are escaped. |
| `set_course_skills(target_course, skill_names)` | Owner only. Replaces a course's skill tags (max 10) with canonical skills, creating new ones under the 50-per-user cap. |
| `delete_my_account()` | Deletes the caller's account. Everything cascades; filed reports keep the evidence anonymised. |

| `suggest_matches(filter_mode, same_university_only, page_size, page_offset)` | Ranks other discoverable, onboarded students (RLS removes blocked ones). Score: 3 per skill they teach that you learn, 3 per skill they learn that you teach, +2 for a two-way swap, +1 per shared interest, +1 per matching course category, +1 for the same university. It needs a skill, interest or course overlap; the same university alone isn't a match. Returns the reason arrays and `total_count`. |

| `my_conversations()` | The caller's inbox: the other member (null if hidden by a block), the last message, the unread count (messages after `last_read_at`) and `can_send` (no block either way). |
| `unread_conversation_count()` | The number of conversations with unread messages (nav badge). |
| `mark_conversation_read(target)` | Sets your `last_read_at` and clears that conversation's `new_message` notification. |
| `list_sessions(tab, page_size, page_offset)` | `upcoming` (scheduled, not started), `live` (now between start and end), or `mine` (hosting or invited, requested or accepted; ended less than a day ago). Includes the host and the caller's own status. Hosts who blocked you are hidden by RLS. |
| `my_notifications(page_size, page_offset)` | The caller's notifications with the actor, the course or session title, and `i_own_course` / `i_host_session`, so the same event reads correctly for each side. |
| `unread_notification_count()`, `mark_all_notifications_read()` | Nav badge and "Mark all as read". |
| `feed_posts(scope, before_ts, before_id, page_size, only_author)` | Security invoker. `following` = your posts plus people you follow; `everyone` = all posts you can see. Newest first with keyset paging on `(created_at, id)`, max 50 per page. Includes the author, `like_count`, `liked_by_me` and the attached session or course. `only_author` lists one student's posts (profile page). |
| `profile_social(target)` | Security definer, but only for profiles you can see. Follower and following counts plus `i_follow` / `follows_me`. |
| `my_blocks()` | Security definer. Lists only the blocks the caller created, so they can unblock. It never reveals who blocked you. |

## Changing the schema

1. `npx supabase migration new <name>` creates a new timestamped file. Never edit an applied migration.
2. In the same file: enable RLS, add policies, and **explicitly grant** `select`, and column-level `insert` and `update`, to `authenticated`. Default privileges give new tables nothing. Grant EXECUTE on any new RPC to `authenticated`. Then update this document and `SECURITY.md`.
3. `npm run db:push` against the **dev** project, then `npm run db:types` and `npm run db:test:rls` (extend the test for the new rules).
4. Production gets the same migrations at deploy time (see `DEPLOYMENT.md`).
