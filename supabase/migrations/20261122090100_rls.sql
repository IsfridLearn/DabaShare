-- Row Level Security: helper functions and policies for every table.
-- Rule of thumb: nobody can read or change another student's private rows.
-- Policies only grant access to signed-in users ("authenticated"); anon can
-- read reference tables only.

-- ── Helpers (security definer so policies can consult tables the caller
--    cannot read directly, such as other people's blocks) ─────────────────
create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create function private.is_onboarded(profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = profile and p.onboarded_at is not null
  );
$$;

create function private.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks bl
    where (bl.blocker_id = a and bl.blocked_id = b)
       or (bl.blocker_id = b and bl.blocked_id = a)
  );
$$;

-- Can the current user see this profile's details (skills, interests)?
create function private.can_view_profile(profile uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select profile = auth.uid()
      or (private.is_onboarded(profile) and not private.is_blocked_between(profile, auth.uid()));
$$;

create function private.owns_course(course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.courses c where c.id = course and c.owner_id = auth.uid());
$$;

create function private.is_conversation_member(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conversation and m.profile_id = auth.uid()
  );
$$;

-- True if anyone else in the conversation has blocked, or been blocked by, the caller.
create function private.conversation_has_block(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_members m
    where m.conversation_id = conversation
      and m.profile_id <> auth.uid()
      and private.is_blocked_between(m.profile_id, auth.uid())
  );
$$;

create function private.is_session_host(session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.study_sessions s where s.id = session and s.host_id = auth.uid());
$$;

create function private.is_accepted_participant(session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.session_participants sp
    where sp.session_id = session and sp.profile_id = auth.uid() and sp.status = 'accepted'
  );
$$;

revoke all on all functions in schema private from public;
grant execute on function
  private.is_admin(),
  private.is_onboarded(uuid),
  private.is_blocked_between(uuid, uuid),
  private.can_view_profile(uuid),
  private.owns_course(uuid),
  private.is_conversation_member(uuid),
  private.conversation_has_block(uuid),
  private.is_session_host(uuid),
  private.is_accepted_participant(uuid)
to authenticated;

-- ── Enable RLS everywhere ────────────────────────────────────────────────
alter table public.universities enable row level security;
alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.student_skills enable row level security;
alter table public.profile_interests enable row level security;
alter table public.courses enable row level security;
alter table public.course_skills enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_session_links enable row level security;
alter table public.session_participants enable row level security;
alter table public.notifications enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- ── Reference data: readable by everyone, writable by nobody via the API ─
create policy "universities are public" on public.universities
  for select to anon, authenticated using (true);
create policy "categories are public" on public.categories
  for select to anon, authenticated using (true);
create policy "skills are readable by members" on public.skills
  for select to authenticated using (true);
-- New skills are created only through public.add_student_skill().

-- ── Profiles ─────────────────────────────────────────────────────────────
-- Others see onboarded profiles, minus anyone in a block relationship.
-- `discoverable` only affects matching and search, not direct viewing.
create policy "profiles are visible to members" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (onboarded_at is not null and not private.is_blocked_between(id, (select auth.uid())))
  );
create policy "students update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Rows are created by the auth.users trigger; deleting the auth user cascades.

create policy "student skills follow profile visibility" on public.student_skills
  for select to authenticated using (private.can_view_profile(profile_id));
create policy "students remove their own skills" on public.student_skills
  for delete to authenticated using (profile_id = (select auth.uid()));
-- Added only through public.add_student_skill(), which enforces limits.

create policy "interests follow profile visibility" on public.profile_interests
  for select to authenticated using (private.can_view_profile(profile_id));
create policy "students add their own interests" on public.profile_interests
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "students remove their own interests" on public.profile_interests
  for delete to authenticated using (profile_id = (select auth.uid()));

-- ── Courses ──────────────────────────────────────────────────────────────
create policy "published courses are visible to members" on public.courses
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    or (status = 'published' and not private.is_blocked_between(owner_id, (select auth.uid())))
  );
create policy "onboarded students create their own courses" on public.courses
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and private.is_onboarded((select auth.uid())));
create policy "owners update their courses" on public.courses
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "owners delete their courses" on public.courses
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "course skills follow course visibility" on public.course_skills
  for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_skills.course_id));
create policy "owners tag their courses" on public.course_skills
  for insert to authenticated with check (private.owns_course(course_id));
create policy "owners untag their courses" on public.course_skills
  for delete to authenticated using (private.owns_course(course_id));

-- Status rules (who may move an enrollment to which status) are enforced by triggers.
create policy "students and course owners see enrollments" on public.course_enrollments
  for select to authenticated
  using (student_id = (select auth.uid()) or private.owns_course(course_id));
create policy "students request enrollment for themselves" on public.course_enrollments
  for insert to authenticated with check (student_id = (select auth.uid()));
create policy "students and course owners update enrollments" on public.course_enrollments
  for update to authenticated
  using (student_id = (select auth.uid()) or private.owns_course(course_id))
  with check (student_id = (select auth.uid()) or private.owns_course(course_id));

-- ── Messaging ────────────────────────────────────────────────────────────
-- Conversations and memberships are created only by public.start_direct_conversation().
create policy "members see their conversations" on public.conversations
  for select to authenticated using (private.is_conversation_member(id));

create policy "members see conversation membership" on public.conversation_members
  for select to authenticated using (private.is_conversation_member(conversation_id));
create policy "members mark their conversations read" on public.conversation_members
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "members read messages" on public.messages
  for select to authenticated using (private.is_conversation_member(conversation_id));
create policy "members send messages unless blocked" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_conversation_member(conversation_id)
    and not private.conversation_has_block(conversation_id)
  );

-- ── Study sessions ───────────────────────────────────────────────────────
create policy "sessions are visible to members" on public.study_sessions
  for select to authenticated
  using (host_id = (select auth.uid()) or not private.is_blocked_between(host_id, (select auth.uid())));
create policy "onboarded students host sessions" on public.study_sessions
  for insert to authenticated
  with check (host_id = (select auth.uid()) and private.is_onboarded((select auth.uid())));
create policy "hosts update their sessions" on public.study_sessions
  for update to authenticated
  using (host_id = (select auth.uid()))
  with check (host_id = (select auth.uid()));
-- No delete: hosts cancel instead, so participants keep a record and get notified.

create policy "hosts and accepted participants see meeting links" on public.study_session_links
  for select to authenticated
  using (private.is_session_host(session_id) or private.is_accepted_participant(session_id));
create policy "hosts add meeting links" on public.study_session_links
  for insert to authenticated with check (private.is_session_host(session_id));
create policy "hosts change meeting links" on public.study_session_links
  for update to authenticated
  using (private.is_session_host(session_id))
  with check (private.is_session_host(session_id));
create policy "hosts remove meeting links" on public.study_session_links
  for delete to authenticated using (private.is_session_host(session_id));

-- Join/invite/approve rules are enforced by triggers.
create policy "participants and hosts see participation" on public.session_participants
  for select to authenticated
  using (profile_id = (select auth.uid()) or private.is_session_host(session_id));
create policy "students join and hosts invite" on public.session_participants
  for insert to authenticated
  with check (profile_id = (select auth.uid()) or private.is_session_host(session_id));
create policy "participants and hosts update participation" on public.session_participants
  for update to authenticated
  using (profile_id = (select auth.uid()) or private.is_session_host(session_id))
  with check (profile_id = (select auth.uid()) or private.is_session_host(session_id));

-- ── Notifications (created only by triggers) ─────────────────────────────
create policy "students see their notifications" on public.notifications
  for select to authenticated using (recipient_id = (select auth.uid()));
create policy "students mark their notifications read" on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));
create policy "students delete their notifications" on public.notifications
  for delete to authenticated using (recipient_id = (select auth.uid()));

-- ── Blocks and reports ───────────────────────────────────────────────────
create policy "students see who they blocked" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "students block others" on public.blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "students unblock" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create policy "reporters and admins see reports" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()) or private.is_admin());
create policy "students file reports" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "admins handle reports" on public.reports
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());
