-- Social layer: posts (optionally sharing your own course or study session),
-- likes and follows, for a LinkedIn-style home feed.
-- Visibility follows profiles: signed-in members only, unfinished profiles and
-- blocked pairs hidden (private.can_view_profile).

alter type public.notification_type add value if not exists 'new_follower';
alter type public.notification_type add value if not exists 'post_liked';
alter type public.report_target add value if not exists 'post';

-- ── Tables ───────────────────────────────────────────────────────────────
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  -- "Event" posts share one of the author's own study sessions or courses.
  session_id uuid references public.study_sessions (id) on delete set null,
  course_id uuid references public.courses (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint posts_one_attachment check (session_id is null or course_id is null)
);
create index posts_created_idx on public.posts (created_at desc, id);
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_session_idx on public.posts (session_id);
create index posts_course_idx on public.posts (course_id);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
create index post_likes_profile_idx on public.post_likes (profile_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_not_self check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

-- Default privileges give new tables no insert/update: grant only what
-- clients may set. Ids, timestamps and counters come from the database.
grant insert (author_id, body, session_id, course_id) on public.posts to authenticated;
grant update (body) on public.posts to authenticated;
grant insert (post_id, profile_id) on public.post_likes to authenticated;
grant insert (follower_id, followee_id) on public.follows to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.follows enable row level security;

create policy "posts follow profile visibility" on public.posts
  for select to authenticated using (private.can_view_profile(author_id));
create policy "onboarded students post as themselves" on public.posts
  for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_onboarded((select auth.uid())));
create policy "authors edit their posts" on public.posts
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy "authors delete their posts" on public.posts
  for delete to authenticated using (author_id = (select auth.uid()));

-- Likes are visible on posts you can see; you like only as yourself, and only
-- posts you can see (the subquery runs under the posts policy).
create policy "likes follow post visibility" on public.post_likes
  for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_likes.post_id));
create policy "students like visible posts" on public.post_likes
  for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and exists (select 1 from public.posts p where p.id = post_likes.post_id)
  );
create policy "students unlike" on public.post_likes
  for delete to authenticated using (profile_id = (select auth.uid()));

-- Follow rows: you see your own follows and your followers. Counts for other
-- profiles come from profile_social() so lists aren't exposed.
create policy "see your follows and followers" on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));
create policy "follow visible students" on public.follows
  for insert to authenticated
  with check (follower_id = (select auth.uid()) and private.can_view_profile(followee_id));
create policy "unfollow" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));

-- ── Triggers ─────────────────────────────────────────────────────────────
create trigger posts_updated_at before update on public.posts
  for each row execute function private.set_updated_at();

-- Posting limits and attachment ownership ("post about your own stuff").
create function private.post_before_insert()
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
  if new.course_id is not null and not exists (
    select 1 from public.courses c
    where c.id = new.course_id and c.owner_id = new.author_id and c.status = 'published'
  ) then
    raise exception 'You can only share your own published courses.';
  end if;
  return new;
end;
$$;

create trigger posts_before_insert before insert on public.posts
  for each row execute function private.post_before_insert();

create function private.post_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.author_id <> old.author_id then
    raise exception 'Posts cannot change author.';
  end if;
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger posts_before_update before update on public.posts
  for each row execute function private.post_before_update();

-- One unread "liked your post" per post (latest liker), no self-notifications.
create function private.post_like_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select p.author_id into author from public.posts p where p.id = new.post_id;
  delete from public.notifications n
  where n.recipient_id = author and n.read_at is null and n.type = 'post_liked'
    and n.data ->> 'post_id' = new.post_id::text;
  perform private.notify(author, 'post_liked', new.profile_id, jsonb_build_object('post_id', new.post_id));
  return null;
end;
$$;

create trigger post_likes_after_insert after insert on public.post_likes
  for each row execute function private.post_like_after_insert();

create function private.follow_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.follows f
    where f.follower_id = new.follower_id and f.created_at > now() - interval '1 day'
  ) >= 200 then
    raise exception 'You''ve followed a lot of people today. Try again tomorrow.';
  end if;
  return new;
end;
$$;

create trigger follows_before_insert before insert on public.follows
  for each row execute function private.follow_before_insert();

-- One unread "started following you" per follower.
create function private.follow_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n
  where n.recipient_id = new.followee_id and n.actor_id = new.follower_id
    and n.read_at is null and n.type = 'new_follower';
  perform private.notify(new.followee_id, 'new_follower', new.follower_id, '{}'::jsonb);
  return null;
end;
$$;

create trigger follows_after_insert after insert on public.follows
  for each row execute function private.follow_after_insert();

-- Blocking removes follows in both directions.
create function private.block_removes_follows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows f
  where (f.follower_id = new.blocker_id and f.followee_id = new.blocked_id)
     or (f.follower_id = new.blocked_id and f.followee_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocks_remove_follows after insert on public.blocks
  for each row execute function private.block_removes_follows();

revoke all on function
  private.post_before_insert(), private.post_before_update(), private.post_like_after_insert(),
  private.follow_before_insert(), private.follow_after_insert(), private.block_removes_follows()
from public;

-- Reports can now target posts (same visibility rule as other targets).
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
  elsif new.target_type = 'post' then
    select jsonb_build_object('body', po.body, 'author_id', po.author_id, 'posted_at', po.created_at)
    into snapshot
    from public.posts po
    join public.profiles p on p.id = po.author_id and p.onboarded_at is not null
    where po.id = new.target_id
      and not exists (select 1 from public.blocks b
                      where b.blocker_id = po.author_id and b.blocked_id = new.reporter_id);
  end if;

  if snapshot is null then
    raise exception 'The item you reported could not be found.';
  end if;
  new.target_snapshot := snapshot;
  return new;
end;
$$;

-- ── Read helpers ─────────────────────────────────────────────────────────
-- Feed: 'following' = you + people you follow; 'everyone' = all visible posts.
-- Keyset pagination on (created_at, id). Runs as the caller (RLS applies).
create function public.feed_posts(
  scope text default 'following',
  before_ts timestamptz default null,
  before_id uuid default null,
  page_size integer default 20,
  only_author uuid default null
)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  edited_at timestamptz,
  author_id uuid,
  author_name text,
  author_username text,
  author_avatar text,
  author_program text,
  author_university text,
  like_count integer,
  liked_by_me boolean,
  session_id uuid,
  session_title text,
  session_starts_at timestamptz,
  session_type public.session_type,
  course_id uuid,
  course_title text,
  course_price integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    po.id, po.body, po.created_at, po.edited_at,
    po.author_id, pr.display_name, pr.username, pr.avatar_path, pr.program, u.short_name,
    (select count(*)::integer from public.post_likes l where l.post_id = po.id),
    exists (select 1 from public.post_likes l where l.post_id = po.id and l.profile_id = auth.uid()),
    s.id, s.title, s.starts_at, s.type,
    c.id, c.title, c.price_php
  from public.posts po
  join public.profiles pr on pr.id = po.author_id
  left join public.universities u on u.id = pr.university_id
  left join public.study_sessions s on s.id = po.session_id
  left join public.courses c on c.id = po.course_id
  where (only_author is null or po.author_id = only_author)
    and (
      coalesce(scope, 'following') = 'everyone'
      or po.author_id = auth.uid()
      or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = po.author_id)
    )
    and (before_ts is null or (po.created_at, po.id) < (before_ts, coalesce(before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by po.created_at desc, po.id desc
  limit least(greatest(page_size, 1), 50);
$$;

-- Follower/following counts and relationship for a profile you can see.
create function public.profile_social(target uuid)
returns table (followers integer, following integer, i_follow boolean, follows_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from public.follows f where f.followee_id = target),
    (select count(*)::integer from public.follows f where f.follower_id = target),
    exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.followee_id = target),
    exists (select 1 from public.follows f where f.follower_id = target and f.followee_id = auth.uid())
  where auth.uid() is not null and private.can_view_profile(target);
$$;

revoke execute on function
  public.feed_posts(text, timestamptz, uuid, integer, uuid),
  public.profile_social(uuid)
from public, anon;
grant execute on function
  public.feed_posts(text, timestamptz, uuid, integer, uuid),
  public.profile_social(uuid)
to authenticated;
