-- Phase 9 hardening from the independent security review (no critical/high
-- findings). Abuse limits, hide-a-conversation, and robustness fixes.

-- ── Conversations: creator, per-day cap, hide ────────────────────────────
alter table public.conversations
  add column created_by uuid references public.profiles (id) on delete set null;
create index conversations_created_by_idx on public.conversations (created_by, created_at);

-- A member can hide a conversation from their inbox; a newer message brings it back.
alter table public.conversation_members add column hidden_at timestamptz;
grant update (hidden_at) on public.conversation_members to authenticated;

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
  select c.id into conversation from public.conversations c where c.direct_key = key;

  if conversation is null then
    if (select count(*) from public.conversations c
        where c.created_by = me and c.created_at > now() - interval '1 day') >= 30 then
      raise exception 'You''ve started a lot of new conversations today. Try again tomorrow.';
    end if;
    insert into public.conversations (direct_key, created_by) values (key, me)
    on conflict (direct_key) do nothing
    returning id into conversation;
    if conversation is null then
      select c.id into conversation from public.conversations c where c.direct_key = key;
    else
      insert into public.conversation_members (conversation_id, profile_id)
      values (conversation, me), (conversation, other_id);
    end if;
  end if;

  -- Starting (again) a conversation you had hidden shows it again.
  update public.conversation_members
  set hidden_at = null
  where conversation_id = conversation and profile_id = me and hidden_at is not null;

  return conversation;
end;
$$;

-- Inbox: hidden conversations stay hidden until a newer message arrives;
-- can_send is false when the other student deleted their account; bounded.
create or replace function public.my_conversations()
returns table (
  conversation_id uuid,
  other_id uuid,
  other_name text,
  other_username text,
  other_avatar text,
  last_body text,
  last_sender uuid,
  last_at timestamptz,
  unread integer,
  can_send boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    om.profile_id,
    p.display_name,
    p.username,
    p.avatar_path,
    lm.body,
    lm.sender_id,
    coalesce(lm.created_at, c.created_at),
    (
      select count(*)::integer from public.messages m
      where m.conversation_id = c.id and m.sender_id <> mine.profile_id and m.created_at > mine.last_read_at
    ),
    om.profile_id is not null and not private.conversation_has_block(c.id)
  from public.conversation_members mine
  join public.conversations c on c.id = mine.conversation_id
  left join public.conversation_members om
    on om.conversation_id = c.id and om.profile_id <> mine.profile_id
  left join public.profiles p on p.id = om.profile_id
  left join lateral (
    select m.body, m.sender_id, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where mine.profile_id = auth.uid()
    and (mine.hidden_at is null or lm.created_at > mine.hidden_at)
  order by coalesce(lm.created_at, c.created_at) desc
  limit 200;
$$;

-- ── Course skills: bound the input before doing any work ────────────────
create or replace function public.set_course_skills(target_course uuid, skill_names text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  raw text;
  clean text;
  wanted bigint[] := '{}';
  skill bigint;
begin
  if me is null then
    raise exception 'Sign in to edit courses.';
  end if;
  if cardinality(coalesce(skill_names, '{}')) > 20 then
    raise exception 'A course can have up to 10 skills.';
  end if;
  if not exists (select 1 from public.courses c where c.id = target_course and c.owner_id = me) then
    raise exception 'You can only edit your own courses.';
  end if;

  foreach raw in array coalesce(skill_names, '{}') loop
    clean := btrim(regexp_replace(coalesce(raw, ''), '[[:space:]]+', ' ', 'g'));
    continue when clean = '' or private.slugify(clean) = '';
    if char_length(clean) > 50 then
      raise exception 'Skill names must be 1 to 50 characters.';
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

    if not skill = any (wanted) then
      wanted := wanted || skill;
    end if;
  end loop;

  if cardinality(wanted) > 10 then
    raise exception 'A course can have up to 10 skills.';
  end if;

  delete from public.course_skills cs
  where cs.course_id = target_course and not cs.skill_id = any (wanted);

  insert into public.course_skills (course_id, skill_id)
  select target_course, w from unnest(wanted) as w
  on conflict do nothing;
end;
$$;

-- ── Session time changes: one unread "updated" notification per person ──
create or replace function private.session_after_update()
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

  delete from public.notifications n
  using public.session_participants sp
  where sp.session_id = new.id
    and n.recipient_id = sp.profile_id
    and n.read_at is null
    and n.type = 'session_updated'
    and n.data ->> 'session_id' = new.id::text;

  insert into public.notifications (recipient_id, actor_id, type, data)
  select sp.profile_id, new.host_id, kind, jsonb_build_object('session_id', new.id)
  from public.session_participants sp
  where sp.session_id = new.id and sp.status in ('accepted', 'requested', 'invited');
  return null;
end;
$$;

-- ── Caps on courses and sessions per student ─────────────────────────────
create function private.course_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.status <> 'archived'
     and (tg_op = 'INSERT' or old.status = 'archived')
     and (select count(*) from public.courses c
          where c.owner_id = new.owner_id and c.status <> 'archived' and c.id <> new.id) >= 20 then
    raise exception 'You can have up to 20 active courses. Archive or delete one first.';
  end if;
  return new;
end;
$$;

create trigger courses_limit before insert or update of status on public.courses
  for each row execute function private.course_limit();

create function private.session_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.study_sessions s
    where s.host_id = new.host_id and s.status = 'scheduled' and s.ends_at > now()
  ) >= 20 then
    raise exception 'You can host up to 20 upcoming sessions at a time.';
  end if;
  return new;
end;
$$;

create trigger study_sessions_limit before insert on public.study_sessions
  for each row execute function private.session_limit();

revoke all on function private.course_limit(), private.session_limit() from public;

-- ── my_blocks: only finished profiles ─────────────────────────────────────
create or replace function public.my_blocks()
returns table (blocked_id uuid, display_name text, username text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, p.display_name, p.username, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id and p.onboarded_at is not null
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;
