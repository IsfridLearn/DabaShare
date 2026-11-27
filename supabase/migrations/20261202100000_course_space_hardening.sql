-- Course space hardening, from the security review of 20261202090000.
--
-- M1  Lesson places: no control characters or surrounding spaces. Any text is
--     a place; the app only renders strict https?:// values as links. (The old
--     scheme check could be bypassed with " javascript:" and rejected real
--     places like "Library: 2nd floor".)
-- M2  Completion notifications are deduplicated (no inbox flooding).
-- M3  A blocked student can't review the tutor's course, and the tutor is never
--     notified by someone in a block relationship. Review notifications are
--     deduplicated per course and reviewer.
-- M4  Completion needs real time on the course: at least one lesson that has
--     ended, or 7 days since the student was accepted. Tutors can mark at most
--     30 completions a day. This slows down "alt account" reviews.
-- L5  Lesson edits get the same time checks (future, at most 2 years ahead),
--     and members hear about changed times or places.
-- L6  A student who has reviewed can't be un-finished (so a review can't be
--     taken away), and the comment on has_completed is corrected.
-- L7  Indexes for the author foreign keys.

-- ── M1 ───────────────────────────────────────────────────────────────────
alter table public.course_lessons drop constraint course_lessons_location_check;
alter table public.course_lessons add constraint course_lessons_location_check check (
  location is null
  or (char_length(location) between 1 and 300
      and location = btrim(location)
      and location !~ '[[:cntrl:]]')
);

-- ── M3 + L6: completion helper ──────────────────────────────────────────
-- Finished the course and not in a block relationship with its tutor.
-- (Completion itself survives leaving or removal; see set_enrollment_completed.)
create or replace function private.has_completed(course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_enrollments e
    join public.courses c on c.id = e.course_id
    where e.course_id = course and e.student_id = auth.uid() and e.completed_at is not null
      and not private.is_blocked_between(c.owner_id, auth.uid())
  );
$$;

-- ── M2 + M4 + L6: marking completion ────────────────────────────────────
create or replace function public.set_enrollment_completed(target uuid, done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
begin
  select en.id, en.student_id, en.status, en.completed_at, en.decided_at, c.id as course_id, c.owner_id
  into e
  from public.course_enrollments en
  join public.courses c on c.id = en.course_id
  where en.id = target
  for update of en;

  if e.id is null or e.owner_id is distinct from auth.uid() then
    raise exception 'Enrollment not found.';
  end if;
  if e.status <> 'accepted' then
    raise exception 'Only enrolled students can be marked as finished.';
  end if;

  if done and e.completed_at is null then
    if not exists (
         select 1 from public.course_lessons l where l.course_id = e.course_id and l.ends_at <= now()
       )
       and coalesce(e.decided_at, now()) > now() - interval '7 days' then
      raise exception 'You can mark a student as finished after a lesson has taken place, or a week after they joined.';
    end if;
    if (select count(*) from public.course_enrollments x
        join public.courses c on c.id = x.course_id
        where c.owner_id = e.owner_id and x.completed_at > now() - interval '1 day') >= 30 then
      raise exception 'You''ve marked a lot of students as finished today. Try again tomorrow.';
    end if;
    update public.course_enrollments set completed_at = now() where id = target;
    delete from public.notifications n
    where n.recipient_id = e.student_id and n.read_at is null and n.type = 'course_completed'
      and n.data ->> 'course_id' = e.course_id::text;
    perform private.notify(e.student_id, 'course_completed', auth.uid(),
      jsonb_build_object('course_id', e.course_id));
  elsif not done and e.completed_at is not null then
    if exists (select 1 from public.course_reviews r
               where r.course_id = e.course_id and r.author_id = e.student_id) then
      raise exception 'This student has already reviewed the course, so they stay marked as finished.';
    end if;
    update public.course_enrollments set completed_at = null where id = target;
  end if;
end;
$$;

-- ── M3: review notifications ─────────────────────────────────────────────
create or replace function private.review_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tutor uuid;
begin
  select c.owner_id into tutor from public.courses c where c.id = new.course_id;
  if tutor is null or private.is_blocked_between(tutor, new.author_id) then
    return null;
  end if;
  delete from public.notifications n
  where n.recipient_id = tutor and n.read_at is null and n.type = 'review_received'
    and n.actor_id = new.author_id and n.data ->> 'course_id' = new.course_id::text;
  perform private.notify(tutor, 'review_received', new.author_id,
    jsonb_build_object('course_id', new.course_id, 'review_id', new.id, 'rating', new.rating));
  return null;
end;
$$;

-- ── L5: lesson time checks on insert and edit ────────────────────────────
create or replace function private.lesson_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at then
      if new.starts_at <= now() then
        raise exception 'Choose a start time in the future.';
      end if;
      if new.starts_at > now() + interval '2 years' then
        raise exception 'Choose a date within the next two years.';
      end if;
    end if;
    if tg_op = 'INSERT' and (select count(*) from public.course_lessons l
        where l.course_id = new.course_id and l.ends_at > now()) >= 50 then
      raise exception 'A course can have up to 50 upcoming lessons.';
    end if;
  end if;
  return new;
end;
$$;
create trigger course_lessons_before_update before update on public.course_lessons
  for each row execute function private.lesson_before_insert();

-- Changed time or place: tell members (same deduplicated notification).
create or replace function private.lesson_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tutor uuid;
  student uuid;
begin
  if tg_op = 'UPDATE'
     and new.starts_at is not distinct from old.starts_at
     and new.ends_at is not distinct from old.ends_at
     and new.location is not distinct from old.location then
    return null;
  end if;
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
create trigger course_lessons_after_update after update on public.course_lessons
  for each row execute function private.lesson_after_insert();

-- ── L7 ───────────────────────────────────────────────────────────────────
create index course_updates_author_idx on public.course_updates (author_id);
create index course_reviews_author_idx on public.course_reviews (author_id);
