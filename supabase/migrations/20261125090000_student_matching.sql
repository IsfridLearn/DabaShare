-- Phase 5: student matching.
-- suggest_matches() ranks other students for the caller and returns the
-- reasons, so every suggestion is explainable. It runs as the caller
-- (security invoker): RLS already hides unfinished profiles and anyone in a
-- block relationship; non-discoverable students are excluded here.
--
-- Score:
--   3 per skill they teach that you want to learn
--   3 per skill they want to learn that you teach
--   2 bonus when both directions match (a real skill swap)
--   1 per shared learning interest
--   1 per category of their published courses that you're interested in
--   1 for the same university
-- A suggestion needs at least one skill, interest or course-category overlap;
-- the same university alone is not a match.
create function public.suggest_matches(
  filter_mode text default null,
  same_university_only boolean default false,
  page_size integer default 20,
  page_offset integer default 0
)
returns table (
  profile_id uuid,
  display_name text,
  username text,
  avatar_path text,
  program text,
  university_short text,
  same_university boolean,
  teaches_you text[],
  learns_from_you text[],
  shared_interests text[],
  course_categories text[],
  published_courses integer,
  score integer,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select p.id, p.university_id
    from public.profiles p
    where p.id = auth.uid() and p.onboarded_at is not null
  ),
  my_learn as (
    select ss.skill_id from public.student_skills ss join me on ss.profile_id = me.id where ss.kind = 'learn'
  ),
  my_teach as (
    select ss.skill_id from public.student_skills ss join me on ss.profile_id = me.id where ss.kind = 'teach'
  ),
  my_interests as (
    select pi.category_id from public.profile_interests pi join me on pi.profile_id = me.id
  ),
  candidates as (
    select
      p.id,
      p.display_name,
      p.username,
      p.avatar_path,
      p.program,
      p.university_id,
      coalesce(p.university_id = me.university_id, false) as same_uni,
      array(
        select s.name from public.student_skills ss
        join public.skills s on s.id = ss.skill_id
        where ss.profile_id = p.id and ss.kind = 'teach' and ss.skill_id in (select skill_id from my_learn)
        order by s.name
      ) as teaches,
      array(
        select s.name from public.student_skills ss
        join public.skills s on s.id = ss.skill_id
        where ss.profile_id = p.id and ss.kind = 'learn' and ss.skill_id in (select skill_id from my_teach)
        order by s.name
      ) as learns,
      array(
        select c.name from public.profile_interests pi
        join public.categories c on c.id = pi.category_id
        where pi.profile_id = p.id and pi.category_id in (select category_id from my_interests)
        order by c.sort_order, c.name
      ) as interests,
      array(
        select distinct c.name from public.courses co
        join public.categories c on c.id = co.category_id
        where co.owner_id = p.id and co.status = 'published'
          and co.category_id in (select category_id from my_interests)
      ) as course_cats,
      (select count(*)::integer from public.courses co where co.owner_id = p.id and co.status = 'published') as courses
    from public.profiles p
    cross join me
    where p.id <> me.id
      and p.onboarded_at is not null
      and p.discoverable
  ),
  scored as (
    select
      c.*,
      3 * cardinality(c.teaches)
        + 3 * cardinality(c.learns)
        + case when cardinality(c.teaches) > 0 and cardinality(c.learns) > 0 then 2 else 0 end
        + cardinality(c.interests)
        + cardinality(c.course_cats)
        + case when c.same_uni then 1 else 0 end as points
    from candidates c
    where cardinality(c.teaches) + cardinality(c.learns) + cardinality(c.interests) + cardinality(c.course_cats) > 0
      and (filter_mode is null
           or (filter_mode = 'teaches_me' and cardinality(c.teaches) > 0)
           or (filter_mode = 'learns_from_me' and cardinality(c.learns) > 0))
      and (not coalesce(same_university_only, false) or c.same_uni)
  )
  select
    s.id, s.display_name, s.username, s.avatar_path, s.program, u.short_name, s.same_uni,
    s.teaches, s.learns, s.interests, s.course_cats, s.courses, s.points,
    count(*) over ()
  from scored s
  left join public.universities u on u.id = s.university_id
  order by s.points desc, cardinality(s.teaches) desc, s.display_name, s.id
  limit least(greatest(page_size, 1), 50)
  offset greatest(page_offset, 0);
$$;

revoke execute on function public.suggest_matches(text, boolean, integer, integer) from public, anon;
grant execute on function public.suggest_matches(text, boolean, integer, integer) to authenticated;
