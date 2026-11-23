-- Business rules that RLS alone cannot express: who may move a request to
-- which status, capacity, dates, profile creation, notifications.
-- Errors raised here use plain sentences; the app shows them to the user.
-- Every check that depends on the actor is skipped when auth.uid() is null,
-- which only happens for trusted access (SQL editor, service role).

-- ── Shared ───────────────────────────────────────────────────────────────
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger courses_updated_at before update on public.courses
  for each row execute function private.set_updated_at();
create trigger course_enrollments_updated_at before update on public.course_enrollments
  for each row execute function private.set_updated_at();
create trigger study_sessions_updated_at before update on public.study_sessions
  for each row execute function private.set_updated_at();
create trigger study_session_links_updated_at before update on public.study_session_links
  for each row execute function private.set_updated_at();
create trigger session_participants_updated_at before update on public.session_participants
  for each row execute function private.set_updated_at();

create function private.notify(
  recipient uuid,
  kind public.notification_type,
  actor uuid,
  payload jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, type, actor_id, data)
  select recipient, kind, actor, payload
  where recipient is distinct from actor;
$$;

-- ── New user -> profile ──────────────────────────────────────────────────
-- Signup passes display_name, university_id and accepted_terms in user metadata.
create function private.handle_new_user()
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

  insert into public.profiles (id, display_name, university_id, accepted_terms_at)
  values (
    new.id,
    name,
    uni,
    case when meta ->> 'accepted_terms' = 'true' then now() end
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

-- ── Course enrollments ───────────────────────────────────────────────────
-- Free courses are accepted immediately; paid courses wait for the owner.
create function private.enrollment_before_insert()
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

  if not found or c.status <> 'published' then
    raise exception 'This course is not open for enrollment.';
  end if;
  if c.owner_id = new.student_id then
    raise exception 'You cannot enroll in your own course.';
  end if;
  if private.is_blocked_between(c.owner_id, new.student_id) then
    raise exception 'You cannot enroll in this course.';
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

create trigger course_enrollments_before_insert before insert on public.course_enrollments
  for each row execute function private.enrollment_before_insert();

-- Student: cancel, or re-request after cancelling.
-- Owner: accept/decline a request, or remove an accepted student.
create function private.enrollment_before_update()
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
  if new.status = old.status or uid is null then
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

  new.decided_at := now();
  return new;
end;
$$;

create trigger course_enrollments_before_update before update on public.course_enrollments
  for each row execute function private.enrollment_before_update();

create function private.enrollment_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner uuid;
  uid uuid := auth.uid();
  payload jsonb;
begin
  select co.owner_id into owner from public.courses co where co.id = new.course_id;
  payload := jsonb_build_object(
    'course_id', new.course_id,
    'enrollment_id', new.id,
    'status', new.status
  );

  if tg_op = 'INSERT' then
    perform private.notify(owner, 'enrollment_created', new.student_id, payload);
  elsif new.status is distinct from old.status then
    if uid = new.student_id then
      perform private.notify(owner, 'enrollment_updated', new.student_id, payload);
    else
      perform private.notify(new.student_id, 'enrollment_updated', coalesce(uid, owner), payload);
    end if;
  end if;
  return null;
end;
$$;

create trigger course_enrollments_after_change after insert or update on public.course_enrollments
  for each row execute function private.enrollment_after_change();

-- ── Messaging ────────────────────────────────────────────────────────────
create function public.start_direct_conversation(other_id uuid)
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
  if not private.is_onboarded(other_id) then
    raise exception 'That student could not be found.';
  end if;
  if private.is_blocked_between(me, other_id) then
    raise exception 'You cannot message this student.';
  end if;

  key := least(me::text, other_id::text) || ':' || greatest(me::text, other_id::text);

  -- ON CONFLICT waits for a concurrent creator to commit, so both callers
  -- end up with the same conversation and its members already in place.
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

revoke execute on function public.start_direct_conversation(uuid) from public, anon;
grant execute on function public.start_direct_conversation(uuid) to authenticated;

-- Keeps the conversation list ordered, marks the sender's own message read,
-- and leaves at most one unread "new message" notification per conversation.
create function private.message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  update public.conversation_members
  set last_read_at = new.created_at
  where conversation_id = new.conversation_id and profile_id = new.sender_id;

  insert into public.notifications (recipient_id, actor_id, type, data)
  select m.profile_id, new.sender_id, 'new_message',
         jsonb_build_object('conversation_id', new.conversation_id)
  from public.conversation_members m
  where m.conversation_id = new.conversation_id
    and m.profile_id <> new.sender_id
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = m.profile_id
        and n.type = 'new_message'
        and n.read_at is null
        and n.data ->> 'conversation_id' = new.conversation_id::text
    );
  return null;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function private.message_after_insert();

-- ── Skills ───────────────────────────────────────────────────────────────
-- Adds a skill to the caller's teach/learn list, creating the canonical
-- skill if it does not exist yet. Returns the skill id.
create function public.add_student_skill(skill_name text, skill_kind public.skill_kind)
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

  insert into public.skills (name, created_by) values (clean, me)
  on conflict (slug) do nothing
  returning id into skill;

  if skill is null then
    select s.id into skill from public.skills s where s.slug = private.slugify(clean);
  end if;

  insert into public.student_skills (profile_id, skill_id, kind)
  values (me, skill, skill_kind)
  on conflict do nothing;

  return skill;
end;
$$;

revoke execute on function public.add_student_skill(text, public.skill_kind) from public, anon;
grant execute on function public.add_student_skill(text, public.skill_kind) to authenticated;

-- ── Study sessions ───────────────────────────────────────────────────────
create function private.session_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.starts_at <= now() then
    raise exception 'Choose a start time in the future.';
  end if;
  if new.starts_at > now() + interval '1 year' then
    raise exception 'Sessions can be scheduled up to one year ahead.';
  end if;
  new.status := 'scheduled'::public.session_status;
  new.accepted_count := 0;
  new.cancelled_at := null;
  return new;
end;
$$;

create trigger study_sessions_before_insert before insert on public.study_sessions
  for each row execute function private.session_before_insert();

-- Host edits. Updates made by other triggers (pg_trigger_depth() > 1), such as
-- keeping accepted_count in sync, skip these checks.
create function private.session_before_update()
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
    if (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at)
       and new.starts_at <= now() then
      raise exception 'Choose a start time in the future.';
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

create trigger study_sessions_before_update before update on public.study_sessions
  for each row execute function private.session_before_update();

create function private.session_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  kind public.notification_type;
begin
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    kind := 'session_cancelled';
  elsif (new.starts_at, new.ends_at) is distinct from (old.starts_at, old.ends_at) then
    kind := 'session_updated';
  else
    return null;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, data)
  select sp.profile_id, new.host_id, kind, jsonb_build_object('session_id', new.id)
  from public.session_participants sp
  where sp.session_id = new.id and sp.status in ('accepted', 'requested', 'invited');
  return null;
end;
$$;

create trigger study_sessions_after_update after update on public.study_sessions
  for each row execute function private.session_after_update();

-- ── Session participants ─────────────────────────────────────────────────
-- Host inserting a row for someone else = invitation.
-- Student inserting their own row = join (or request, if approval is required).
create function private.participant_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  s record;
begin
  -- Lock the session so concurrent joins cannot exceed capacity.
  select * into s from public.study_sessions ss where ss.id = new.session_id for update;

  if not found or s.status <> 'scheduled' or s.ends_at <= now() then
    raise exception 'This session is no longer open.';
  end if;
  if new.profile_id = s.host_id then
    raise exception 'You are hosting this session.';
  end if;
  if private.is_blocked_between(s.host_id, new.profile_id) then
    raise exception 'You cannot join this session.';
  end if;

  if uid is not null and uid = s.host_id then
    if not private.is_onboarded(new.profile_id) then
      raise exception 'That student could not be found.';
    end if;
    new.status := 'invited'::public.participant_status;
    new.invited_by := uid;
  elsif uid is null or uid = new.profile_id then
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

create trigger session_participants_before_insert before insert on public.session_participants
  for each row execute function private.participant_before_insert();

-- Participant: accept/decline an invitation, cancel, or rejoin after cancelling.
-- Host: accept/decline a request, or remove an accepted participant.
create function private.participant_before_update()
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

  if uid is not null then
    if s.status <> 'scheduled' or s.ends_at <= now() then
      raise exception 'This session is no longer open.';
    end if;

    if uid = old.profile_id then
      if old.status = 'invited' and new.status in ('accepted', 'declined') then
        null;
      elsif old.status in ('requested', 'accepted') and new.status = 'cancelled' then
        null;
      elsif old.status = 'cancelled' and new.status in ('requested', 'accepted') then
        new.status := case when s.requires_approval
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
    else
      raise exception 'You cannot change this participant.';
    end if;
  end if;

  if new.status = 'accepted' and old.status <> 'accepted' and s.accepted_count >= s.capacity then
    raise exception 'This session is full.';
  end if;
  return new;
end;
$$;

create trigger session_participants_before_update before update on public.session_participants
  for each row execute function private.participant_before_update();

-- Keeps study_sessions.accepted_count in sync and notifies the other party.
create function private.participant_after_change()
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

  if tg_op = 'DELETE' then
    return null;
  end if;

  select ss.host_id into host from public.study_sessions ss where ss.id = new.session_id;
  payload := jsonb_build_object('session_id', new.session_id, 'status', new.status);

  if tg_op = 'INSERT' then
    if new.status = 'invited' then
      perform private.notify(new.profile_id, 'session_invitation', host, payload);
    elsif new.status = 'requested' then
      perform private.notify(host, 'session_request', new.profile_id, payload);
    else
      perform private.notify(host, 'session_joined', new.profile_id, payload);
    end if;
  elsif new.status is distinct from old.status then
    if uid = new.profile_id then
      perform private.notify(host, 'participation_updated', new.profile_id, payload);
    else
      perform private.notify(new.profile_id, 'participation_updated', coalesce(uid, host), payload);
    end if;
  end if;
  return null;
end;
$$;

create trigger session_participants_after_change
  after insert or update or delete on public.session_participants
  for each row execute function private.participant_after_change();

-- ── Reports ──────────────────────────────────────────────────────────────
-- Verifies the reporter can actually see the target, then snapshots it.
create function private.report_before_insert()
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
    where p.id = new.target_id and p.onboarded_at is not null;
  elsif new.target_type = 'course' then
    select jsonb_build_object('title', c.title, 'description', c.description, 'owner_id', c.owner_id)
    into snapshot
    from public.courses c
    where c.id = new.target_id and (c.status = 'published' or c.owner_id = new.reporter_id);
  elsif new.target_type = 'session' then
    select jsonb_build_object('title', s.title, 'description', s.description, 'host_id', s.host_id)
    into snapshot
    from public.study_sessions s
    where s.id = new.target_id;
  end if;

  if snapshot is null then
    raise exception 'The item you reported could not be found.';
  end if;
  new.target_snapshot := snapshot;
  return new;
end;
$$;

create trigger reports_before_insert before insert on public.reports
  for each row execute function private.report_before_insert();

create function private.report_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('resolved', 'dismissed') and old.status not in ('resolved', 'dismissed') then
    new.resolved_at := now();
    new.resolved_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger reports_before_update before update on public.reports
  for each row execute function private.report_before_update();

-- Trigger functions must not be callable directly.
revoke all on function
  private.set_updated_at(),
  private.notify(uuid, public.notification_type, uuid, jsonb),
  private.handle_new_user(),
  private.enrollment_before_insert(),
  private.enrollment_before_update(),
  private.enrollment_after_change(),
  private.message_after_insert(),
  private.session_before_insert(),
  private.session_before_update(),
  private.session_after_update(),
  private.participant_before_insert(),
  private.participant_before_update(),
  private.participant_after_change(),
  private.report_before_insert(),
  private.report_before_update()
from public;
