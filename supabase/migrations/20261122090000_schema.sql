-- DabaShare core schema: types, tables, constraints, indexes, privileges.
-- RLS policies: 20261122090100. Triggers and RPCs: 20261122090200.
-- See docs/DATABASE.md for the model and docs/SECURITY.md for the rules.

-- Internal helpers live in `private`, which PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Canonical skill slug: "C++" -> "cplusplus", "Web Dev" -> "web-dev", "Español" -> "espanol".
create function private.slugify(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    replace(replace(translate(lower(btrim(value)), 'áéíóúñü', 'aeiounu'), '+', 'plus'), '#', 'sharp'),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- ── Types ────────────────────────────────────────────────────────────────
create type public.skill_kind as enum ('teach', 'learn');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced', 'expert');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.request_status as enum ('requested', 'accepted', 'declined', 'cancelled');
create type public.session_type as enum ('webinar', 'study_group', 'qa');
create type public.session_status as enum ('scheduled', 'cancelled');
create type public.participant_status as enum ('invited', 'requested', 'accepted', 'declined', 'cancelled');
create type public.notification_type as enum (
  'new_message',
  'enrollment_created',
  'enrollment_updated',
  'session_invitation',
  'session_request',
  'session_joined',
  'participation_updated',
  'session_updated',
  'session_cancelled'
);
create type public.report_target as enum ('profile', 'course', 'message', 'session');
create type public.report_reason as enum ('spam', 'harassment', 'inappropriate', 'scam', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ── Reference data ───────────────────────────────────────────────────────
create table public.universities (
  id smallint generated always as identity primary key,
  name text not null unique,
  short_name text not null unique,
  sort_order smallint not null default 100
);

create table public.categories (
  id smallint generated always as identity primary key,
  slug text not null unique,
  name text not null unique,
  sort_order smallint not null default 100
);

-- ── Profiles and skills ──────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  avatar_path text check (char_length(avatar_path) <= 300),
  university_id smallint references public.universities (id),
  program text check (char_length(program) <= 100),
  bio text check (char_length(bio) <= 500),
  discoverable boolean not null default true,
  is_admin boolean not null default false,
  accepted_terms_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_onboarding_complete
    check (onboarded_at is null or (username is not null and university_id is not null))
);
create index profiles_university_idx on public.profiles (university_id);

create table public.skills (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  slug text not null unique generated always as (private.slugify(name)) stored,
  category_id smallint references public.categories (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint skills_slug_not_empty check (char_length(slug) > 0)
);

create table public.student_skills (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete cascade,
  kind public.skill_kind not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id, kind)
);
create index student_skills_skill_idx on public.student_skills (skill_id, kind);

-- Learning interests = categories a student cares about (used by matching).
create table public.profile_interests (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category_id smallint not null references public.categories (id) on delete cascade,
  primary key (profile_id, category_id)
);
create index profile_interests_category_idx on public.profile_interests (category_id);

-- ── Courses ──────────────────────────────────────────────────────────────
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null check (char_length(btrim(description)) between 10 and 5000),
  category_id smallint not null references public.categories (id),
  level public.course_level not null,
  price_php integer not null default 0 check (price_php between 0 and 100000),
  status public.course_status not null default 'published',
  search tsvector generated always as (to_tsvector('simple', title || ' ' || description)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_owner_idx on public.courses (owner_id);
create index courses_category_idx on public.courses (category_id);
create index courses_published_idx on public.courses (created_at desc) where status = 'published';
create index courses_search_idx on public.courses using gin (search);

create table public.course_skills (
  course_id uuid not null references public.courses (id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete cascade,
  primary key (course_id, skill_id)
);
create index course_skills_skill_idx on public.course_skills (skill_id);

create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'requested',
  note text check (char_length(note) <= 500),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);
create index course_enrollments_student_idx on public.course_enrollments (student_id);

-- ── Messaging ────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  -- '<smaller uuid>:<larger uuid>' for one-to-one conversations; guarantees one per pair.
  direct_key text unique,
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);
create index conversation_members_profile_idx on public.conversation_members (profile_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- ── Study sessions and webinars ──────────────────────────────────────────
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  type public.session_type not null,
  category_id smallint references public.categories (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity between 1 and 500),
  requires_approval boolean not null default false,
  status public.session_status not null default 'scheduled',
  accepted_count integer not null default 0 check (accepted_count >= 0),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_valid_time
    check (ends_at > starts_at and ends_at <= starts_at + interval '12 hours'),
  constraint study_sessions_within_capacity check (accepted_count <= capacity)
);
create index study_sessions_host_idx on public.study_sessions (host_id);
create index study_sessions_upcoming_idx on public.study_sessions (starts_at) where status = 'scheduled';

-- Meeting links live in their own table so RLS can hide them from everyone
-- except the host and accepted participants.
create table public.study_session_links (
  session_id uuid primary key references public.study_sessions (id) on delete cascade,
  meeting_url text not null
    check (meeting_url ~ '^https://[^[:space:]]+$' and char_length(meeting_url) <= 500),
  updated_at timestamptz not null default now()
);

create table public.session_participants (
  session_id uuid not null references public.study_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status public.participant_status not null,
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (session_id, profile_id)
);
create index session_participants_profile_idx on public.session_participants (profile_id);

-- ── Notifications ────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type public.notification_type not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

-- ── Safety: blocks and reports ───────────────────────────────────────────
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text check (char_length(details) <= 1000),
  -- Copy of the reported content at report time, so moderators can review it
  -- even if it is edited or deleted, without needing access to private data.
  target_snapshot jsonb not null default '{}'::jsonb,
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_open_idx on public.reports (created_at) where status in ('open', 'reviewing');

-- ── Privileges ───────────────────────────────────────────────────────────
-- Supabase grants everything to anon/authenticated by default; RLS is the main
-- guard, and these grants narrow what each role can even attempt.
revoke all on all tables in schema public from anon;
grant select on public.universities, public.categories to anon;

revoke truncate, references, trigger on all tables in schema public from authenticated;

-- Updates are limited to the columns users are meant to change.
revoke update on all tables in schema public from authenticated;
grant update (username, display_name, avatar_path, university_id, program, bio, discoverable, onboarded_at)
  on public.profiles to authenticated;
grant update (title, description, category_id, level, price_php, status)
  on public.courses to authenticated;
grant update (status) on public.course_enrollments to authenticated;
grant update (last_read_at) on public.conversation_members to authenticated;
grant update (title, description, type, category_id, starts_at, ends_at, capacity, requires_approval, status)
  on public.study_sessions to authenticated;
grant update (meeting_url) on public.study_session_links to authenticated;
grant update (status) on public.session_participants to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant update (status) on public.reports to authenticated;
