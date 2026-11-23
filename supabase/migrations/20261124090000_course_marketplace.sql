-- Phase 4: course marketplace.
-- search_courses(): browse/search/filter in one query, run as the caller so
--   RLS (published only, blocks) applies.
-- set_course_skills(): owner-only replace of a course's skill tags.
-- Deleting a course notifies students with an active enrollment.

alter type public.notification_type add value if not exists 'course_removed';

-- ── Browse and search ────────────────────────────────────────────────────
-- Search matches the title/description (full text and partial words), skill
-- names and the tutor's name ("Search for courses or tutors").
create function public.search_courses(
  filter_text text default null,
  filter_university smallint default null,
  filter_price text default null,
  filter_category smallint default null,
  filter_level public.course_level default null,
  page_size integer default 12,
  page_offset integer default 0
)
returns table (
  id uuid,
  title text,
  description text,
  level public.course_level,
  price_php integer,
  created_at timestamptz,
  category_id smallint,
  category_name text,
  owner_id uuid,
  owner_name text,
  owner_username text,
  owner_avatar text,
  university_short text,
  skill_names text[],
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      nullif(btrim(left(filter_text, 100)), '') as term,
      '%' || replace(replace(replace(btrim(left(filter_text, 100)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  matches as (
    select c.*, p.display_name, p.username, p.avatar_path, p.university_id
    from public.courses c
    join public.profiles p on p.id = c.owner_id
    cross join input
    where c.status = 'published'
      and (filter_university is null or p.university_id = filter_university)
      and (filter_price is null
           or (filter_price = 'free' and c.price_php = 0)
           or (filter_price = 'paid' and c.price_php > 0))
      and (filter_category is null or c.category_id = filter_category)
      and (filter_level is null or c.level = filter_level)
      and (input.term is null
           or c.search @@ websearch_to_tsquery('simple', input.term)
           or c.title ilike input.pattern
           or p.display_name ilike input.pattern
           or exists (
             select 1 from public.course_skills cs
             join public.skills s on s.id = cs.skill_id
             where cs.course_id = c.id and s.name ilike input.pattern
           ))
  )
  select
    m.id, m.title, m.description, m.level, m.price_php, m.created_at,
    m.category_id, cat.name,
    m.owner_id, m.display_name, m.username, m.avatar_path, u.short_name,
    array(
      select s.name from public.course_skills cs
      join public.skills s on s.id = cs.skill_id
      where cs.course_id = m.id
      order by s.name
    ),
    count(*) over ()
  from matches m
  join public.categories cat on cat.id = m.category_id
  left join public.universities u on u.id = m.university_id
  order by m.created_at desc, m.id
  limit least(greatest(page_size, 1), 48)
  offset greatest(page_offset, 0);
$$;

revoke execute on function public.search_courses(text, smallint, text, smallint, public.course_level, integer, integer)
  from public, anon;
grant execute on function public.search_courses(text, smallint, text, smallint, public.course_level, integer, integer)
  to authenticated;

-- ── Course skill tags ────────────────────────────────────────────────────
-- Replaces the course's skills with the given names (max 10), creating
-- canonical skills when needed (same per-user cap as add_student_skill).
create function public.set_course_skills(target_course uuid, skill_names text[])
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

revoke execute on function public.set_course_skills(uuid, text[]) from public, anon;
grant execute on function public.set_course_skills(uuid, text[]) to authenticated;

-- ── Deleting a course tells its students ─────────────────────────────────
-- Only for a direct delete by the owner (trigger depth 1). When a whole
-- account is deleted the cascade runs deeper and stays silent, because the
-- owner's profile is being removed in the same statement.
create function private.course_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() = 1 then
    insert into public.notifications (recipient_id, actor_id, type, data)
    select e.student_id, old.owner_id, 'course_removed',
           jsonb_build_object('course_title', old.title)
    from public.course_enrollments e
    where e.course_id = old.id and e.status in ('requested', 'accepted');
  end if;
  return old;
end;
$$;

revoke all on function private.course_before_delete() from public;

create trigger courses_before_delete before delete on public.courses
  for each row execute function private.course_before_delete();
