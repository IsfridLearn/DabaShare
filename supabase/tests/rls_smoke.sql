-- RLS and business-rule smoke test against a real Supabase database.
--
--   npm run db:test:rls      (runs against the LINKED project; use dev only)
--
-- Everything runs inside one DO block that ends by raising an exception with
-- the results, so every fixture (users, courses, messages...) is rolled back.
-- Expected output: an error whose message lists PASS/FAIL lines and ends with
-- "SUMMARY: N passed, 0 failed".
--
-- Users are impersonated exactly as PostgREST does it: role `authenticated`
-- plus request.jwt.claims.sub.

do $test$
declare
  admin_role text := current_user;
  a uuid := gen_random_uuid();   -- Alice, onboarded
  b uuid := gen_random_uuid();   -- Bob, onboarded
  c uuid := gen_random_uuid();   -- Carol, NOT onboarded
  d uuid := gen_random_uuid();   -- Dave, onboarded
  e uuid := gen_random_uuid();   -- Erin, onboarded
  r text[] := '{}';
  n integer;
  v_text text;
  v_bigint bigint;
  v_uuid uuid;
  course_free uuid;
  course_paid uuid;
  enr uuid;
  conv uuid;
  conv2 uuid;
  msg uuid;
  sess uuid;
  passed integer;
  failed integer;
begin
  -- ── Fixtures (as admin) ────────────────────────────────────────────────
  insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  values
    ('00000000-0000-0000-0000-000000000000', a, 'authenticated', 'authenticated', 'rls-a@test.invalid',
     '{"display_name":"Alice","university_id":"1","accepted_terms":"true"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', b, 'authenticated', 'authenticated', 'rls-b@test.invalid',
     '{"display_name":"Bob","university_id":"2","accepted_terms":"true"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', c, 'authenticated', 'authenticated', 'rls-c@test.invalid',
     '{}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', d, 'authenticated', 'authenticated', 'rls-d@test.invalid',
     '{"display_name":"Dave"}', '{}', now(), now()),
    ('00000000-0000-0000-0000-000000000000', e, 'authenticated', 'authenticated', 'rls-e@test.invalid',
     '{"display_name":"Erin"}', '{}', now(), now());

  select count(*) into n from public.profiles where id in (a, b, c, d, e);
  r := r || (case when n = 5 then 'PASS' else 'FAIL' end || ' signup trigger creates profiles (' || n || '/5)');
  select count(*) into n from private.accounts where profile_id in (a, b) and accepted_terms_at is not null;
  r := r || (case when n = 2 then 'PASS' else 'FAIL' end || ' signup records terms consent privately');
  select display_name into v_text from public.profiles where id = c;
  r := r || (case when v_text = 'rls-c' then 'PASS' else 'FAIL' end || ' display name falls back to email prefix (' || coalesce(v_text, 'null') || ')');

  update public.profiles
  set username = 'rls_' || substr(replace(id::text, '-', ''), 1, 8),
      university_id = coalesce(university_id, 1),
      onboarded_at = now()
  where id in (a, b, d, e);

  -- ── Profiles ───────────────────────────────────────────────────────────
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  select count(*) into n from public.profiles where id in (a, b, c);
  r := r || (case when n = 2 then 'PASS' else 'FAIL' end || ' A sees self + onboarded B, not un-onboarded C (' || n || ')');

  update public.profiles set bio = 'hacked' where id = b;
  get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' A cannot update B''s profile');

  begin
    perform 1 from private.accounts;
    r := r || 'FAIL A can read private.accounts'::text;
  exception when others then
    r := r || ('PASS A cannot read private.accounts (' || sqlerrm || ')');
  end;

  begin
    update public.profiles set avatar_path = b::text || '/x.png' where id = a;
    r := r || 'FAIL A can point avatar at B''s folder'::text;
  exception when others then
    r := r || ('PASS avatar path must be in own folder (' || sqlerrm || ')');
  end;

  update public.profiles set avatar_path = a::text || '/avatar-1.webp' where id = a;
  get diagnostics n = row_count;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' A can set own avatar path');

  -- ── Skills ─────────────────────────────────────────────────────────────
  v_bigint := public.add_student_skill('  python ', 'teach');
  r := r || (case when v_bigint = (select id from public.skills where slug = 'python') then 'PASS' else 'FAIL' end
             || ' add_student_skill reuses canonical "Python"');
  v_bigint := public.add_student_skill('c++', 'learn');
  r := r || (case when v_bigint = (select id from public.skills where slug = 'cplusplus') then 'PASS' else 'FAIL' end
             || ' "c++" maps to canonical C++');

  begin
    insert into public.skills (name) values ('Direct Insert');
    r := r || 'FAIL A can insert skills directly'::text;
  exception when others then
    r := r || ('PASS no direct skill inserts (' || sqlerrm || ')');
  end;

  -- ── Courses ────────────────────────────────────────────────────────────
  insert into public.courses (owner_id, title, description, category_id, level, price_php)
  values (a, 'Intro to Python', 'Learn Python basics step by step.', 1, 'beginner', 0)
  returning id into course_free;
  r := r || (case when course_free is not null then 'PASS' else 'FAIL' end || ' A creates a free course');

  begin
    insert into public.courses (owner_id, title, description, category_id, level, created_at)
    values (a, 'Backdated', 'Trying to set created_at.', 1, 'beginner', '2999-01-01');
    r := r || 'FAIL client can set courses.created_at'::text;
  exception when others then
    r := r || ('PASS client cannot set created_at (' || sqlerrm || ')');
  end;

  begin
    insert into public.courses (owner_id, title, description, category_id, level)
    values (b, 'Impersonation', 'Course owned by someone else.', 1, 'beginner');
    r := r || 'FAIL A can create a course owned by B'::text;
  exception when others then
    r := r || ('PASS A cannot create a course as B (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.courses (owner_id, title, description, category_id, level, price_php)
  values (b, 'Accounting 101', 'Journal entries and ledgers.', 5, 'expert', 250)
  returning id into course_paid;

  update public.courses set title = 'Taken over' where id = course_free;
  get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' B cannot edit A''s course');

  begin
    update public.courses set owner_id = b where id = course_paid;
    r := r || 'FAIL owner_id is updatable'::text;
  exception when others then
    r := r || ('PASS owner_id cannot be changed (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  begin
    insert into public.courses (owner_id, title, description, category_id, level)
    values (c, 'Not onboarded', 'Should not be allowed yet.', 1, 'beginner');
    r := r || 'FAIL un-onboarded C can create a course'::text;
  exception when others then
    r := r || ('PASS un-onboarded C cannot create a course (' || sqlerrm || ')');
  end;
  begin
    insert into public.course_enrollments (course_id, student_id) values (course_free, c);
    r := r || 'FAIL un-onboarded C can enroll'::text;
  exception when others then
    r := r || ('PASS un-onboarded C cannot enroll (' || sqlerrm || ')');
  end;

  -- ── Enrollments ────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.course_enrollments (course_id, student_id) values (course_free, b);
  select status::text into v_text from public.course_enrollments where course_id = course_free and student_id = b;
  r := r || (case when v_text = 'accepted' then 'PASS' else 'FAIL' end || ' free course enrollment auto-accepted (' || coalesce(v_text, 'null') || ')');

  begin
    insert into public.course_enrollments (course_id, student_id) values (course_paid, b);
    r := r || 'FAIL B can enroll in own course'::text;
  exception when others then
    r := r || ('PASS cannot enroll in own course (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  insert into public.course_enrollments (course_id, student_id) values (course_paid, a) returning id into enr;
  select status::text into v_text from public.course_enrollments where id = enr;
  r := r || (case when v_text = 'requested' then 'PASS' else 'FAIL' end || ' paid course enrollment is a request (' || coalesce(v_text, 'null') || ')');

  begin
    update public.course_enrollments set status = 'accepted' where id = enr;
    r := r || 'FAIL student can accept own request'::text;
  exception when others then
    r := r || ('PASS student cannot accept own request (' || sqlerrm || ')');
  end;

  begin
    insert into public.course_enrollments (course_id, student_id) values (course_paid, a);
    r := r || 'FAIL duplicate enrollment allowed'::text;
  exception when others then
    r := r || ('PASS duplicate enrollment rejected (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where recipient_id = b and type = 'enrollment_created';
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' owner B notified of A''s request (' || n || ')');
  update public.course_enrollments set status = 'accepted' where id = enr;
  select status::text into v_text from public.course_enrollments where id = enr;
  r := r || (case when v_text = 'accepted' then 'PASS' else 'FAIL' end || ' owner accepts request');

  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.course_enrollments where id = enr;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' outsider D cannot see the enrollment');
  select count(*) into n from public.notifications where recipient_id in (a, b);
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' outsider D cannot see others'' notifications');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where recipient_id = a and type = 'enrollment_updated';
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' student A notified of acceptance (' || n || ')');

  -- ── Messaging ──────────────────────────────────────────────────────────
  conv := public.start_direct_conversation(b);
  conv2 := public.start_direct_conversation(b);
  r := r || (case when conv = conv2 then 'PASS' else 'FAIL' end || ' one conversation per pair');

  insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'Hi Bob!') returning id into msg;
  insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'Are you free tomorrow?');

  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, b, 'Forged');
    r := r || 'FAIL A can send as B'::text;
  exception when others then
    r := r || ('PASS A cannot send as B (' || sqlerrm || ')');
  end;

  begin
    insert into public.messages (conversation_id, sender_id, body, created_at) values (conv, a, 'Pinned', '2999-01-01');
    r := r || 'FAIL client can set messages.created_at'::text;
  exception when others then
    r := r || ('PASS client cannot set message timestamps (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where conversation_id = conv;
  r := r || (case when n = 2 then 'PASS' else 'FAIL' end || ' B reads both messages (' || n || ')');
  select count(*) into n from public.notifications where recipient_id = b and type = 'new_message';
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' one unread new_message notification for 2 messages (' || n || ')');

  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages where conversation_id = conv;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' outsider D cannot read the conversation');
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, d, 'Intruding');
    r := r || 'FAIL outsider D can post into the conversation'::text;
  exception when others then
    r := r || ('PASS outsider D cannot post (' || sqlerrm || ')');
  end;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (d, 'message', msg, 'spam');
    r := r || 'FAIL outsider can report (and snapshot) a private message'::text;
  exception when others then
    r := r || ('PASS outsider cannot report a private message (' || sqlerrm || ')');
  end;

  -- ── Reports ────────────────────────────────────────────────────────────
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  insert into public.reports (reporter_id, target_type, target_id, reason) values (b, 'message', msg, 'spam');
  select target_snapshot ->> 'body' into v_text from public.reports where reporter_id = b and target_id = msg;
  r := r || (case when v_text = 'Hi Bob!' then 'PASS' else 'FAIL' end || ' member report snapshots the message');

  -- ── Blocks ─────────────────────────────────────────────────────────────
  insert into public.blocks (blocker_id, blocked_id) values (b, a);
  select status::text into v_text from public.course_enrollments where id = enr;
  r := r || (case when v_text = 'cancelled' then 'PASS' else 'FAIL' end || ' blocking cancels the pair''s enrollment (' || coalesce(v_text, 'null') || ')');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.profiles where id = b;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' blocked A cannot see B''s profile');
  select count(*) into n from public.courses where id = course_paid;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' blocked A cannot see B''s course');
  select count(*) into n from public.blocks;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' A cannot see that B blocked them');
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, a, 'Still there?');
    r := r || 'FAIL blocked A can still message B'::text;
  exception when others then
    r := r || ('PASS blocked A cannot message B (' || sqlerrm || ')');
  end;
  begin
    update public.course_enrollments set status = 'requested' where id = enr;
    get diagnostics n = row_count;
    r := r || (case when n = 0 then 'PASS blocked A cannot re-request (row hidden)' else 'FAIL blocked A re-requested enrollment' end);
  exception when others then
    r := r || ('PASS blocked A cannot re-request (' || sqlerrm || ')');
  end;
  begin
    perform public.start_direct_conversation(b);
    r := r || 'FAIL blocked A can start a conversation'::text;
  exception when others then
    r := r || ('PASS blocked A gets generic not-found (' || sqlerrm || ')');
  end;
  begin
    insert into public.reports (reporter_id, target_type, target_id, reason) values (a, 'profile', b, 'other');
    r := r || 'FAIL blocked A can snapshot B''s profile via a report'::text;
  exception when others then
    r := r || ('PASS blocked A cannot report-snapshot B (' || sqlerrm || ')');
  end;

  -- ── Study sessions ─────────────────────────────────────────────────────
  begin
    insert into public.study_sessions (host_id, title, type, starts_at, ends_at, capacity)
    values (a, 'Past session', 'study_group', now() - interval '1 hour', now() + interval '1 hour', 5);
    r := r || 'FAIL a session can start in the past'::text;
  exception when others then
    r := r || ('PASS past start rejected (' || sqlerrm || ')');
  end;

  insert into public.study_sessions (host_id, title, type, starts_at, ends_at, capacity)
  values (a, 'Calculus finals prep', 'study_group', now() + interval '1 day', now() + interval '1 day 2 hours', 1)
  returning id into sess;
  insert into public.study_session_links (session_id, meeting_url) values (sess, 'https://meet.example.com/abc');

  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  insert into public.session_participants (session_id, profile_id) values (sess, d);
  select status::text into v_text from public.session_participants where session_id = sess and profile_id = d;
  r := r || (case when v_text = 'accepted' then 'PASS' else 'FAIL' end || ' D joins open session');
  select count(*) into n from public.study_session_links where session_id = sess;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' accepted D sees meeting link');
  update public.study_sessions set title = 'Hijacked' where id = sess;
  get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' participant D cannot edit the session');
  begin
    update public.study_sessions set accepted_count = 0 where id = sess;
    r := r || 'FAIL accepted_count is client-writable'::text;
  exception when others then
    r := r || ('PASS accepted_count not writable (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  begin
    insert into public.session_participants (session_id, profile_id) values (sess, e);
    r := r || 'FAIL session over capacity'::text;
  exception when others then
    r := r || ('PASS full session rejects E (' || sqlerrm || ')');
  end;
  select count(*) into n from public.study_session_links where session_id = sess;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' non-participant E cannot see meeting link');

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select accepted_count into n from public.study_sessions where id = sess;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' accepted_count tracks joins (' || n || ')');
  update public.study_sessions set status = 'cancelled' where id = sess;

  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where recipient_id = d and type = 'session_cancelled';
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' participant D notified of cancellation (' || n || ')');
  begin
    update public.session_participants set status = 'cancelled' where session_id = sess and profile_id = d;
    r := r || 'FAIL participation changed after session cancelled'::text;
  exception when others then
    r := r || ('PASS cancelled session is closed (' || sqlerrm || ')');
  end;

  -- ── Phase 4: marketplace search, course skills, course deletion ───────
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.set_course_skills(course_free, array['Python', ' react ', 'python']);
  select count(*) into n from public.course_skills where course_id = course_free;
  r := r || (case when n = 2 then 'PASS' else 'FAIL' end || ' set_course_skills dedupes canonical skills (' || n || ')');
  begin
    perform public.set_course_skills(course_paid, array['Hijack']);
    r := r || 'FAIL A can tag B''s course'::text;
  exception when others then
    r := r || ('PASS only owners tag courses (' || sqlerrm || ')');
  end;
  begin
    perform public.set_course_skills(course_free, array['Python','Java','SQL','React','Calculus','Algebra','Physics','Chemistry','Biology','Economics','Guitar']);
    r := r || 'FAIL more than 10 course skills allowed'::text;
  exception when others then
    r := r || ('PASS course skills capped at 10 (' || sqlerrm || ')');
  end;
  insert into public.courses (owner_id, title, description, category_id, level, status)
  values (a, 'Hidden Draft', 'Not ready to publish yet.', 1, 'beginner', 'draft');
  select count(*) into n from public.search_courses() where id = course_paid;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' search hides courses of someone who blocked you');

  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.search_courses() where id = course_free or id = course_paid;
  r := r || (case when n = 2 then 'PASS' else 'FAIL' end || ' search lists published courses (' || n || ')');
  select count(*) into n from public.search_courses() where title = 'Hidden Draft';
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' search hides drafts');
  select count(*) into n from public.search_courses(filter_text => 'react') where id = course_free;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' search matches skill names');
  select count(*) into n from public.search_courses(filter_text => 'alic') where id = course_free;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' search matches partial tutor name');
  select count(*) into n from public.search_courses(filter_text => '100%_off') where true;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' LIKE wildcards in search are escaped');
  select count(*) into n from public.search_courses(filter_price => 'paid') where id in (course_free, course_paid);
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' price filter (paid)');
  select count(*) into n from public.search_courses(filter_level => 'expert') where id = course_paid;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' level filter');
  select count(*) into n from public.search_courses(filter_university => 2::smallint) where id in (course_free, course_paid);
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' university filter uses the tutor''s university');

  insert into public.course_enrollments (course_id, student_id) values (course_free, d);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  delete from public.courses where id = course_free;
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.notifications where recipient_id = d and type = 'course_removed';
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' enrolled student notified when a course is deleted (' || n || ')');

  -- ── Phase 3: onboarding, interests, skills, account deletion ───────────
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  begin
    update public.profiles set onboarded_at = now() where id = c;
    r := r || 'FAIL onboarding without username allowed'::text;
  exception when others then
    r := r || ('PASS onboarding needs username + university (' || sqlerrm || ')');
  end;
  begin
    update public.profiles set username = (select username from public.profiles where id = d) where id = c;
    r := r || 'FAIL duplicate username allowed'::text;
  exception when others then
    r := r || ('PASS usernames are unique (' || sqlerrm || ')');
  end;
  update public.profiles
  set username = 'rls_carol', university_id = 1, program = 'BS Nursing', onboarded_at = now()
  where id = c;
  get diagnostics n = row_count;
  r := r || (case when n = 1 then 'PASS' else 'FAIL' end || ' C completes onboarding');

  insert into public.profile_interests (profile_id, category_id) values (c, 1), (c, 2);
  begin
    insert into public.profile_interests (profile_id, category_id) values (d, 3);
    r := r || 'FAIL C can add interests to D'::text;
  exception when others then
    r := r || ('PASS C cannot add interests to D (' || sqlerrm || ')');
  end;

  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
  select count(*) into n from public.profile_interests where profile_id = c;
  r := r || (case when n = 2 then 'PASS' else 'FAIL' end || ' D sees C''s interests (' || n || ')');
  delete from public.profile_interests where profile_id = c;
  get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' D cannot delete C''s interests');
  delete from public.student_skills where profile_id = a;
  get diagnostics n = row_count;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' D cannot delete A''s skills');

  perform set_config('request.jwt.claims', json_build_object('sub', e, 'role', 'authenticated')::text, true);
  perform public.delete_my_account();
  perform set_config('role', admin_role, true);
  select count(*) into n from auth.users where id in (a, b, c, d, e);
  r := r || (case when n = 4 then 'PASS' else 'FAIL' end || ' delete_my_account removes only the caller (' || n || ' left)');
  select count(*) into n from public.profiles where id = e;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' deleted user''s profile cascades');
  select count(*) into n from private.accounts where profile_id = e;
  r := r || (case when n = 0 then 'PASS' else 'FAIL' end || ' deleted user''s private account row cascades');

  -- ── Result (always roll back) ──────────────────────────────────────────
  perform set_config('role', admin_role, true);
  select count(*) filter (where x like 'PASS%'), count(*) filter (where x like 'FAIL%')
  into passed, failed from unnest(r) as x;
  -- Hosted error messages are truncated at ~1 KB, so only failures are listed.
  raise exception E'RLS SMOKE TEST (rolled back) SUMMARY: % passed, % failed\n%',
    passed, failed,
    coalesce((select string_agg(x, E'\n') from unnest(r) as x where x like 'FAIL%'), 'no failures');
end;
$test$;
