-- session_participants.status is always set by the before-insert trigger
-- (and clients may not supply it: no insert grant on the column). A default
-- makes that explicit, so inserts only need session_id and profile_id.
alter table public.session_participants alter column status set default 'requested';
