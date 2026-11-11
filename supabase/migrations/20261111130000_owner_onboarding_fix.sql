-- Unit 10 follow-up to 20261111120000_owner_onboarding.
-- 1. Narrow exception in validate_profile_mutation: an owner profile may be inserted only
--    by create_shop_for_new_owner, for the signed-in user's own id. Every other owner
--    creation stays blocked. Owner-approved 2026-11-11.
-- 2. create_shop_for_new_owner: owner profile is inserted with the flag set; branch and
--    product activity is logged by the existing triggers, so explicit log inserts are removed.

create or replace function public.validate_profile_mutation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_other_active_owners integer;
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'id cannot be changed.';
  end if;

  if tg_op = 'UPDATE' and new.shop_id is distinct from old.shop_id then
    raise exception 'shop_id cannot be changed.';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'role cannot be changed.';
  end if;

  if tg_op = 'UPDATE' and new.username is distinct from old.username then
    raise exception 'username cannot be changed.';
  end if;

  if tg_op = 'INSERT' and not public.request_is_maintenance_mode() and new.role <> 'staff'
     and not (
       new.role = 'owner'
       and new.id = auth.uid()
       and coalesce(nullif(current_setting('stokr.allow_owner_onboarding', true), ''), 'false') = 'true'
     ) then
    raise exception 'Only staff profiles can be created through the application.';
  end if;

  if new.role = 'staff' and new.branch_id is null then
    raise exception 'Staff profiles require a branch assignment.';
  end if;

  -- Invariant: App-created staff profiles must have must_change_password = true
  if tg_op = 'INSERT' and not public.request_is_maintenance_mode() and new.role = 'staff' and new.must_change_password is not true then
    raise exception 'App-created staff profiles must have must_change_password = true.';
  end if;

  -- Invariant: must_change_password can only be true when role = 'staff'
  if new.must_change_password = true and new.role <> 'staff' then
    raise exception 'must_change_password can only be true for staff profiles.';
  end if;

  -- Invariant: must_change_password cannot be modified directly
  if tg_op = 'UPDATE' and new.must_change_password is distinct from old.must_change_password then
    if not public.request_is_maintenance_mode() and
       coalesce(nullif(current_setting('stokr.allow_password_flag_change', true), ''), 'false') <> 'true' then
      raise exception 'must_change_password cannot be modified directly. Use begin_staff_password_reset() or complete_password_change().';
    end if;
  end if;

  if (tg_op = 'INSERT' and new.branch_id is not null) or
     (tg_op = 'UPDATE' and new.branch_id is distinct from old.branch_id) then
    if not exists (
      select 1 from public.branches
      where id = new.branch_id
        and shop_id = new.shop_id
        and is_active = true
    ) then
      raise exception 'branch_id does not belong to an active branch in the same shop.';
    end if;
  end if;

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
$function$;

create or replace function public.create_shop_for_new_owner(
  p_shop_name text,
  p_branch_name text,
  p_products jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', 'Owner');
  v_shop_id uuid;
  v_store_code text;
  v_branch_id uuid;
  v_product jsonb;
  i int;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  if p_shop_name is null or length(trim(p_shop_name)) = 0 or length(p_shop_name) > 80 then
    raise exception 'invalid_shop_name' using errcode = '22023';
  end if;
  if p_branch_name is null or length(trim(p_branch_name)) = 0 or length(p_branch_name) > 80 then
    raise exception 'invalid_branch_name' using errcode = '22023';
  end if;
  if p_products is null or jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) > 50 then
    raise exception 'invalid_products' using errcode = '22023';
  end if;

  -- Retry on the rare store code collision; the unique constraint is the real guard.
  for i in 1..5 loop
    begin
      insert into public.shops (name, store_code)
      values (trim(p_shop_name), public.generate_store_code())
      returning id, store_code into v_shop_id, v_store_code;
      exit;
    exception when unique_violation then
      if i = 5 then
        raise exception 'could_not_generate_store_code' using errcode = 'P0001';
      end if;
    end;
  end loop;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details)
  values (v_shop_id, v_uid, 'shop_created', 'shop', v_shop_id::text, jsonb_build_object('name', trim(p_shop_name)));

  -- Owner profile: the allow flag is transaction-local and only this function sets it.
  perform set_config('stokr.allow_owner_onboarding', 'true', true);
  insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
  values (v_uid, v_shop_id, v_email, 'owner', null, true);
  perform set_config('stokr.allow_owner_onboarding', 'false', true);

  -- Branch and product inserts are logged by tr_log_branch_activity and tr_log_product_activity.
  insert into public.branches (shop_id, name)
  values (v_shop_id, trim(p_branch_name))
  returning id into v_branch_id;

  for v_product in select * from jsonb_array_elements(p_products) loop
    insert into public.products (
      shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold
    )
    values (
      v_shop_id,
      trim(v_product ->> 'name'),
      v_product ->> 'category',
      (v_product ->> 'sellingPrice')::bigint,
      (v_product ->> 'costPrice')::bigint,
      (v_product ->> 'lowStockThreshold')::int
    );
  end loop;

  return v_store_code;
end;
$$;

revoke all on function public.create_shop_for_new_owner(text, text, jsonb) from public, anon;
grant execute on function public.create_shop_for_new_owner(text, text, jsonb) to authenticated;
