-- A hidden conversation should still open from a link (e.g. an old
-- notification): my_conversations() can include one specific conversation
-- even when it's hidden. The inbox list calls it without the argument.
drop function public.my_conversations();

create function public.my_conversations(include_conversation uuid default null)
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
    and (mine.hidden_at is null or lm.created_at > mine.hidden_at or c.id = include_conversation)
  order by coalesce(lm.created_at, c.created_at) desc
  limit 200;
$$;

revoke execute on function public.my_conversations(uuid) from public, anon;
grant execute on function public.my_conversations(uuid) to authenticated;
