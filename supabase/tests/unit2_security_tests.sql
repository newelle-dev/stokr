-- supabase/tests/unit2_security_tests.sql
-- Comprehensive SQL Security & Invariant Test Suite for Unit 2.
-- Verifies:
--   1. Staff direct INSERT rejection on all 10 tables:
--      shops, branches, profiles, products, stock_movements, sales, sale_items, stock_counts, stock_count_items, activity_log.
--   2. Staff direct UPDATE rejection on all 10 tables + Owner positive controls.
--   3. Staff direct DELETE rejection on all 10 tables + Append-only positive controls.
--   4. Fixture integrity verification (proving fixtures are unchanged after staff attempts).
--   5. Actor forgery prevention (created_by, actor_id, recorded_by must equal auth.uid()).
--   6. Movement reason restrictions (direct sale/void_return rejected; restock/adjustment allowed).
--   7. Deactivated user isolation (zero rows from my_sales, staff_products, stock_levels; self-profile readable).
--   8. Profile branch shop validation (branch_id must belong to same shop).
--   9. Cross-shop profile isolation.
--   10. Last active owner demotion/deactivation protection.

begin;

-- ============================================================================
-- SETUP FIXTURES (Seeding all 10 tables)
-- ============================================================================
create temp table if not exists u2_test_results (
  id serial,
  table_name text,
  operation text,
  status text,
  detail text
);

delete from u2_test_results;
grant all on u2_test_results to authenticated;
grant usage, select on sequence u2_test_results_id_seq to authenticated;

create or replace function pg_temp.record_result(p_table text, p_op text, p_status text, p_detail text)
returns void language plpgsql security definer as $$
begin
  insert into u2_test_results (table_name, operation, status, detail)
  values (p_table, p_op, p_status, p_detail);
  raise notice '% | % | % | %', rpad(p_status, 4), rpad(p_table, 18), rpad(p_op, 24), p_detail;
end;
$$;

create temp table if not exists u2_test_params (
  shop_a_id uuid,
  shop_b_id uuid,
  branch_a_id uuid,
  branch_b_id uuid,
  owner_a_id uuid,
  staff_a_id uuid,
  owner_b_id uuid,
  product_a_id uuid,
  movement_a_id uuid,
  sale_a_id uuid,
  sale_item_a_id uuid,
  stock_count_a_id uuid,
  stock_count_item_a_id uuid,
  activity_log_a_id uuid
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
  '11111111-3333-3333-3333-333333333333',
  '11111111-4444-4444-4444-444444444444',
  '11111111-5555-5555-5555-555555555555',
  '11111111-6666-6666-6666-666666666666',
  '11111111-7777-7777-7777-777777777777',
  '11111111-8888-8888-8888-888888888888',
  '11111111-9999-9999-9999-999999999999'
);

-- 1. Seed Shops
insert into public.shops (id, name, store_code)
select shop_a_id, 'Shop Alpha', 'u2shopa' from u2_test_params on conflict do nothing;
insert into public.shops (id, name, store_code)
select shop_b_id, 'Shop Beta', 'u2shopb' from u2_test_params on conflict do nothing;

-- 2. Seed Branches
insert into public.branches (id, shop_id, name)
select branch_a_id, shop_a_id, 'Branch Alpha' from u2_test_params on conflict do nothing;
insert into public.branches (id, shop_id, name)
select branch_b_id, shop_b_id, 'Branch Beta' from u2_test_params on conflict do nothing;

-- 3. Seed Auth Users
insert into auth.users (id, instance_id, email, aud, role)
select owner_a_id, '00000000-0000-0000-0000-000000000000', 'owner_a@test.local', 'authenticated', 'authenticated' from u2_test_params on conflict do nothing;
insert into auth.users (id, instance_id, email, aud, role)
select staff_a_id, '00000000-0000-0000-0000-000000000000', 'staff_a@test.local', 'authenticated', 'authenticated' from u2_test_params on conflict do nothing;
insert into auth.users (id, instance_id, email, aud, role)
select owner_b_id, '00000000-0000-0000-0000-000000000000', 'owner_b@test.local', 'authenticated', 'authenticated' from u2_test_params on conflict do nothing;

-- 4. Seed Profiles
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select owner_a_id, shop_a_id, 'Owner A', 'owner', null, true from u2_test_params on conflict do nothing;
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active, username)
select staff_a_id, shop_a_id, 'Staff A', 'staff', branch_a_id, true, 'u2staffa' from u2_test_params on conflict do nothing;
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select owner_b_id, shop_b_id, 'Owner B', 'owner', null, true from u2_test_params on conflict do nothing;

-- 5. Seed Products
insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos, is_active)
select product_a_id, shop_a_id, 'Product Alpha', 'liquid', 30000, 15000, true from u2_test_params on conflict do nothing;

-- 6. Seed Stock Movements
insert into public.stock_movements (id, shop_id, branch_id, product_id, quantity_change, reason, created_by)
select movement_a_id, shop_a_id, branch_a_id, product_a_id, 50, 'opening', owner_a_id from u2_test_params on conflict do nothing;

-- 7. Seed Sales
insert into public.sales (id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
select sale_a_id, shop_a_id, branch_a_id, staff_a_id, owner_a_id, 'cash', 30000, 15000, 'req_fixture_1' from u2_test_params on conflict do nothing;

-- 8. Seed Sale Items
insert into public.sale_items (id, sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
select sale_item_a_id, sale_a_id, shop_a_id, product_a_id, 'Product Alpha', 1, 30000, 15000 from u2_test_params on conflict do nothing;

-- 9. Seed Stock Counts & Count Items
insert into public.stock_counts (id, shop_id, branch_id, counted_by, note)
select stock_count_a_id, shop_a_id, branch_a_id, owner_a_id, 'Initial seed count' from u2_test_params on conflict do nothing;

insert into public.stock_count_items (id, stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference)
select stock_count_item_a_id, stock_count_a_id, shop_a_id, product_a_id, 50, 50, 0 from u2_test_params on conflict do nothing;

-- 10. Seed Activity Log
insert into public.activity_log (id, shop_id, actor_id, action, entity_type)
select activity_log_a_id, shop_a_id, owner_a_id, 'seed_test', 'shop' from u2_test_params on conflict do nothing;

-- Helper to switch context
create or replace function pg_temp.act_as(user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
end;
$$;

-- ============================================================================
-- TEST 1: STAFF DIRECT INSERT REJECTION ON ALL 10 TABLES
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_id uuid := '11111111-0000-0000-0000-000000000001';
  v_prod_id uuid := '11111111-3333-3333-3333-333333333333';
  v_sale_id uuid := '11111111-5555-5555-5555-555555555555';
  v_count_id uuid := '11111111-7777-7777-7777-777777777777';
  v_err boolean;
begin
  perform pg_temp.act_as(v_staff_id);

  -- 1.1 shops
  v_err := false;
  begin insert into public.shops (name, store_code) values ('Rogue Shop', 'rogueshop'); exception when others then v_err := true; end;
  perform pg_temp.record_result('shops', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.2 branches
  v_err := false;
  begin insert into public.branches (shop_id, name) values (v_shop_id, 'Rogue Branch'); exception when others then v_err := true; end;
  perform pg_temp.record_result('branches', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.3 profiles
  v_err := false;
  begin insert into public.profiles (id, shop_id, full_name, role, branch_id, username) values (gen_random_uuid(), v_shop_id, 'Rogue Staff', 'staff', v_branch_id, 'roguestaff'); exception when others then v_err := true; end;
  perform pg_temp.record_result('profiles', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.4 products
  v_err := false;
  begin insert into public.products (shop_id, name, category, selling_price_centavos, cost_price_centavos) values (v_shop_id, 'Rogue Prod', 'device', 1000, 500); exception when others then v_err := true; end;
  perform pg_temp.record_result('products', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.5 stock_movements
  v_err := false;
  begin insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by) values (v_shop_id, v_branch_id, v_prod_id, 5, 'restock', v_staff_id); exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_movements', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.6 sales
  v_err := false;
  begin insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id) values (v_shop_id, v_branch_id, v_staff_id, v_staff_id, 'cash', 1000, 500, 'req_fail_1'); exception when others then v_err := true; end;
  perform pg_temp.record_result('sales', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.7 sale_items
  v_err := false;
  begin insert into public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos) values (v_sale_id, v_shop_id, v_prod_id, 'Product Alpha', 1, 1000, 500); exception when others then v_err := true; end;
  perform pg_temp.record_result('sale_items', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.8 stock_counts
  v_err := false;
  begin insert into public.stock_counts (shop_id, branch_id, counted_by) values (v_shop_id, v_branch_id, v_staff_id); exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_counts', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.9 stock_count_items
  v_err := false;
  begin insert into public.stock_count_items (stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference) values (v_count_id, v_shop_id, v_prod_id, 10, 10, 0); exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_count_items', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');

  -- 1.10 activity_log
  v_err := false;
  begin insert into public.activity_log (shop_id, actor_id, action, entity_type) values (v_shop_id, v_staff_id, 'tamper', 'product'); exception when others then v_err := true; end;
  perform pg_temp.record_result('activity_log', 'INSERT (Staff)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert rejected');
end;
$$;

-- ============================================================================
-- TEST 2: STAFF DIRECT UPDATE REJECTION ON ALL 10 TABLES + OWNER CONTROLS
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_count integer;
  v_err boolean;
begin
  -- 2.1 shops
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.shops set name = 'Hacked Shop' where id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('shops', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  perform pg_temp.act_as(v_owner_id);
  update public.shops set name = 'Shop Alpha Renamed' where id = v_shop_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  perform pg_temp.record_result('shops', 'UPDATE (Owner Control)', case when v_count = 1 then 'PASS' else 'FAIL' end, format('%s rows updated by owner', v_count));
  update public.shops set name = 'Shop Alpha' where id = v_shop_id; -- restore

  -- 2.2 branches
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.branches set name = 'Hacked Branch' where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('branches', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  perform pg_temp.act_as(v_owner_id);
  update public.branches set name = 'Branch Alpha Renamed' where shop_id = v_shop_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  perform pg_temp.record_result('branches', 'UPDATE (Owner Control)', case when v_count = 1 then 'PASS' else 'FAIL' end, format('%s rows updated by owner', v_count));
  update public.branches set name = 'Branch Alpha' where shop_id = v_shop_id; -- restore

  -- 2.3 profiles
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.profiles set role = 'owner' where id = v_staff_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('profiles', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected (self-promotion blocked)', v_count));

  perform pg_temp.act_as(v_owner_id);
  update public.profiles set full_name = 'Staff A Updated' where id = v_staff_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  perform pg_temp.record_result('profiles', 'UPDATE (Owner Control)', case when v_count = 1 then 'PASS' else 'FAIL' end, format('%s rows updated by owner', v_count));
  update public.profiles set full_name = 'Staff A' where id = v_staff_id; -- restore

  -- 2.4 products
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.products set selling_price_centavos = 999999 where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('products', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  perform pg_temp.act_as(v_owner_id);
  update public.products set selling_price_centavos = 35000 where shop_id = v_shop_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  perform pg_temp.record_result('products', 'UPDATE (Owner Control)', case when v_count = 1 then 'PASS' else 'FAIL' end, format('%s rows updated by owner', v_count));
  update public.products set selling_price_centavos = 30000 where shop_id = v_shop_id; -- restore

  -- 2.5 stock_movements (Append-only ledger: no update policy exists)
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.stock_movements set quantity_change = 999 where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_movements', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  perform pg_temp.act_as(v_owner_id);
  v_count := -1;
  begin update public.stock_movements set quantity_change = 999 where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_movements', 'UPDATE (Owner Policy)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows affected (immutable ledger)');

  -- 2.6 sales
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.sales set total_centavos = 0 where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('sales', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  -- 2.7 sale_items
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.sale_items set quantity = 999 where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('sale_items', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  -- 2.8 stock_counts
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.stock_counts set note = 'Hacked' where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_counts', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  -- 2.9 stock_count_items
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.stock_count_items set counted_qty = 999 where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_count_items', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  -- 2.10 activity_log (Append-only: blocked for both staff and owner)
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin update public.activity_log set action = 'Hacked' where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('activity_log', 'UPDATE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows affected', v_count));

  perform pg_temp.act_as(v_owner_id);
  v_count := -1;
  begin update public.activity_log set action = 'Hacked' where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('activity_log', 'UPDATE (Owner Policy)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows affected (no update policy)');

  set role postgres;
  v_err := false;
  begin update public.activity_log set action = 'Hacked' where shop_id = v_shop_id; exception when others then v_err := true; end;
  perform pg_temp.record_result('activity_log', 'UPDATE (Trigger Bypass)', case when v_err then 'PASS' else 'FAIL' end, 'Strictly blocked by append-only trigger');
end;
$$;

-- ============================================================================
-- TEST 3: STAFF DIRECT DELETE REJECTION ON ALL 10 TABLES + OWNER CONTROLS
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_count integer;
  v_err boolean;
begin
  -- 3.1 shops
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.shops where id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('shops', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.2 branches
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.branches where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('branches', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.3 profiles
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.profiles where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('profiles', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.4 products
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.products where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('products', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.5 stock_movements (Append-only: blocked for both staff and owner)
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.stock_movements where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_movements', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  perform pg_temp.act_as(v_owner_id);
  v_count := -1;
  begin delete from public.stock_movements where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_movements', 'DELETE (Owner Policy)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows affected (no delete policy)');

  set role postgres;
  v_err := false;
  begin delete from public.stock_movements where shop_id = v_shop_id; exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_movements', 'DELETE (Trigger Bypass)', case when v_err then 'PASS' else 'FAIL' end, 'Strictly blocked by append-only trigger');

  -- 3.6 sales
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.sales where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('sales', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.7 sale_items
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.sale_items where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('sale_items', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.8 stock_counts
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.stock_counts where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_counts', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.9 stock_count_items
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.stock_count_items where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('stock_count_items', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  -- 3.10 activity_log (Append-only: blocked for both staff and owner)
  perform pg_temp.act_as(v_staff_id);
  v_count := -1;
  begin delete from public.activity_log where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('activity_log', 'DELETE (Staff)', case when v_count = 0 then 'PASS' else 'FAIL' end, format('%s rows deleted', v_count));

  perform pg_temp.act_as(v_owner_id);
  v_count := -1;
  begin delete from public.activity_log where shop_id = v_shop_id; GET DIAGNOSTICS v_count = ROW_COUNT; exception when others then v_count := 0; end;
  perform pg_temp.record_result('activity_log', 'DELETE (Owner Policy)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows affected (no delete policy)');

  set role postgres;
  v_err := false;
  begin delete from public.activity_log where shop_id = v_shop_id; exception when others then v_err := true; end;
  perform pg_temp.record_result('activity_log', 'DELETE (Trigger Bypass)', case when v_err then 'PASS' else 'FAIL' end, 'Strictly blocked by append-only trigger');
end;
$$;

-- ============================================================================
-- TEST 4: FIXTURE INTEGRITY VERIFICATION (Unchanged after staff attempts)
-- ============================================================================
do $$
declare
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_prod_price integer;
  v_branch_name text;
  v_staff_role text;
  v_count integer;
begin
  set role postgres;

  -- 1. shops intact
  select count(*) into v_count from public.shops where id = v_shop_id and name = 'Shop Alpha';
  if v_count <> 1 then raise exception 'Shops fixture modified or deleted!'; end if;

  -- 2. branches intact
  select count(*), max(name) into v_count, v_branch_name from public.branches where shop_id = v_shop_id;
  if v_count <> 1 or v_branch_name <> 'Branch Alpha' then raise exception 'Branches fixture modified or deleted!'; end if;

  -- 3. profiles intact
  select count(*), max(role) into v_count, v_staff_role from public.profiles where shop_id = v_shop_id and role = 'staff';
  if v_count <> 1 or v_staff_role <> 'staff' then raise exception 'Profiles fixture modified or promoted!'; end if;

  -- 4. products intact
  select count(*), max(selling_price_centavos) into v_count, v_prod_price from public.products where shop_id = v_shop_id;
  if v_count <> 1 or v_prod_price <> 30000 then raise exception 'Products fixture modified or deleted!'; end if;

  -- 5. stock_movements intact
  select count(*) into v_count from public.stock_movements where shop_id = v_shop_id;
  if v_count <> 1 then raise exception 'Stock movements fixture modified or deleted!'; end if;

  -- 6. sales intact
  select count(*) into v_count from public.sales where shop_id = v_shop_id;
  if v_count <> 1 then raise exception 'Sales fixture modified or deleted!'; end if;

  -- 7. sale_items intact
  select count(*) into v_count from public.sale_items where shop_id = v_shop_id;
  if v_count <> 1 then raise exception 'Sale items fixture modified or deleted!'; end if;

  -- 8. stock_counts intact
  select count(*) into v_count from public.stock_counts where shop_id = v_shop_id;
  if v_count <> 1 then raise exception 'Stock counts fixture modified or deleted!'; end if;

  -- 9. stock_count_items intact
  select count(*) into v_count from public.stock_count_items where shop_id = v_shop_id;
  if v_count <> 1 then raise exception 'Stock count items fixture modified or deleted!'; end if;

  -- 10. activity_log seed intact (seed row exists)
  select count(*) into v_count from public.activity_log where id = '11111111-9999-9999-9999-999999999999';
  if v_count <> 1 then raise exception 'Activity log fixture modified or deleted!'; end if;

  perform pg_temp.record_result('ALL 10 TABLES', 'INTEGRITY VERIFY', 'PASS', 'All fixture rows verified completely intact and unchanged');
end;
$$;

-- ============================================================================
-- TEST 5: ACTOR FORGERY PREVENTION
-- ============================================================================
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_id uuid := '11111111-0000-0000-0000-000000000001';
  v_prod_id uuid := '11111111-3333-3333-3333-333333333333';
  v_err boolean;
begin
  perform pg_temp.act_as(v_owner_id);

  v_err := false;
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 10, 'restock', v_staff_id);
  exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_movements', 'FORGERY (created_by)', case when v_err then 'PASS' else 'FAIL' end, 'Owner forged created_by rejected');

  -- Direct activity_log insert is completely revoked from authenticated role
  v_err := false;
  begin
    insert into public.activity_log (shop_id, actor_id, action, entity_type)
    values (v_shop_id, v_staff_id, 'audit_entry', 'product');
  exception when others then v_err := true; end;
  perform pg_temp.record_result('activity_log', 'FORGERY (actor_id)', case when v_err then 'PASS' else 'FAIL' end, 'Direct insert revoked from authenticated');

  v_err := false;
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (v_shop_id, v_branch_id, v_owner_id, v_staff_id, 'cash', 1000, 500, 'req_forge_1');
  exception when others then v_err := true; end;
  perform pg_temp.record_result('sales', 'FORGERY (recorded_by)', case when v_err then 'PASS' else 'FAIL' end, 'Owner forged recorded_by rejected');
end;
$$;

-- ============================================================================
-- TEST 6: STOCK MOVEMENT REASON RESTRICTION
-- ============================================================================
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_shop_id uuid := '11111111-1111-1111-1111-111111111111';
  v_branch_id uuid := '11111111-0000-0000-0000-000000000001';
  v_prod_id uuid := '11111111-3333-3333-3333-333333333333';
  v_err boolean;
begin
  perform pg_temp.act_as(v_owner_id);

  v_err := false;
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, -1, 'sale', v_owner_id);
  exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_movements', 'REASON (sale)', case when v_err then 'PASS' else 'FAIL' end, 'Direct reason sale rejected');

  v_err := false;
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 1, 'void_return', v_owner_id);
  exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_movements', 'REASON (void_return)', case when v_err then 'PASS' else 'FAIL' end, 'Direct reason void_return rejected');

  v_err := false;
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_id, v_prod_id, 25, 'restock', v_owner_id);
  exception when others then v_err := true; end;
  perform pg_temp.record_result('stock_movements', 'REASON (restock)', case when not v_err then 'PASS' else 'FAIL' end, 'Direct reason restock permitted for owner');
end;
$$;

-- ============================================================================
-- TEST 7: DEACTIVATED USER ISOLATION & SELF-PROFILE READ
-- ============================================================================
do $$
declare
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_count integer;
begin
  update public.profiles set is_active = false where id = v_staff_id;
  perform pg_temp.act_as(v_staff_id);

  perform pg_temp.record_result('profiles', 'DEACTIVATED (shop_id)', case when (select public.current_user_shop_id()) is null then 'PASS' else 'FAIL' end, 'current_user_shop_id returns NULL');
  perform pg_temp.record_result('profiles', 'DEACTIVATED (is_owner)', case when (select public.is_owner()) is false then 'PASS' else 'FAIL' end, 'is_owner returns false');

  select count(*) into v_count from public.my_sales;
  perform pg_temp.record_result('my_sales', 'DEACTIVATED (view)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows returned');

  select count(*) into v_count from public.staff_products;
  perform pg_temp.record_result('staff_products', 'DEACTIVATED (view)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows returned');

  select count(*) into v_count from public.stock_levels;
  perform pg_temp.record_result('stock_levels', 'DEACTIVATED (view)', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows returned');

  select count(*) into v_count from public.profiles where id = v_staff_id;
  perform pg_temp.record_result('profiles', 'DEACTIVATED (self)', case when v_count = 1 then 'PASS' else 'FAIL' end, '1 row returned (self-profile readable)');

  set role postgres;
  update public.profiles set is_active = true where id = v_staff_id;
end;
$$;

-- ============================================================================
-- TEST 8: PROFILE BRANCH SHOP VALIDATION
-- ============================================================================
do $$
declare
  v_owner_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_staff_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_branch_b_id uuid := '22222222-0000-0000-0000-000000000001';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_owner_id);

  begin
    update public.profiles set branch_id = v_branch_b_id where id = v_staff_id;
  exception when others then v_err := true; end;
  perform pg_temp.record_result('profiles', 'VALIDATION (branch shop)', case when v_err then 'PASS' else 'FAIL' end, 'Cross-shop branch assignment rejected');
end;
$$;

-- ============================================================================
-- TEST 9: CROSS-SHOP PROFILE UPDATE ISOLATION
-- ============================================================================
do $$
declare
  v_owner_b_id uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_staff_a_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_count integer;
begin
  perform pg_temp.act_as(v_owner_b_id);

  update public.profiles set full_name = 'Compromised Name' where id = v_staff_a_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  perform pg_temp.record_result('profiles', 'CROSS-SHOP UPDATE', case when v_count = 0 then 'PASS' else 'FAIL' end, '0 rows affected');
end;
$$;

-- ============================================================================
-- TEST 10: LAST ACTIVE OWNER PROTECTION
-- ============================================================================
do $$
declare
  v_owner_a_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_err boolean := false;
begin
  perform pg_temp.act_as(v_owner_a_id);

  begin
    update public.profiles set is_active = false where id = v_owner_a_id;
  exception when others then v_err := true; end;
  perform pg_temp.record_result('profiles', 'LAST OWNER (deactivate)', case when v_err then 'PASS' else 'FAIL' end, 'Self-deactivation rejected by trigger');

  v_err := false;
  begin
    update public.profiles set role = 'staff' where id = v_owner_a_id;
  exception when others then v_err := true; end;
  perform pg_temp.record_result('profiles', 'LAST OWNER (demote)', case when v_err then 'PASS' else 'FAIL' end, 'Self-demotion rejected by trigger');
end;
$$;

-- ============================================================================
-- TEST 11: PROFILE ID IMMUTABILITY
-- ============================================================================
do $$
declare
  v_owner_a_id uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_staff_a_id uuid := 'bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb';
  v_err boolean := false;
  v_msg text;
begin
  perform pg_temp.act_as(v_owner_a_id);

  begin
    update public.profiles set id = gen_random_uuid() where id = v_staff_a_id;
  exception when others then
    v_err := true;
    v_msg := sqlerrm;
  end;
  perform pg_temp.record_result(
    'profiles',
    'IMMUTABLE (id)',
    case when v_err and v_msg = 'id cannot be changed.' then 'PASS' else 'FAIL' end,
    'Update id rejected with "id cannot be changed."'
  );
end;
$$;

-- Return all explicit PASS/FAIL test lines
select id, status, table_name, operation, detail from u2_test_results order by id;

rollback;

