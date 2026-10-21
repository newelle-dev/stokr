-- Migration: Prevent modifying staff email in auth.users

create or replace function public.prevent_staff_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_staff boolean;
begin
  -- Only evaluate when email is actually being updated to a different value
  if new.email is distinct from old.email then
    select exists (
      select 1
      from public.profiles
      where id = new.id
        and role = 'staff'
    ) into v_is_staff;

    if v_is_staff then
      raise exception 'Staff email cannot be modified.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_staff_email_change() from public, anon, authenticated;

drop trigger if exists trg_prevent_staff_email_change on auth.users;
create trigger trg_prevent_staff_email_change
before update of email on auth.users
for each row
execute function public.prevent_staff_email_change();
