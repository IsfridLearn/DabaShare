-- Phase 6: messaging, blocking and reporting.

-- ── Inbox ────────────────────────────────────────────────────────────────
-- One row per conversation the caller belongs to: the other member (null
-- fields if RLS hides them, e.g. they blocked you), the latest message, the
-- unread count and whether a reply is possible (no block either way).
create function public.my_conversations()
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
    not private.conversation_has_block(c.id)
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
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- Number of conversations with unread messages (navigation badge).
create function public.unread_conversation_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from public.conversation_members mine
  where mine.profile_id = auth.uid()
    and exists (
      select 1 from public.messages m
      where m.conversation_id = mine.conversation_id
        and m.sender_id <> mine.profile_id
        and m.created_at > mine.last_read_at
    );
$$;

-- Marks a conversation read and clears its "new message" notification.
create function public.mark_conversation_read(target uuid)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  update public.conversation_members
  set last_read_at = now()
  where conversation_id = target and profile_id = auth.uid();

  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and type = 'new_message'
    and read_at is null
    and data ->> 'conversation_id' = target::text;
$$;

-- ── Blocks the caller created ────────────────────────────────────────────
-- Blocked profiles are hidden by RLS, so listing them (to unblock) needs a
-- definer function. It only ever returns the caller's own blocks.
create function public.my_blocks()
returns table (blocked_id uuid, display_name text, username text, blocked_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select b.blocked_id, p.display_name, p.username, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke execute on function
  public.my_conversations(),
  public.unread_conversation_count(),
  public.mark_conversation_read(uuid),
  public.my_blocks()
from public, anon;
grant execute on function
  public.my_conversations(),
  public.unread_conversation_count(),
  public.mark_conversation_read(uuid),
  public.my_blocks()
to authenticated;

-- ── Rate limits ──────────────────────────────────────────────────────────
create function private.message_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.messages m
    where m.sender_id = new.sender_id and m.created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'You''re sending messages too quickly. Wait a moment and try again.';
  end if;
  return new;
end;
$$;

create trigger messages_rate_limit before insert on public.messages
  for each row execute function private.message_rate_limit();

create function private.report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.reports r
    where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'You''ve sent a lot of reports today. Our team will review them; try again tomorrow.';
  end if;
  return new;
end;
$$;

create trigger reports_rate_limit before insert on public.reports
  for each row execute function private.report_rate_limit();

revoke all on function private.message_rate_limit(), private.report_rate_limit() from public;
