-- When the last member of a conversation is removed (e.g. both students
-- deleted their accounts), delete the now-empty conversation row too.
create function private.conversation_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.conversations c
  where c.id = old.conversation_id
    and not exists (select 1 from public.conversation_members m where m.conversation_id = old.conversation_id);
  return null;
end;
$$;

revoke all on function private.conversation_cleanup() from public;

create trigger conversation_members_cleanup after delete on public.conversation_members
  for each row execute function private.conversation_cleanup();

-- Remove conversations already left empty.
delete from public.conversations c
where not exists (select 1 from public.conversation_members m where m.conversation_id = c.id);
