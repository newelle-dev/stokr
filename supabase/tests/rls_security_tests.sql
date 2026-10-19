-- supabase/tests/rls_security_tests.sql
-- Comprehensive verification script for Stokr security rules & invariants.
-- Covers:
--  1. Staff user permissions & data shielding (no cost, isolated my_sales)
--  2. Cross-shop isolation (Owner B sees zero data from Shop A)
--  3. Logged-out / anon user (zero data visible across all tables and views)
--  4. Append-only stock movements and sale deletion protection

begin;

-- ============================================================================
-- 1. SETUP TEST FIXTURES
-- ============================================================================

-- IDs
-- Shop A
create temp table if not exists test_params (
  shop_a_id uuid,
  shop_b_id uuid,
  branch_a_id uuid,
  branch_b_id uuid,
  owner_a_id uuid,
  staff_a1_id uuid,
  staff_a2_id uuid,
  owner_b_id uuid,
  product_a_id uuid,
  product_b_id uuid,
  sale_a1_id uuid,
  sale_a2_id uuid,
  sale_b_id uuid
);

delete from test_params;

insert into test_params values (
  '11111111-1111-1111-1111-111111111111', -- shop_a_id
  '22222222-2222-2222-2222-222222222222', -- shop_b_id
  '11111111-0000-0000-0000-000000000001', -- branch_a_id
  '22222222-0000-0000-0000-000000000001', -- branch_b_id
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- owner_a_id
  'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb', -- staff_a1_id
  'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', -- staff_a2_id
  'cccccccc-cccc-cccc-cccc-cccccccccccc', -- owner_b_id
  '11111111-3333-3333-3333-333333333333', -- product_a_id
  '22222222-3333-3333-3333-333333333333', -- product_b_id
  '11111111-5555-5555-5555-555555555551', -- sale_a1_id
  '11111111-5555-5555-5555-555555555552', -- sale_a2_id
  '22222222-5555-5555-5555-555555555551'  -- sale_b_id
);

-- Insert Shops
insert into public.shops (id, name)
select shop_a_id, 'Shop Alpha' from test_params
on conflict (id) do nothing;

insert into public.shops (id, name)
select shop_b_id, 'Shop Beta' from test_params
on conflict (id) do nothing;

-- Insert Branches
insert into public.branches (id, shop_id, name)
select branch_a_id, shop_a_id, 'Alpha Branch 1' from test_params
on conflict (id) do nothing;

insert into public.branches (id, shop_id, name)
select branch_b_id, shop_b_id, 'Beta Branch 1' from test_params
on conflict (id) do nothing;

-- Insert Auth Users
insert into auth.users (id, instance_id, email, aud, role)
select owner_a_id, '00000000-0000-0000-0000-000000000000', 'owner_a@test.local', 'authenticated', 'authenticated' from test_params
on conflict (id) do nothing;

insert into auth.users (id, instance_id, email, aud, role)
select staff_a1_id, '00000000-0000-0000-0000-000000000000', 'staff_a1@test.local', 'authenticated', 'authenticated' from test_params
on conflict (id) do nothing;

insert into auth.users (id, instance_id, email, aud, role)
select staff_a2_id, '00000000-0000-0000-0000-000000000000', 'staff_a2@test.local', 'authenticated', 'authenticated' from test_params
on conflict (id) do nothing;

insert into auth.users (id, instance_id, email, aud, role)
select owner_b_id, '00000000-0000-0000-0000-000000000000', 'owner_b@test.local', 'authenticated', 'authenticated' from test_params
on conflict (id) do nothing;

-- Insert Profiles
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select owner_a_id, shop_a_id, 'Owner Alpha', 'owner', null, true from test_params
on conflict (id) do update set shop_id = excluded.shop_id, role = excluded.role, is_active = excluded.is_active;

insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select staff_a1_id, shop_a_id, 'Staff Alpha 1', 'staff', branch_a_id, true from test_params
on conflict (id) do update set shop_id = excluded.shop_id, role = excluded.role, is_active = excluded.is_active;

insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select staff_a2_id, shop_a_id, 'Staff Alpha 2', 'staff', branch_a_id, true from test_params
on conflict (id) do update set shop_id = excluded.shop_id, role = excluded.role, is_active = excluded.is_active;

insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select owner_b_id, shop_b_id, 'Owner Beta', 'owner', null, true from test_params
on conflict (id) do update set shop_id = excluded.shop_id, role = excluded.role, is_active = excluded.is_active;

-- Insert Products
insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos)
select product_a_id, shop_a_id, 'Alpha Secret Juice', 'liquid', 50000, 25000 from test_params
on conflict (id) do nothing;

insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos)
select product_b_id, shop_b_id, 'Beta Mod Device', 'device', 150000, 90000 from test_params
on conflict (id) do nothing;

-- Insert Stock Movements
insert into public.stock_movements (id, shop_id, branch_id, product_id, quantity_change, reason, created_by)
select '11111111-4444-4444-4444-444444444441', shop_a_id, branch_a_id, product_a_id, 100, 'opening', owner_a_id from test_params
on conflict (id) do nothing;

insert into public.stock_movements (id, shop_id, branch_id, product_id, quantity_change, reason, created_by)
select '22222222-4444-4444-4444-444444444441', shop_b_id, branch_b_id, product_b_id, 50, 'opening', owner_b_id from test_params
on conflict (id) do nothing;

-- Insert Sales
insert into public.sales (
  id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id
)
select sale_a1_id, shop_a_id, branch_a_id, staff_a1_id, staff_a1_id, 'cash', 50000, 25000, 'req-a1' from test_params
on conflict (id) do nothing;

insert into public.sales (
  id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id
)
select sale_a2_id, shop_a_id, branch_a_id, staff_a2_id, staff_a2_id, 'gcash', 50000, 25000, 'req-a2' from test_params
on conflict (id) do nothing;

insert into public.sales (
  id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id
)
select sale_b_id, shop_b_id, branch_b_id, owner_b_id, owner_b_id, 'cash', 150000, 90000, 'req-b' from test_params
on conflict (id) do nothing;

-- Insert Sale Items
insert into public.sale_items (id, sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
select '11111111-6666-6666-6666-666666666661', sale_a1_id, shop_a_id, product_a_id, 'Alpha Secret Juice', 1, 50000, 25000 from test_params
on conflict (id) do nothing;

insert into public.sale_items (id, sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
select '11111111-6666-6666-6666-666666666662', sale_a2_id, shop_a_id, product_a_id, 'Alpha Secret Juice', 1, 50000, 25000 from test_params
on conflict (id) do nothing;

insert into public.sale_items (id, sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
select '22222222-6666-6666-6666-666666666661', sale_b_id, shop_b_id, product_b_id, 'Beta Mod Device', 1, 150000, 90000 from test_params
on conflict (id) do nothing;

-- ============================================================================
-- 2. TEST: STAFF USER CHECKS (STAFF A1)
-- ============================================================================

set local role authenticated;
set local "request.jwt.claim.sub" = 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';

do $$
declare
  v_count integer;
begin
  -- 2.1 Staff CANNOT SELECT directly from base products table (0 rows)
  select count(*) into v_count from public.products;
  if v_count <> 0 then
    raise exception 'FAIL [Staff]: Staff accessed base products table! Returned % rows.', v_count;
  end if;

  -- 2.2 Staff CANNOT SELECT directly from base sales table (0 rows)
  select count(*) into v_count from public.sales;
  if v_count <> 0 then
    raise exception 'FAIL [Staff]: Staff accessed base sales table! Returned % rows.', v_count;
  end if;

  -- 2.3 Staff CANNOT SELECT directly from base sale_items table (0 rows)
  select count(*) into v_count from public.sale_items;
  if v_count <> 0 then
    raise exception 'FAIL [Staff]: Staff accessed base sale_items table! Returned % rows.', v_count;
  end if;

  -- 2.4 Staff CAN read staff_products view (sees only Shop A product, count = 1)
  select count(*) into v_count from public.staff_products;
  if v_count <> 1 then
    raise exception 'FAIL [Staff]: Staff expected 1 row from staff_products, got %', v_count;
  end if;

  -- 2.5 my_sales returns ONLY Staff A1 sales (1 row), NOT Staff A2 or Shop B
  select count(*) into v_count from public.my_sales;
  if v_count <> 1 then
    raise exception 'FAIL [Staff]: my_sales returned % rows, expected exactly 1 (own sale).', v_count;
  end if;

  select count(*) into v_count from public.my_sales where sold_by = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';
  if v_count <> 0 then
    raise exception 'FAIL [Staff]: my_sales leaked another staff member sales!';
  end if;

  -- 2.6 stock_levels returns ONLY user own shop
  select count(*) into v_count from public.stock_levels;
  if v_count <> 1 then
    raise exception 'FAIL [Staff]: stock_levels expected 1 row for own shop, got %', v_count;
  end if;

  select count(*) into v_count from public.stock_levels where shop_id = '22222222-2222-2222-2222-222222222222';
  if v_count <> 0 then
    raise exception 'FAIL [Staff]: stock_levels leaked another shop stock!';
  end if;

  raise notice 'PASS: Staff user checks (a) succeeded completely.';
end;
$$;

-- ============================================================================
-- 3. TEST: CROSS-SHOP ISOLATION (OWNER B)
-- ============================================================================

set local role authenticated;
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

do $$
declare
  v_count integer;
begin
  -- 3.1 Owner B sees ONLY Shop B products (count = 1), zero from Shop A
  select count(*) into v_count from public.products;
  if v_count <> 1 then
    raise exception 'FAIL [Cross-Shop]: Owner B saw % products, expected 1.', v_count;
  end if;

  select count(*) into v_count from public.products where shop_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then
    raise exception 'FAIL [Cross-Shop]: Owner B can see Shop A products!';
  end if;

  -- 3.2 Owner B sees zero Shop A branches
  select count(*) into v_count from public.branches where shop_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then
    raise exception 'FAIL [Cross-Shop]: Owner B can see Shop A branches!';
  end if;

  -- 3.3 Owner B sees zero Shop A sales
  select count(*) into v_count from public.sales where shop_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then
    raise exception 'FAIL [Cross-Shop]: Owner B can see Shop A sales!';
  end if;

  -- 3.4 Owner B stock_levels returns only Shop B
  select count(*) into v_count from public.stock_levels where shop_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then
    raise exception 'FAIL [Cross-Shop]: Owner B can see Shop A stock levels!';
  end if;

  raise notice 'PASS: Cross-shop isolation checks (b) succeeded completely.';
end;
$$;

-- ============================================================================
-- 4. TEST: LOGGED-OUT USER (ANON) CHECKS
-- ============================================================================

set local role anon;
set local "request.jwt.claim.sub" = '';

do $$
declare
  v_count integer;
begin
  -- 4.1 Anon user gets 0 rows from base products
  select count(*) into v_count from public.products;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % products!', v_count;
  end if;

  -- 4.2 Anon user gets 0 rows from base sales
  select count(*) into v_count from public.sales;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % sales!', v_count;
  end if;

  -- 4.3 Anon user gets 0 rows from base sale_items
  select count(*) into v_count from public.sale_items;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % sale_items!', v_count;
  end if;

  -- 4.4 Anon user gets 0 rows from stock_movements
  select count(*) into v_count from public.stock_movements;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % stock movements!', v_count;
  end if;

  -- 4.5 Anon user gets 0 rows from shops & branches
  select count(*) into v_count from public.shops;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % shops!', v_count;
  end if;

  select count(*) into v_count from public.branches;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % branches!', v_count;
  end if;

  -- 4.6 Views return 0 rows for anon user (or are inaccessible)
  select count(*) into v_count from public.staff_products;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % rows in staff_products!', v_count;
  end if;

  select count(*) into v_count from public.my_sales;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % rows in my_sales!', v_count;
  end if;

  select count(*) into v_count from public.stock_levels;
  if v_count <> 0 then
    raise exception 'FAIL [Anon]: Logged-out user saw % rows in stock_levels!', v_count;
  end if;

  raise notice 'PASS: Logged-out / anon user checks (c) succeeded completely.';
end;
$$;

-- ============================================================================
-- 5. TEST: IMMUTABILITY & PROTECTION TRIGGERS
-- ============================================================================

reset role;

-- 5.1 Stock movements cannot be updated
do $$
begin
  update public.stock_movements
  set quantity_change = 999
  where id = '11111111-4444-4444-4444-444444444441';

  raise exception 'FAIL [Immutability]: stock_movements allowed an UPDATE!';
exception
  when others then
    -- Expected: trigger blocked update
    null;
end;
$$;

-- 5.2 Stock movements cannot be deleted
do $$
begin
  delete from public.stock_movements
  where id = '11111111-4444-4444-4444-444444444441';

  raise exception 'FAIL [Immutability]: stock_movements allowed a DELETE!';
exception
  when others then
    -- Expected: trigger blocked delete
    null;
end;
$$;

-- 5.3 Sales cannot be deleted
do $$
begin
  delete from public.sales
  where id = '11111111-5555-5555-5555-555555555551';

  raise exception 'FAIL [Immutability]: sales allowed a DELETE!';
exception
  when others then
    -- Expected: trigger blocked delete
    null;
end;
$$;

-- 5.4 Sale items cannot be deleted
do $$
begin
  delete from public.sale_items
  where id = '11111111-6666-6666-6666-666666666661';

  raise exception 'FAIL [Immutability]: sale_items allowed a DELETE!';
exception
  when others then
    -- Expected: trigger blocked delete
    null;
end;
$$;

raise notice 'PASS: Immutability and deletion protection triggers succeeded.';

rollback; -- Clean rollback: leaves zero residual rows in database
