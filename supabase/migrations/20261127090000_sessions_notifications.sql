-- Phase 7: study sessions, webinars and the notification centre.
-- The tables, state machines, capacity locking and notification triggers
-- already exist (Phase 2); these are read helpers for the UI.

-- ── Sessions list ────────────────────────────────────────────────────────
-- tab: 'upcoming' (scheduled, not started), 'live' (happening now),
--      'mine' (hosting or joined/requested/invited, ended < 1 day ago incl. cancelled).
create function public.list_sessions(
  tab text default 'upcoming',
  page_size integer default 12,
  page_offset integer default 0
)
returns table (
  id uuid,
  title text,
  description text,
  type public.session_type,
  category_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  accepted_count integer,
  requires_approval boolean,
  status public.session_status,
  host_id uuid,
  host_name text,
  host_username text,
  host_avatar text,
  my_status public.participant_status,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id, s.title, s.description, s.type, c.name, s.starts_at, s.ends_at,
    s.capacity, s.accepted_count, s.requires_approval, s.status,
    s.host_id, p.display_name, p.username, p.avatar_path,
    (select sp.status from public.session_participants sp
     where sp.session_id = s.id and sp.profile_id = auth.uid()),
    count(*) over ()
  from public.study_sessions s
  join public.profiles p on p.id = s.host_id
  left join public.categories c on c.id = s.category_id
  where case coalesce(tab, 'upcoming')
    when 'live' then s.status = 'scheduled' and s.starts_at <= now() and s.ends_at > now()
    when 'mine' then s.ends_at > now() - interval '1 day'
      and (s.host_id = auth.uid() or exists (
        select 1 from public.session_participants sp
        where sp.session_id = s.id and sp.profile_id = auth.uid()
          and sp.status in ('invited', 'requested', 'accepted')))
    else s.status = 'scheduled' and s.starts_at > now()
  end
  order by s.starts_at, s.id
  limit least(greatest(page_size, 1), 48)
  offset greatest(page_offset, 0);
$$;

-- ── Notification centre ──────────────────────────────────────────────────
-- Adds who acted and the course/session title, plus whether the caller owns
-- the course / hosts the session (the same type reads differently for each side).
create function public.my_notifications(page_size integer default 30, page_offset integer default 0)
returns table (
  id uuid,
  type public.notification_type,
  data jsonb,
  read_at timestamptz,
  created_at timestamptz,
  actor_name text,
  actor_username text,
  actor_avatar text,
  course_title text,
  i_own_course boolean,
  session_title text,
  i_host_session boolean,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    n.id, n.type, n.data, n.read_at, n.created_at,
    a.display_name, a.username, a.avatar_path,
    coalesce(co.title, n.data ->> 'course_title'),
    coalesce(co.owner_id = auth.uid(), false),
    ss.title,
    coalesce(ss.host_id = auth.uid(), false),
    count(*) over ()
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.courses co on co.id = (n.data ->> 'course_id')::uuid
  left join public.study_sessions ss on ss.id = (n.data ->> 'session_id')::uuid
  where n.recipient_id = auth.uid()
  order by n.created_at desc, n.id
  limit least(greatest(page_size, 1), 100)
  offset greatest(page_offset, 0);
$$;

create function public.unread_notification_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer from public.notifications
  where recipient_id = auth.uid() and read_at is null;
$$;

create function public.mark_all_notifications_read()
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where recipient_id = auth.uid() and read_at is null;
$$;

revoke execute on function
  public.list_sessions(text, integer, integer),
  public.my_notifications(integer, integer),
  public.unread_notification_count(),
  public.mark_all_notifications_read()
from public, anon;
grant execute on function
  public.list_sessions(text, integer, integer),
  public.my_notifications(integer, integer),
  public.unread_notification_count(),
  public.mark_all_notifications_read()
to authenticated;
