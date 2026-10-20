-- Migration: 20261020084000_profile_id_immutable.sql
-- Description: Enforce that profiles.id cannot be changed on UPDATE

create or replace function public.validate_profile_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_active_owners integer;
begin
  -- Invariant: profiles.id cannot be changed
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'id cannot be changed.';
  end if;

  -- Invariant: shop_id cannot be changed once assigned
  if tg_op = 'UPDATE' and new.shop_id is distinct from old.shop_id then
    raise exception 'shop_id cannot be changed.';
  end if;

  -- Invariant: branch_id must belong to the same shop as the profile
  if new.branch_id is not null then
    if not exists (
      select 1 from public.branches
      where id = new.branch_id
        and shop_id = new.shop_id
    ) then
      raise exception 'branch_id does not belong to the same shop as the profile.';
    end if;
  end if;

  -- Business Invariant: Cannot deactivate or demote the last active owner of a shop
  if tg_op = 'UPDATE' and old.role = 'owner' and old.is_active = true and (new.role <> 'owner' or new.is_active = false) then
    select count(*)
    into v_other_active_owners
    from public.profiles
    where shop_id = old.shop_id
      and role = 'owner'
      and is_active = true
      and id <> old.id;

    if v_other_active_owners = 0 then
      raise exception 'Cannot deactivate or demote the last active owner of a shop.';
    end if;
  end if;

  return new;
end;
$$;
