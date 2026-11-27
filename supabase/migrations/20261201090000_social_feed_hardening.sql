-- Social layer hardening, from the Phase 6 security review of
-- 20261129090000_social_feed.sql. No data changes.
--
-- M1  Only onboarded students can like and follow (posting already required
--     it). Unfinished accounts could otherwise send "started following you"
--     notifications with an anonymous actor that can't be traced or blocked.
-- L1  Liking your own post no longer deletes someone else's unread
--     "liked your post" notification.
-- L3  Only upcoming, scheduled sessions you host can be attached to a post.
-- L4  Likes by someone in a block relationship with you aren't visible to you
--     (and so aren't counted in what you see).

-- ── M1 + L4: policies ───────────────────────────────────────────────────
drop policy "likes follow post visibility" on public.post_likes;
create policy "likes follow post visibility" on public.post_likes
  for select to authenticated
  using (
    exists (select 1 from public.posts p where p.id = post_likes.post_id)
    and not private.is_blocked_between(post_likes.profile_id, (select auth.uid()))
  );

drop policy "students like visible posts" on public.post_likes;
create policy "students like visible posts" on public.post_likes
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and private.is_onboarded((select auth.uid()))
    and exists (select 1 from public.posts p where p.id = post_likes.post_id)
  );

drop policy "follow visible students" on public.follows;
create policy "follow visible students" on public.follows
  for insert to authenticated
  with check (
    follower_id = (select auth.uid())
    and private.is_onboarded((select auth.uid()))
    and private.can_view_profile(followee_id)
  );

-- ── L1: like notification ───────────────────────────────────────────────
create or replace function private.post_like_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select p.author_id into author from public.posts p where p.id = new.post_id;
  -- Your own like never notifies, so it must not replace anyone's notification.
  if author is null or author = new.profile_id then
    return null;
  end if;
  delete from public.notifications n
  where n.recipient_id = author and n.read_at is null and n.type = 'post_liked'
    and n.data ->> 'post_id' = new.post_id::text;
  perform private.notify(author, 'post_liked', new.profile_id, jsonb_build_object('post_id', new.post_id));
  return null;
end;
$$;

-- ── L3: attachments ─────────────────────────────────────────────────────
create or replace function private.post_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.posts p
    where p.author_id = new.author_id and p.created_at > now() - interval '1 day'
  ) >= 30 then
    raise exception 'You''ve posted a lot today. Try again tomorrow.';
  end if;
  if new.session_id is not null and not exists (
    select 1 from public.study_sessions s where s.id = new.session_id and s.host_id = new.author_id
  ) then
    raise exception 'You can only share study sessions you host.';
  end if;
  if new.session_id is not null and not exists (
    select 1 from public.study_sessions s
    where s.id = new.session_id and s.status = 'scheduled' and s.ends_at > now()
  ) then
    raise exception 'That session has ended or was cancelled, so it can''t be shared.';
  end if;
  if new.course_id is not null and not exists (
    select 1 from public.courses c
    where c.id = new.course_id and c.owner_id = new.author_id and c.status = 'published'
  ) then
    raise exception 'You can only share your own published courses.';
  end if;
  return new;
end;
$$;
