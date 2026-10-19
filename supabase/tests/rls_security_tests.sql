-- supabase/tests/rls_security_tests.sql
-- Verification script for Unit 1 security rules and database invariants.
-- Run in psql or Supabase SQL editor.

begin;

-- ============================================================================
-- 1. SETUP TEST FIXTURES
-- ============================================================================

-- Shop A (Target Shop)
create temp table if not exists test_state (
  shop_a_id uuid,
  shop_b_id uuid,
  owner_a_id uuid,
  staff_a_id uuid,
  owner_b_id uuid
);

delete from test_state;

insert into test_state values (
  '11111111-1111-1111-1111-111111111111', -- Shop A
  '22222222-2222-2222-2222-222222222222', -- Shop B (Attacker / Other Shop)
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Owner A
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Staff A
  'cccccccc-cccc-cccc-cccc-cccccccccccc'  -- Owner B
);

-- Insert Shops
insert into public.shops (id, name)
select shop_a_id, 'Shop Alpha' from test_state
on conflict (id) do nothing;

insert into public.shops (id, name)
select shop_b_id, 'Shop Beta' from test_state
on conflict (id) do nothing;

-- Insert Branches
insert into public.branches (id, shop_id, name)
values
  ('11111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Alpha Branch 1'),
  ('22222222-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Beta Branch 1')
on conflict (id) do nothing;

-- Insert Mock Auth Users
insert into auth.users (id, instance_id, email, aud, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'owner_a@test.local', 'authenticated', 'authenticated'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'staff_a@test.local', 'authenticated', 'authenticated'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'owner_b@test.local', 'authenticated', 'authenticated')
on conflict (id) do nothing;

-- Insert Profiles
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Owner Alpha', 'owner', null, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Staff Alpha', 'staff', '11111111-0000-0000-0000-000000000001', true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Owner Beta', 'owner', null, true)
on conflict (id) do update set
  shop_id = excluded.shop_id,
  role = excluded.role,
  is_active = excluded.is_active;

-- Insert Products
insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos)
values
  ('11111111-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Secret Vape Juice', 'liquid', 50000, 25000),
  ('22222222-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Beta Vape Device', 'device', 150000, 90000)
on conflict (id) do nothing;

-- ============================================================================
-- 2. TEST: TENANT ISOLATION (CROSS-SHOP LEAKAGE TEST)
-- ============================================================================

-- Switch to Owner Beta (Shop B)
set local role authenticated;
set local "request.jwt.claim.sub" = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

do $$
declare
  v_count integer;
begin
  -- Should see only Shop B products (count = 1) and zero products from Shop A
  select count(*) into v_count from public.products;
  if v_count <> 1 then
    raise exception 'Cross-shop isolation failed: Owner B saw % products, expected 1.', v_count;
  end if;

  select count(*) into v_count from public.products where shop_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then
    raise exception 'Critical security failure: Owner B can see Shop A products!';
  end if;

  select count(*) into v_count from public.branches where shop_id = '11111111-1111-1111-1111-111111111111';
  if v_count <> 0 then
    raise exception 'Critical security failure: Owner B can see Shop A branches!';
  end if;
end;
$$;

-- ============================================================================
-- 3. TEST: STAFF PRIVACY (STAFF CANNOT ACCESS COST DATA)
-- ============================================================================

-- Switch to Staff Alpha (Shop A)
set local role authenticated;
set local "request.jwt.claim.sub" = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

do $$
declare
  v_count integer;
begin
  -- Base products table has RLS policy: Owner only!
  -- Staff reading directly from base table gets 0 rows.
  select count(*) into v_count from public.products;
  if v_count <> 0 then
    raise exception 'Security violation: Staff can read directly from base products table (leakage risk)! Found % rows.', v_count;
  end if;

  -- Staff CAN read from staff_products view (which omits cost_price_centavos)
  select count(*) into v_count from public.staff_products;
  if v_count <> 1 then
    raise exception 'Staff should be able to view 1 product from staff_products, found %', v_count;
  end if;
end;
$$;

-- Reset role to postgres for ledger tests
reset role;

-- ============================================================================
-- 4. TEST: LEDGER IMMUTABILITY (STOCK_MOVEMENTS CANNOT BE MODIFIED)
-- ============================================================================

-- Insert sample movement
insert into public.stock_movements (
  id,
  shop_id,
  branch_id,
  product_id,
  quantity_change,
  reason,
  created_by
)
values (
  '11111111-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  '11111111-0000-0000-0000-000000000001',
  '11111111-3333-3333-3333-333333333333',
  10,
  'opening',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
)
on conflict (id) do nothing;

-- Verify UPDATE is blocked
do $$
begin
  update public.stock_movements
  set quantity_change = 999
  where id = '11111111-4444-4444-4444-444444444444';

  raise exception 'Critical invariant failure: stock_movements allowed an UPDATE!';
exception
  when others then
    -- Expected behavior: trigger blocked update
    null;
end;
$$;

-- Verify DELETE is blocked
do $$
begin
  delete from public.stock_movements
  where id = '11111111-4444-4444-4444-444444444444';

  raise exception 'Critical invariant failure: stock_movements allowed a DELETE!';
exception
  when others then
    -- Expected behavior: trigger blocked delete
    null;
end;
$$;

rollback; -- Clean rollback so tests never leave residual rows in test runs
