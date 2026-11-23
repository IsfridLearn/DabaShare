-- Account deletion (Data Privacy Act: right to erasure).
-- Deletes the caller's auth user; everything owned by the profile cascades
-- (profile, skills, courses, enrollments, messages, sessions, notifications,
-- blocks). Reports they filed keep the evidence with reporter_id set to null.
-- Avatar files must be removed through the Storage API first (the app does
-- this), because Supabase does not allow deleting storage objects in SQL.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Sign in to delete your account.';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
