-- supabase/tests/unit2_security_tests.sql
-- Comprehensive SQL Security & Invariant Test Suite for Unit 2.
-- Verifies:
--   1. Staff direct write rejection (cannot insert sales, items, movements, activity_log, products, branches).
--   2. Staff cannot update or delete anything.
--   3. Actor forgery prevention (created_by, actor_id, recorded_by must equal auth.uid()).
--   4. Movement reason restrictions (direct sale/void_return rejected; restock/adjustment allowed).
--   5. Deactivated user isolation (zero rows from my_sales, staff_products, stock_levels; self-profile readable).
--   6. Profile branch shop validation (branch_id must belong to same shop).
--   7. Cross-shop profile isolation.
--   8. Last active owner demotion/deactivation protection.

begin;

-- ============================================================================
-- SETUP FIXTURES
-- ============================================================================
create temp table if not exists u2_test_params (
  shop_a_id uuid,
  shop_b_id uuid,
  branch_a_id uuid,
  branch_b_id uuid,
  owner_a_id uuid,
  staff_a_id uuid,
  owner_b_id uuid,
  product_a_id uuid
);

delete from u2_test_params;

insert into u2_test_params values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-3333-3333-3333-333333333333'
);

-- Seed Shops
insert into public.shops (id, name)
select shop_a_id, 'Shop Alpha' from u2_test_params on conflict do nothing;
insert into public.shops (id, name)
select shop_b_id, 'Shop Beta' from u2_test_params on conflict do nothing;

-- Seed Branches
insert into public.branches (id, shop_id, name)
select branch_a_id, shop_a_id, 'Branch Alpha' from u2_test_params on conflict do nothing;
insert into public.branches (id, shop_id, name)
select branch_b_id, shop_b_id, 'Branch Beta' from u2_test_params on conflict do nothing;

-- Seed Auth Users
insert into auth.users (id, instance_id, email, aud, role)
select owner_a_id, '00000000-0000-0000-0000-000000000000', 'owner_a@test.local', 'authenticated', 'authenticated' from u2_test_params on conflict do nothing;
insert into auth.users (id, instance_id, email, aud, role)
select staff_a_id, '00000000-0000-0000-0000-000000000000', 'staff_a@test.local', 'authenticated', 'authenticated' from u2_test_params on conflict do nothing;
insert into auth.users (id, instance_id, email, aud, role)
select owner_b_id, '00000000-0000-0000-0000-000000000000', 'owner_b@test.local', 'authenticated', 'authenticated' from u2_test_params on conflict do nothing;

-- Seed Profiles
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select owner_a_id, shop_a_id, 'Owner A', 'owner', null, true from u2_test_params on conflict do nothing;
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select staff_a_id, shop_a_id, 'Staff A', 'staff', branch_a_id, true from u2_test_params on conflict do nothing;
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select owner_b_id, shop_b_id, 'Owner B', 'owner', null, true from u2_test_params on conflict do nothing;

-- Seed Product
insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos, is_active)
select product_a_id, shop_a_id, 'Product Alpha', 'liquid', 30000, 15000, true from u2_test_params on conflict do nothing;

-- Helper to switch context
create or replace function pg_temp.act_as(user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
end;
$$;

-- ============================================================================
-- TEST 1: STAFF DIRECT WRITE REJECTION
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_id uuid := '11111111-0000-0000-0000-000000000001';
  v_prod_id uuid := '11111111-3333-3333-3333-333333333333';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_staff_id);

  -- 1. Direct INSERT on sales must fail
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (v_shop_id, v_branch_id, v_staff_id, v_staff_id, 'cash', 1000, 500, 'req_fail_1');
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 1.1 failed: Staff direct insert on sales was permitted!'; end if;

  -- 2. Direct INSERT on stock_movements must fail
  v_err := false;
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 5, 'restock', v_staff_id);
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 1.2 failed: Staff direct insert on stock_movements was permitted!'; end if;

  -- 3. Direct INSERT on activity_log must fail
  v_err := false;
  begin
    insert into public.activity_log (shop_id, actor_id, action, entity_type)
    values (v_shop_id, v_staff_id, 'tamper', 'product');
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 1.3 failed: Staff direct insert on activity_log was permitted!'; end if;

  -- 4. Direct INSERT on products must fail
  v_err := false;
  begin
    insert into public.products (shop_id, name, category, selling_price_centavos, cost_price_centavos)
    values (v_shop_id, 'Staff Fake Prod', 'device', 1000, 500);
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 1.4 failed: Staff direct insert on products was permitted!'; end if;

  -- 5. Direct INSERT on branches must fail
  v_err := false;
  begin
    insert into public.branches (shop_id, name)
    values (v_shop_id, 'Staff Fake Branch');
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 1.5 failed: Staff direct insert on branches was permitted!'; end if;
end;
$$;

-- ============================================================================
-- TEST 2: STAFF DIRECT UPDATE / DELETE REJECTION
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_count integer;
begin
  perform pg_temp.act_as(v_staff_id);

  -- Attempt to update product price
  update public.products set selling_price_centavos = 999999 where shop_id = v_shop_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  if v_count <> 0 then raise exception 'Test 2.1 failed: Staff was able to update products!'; end if;

  -- Attempt to update branch name
  update public.branches set name = 'Hacked Branch' where shop_id = v_shop_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  if v_count <> 0 then raise exception 'Test 2.2 failed: Staff was able to update branches!'; end if;

  -- Attempt to update own profile to owner
  update public.profiles set role = 'owner' where id = v_staff_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  if v_count <> 0 then raise exception 'Test 2.3 failed: Staff was able to update profile role!'; end if;

  -- Attempt to delete product
  delete from public.products where shop_id = v_shop_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  if v_count <> 0 then raise exception 'Test 2.4 failed: Staff was able to delete products!'; end if;
end;
$$;

-- ============================================================================
-- TEST 3: ACTOR FORGERY PREVENTION
-- ============================================================================
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_id uuid := '11111111-0000-0000-0000-000000000001';
  v_prod_id uuid := '11111111-3333-3333-3333-333333333333';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_owner_id);

  -- 1. Owner cannot insert into stock_movements with forged created_by
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 10, 'restock', v_staff_id);
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 3.1 failed: Owner forged created_by in stock_movements!'; end if;

  -- 2. Owner cannot insert into activity_log with forged actor_id
  v_err := false;
  begin
    insert into public.activity_log (shop_id, actor_id, action, entity_type)
    values (v_shop_id, v_staff_id, 'audit_entry', 'product');
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 3.2 failed: Owner forged actor_id in activity_log!'; end if;

  -- 3. Owner cannot insert into sales with forged recorded_by
  v_err := false;
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (v_shop_id, v_branch_id, v_owner_id, v_staff_id, 'cash', 1000, 500, 'req_forge_1');
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 3.3 failed: Owner forged recorded_by in sales!'; end if;
end;
$$;

-- ============================================================================
-- TEST 4: STOCK MOVEMENT REASON RESTRICTION
-- ============================================================================
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_id uuid := '11111111-0000-0000-0000-000000000001';
  v_prod_id uuid := '11111111-3333-3333-3333-333333333333';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_owner_id);

  -- 1. Direct insert with reason 'sale' must be rejected
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, -1, 'sale', v_owner_id);
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 4.1 failed: Direct insert with reason sale was permitted!'; end if;

  -- 2. Direct insert with reason 'void_return' must be rejected
  v_err := false;
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 1, 'void_return', v_owner_id);
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 4.2 failed: Direct insert with reason void_return was permitted!'; end if;

  -- 3. Direct insert with reason 'restock' must succeed for owner
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 25, 'restock', v_owner_id);
end;
$$;

-- ============================================================================
-- TEST 5: DEACTIVATED USER ISOLATION & SELF-PROFILE READ
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_count integer;
begin
  -- Deactivate staff profile
  update public.profiles set is_active = false where id = v_staff_id;

  perform pg_temp.act_as(v_staff_id);

  -- Helper functions must return NULL / false
  if (select public.current_user_shop_id()) is not null then
    raise exception 'Test 5.1 failed: current_user_shop_id() did not return NULL for inactive user!';
  end if;
  if (select public.is_owner()) is not false then
    raise exception 'Test 5.2 failed: is_owner() did not return false for inactive user!';
  end if;

  -- Views must return 0 rows
  select count(*) into v_count from public.my_sales;
  if v_count <> 0 then raise exception 'Test 5.3 failed: Deactivated user got rows from my_sales!'; end if;

  select count(*) into v_count from public.staff_products;
  if v_count <> 0 then raise exception 'Test 5.4 failed: Deactivated user got rows from staff_products!'; end if;

  select count(*) into v_count from public.stock_levels;
  if v_count <> 0 then raise exception 'Test 5.5 failed: Deactivated user got rows from stock_levels!'; end if;

  -- Deactivated user CAN still read their own profile row
  select count(*) into v_count from public.profiles where id = v_staff_id;
  if v_count <> 1 then raise exception 'Test 5.6 failed: Deactivated user could not read their own profile row!'; end if;

  -- Re-activate staff for remaining tests
  update public.profiles set is_active = true where id = v_staff_id;
end;
$$;

-- ============================================================================
-- TEST 6: PROFILE BRANCH SHOP VALIDATION
-- ============================================================================
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_branch_b_id uuid := '22222222-0000-0000-0000-000000000001';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_owner_id);

  -- Attempt to assign staff member to a branch from Shop B
  begin
    update public.profiles set branch_id = v_branch_b_id where id = v_staff_id;
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 6 failed: Assigning branch from another shop was permitted!'; end if;
end;
$$;

-- ============================================================================
-- TEST 7: CROSS-SHOP PROFILE UPDATE ISOLATION
-- ============================================================================
do $$
declare
  v_owner_b_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_staff_a_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_count integer;
begin
  perform pg_temp.act_as(v_owner_b_id);

  -- Owner B tries to update Staff A's profile (from Shop A)
  update public.profiles set full_name = 'Compromised Name' where id = v_staff_a_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  if v_count <> 0 then raise exception 'Test 7 failed: Owner B updated Shop A profile!'; end if;
end;
$$;

-- ============================================================================
-- TEST 8: LAST ACTIVE OWNER PROTECTION
-- ============================================================================
do $$
declare
  v_owner_a_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_owner_a_id);

  -- 1. Sole owner cannot deactivate themselves
  begin
    update public.profiles set is_active = false where id = v_owner_a_id;
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 8.1 failed: Sole owner was able to deactivate themselves!'; end if;

  -- 2. Sole owner cannot demote themselves to staff
  v_err := false;
  begin
    update public.profiles set role = 'staff' where id = v_owner_a_id;
  exception when others then
    v_err := true;
  end;
  if not v_err then raise exception 'Test 8.2 failed: Sole owner was able to demote themselves!'; end if;
end;
$$;

rollback;
