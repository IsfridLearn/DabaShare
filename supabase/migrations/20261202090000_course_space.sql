-- Course space and reviews (docs/COURSE_SPACE.md). Additive only.
--
-- Members of a course (the tutor and students with an accepted enrollment)
-- share a schedule of lessons and the tutor's updates. The tutor can mark a
-- student as finished; finished students can review the course.

alter type public.notification_type add value if not exists 'lesson_scheduled';
alter type public.notification_type add value if not exists 'course_update';
alter type public.notification_type add value if not exists 'course_completed';
alter type public.notification_type add value if not exists 'review_received';
alter type public.report_target add value if not exists 'review';

-- Set by the tutor through set_enrollment_completed(); students have no grant on it.
alter table public.course_enrollments add column completed_at timestamptz;

-- ── Membership ───────────────────────────────────────────────────────────
create function private.is_course_member(course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.courses c
    where c.id = course
      and not private.is_blocked_between(c.owner_id, auth.uid())
      and (
        c.owner_id = auth.uid()
        or exists (
          select 1 from public.course_enrollments e
          where e.course_id = c.id and e.student_id = auth.uid() and e.status = 'accepted'
        )
      )
  );
$$;

-- Finished the course (completion survives leaving or removal afterwards,
-- so a tutor can't remove a student to stop a review).
create function private.has_completed(course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.course_enrollments e
    where e.course_id = course and e.student_id = auth.uid() and e.completed_at is not null
  );
$$;

-- ── Completion ───────────────────────────────────────────────────────────
-- Tutor only, accepted students only. Not a status: the enrollment rules and
-- column grants stay exactly as they are.
create function public.set_enrollment_completed(target uuid, done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
begin
  select en.id, en.student_id, en.status, en.completed_at, c.id as course_id, c.owner_id
  into e
  from public.course_enrollments en
  join public.courses c on c.id = en.course_id
  where en.id = target;

  if e.id is null or e.owner_id is distinct from auth.uid() then
    raise exception 'Enrollment not found.';
  end if;
  if e.status <> 'accepted' then
    raise exception 'Only enrolled students can be marked as finished.';
  end if;

  if done and e.completed_at is null then
    update public.course_enrollments set completed_at = now() where id = target;
    perform private.notify(e.student_id, 'course_completed', auth.uid(),
      jsonb_build_object('course_id', e.course_id));
  elsif not done and e.completed_at is not null then
    update public.course_enrollments set completed_at = null where id = target;
  end if;
end;
$$;

-- ── Lessons ──────────────────────────────────────────────────────────────
create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  -- A room or a meeting link. Links must be web links (no javascript: etc.).
  location text check (
    location is null
    or (char_length(location) <= 300
        and (location !~* '^[a-z][a-z0-9+.-]*:' or location ~* '^https?://'))
  ),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '12 hours')
);
create index course_lessons_course_idx on public.course_lessons (course_id, starts_at);
alter table public.course_lessons enable row level security;

create policy "members see lessons" on public.course_lessons
  for select to authenticated using (private.is_course_member(course_id));
create policy "tutors add lessons" on public.course_lessons
  for insert to authenticated with check (private.owns_course(course_id));
create policy "tutors edit lessons" on public.course_lessons
  for update to authenticated
  using (private.owns_course(course_id))
  with check (private.owns_course(course_id));
create policy "tutors delete lessons" on public.course_lessons
  for delete to authenticated using (private.owns_course(course_id));

grant insert (course_id, title, starts_at, ends_at, location, notes) on public.course_lessons to authenticated;
grant update (title, starts_at, ends_at, location, notes) on public.course_lessons to authenticated;

create trigger course_lessons_updated_at before update on public.course_lessons
  for each row execute function private.set_updated_at();

create function private.lesson_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.starts_at <= now() then
      raise exception 'Choose a start time in the future.';
    end if;
    if (select count(*) from public.course_lessons l
        where l.course_id = new.course_id and l.ends_at > now()) >= 50 then
      raise exception 'A course can have up to 50 upcoming lessons.';
    end if;
  end if;
  return new;
end;
$$;
create trigger course_lessons_before_insert before insert on public.course_lessons
  for each row execute function private.lesson_before_insert();

-- Notify enrolled students: one unread "new lessons" per course.
create function private.lesson_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tutor uuid;
  student uuid;
begin
  select c.owner_id into tutor from public.courses c where c.id = new.course_id;
  for student in
    select e.student_id from public.course_enrollments e
    where e.course_id = new.course_id and e.status = 'accepted'
      and not private.is_blocked_between(tutor, e.student_id)
  loop
    delete from public.notifications n
    where n.recipient_id = student and n.read_at is null and n.type = 'lesson_scheduled'
      and n.data ->> 'course_id' = new.course_id::text;
    perform private.notify(student, 'lesson_scheduled', tutor,
      jsonb_build_object('course_id', new.course_id, 'lesson_id', new.id));
  end loop;
  return null;
end;
$$;
create trigger course_lessons_after_insert after insert on public.course_lessons
  for each row execute function private.lesson_after_insert();

-- ── Updates (announcements, optionally with a link to materials) ─────────
create table public.course_updates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  link_url text check (link_url is null or (char_length(link_url) <= 500 and link_url ~* '^https?://')),
  created_at timestamptz not null default now()
);
create index course_updates_course_idx on public.course_updates (course_id, created_at desc);
alter table public.course_updates enable row level security;

create policy "members see updates" on public.course_updates
  for select to authenticated using (private.is_course_member(course_id));
create policy "tutors post updates" on public.course_updates
  for insert to authenticated
  with check (author_id = (select auth.uid()) and private.owns_course(course_id));
create policy "tutors delete updates" on public.course_updates
  for delete to authenticated using (private.owns_course(course_id));

grant insert (course_id, author_id, body, link_url) on public.course_updates to authenticated;

create function private.course_update_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and (
    select count(*) from public.course_updates u
    where u.course_id = new.course_id and u.created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'That''s a lot of updates for one day. Try again tomorrow.';
  end if;
  return new;
end;
$$;
create trigger course_updates_before_insert before insert on public.course_updates
  for each row execute function private.course_update_before_insert();

create function private.course_update_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  student uuid;
begin
  for student in
    select e.student_id from public.course_enrollments e
    where e.course_id = new.course_id and e.status = 'accepted'
      and not private.is_blocked_between(new.author_id, e.student_id)
  loop
    delete from public.notifications n
    where n.recipient_id = student and n.read_at is null and n.type = 'course_update'
      and n.data ->> 'course_id' = new.course_id::text;
    perform private.notify(student, 'course_update', new.author_id,
      jsonb_build_object('course_id', new.course_id, 'update_id', new.id));
  end loop;
  return null;
end;
$$;
create trigger course_updates_after_insert after insert on public.course_updates
  for each row execute function private.course_update_after_insert();

-- ── Reviews ──────────────────────────────────────────────────────────────
create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, author_id)
);
create index course_reviews_course_idx on public.course_reviews (course_id, created_at desc);
alter table public.course_reviews enable row level security;

-- Readable wherever the course is visible (the subquery runs under the
-- courses policy), except reviews by someone in a block relationship.
create policy "reviews follow course visibility" on public.course_reviews
  for select to authenticated
  using (
    exists (select 1 from public.courses c where c.id = course_reviews.course_id)
    and not private.is_blocked_between(author_id, (select auth.uid()))
  );
create policy "finished students review" on public.course_reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.is_onboarded((select auth.uid()))
    and private.has_completed(course_id)
  );
create policy "authors edit their reviews" on public.course_reviews
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
create policy "authors delete their reviews" on public.course_reviews
  for delete to authenticated using (author_id = (select auth.uid()));

grant insert (course_id, author_id, rating, body) on public.course_reviews to authenticated;
grant update (rating, body) on public.course_reviews to authenticated;

create trigger course_reviews_updated_at before update on public.course_reviews
  for each row execute function private.set_updated_at();

create function private.review_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tutor uuid;
begin
  select c.owner_id into tutor from public.courses c where c.id = new.course_id;
  perform private.notify(tutor, 'review_received', new.author_id,
    jsonb_build_object('course_id', new.course_id, 'review_id', new.id, 'rating', new.rating));
  return null;
end;
$$;
create trigger course_reviews_after_insert after insert on public.course_reviews
  for each row execute function private.review_after_insert();

-- ── Ratings (run as the caller, so blocked reviewers aren't counted) ──────
create function public.course_rating_summary(course_ids uuid[])
returns table (course_id uuid, rating_avg numeric, rating_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.course_id, round(avg(r.rating)::numeric, 1), count(*)::integer
  from public.course_reviews r
  where r.course_id = any (course_ids) and cardinality(course_ids) <= 100
  group by r.course_id;
$$;

create function public.tutor_rating_summary(tutor uuid)
returns table (rating_avg numeric, rating_count integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select round(avg(r.rating)::numeric, 1), count(*)::integer
  from public.course_reviews r
  join public.courses c on c.id = r.course_id
  where c.owner_id = tutor;
$$;

-- ── Reports: reviews can be reported (same block rule as other targets) ──
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
  elsif new.target_type = 'review' then
    select jsonb_build_object('rating', r.rating, 'body', r.body, 'author_id', r.author_id,
                              'course_id', r.course_id, 'written_at', r.created_at)
    into snapshot
    from public.course_reviews r
    join public.courses c on c.id = r.course_id
    where r.id = new.target_id
      and (c.status = 'published' or c.owner_id = new.reporter_id)
      and not exists (select 1 from public.blocks b
                      where (b.blocker_id = r.author_id and b.blocked_id = new.reporter_id)
                         or (b.blocker_id = c.owner_id and b.blocked_id = new.reporter_id));
  end if;

  if snapshot is null then
    raise exception 'The item you reported could not be found.';
  end if;
  new.target_snapshot := snapshot;
  return new;
end;
$$;

-- ── Privileges ───────────────────────────────────────────────────────────
revoke all on function
  private.is_course_member(uuid), private.has_completed(uuid),
  private.lesson_before_insert(), private.lesson_after_insert(),
  private.course_update_before_insert(), private.course_update_after_insert(),
  private.review_after_insert()
from public;
-- Policy helpers run as the signed-in student, like the existing ones.
grant execute on function private.is_course_member(uuid), private.has_completed(uuid) to authenticated;

revoke execute on function
  public.set_enrollment_completed(uuid, boolean),
  public.course_rating_summary(uuid[]),
  public.tutor_rating_summary(uuid)
from public, anon;
grant execute on function
  public.set_enrollment_completed(uuid, boolean),
  public.course_rating_summary(uuid[]),
  public.tutor_rating_summary(uuid)
to authenticated;
