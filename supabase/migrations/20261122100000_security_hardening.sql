-- Security hardening from the Phase 2 independent review.
-- M1 client-controlled insert columns, M2 block bypass on update paths,
-- M3 admin/consent flags readable by others, plus low-severity fixes L4–L15.

-- ── M3: private account flags ────────────────────────────────────────────
-- is_admin and accepted_terms_at were readable by every signed-in user.
create table private.accounts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  is_admin boolean not null default false,
  accepted_terms_at timestamptz
);
revoke all on private.accounts from public, anon, authenticated;

insert into private.accounts (profile_id, is_admin, accepted_terms_at)
select id, is_admin, accepted_terms_at from public.profiles;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select a.is_admin from private.accounts a where a.profile_id = auth.uid()), false);
$$;

alter table public.profiles drop column is_admin, drop column accepted_terms_at;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := left(btrim(coalesce(meta ->> 'display_name', '')), 60);
  uni smallint;
begin
  if name = '' then
    name := left(split_part(coalesce(new.email, ''), '@', 1), 60);
  end if;
  if name = '' then
    name := 'Student';
  end if;

  if coalesce(meta ->> 'university_id', '') ~ '^[0-9]{1,4}$' then
    select u.id into uni from public.universities u where u.id = (meta ->> 'university_id')::smallint;
  end if;

  insert into public.profiles (id, display_name, university_id)
  values (new.id, name, uni);

  insert into private.accounts (profile_id, accepted_terms_at)
  values (new.id, case when meta ->> 'accepted_terms' = 'true' then now() end);
  return new;
end;
$$;

-- ── L10: avatar paths must point inside the owner's own folder ───────────
alter table public.profiles add constraint profiles_avatar_path_own_folder
  check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[A-Za-z0-9_-][A-Za-z0-9._-]*$'));

-- ── M1: inserts limited to the columns clients are meant to provide ──────
-- ids and timestamps always come from defaults; statuses from triggers.
revoke insert on all tables in schema public from authenticated;
grant insert (profile_id, category_id) on public.profile_interests to authenticated;
grant insert (owner_id, title, description, category_id, level, price_php, status)
  on public.courses to authenticated;
grant insert (course_id, skill_id) on public.course_skills to authenticated;
grant insert (course_id, student_id, note) on public.course_enrollments to authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;
grant insert (host_id, title, description, type, category_id, starts_at, ends_at, capacity, requires_approval)
  on public.study_sessions to authenticated;
grant insert (session_id, meeting_url) on public.study_session_links to authenticated;
grant insert (session_id, profile_id) on public.session_participants to authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

-- ── L14: secure defaults for objects created by future migrations ────────
-- New tables: no anon access, no truncate/references/trigger, and no
-- insert/update until a migration grants specific columns.
-- New functions: not executable until a migration grants them.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke insert, update, truncate, references, trigger on tables from authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- ── Enrollments: onboarding (L5), blocks on every path (M2), generic
--    messages (L11), notification de-duplication (L12) ───────────────────
create or replace function private.enrollment_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c record;
begin
  select co.owner_id, co.status, co.price_php into c
  from public.courses co where co.id = new.course_id;

  if not found or c.status <> 'published'
     or private.is_blocked_between(c.owner_id, new.student_id) then
    raise exception 'This course is not open for enrollment.';
  end if;
  if c.owner_id = new.student_id then
    raise exception 'You cannot enroll in your own course.';
  end if;
  if auth.uid() is not null and not private.is_onboarded(new.student_id) then
    raise exception 'Finish setting up your profile first.';
  end if;

  if c.price_php = 0 then
    new.status := 'accepted'::public.request_status;
    new.decided_at := now();
  else
    new.status := 'requested'::public.request_status;
    new.decided_at := null;
  end if;
  return new;
end;
$$;

create or replace function private.enrollment_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  c record;
begin
  if new.course_id <> old.course_id or new.student_id <> old.student_id then
    raise exception 'Enrollments cannot be moved.';
  end if;
  -- Internal updates (e.g. the block trigger) and trusted access skip actor rules.
  if new.status = old.status or uid is null or pg_trigger_depth() > 1 then
    return new;
  end if;

  select co.owner_id, co.status, co.price_php into c
  from public.courses co where co.id = new.course_id;

  if uid = old.student_id then
    if new.status = 'cancelled' and old.status in ('requested', 'accepted') then
      null;
    elsif new.status in ('requested', 'accepted') and old.status = 'cancelled' then
      if c.status <> 'published' then
        raise exception 'This course is not open for enrollment.';
      end if;
      new.status := case when c.price_php = 0
        then 'accepted'::public.request_status
        else 'requested'::public.request_status end;
    else
      raise exception 'You cannot change this enrollment that way.';
    end if;
  elsif uid = c.owner_id then
    if not (
      (old.status = 'requested' and new.status in ('accepted', 'declined'))
      or (old.status = 'accepted' and new.status = 'declined')
    ) then
      raise exception 'You cannot change this enrollment that way.';
    end if;
  else
    raise exception 'You cannot change this enrollment.';
  end if;

  if new.status in ('requested', 'accepted')
     and private.is_blocked_between(c.owner_id, old.student_id) then
    raise exception 'This course is not open for enrollment.';
  end if;

  new.decided_at := now();
  return new;
end;
$$;

create or replace function private.enrollment_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  uid uuid := auth.uid();
  payload jsonb;
  recipient uuid;
  actor uuid;
  kind public.notification_type;
begin
  -- Changes made by other triggers (blocks) are silent.
  if pg_trigger_depth() > 1 then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;

  select co.owner_id into owner from public.courses co where co.id = new.course_id;
  payload := jsonb_build_object('course_id', new.course_id, 'enrollment_id', new.id, 'status', new.status);

  if tg_op = 'INSERT' then
    recipient := owner; actor := new.student_id; kind := 'enrollment_created';
  elsif uid = new.student_id then
    recipient := owner; actor := new.student_id; kind := 'enrollment_updated';
  else
    recipient := new.student_id; actor := coalesce(uid, owner); kind := 'enrollment_updated';
  end if;

  -- One unread notification per enrollment: refresh it instead of stacking.
  delete from public.notifications n
  where n.recipient_id = recipient
    and n.read_at is null
    and n.type in ('enrollment_created', 'enrollment_updated')
    and n.data ->> 'enrollment_id' = new.id::text;

  perform private.notify(recipient, kind, actor, payload);
  return null;
end;
$$;

-- ── Messaging: one generic message for "blocked" and "not found" (L11) ───
create or replace function public.start_direct_conversation(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  key text;
  conversation uuid;
begin
  if me is null then
    raise exception 'Sign in to send messages.';
  end if;
  if other_id = me then
    raise exception 'You cannot message yourself.';
  end if;
  if not private.is_onboarded(me) then
    raise exception 'Finish setting up your profile first.';
  end if;
  if not private.is_onboarded(other_id) or private.is_blocked_between(me, other_id) then
    raise exception 'That student could not be found.';
  end if;

  key := least(me::text, other_id::text) || ':' || greatest(me::text, other_id::text);

  insert into public.conversations (direct_key) values (key)
  on conflict (direct_key) do nothing
  returning id into conversation;

  if conversation is null then
    select c.id into conversation from public.conversations c where c.direct_key = key;
  else
    insert into public.conversation_members (conversation_id, profile_id)
    values (conversation, me), (conversation, other_id);
  end if;

  return conversation;
end;
$$;

-- ── Skills: cap new canonical skills per user (L12) ──────────────────────
create or replace function public.add_student_skill(skill_name text, skill_kind public.skill_kind)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  clean text := btrim(regexp_replace(coalesce(skill_name, ''), '[[:space:]]+', ' ', 'g'));
  skill bigint;
begin
  if me is null then
    raise exception 'Sign in to edit your skills.';
  end if;
  if char_length(clean) not between 1 and 50 then
    raise exception 'Skill names must be 1 to 50 characters.';
  end if;
  if private.slugify(clean) = '' then
    raise exception 'Skill names need at least one letter or number.';
  end if;
  if (select count(*) from public.student_skills s
      where s.profile_id = me and s.kind = skill_kind) >= 20 then
    raise exception 'You can list up to 20 skills in each list.';
  end if;

  select s.id into skill from public.skills s where s.slug = private.slugify(clean);

  if skill is null then
    if (select count(*) from public.skills s where s.created_by = me) >= 50 then
      raise exception 'You have added the maximum number of new skills. Pick an existing one.';
    end if;
    insert into public.skills (name, created_by) values (clean, me)
    on conflict (slug) do nothing
    returning id into skill;
    if skill is null then
      select s.id into skill from public.skills s where s.slug = private.slugify(clean);
    end if;
  end if;

  insert into public.student_skills (profile_id, skill_id, kind)
  values (me, skill, skill_kind)
  on conflict do nothing;

  return skill;
end;
$$;

-- ── Courses: at most 10 skill tags per course (L12) ──────────────────────
create function private.course_skills_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.course_skills cs where cs.course_id = new.course_id) >= 10 then
    raise exception 'A course can have up to 10 skills.';
  end if;
  return new;
end;
$$;

create trigger course_skills_limit before insert on public.course_skills
  for each row execute function private.course_skills_limit();

-- ── Sessions: live sessions can be extended (L6), one-year limit on
--    edits (L7) ───────────────────────────────────────────────────────────
create or replace function private.session_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.host_id <> old.host_id then
    raise exception 'Sessions cannot change host.';
  end if;

  if pg_trigger_depth() = 1 and auth.uid() is not null then
    if old.status = 'cancelled' then
      raise exception 'This session was cancelled and can no longer be changed.';
    end if;
    if old.ends_at <= now() then
      raise exception 'This session has already ended.';
    end if;
    if new.starts_at is distinct from old.starts_at and new.starts_at <= now() then
      raise exception 'Choose a start time in the future.';
    end if;
    if new.ends_at is distinct from old.ends_at and new.ends_at <= now() then
      raise exception 'Choose an end time in the future.';
    end if;
    if new.starts_at > now() + interval '1 year' then
      raise exception 'Sessions can be scheduled up to one year ahead.';
    end if;
    if new.capacity < old.accepted_count then
      raise exception 'Capacity cannot be lower than the number of accepted participants.';
    end if;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

-- ── Participants: onboarding (L5), blocks (M2), invite caps (L12),
--    rejoin after declining an invitation (L8), generic messages (L11) ────
create or replace function private.participant_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s record;
begin
  select * into s from public.study_sessions ss where ss.id = new.session_id for update;

  if not found or s.status <> 'scheduled' or s.ends_at <= now()
     or private.is_blocked_between(s.host_id, new.profile_id) then
    raise exception 'This session is no longer open.';
  end if;
  if new.profile_id = s.host_id then
    raise exception 'You are hosting this session.';
  end if;

  if uid is not null and uid = s.host_id then
    if not private.is_onboarded(new.profile_id) then
      raise exception 'That student could not be found.';
    end if;
    if (select count(*) from public.session_participants sp
        where sp.invited_by = uid and sp.created_at > now() - interval '1 day') >= 50 then
      raise exception 'You can send up to 50 invitations per day.';
    end if;
    new.status := 'invited'::public.participant_status;
    new.invited_by := uid;
  elsif uid is null or uid = new.profile_id then
    if uid is not null and not private.is_onboarded(uid) then
      raise exception 'Finish setting up your profile first.';
    end if;
    new.invited_by := null;
    if s.requires_approval then
      new.status := 'requested'::public.participant_status;
    elsif s.accepted_count >= s.capacity then
      raise exception 'This session is full.';
    else
      new.status := 'accepted'::public.participant_status;
    end if;
  else
    raise exception 'You cannot add this participant.';
  end if;
  return new;
end;
$$;

-- invited_by stays set when the invitee declines (so they may change their
-- mind) and is cleared when the host declines or removes someone.
create or replace function private.participant_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s record;
begin
  if new.session_id <> old.session_id or new.profile_id <> old.profile_id then
    raise exception 'Participation cannot be moved.';
  end if;
  if new.status = old.status then
    return new;
  end if;

  select * into s from public.study_sessions ss where ss.id = new.session_id for update;

  if uid is not null and pg_trigger_depth() = 1 then
    if s.status <> 'scheduled' or s.ends_at <= now() then
      raise exception 'This session is no longer open.';
    end if;

    if uid = old.profile_id then
      if old.status = 'invited' and new.status in ('accepted', 'declined') then
        null;
      elsif old.status in ('requested', 'accepted') and new.status = 'cancelled' then
        null;
      elsif new.status in ('requested', 'accepted')
            and (old.status = 'cancelled' or (old.status = 'declined' and old.invited_by is not null)) then
        new.status := case when s.requires_approval and old.invited_by is null
          then 'requested'::public.participant_status
          else 'accepted'::public.participant_status end;
      else
        raise exception 'You cannot change your participation that way.';
      end if;
    elsif uid = s.host_id then
      if not (
        (old.status = 'requested' and new.status in ('accepted', 'declined'))
        or (old.status = 'accepted' and new.status = 'declined')
      ) then
        raise exception 'You cannot change this participant that way.';
      end if;
      if new.status = 'declined' then
        new.invited_by := null;
      end if;
    else
      raise exception 'You cannot change this participant.';
    end if;

    if new.status in ('requested', 'accepted')
       and private.is_blocked_between(s.host_id, old.profile_id) then
      raise exception 'This session is no longer open.';
    end if;
  end if;

  if new.status = 'accepted' and old.status <> 'accepted' and s.accepted_count >= s.capacity then
    raise exception 'This session is full.';
  end if;
  return new;
end;
$$;

create or replace function private.participant_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  host uuid;
  delta integer := 0;
  row_data record;
  payload jsonb;
  recipient uuid;
  actor uuid;
  kind public.notification_type;
begin
  if tg_op = 'DELETE' then
    row_data := old;
  else
    row_data := new;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.status = 'accepted' then
    delta := delta - 1;
  end if;
  if tg_op in ('INSERT', 'UPDATE') and new.status = 'accepted' then
    delta := delta + 1;
  end if;
  if delta <> 0 then
    update public.study_sessions
    set accepted_count = accepted_count + delta
    where id = row_data.session_id;
  end if;

  -- Deletions and changes made by other triggers (blocks) are silent.
  if tg_op = 'DELETE' or pg_trigger_depth() > 1 then
    return null;
  end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return null;
  end if;

  select ss.host_id into host from public.study_sessions ss where ss.id = new.session_id;
  payload := jsonb_build_object('session_id', new.session_id, 'status', new.status);

  if tg_op = 'INSERT' then
    if new.status = 'invited' then
      recipient := new.profile_id; actor := host; kind := 'session_invitation';
    elsif new.status = 'requested' then
      recipient := host; actor := new.profile_id; kind := 'session_request';
    else
      recipient := host; actor := new.profile_id; kind := 'session_joined';
    end if;
  elsif uid = new.profile_id then
    recipient := host; actor := new.profile_id; kind := 'participation_updated';
  else
    recipient := new.profile_id; actor := coalesce(uid, host); kind := 'participation_updated';
  end if;

  -- One unread participation notification per (session, person): refresh it.
  delete from public.notifications n
  where n.recipient_id = recipient
    and n.actor_id is not distinct from actor
    and n.read_at is null
    and n.type in ('session_invitation', 'session_request', 'session_joined', 'participation_updated')
    and n.data ->> 'session_id' = new.session_id::text;

  perform private.notify(recipient, kind, actor, payload);
  return null;
end;
$$;

-- ── M2: blocking ends existing enrollments and participations ────────────
create function private.block_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.course_enrollments e
  set status = 'cancelled'
  from public.courses c
  where c.id = e.course_id
    and e.status in ('requested', 'accepted')
    and ((c.owner_id = new.blocker_id and e.student_id = new.blocked_id)
      or (c.owner_id = new.blocked_id and e.student_id = new.blocker_id));

  update public.session_participants sp
  set status = 'cancelled'
  from public.study_sessions s
  where s.id = sp.session_id
    and sp.status in ('invited', 'requested', 'accepted')
    and ((s.host_id = new.blocker_id and sp.profile_id = new.blocked_id)
      or (s.host_id = new.blocked_id and sp.profile_id = new.blocker_id));
  return null;
end;
$$;

create trigger blocks_after_insert after insert on public.blocks
  for each row execute function private.block_after_insert();

-- ── L4: report snapshots respect blocks ──────────────────────────────────
-- A reporter who was blocked by the target's owner cannot see the target,
-- so cannot report it (and cannot read it through the snapshot).
create or replace function private.report_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  snapshot jsonb;
begin
  new.status := 'open'::public.report_status;
  new.resolved_by := null;
  new.resolved_at := null;

  if new.target_type = 'message' then
    select jsonb_build_object('body', m.body, 'sender_id', m.sender_id,
                              'conversation_id', m.conversation_id, 'sent_at', m.created_at)
    into snapshot
    from public.messages m
    where m.id = new.target_id
      and exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = m.conversation_id and cm.profile_id = new.reporter_id
      );
  elsif new.target_type = 'profile' then
    select jsonb_build_object('display_name', p.display_name, 'username', p.username, 'bio', p.bio)
    into snapshot
    from public.profiles p
    where p.id = new.target_id
      and p.onboarded_at is not null
      and not exists (select 1 from public.blocks b
                      where b.blocker_id = p.id and b.blocked_id = new.reporter_id);
  elsif new.target_type = 'course' then
    select jsonb_build_object('title', c.title, 'description', c.description, 'owner_id', c.owner_id)
    into snapshot
    from public.courses c
    where c.id = new.target_id
      and (c.status = 'published' or c.owner_id = new.reporter_id)
      and not exists (select 1 from public.blocks b
                      where b.blocker_id = c.owner_id and b.blocked_id = new.reporter_id);
  elsif new.target_type = 'session' then
    select jsonb_build_object('title', s.title, 'description', s.description, 'host_id', s.host_id)
    into snapshot
    from public.study_sessions s
    where s.id = new.target_id
      and not exists (select 1 from public.blocks b
                      where b.blocker_id = s.host_id and b.blocked_id = new.reporter_id);
  end if;

  if snapshot is null then
    raise exception 'The item you reported could not be found.';
  end if;
  new.target_snapshot := snapshot;
  return new;
end;
$$;

revoke all on function private.course_skills_limit(), private.block_after_insert() from public;

-- ── L15: indexes for foreign keys hit by account deletion ────────────────
create index messages_sender_idx on public.messages (sender_id);
create index notifications_actor_idx on public.notifications (actor_id);
create index skills_created_by_idx on public.skills (created_by);
create index session_participants_invited_by_idx on public.session_participants (invited_by);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_resolved_by_idx on public.reports (resolved_by);
