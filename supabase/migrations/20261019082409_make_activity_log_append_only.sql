-- Migration: make_activity_log_append_only
-- Enforces append-only invariant on activity_log (audit trail).
-- Prohibits UPDATE, DELETE, and TRUNCATE via database triggers and role privilege revocations.

-- 1. Trigger function to reject mutations
create or replace function public.prevent_activity_log_modification()
returns trigger
language plpgsql
as $$
begin
  raise exception 'activity_log is an append-only audit trail: updates, deletes, and truncates are prohibited.';
end;
$$;

-- 2. Row-level trigger blocking UPDATE and DELETE
drop trigger if exists tr_prevent_activity_log_mutation on public.activity_log;
create trigger tr_prevent_activity_log_mutation
before update or delete on public.activity_log
for each row
execute function public.prevent_activity_log_modification();

-- 3. Statement-level trigger blocking TRUNCATE
drop trigger if exists tr_prevent_activity_log_truncate on public.activity_log;
create trigger tr_prevent_activity_log_truncate
before truncate on public.activity_log
for each statement
execute function public.prevent_activity_log_modification();

-- 4. Defense-in-depth: Revoke mutation privileges from authenticated and anon
revoke update, delete, truncate on public.activity_log from authenticated, anon;
