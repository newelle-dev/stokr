BEGIN;

CREATE TEMP TABLE test_log_results (
  test_case text,
  action text,
  actor_id uuid,
  entity_type text,
  entity_id text,
  details jsonb
);

DO $$
declare
  v_shop_id uuid := '00000000-0000-0000-0000-000000000001';
  v_owner_id uuid := '00000000-0000-0000-0000-000000000100';
  v_branch_id uuid;
  v_branch_2_id uuid;
  v_new_branch_id uuid;
  v_product_id uuid;
  v_new_staff_id uuid := gen_random_uuid();
  v_new_log_id uuid;
  v_count integer;
  v_prior_count integer;
  v_row record;
begin
  -- Identify active branch
  select id into v_branch_id from public.branches where shop_id = v_shop_id and is_active = true limit 1;

  -- Create a second branch for reassignment tests (in maintenance mode)
  insert into public.branches (shop_id, name) values (v_shop_id, 'Second Branch For Test') returning id into v_branch_2_id;

  -- Create simulated auth user for v_new_staff_id
  insert into auth.users (id, email, encrypted_password, email_confirmed_at)
  values (v_new_staff_id, 'test_new_staff.cloudhaven@staff.stokr.invalid', '$2a$10$TEMP_HASH_XYZ_123', now())
  on conflict (id) do nothing;

  -- =========================================================================
  -- 1. product_created (Owner action)
  -- =========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  insert into public.products (shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold)
  values (v_shop_id, 'Test Product Alpha', 'liquid', 50000, 30000, 5)
  returning id into v_product_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'product_created: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_product_id::text and action = 'product_created';

  if v_row.actor_id <> v_owner_id or (v_row.details ->> 'selling_price_centavos')::int <> 50000 then
    raise exception 'product_created: assertion failed on actor or details: %', v_row;
  end if;
  insert into test_log_results values ('1. product_created', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 2. product_updated (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.products
  set selling_price_centavos = 55000, cost_price_centavos = 32000
  where id = v_product_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'product_updated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_product_id::text and action = 'product_updated';

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_selling_price_centavos')::int <> 50000 or
     (v_row.details ->> 'new_selling_price_centavos')::int <> 55000 then
    raise exception 'product_updated: assertion failed on old/new prices: %', v_row;
  end if;
  insert into test_log_results values ('2. product_updated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 3. product_deactivated (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.products set is_active = false where id = v_product_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'product_deactivated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_product_id::text and action = 'product_deactivated';

  if v_row.actor_id <> v_owner_id or (v_row.details ->> 'old_is_active')::boolean <> true or (v_row.details ->> 'new_is_active')::boolean <> false then
    raise exception 'product_deactivated: assertion failed on old/new values: %', v_row;
  end if;
  insert into test_log_results values ('3. product_deactivated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 4. product_reactivated (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.products set is_active = true where id = v_product_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'product_reactivated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_product_id::text and action = 'product_reactivated';

  if v_row.actor_id <> v_owner_id or (v_row.details ->> 'old_is_active')::boolean <> false or (v_row.details ->> 'new_is_active')::boolean <> true then
    raise exception 'product_reactivated: assertion failed on old/new values: %', v_row;
  end if;
  insert into test_log_results values ('4. product_reactivated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 5. branch_created (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  insert into public.branches (shop_id, name) values (v_shop_id, 'Branch Beta Test') returning id into v_new_branch_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'branch_created: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_branch_id::text and action = 'branch_created';

  if v_row.actor_id <> v_owner_id or (v_row.details ->> 'name') <> 'Branch Beta Test' then
    raise exception 'branch_created: assertion failed: %', v_row;
  end if;
  insert into test_log_results values ('5. branch_created', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 6. branch_renamed (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.branches set name = 'Branch Beta Renamed' where id = v_new_branch_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'branch_renamed: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_branch_id::text and action = 'branch_renamed';

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_name') <> 'Branch Beta Test' or
     (v_row.details ->> 'new_name') <> 'Branch Beta Renamed' then
    raise exception 'branch_renamed: assertion failed on old/new names: %', v_row;
  end if;
  insert into test_log_results values ('6. branch_renamed', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 7. branch_deactivated (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.branches set is_active = false where id = v_new_branch_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'branch_deactivated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_branch_id::text and action = 'branch_deactivated';

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_is_active')::boolean <> true or
     (v_row.details ->> 'new_is_active')::boolean <> false then
    raise exception 'branch_deactivated: assertion failed on old/new values: %', v_row;
  end if;
  insert into test_log_results values ('7. branch_deactivated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 8. branch_reactivated (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.branches set is_active = true where id = v_new_branch_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'branch_reactivated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_branch_id::text and action = 'branch_reactivated';

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_is_active')::boolean <> false or
     (v_row.details ->> 'new_is_active')::boolean <> true then
    raise exception 'branch_reactivated: assertion failed on old/new values: %', v_row;
  end if;
  insert into test_log_results values ('8. branch_reactivated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 9. staff_created (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  insert into public.profiles (id, shop_id, branch_id, role, full_name, username, must_change_password)
  values (v_new_staff_id, v_shop_id, v_branch_id, 'staff', 'New Staff Alpha', 'newstaffalpha', true);

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'staff_created: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_staff_id::text and action = 'staff_created';

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'username') <> 'newstaffalpha' or
     (v_row.details ->> 'role') <> 'staff' or
     (v_row.details ->> 'must_change_password')::boolean <> true then
    raise exception 'staff_created: assertion failed: %', v_row;
  end if;
  insert into test_log_results values ('9. staff_created', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 10. staff_reassigned (Owner action)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.profiles set branch_id = v_branch_2_id where id = v_new_staff_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'staff_reassigned: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  -- Select the single row inserted by this operation (using shop_id and action staff_reassigned)
  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log
  where entity_id = v_new_staff_id::text and action = 'staff_reassigned'
    and (details ->> 'new_branch_id')::uuid = v_branch_2_id;

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_branch_id')::uuid <> v_branch_id or
     (v_row.details ->> 'new_branch_id')::uuid <> v_branch_2_id then
    raise exception 'staff_reassigned: assertion failed on old/new branch: %', v_row;
  end if;
  insert into test_log_results values ('10. staff_reassigned', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 11. Multi-field profile update (name + branch) (Owner action)
  -- =========================================================================
  -- Track the IDs existing right before this update
  create temp table prior_log_ids as select id from public.activity_log where shop_id = v_shop_id;
  select count(*) into v_prior_count from prior_log_ids;

  update public.profiles set full_name = 'New Staff Alpha Renamed', branch_id = v_branch_id where id = v_new_staff_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'multi-field profile update: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  -- Grab the exact newly inserted row by excluding prior_log_ids
  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log
  where shop_id = v_shop_id and id not in (select id from prior_log_ids);

  drop table prior_log_ids;

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_full_name') <> 'New Staff Alpha' or
     (v_row.details ->> 'new_full_name') <> 'New Staff Alpha Renamed' or
     (v_row.details ->> 'old_branch_id')::uuid <> v_branch_2_id or
     (v_row.details ->> 'new_branch_id')::uuid <> v_branch_id then
    raise exception 'multi-field profile update: assertion failed: %', v_row;
  end if;
  insert into test_log_results values ('11. multi-field profile update (name + branch)', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 12. staff_password_reset_initiated (Owner calls begin_staff_password_reset)
  -- =========================================================================
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update auth.users set encrypted_password = '$2a$10$TEMP_RESET_HASH_999' where id = v_new_staff_id;
  perform public.begin_staff_password_reset(v_new_staff_id);

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'staff_password_reset_initiated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_staff_id::text and action = 'staff_password_reset_initiated';

  if v_row.actor_id <> v_owner_id or (v_row.details ->> 'username') <> 'newstaffalpha' then
    raise exception 'staff_password_reset_initiated: assertion failed: %', v_row;
  end if;
  insert into test_log_results values ('12. staff_password_reset_initiated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 13. staff_password_changed (Staff member calls complete_password_change)
  -- =========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_new_staff_id::text, 'role', 'authenticated')::text, true);
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update auth.users set encrypted_password = '$2a$10$USER_NEW_SECRET_HASH_888' where id = v_new_staff_id;
  perform public.complete_password_change();

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'staff_password_changed: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_staff_id::text and action = 'staff_password_changed';

  if v_row.actor_id <> v_new_staff_id or
     (v_row.details ->> 'old_must_change_password')::boolean <> true or
     (v_row.details ->> 'new_must_change_password')::boolean <> false then
    raise exception 'staff_password_changed: assertion failed on actor or flag values: %', v_row;
  end if;
  insert into test_log_results values ('13. staff_password_changed', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

  -- =========================================================================
  -- 14. staff_deactivated (Owner deactivates staff)
  -- =========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);
  select count(*) into v_prior_count from public.activity_log where shop_id = v_shop_id;

  update public.profiles set is_active = false where id = v_new_staff_id;

  select count(*) into v_count from public.activity_log where shop_id = v_shop_id;
  if v_count <> v_prior_count + 1 then
    raise exception 'staff_deactivated: expected exactly 1 new activity_log row, got %', v_count - v_prior_count;
  end if;

  select action, actor_id, entity_type, entity_id, details into v_row
  from public.activity_log where entity_id = v_new_staff_id::text and action = 'staff_deactivated';

  if v_row.actor_id <> v_owner_id or
     (v_row.details ->> 'old_is_active')::boolean <> true or
     (v_row.details ->> 'new_is_active')::boolean <> false then
    raise exception 'staff_deactivated: assertion failed on old/new values: %', v_row;
  end if;
  insert into test_log_results values ('14. staff_deactivated', v_row.action, v_row.actor_id, v_row.entity_type, v_row.entity_id, v_row.details);

end;
$$;

SELECT test_case, action, actor_id::text, entity_type, entity_id, details
FROM test_log_results
ORDER BY test_case;

ROLLBACK;
