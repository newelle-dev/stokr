-- supabase/tests/composite_foreign_keys_test.sql
-- Comprehensive verification of shop-scoped composite foreign keys & delete protection.
-- Tests:
--   1. All cross-tenant references fail with foreign_key_violation (SQLSTATE 23503).
--   2. All same-shop references succeed (positive controls).
--   3. Deleting records with history (branch, product, profile, sale) is refused (23503).

begin;

create temp table if not exists cfk_test_results (
  id serial,
  test_name text,
  target_table text,
  reference_col text,
  status text,
  detail text
);

delete from cfk_test_results;

create or replace function pg_temp.record_cfk(p_name text, p_table text, p_col text, p_status text, p_detail text)
returns void language plpgsql as $$
begin
  insert into cfk_test_results (test_name, target_table, reference_col, status, detail)
  values (p_name, p_table, p_col, p_status, p_detail);
end;
$$;

-- Setup test fixtures
create temp table if not exists cfk_fixtures (
  shop_a uuid,
  shop_b uuid,
  branch_a uuid,
  branch_b uuid,
  user_a uuid,
  user_b uuid,
  prod_a uuid,
  prod_b uuid,
  sale_a uuid,
  sale_b uuid,
  count_a uuid,
  count_b uuid
);

delete from cfk_fixtures;

insert into cfk_fixtures values (
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000010',
  'b0000000-0000-0000-0000-000000000020',
  'a0000000-0000-0000-0000-000000000100',
  'b0000000-0000-0000-0000-000000000200',
  'a0000000-0000-0000-0000-000000000300',
  'b0000000-0000-0000-0000-000000000400',
  'a0000000-0000-0000-0000-000000000500',
  'b0000000-0000-0000-0000-000000000600',
  'a0000000-0000-0000-0000-000000000700',
  'b0000000-0000-0000-0000-000000000800'
);

-- Seed base entities in postgres superuser role
insert into public.shops (id, name, store_code)
select shop_a, 'Shop A', 'cfkshopa' from cfk_fixtures on conflict do nothing;
insert into public.shops (id, name, store_code)
select shop_b, 'Shop B', 'cfkshopb' from cfk_fixtures on conflict do nothing;

insert into public.branches (id, shop_id, name)
select branch_a, shop_a, 'Branch A' from cfk_fixtures on conflict do nothing;
insert into public.branches (id, shop_id, name)
select branch_b, shop_b, 'Branch B' from cfk_fixtures on conflict do nothing;

insert into auth.users (id, instance_id, email, aud, role)
select user_a, '00000000-0000-0000-0000-000000000000', 'owner_a_cfk@test.local', 'authenticated', 'authenticated' from cfk_fixtures on conflict do nothing;
insert into auth.users (id, instance_id, email, aud, role)
select user_b, '00000000-0000-0000-0000-000000000000', 'owner_b_cfk@test.local', 'authenticated', 'authenticated' from cfk_fixtures on conflict do nothing;

insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select user_a, shop_a, 'Owner A CFK', 'owner', branch_a, true from cfk_fixtures on conflict do nothing;
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
select user_b, shop_b, 'Owner B CFK', 'owner', branch_b, true from cfk_fixtures on conflict do nothing;

insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos)
select prod_a, shop_a, 'Product A', 'liquid', 20000, 10000 from cfk_fixtures on conflict do nothing;
insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos)
select prod_b, shop_b, 'Product B', 'liquid', 25000, 12000 from cfk_fixtures on conflict do nothing;

insert into public.sales (id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
select sale_a, shop_a, branch_a, user_a, user_a, 'cash', 20000, 10000, 'req_sale_cfk_a' from cfk_fixtures on conflict do nothing;
insert into public.sales (id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
select sale_b, shop_b, branch_b, user_b, user_b, 'cash', 25000, 12000, 'req_sale_cfk_b' from cfk_fixtures on conflict do nothing;

insert into public.stock_counts (id, shop_id, branch_id, counted_by)
select count_a, shop_a, branch_a, user_a from cfk_fixtures on conflict do nothing;
insert into public.stock_counts (id, shop_id, branch_id, counted_by)
select count_b, shop_b, branch_b, user_b from cfk_fixtures on conflict do nothing;

-- ============================================================================
-- TEST RUNNER FOR THE 17 REFERENCES
-- ============================================================================
do $$
declare
  f record;
  v_sqlstate text;
  v_pass boolean;
  v_temp_user uuid;
begin
  select * into f from cfk_fixtures;

  -- 1. profiles.branch_id
  v_sqlstate := '00000';
  v_temp_user := gen_random_uuid();
  insert into auth.users (id, instance_id, email, aud, role) values (v_temp_user, '00000000-0000-0000-0000-000000000000', 'u1@test.local', 'authenticated', 'authenticated');
  insert into public.profiles (id, shop_id, full_name, role, branch_id, username) values (v_temp_user, f.shop_a, 'Pos Control', 'staff', f.branch_a, 'cfkuser1');
  perform pg_temp.record_cfk('Positive Control', 'profiles', 'branch_id', 'PASS', 'Same-shop branch insert succeeded');

  -- Disable trigger temporarily to test the composite foreign key directly
  alter table public.profiles disable trigger tr_validate_profile_mutation;
  v_sqlstate := '00000';
  v_temp_user := gen_random_uuid();
  insert into auth.users (id, instance_id, email, aud, role) values (v_temp_user, '00000000-0000-0000-0000-000000000000', 'u2@test.local', 'authenticated', 'authenticated');
  begin
    insert into public.profiles (id, shop_id, full_name, role, branch_id, username) values (v_temp_user, f.shop_a, 'Cross Shop', 'staff', f.branch_b, 'cfkuser2');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'profiles', 'branch_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));
  alter table public.profiles enable trigger tr_validate_profile_mutation;

  -- 2. stock_movements.branch_id
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
  values (f.shop_a, f.branch_a, f.prod_a, 10, 'opening', f.user_a);
  perform pg_temp.record_cfk('Positive Control', 'stock_movements', 'branch_id', 'PASS', 'Same-shop branch insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (f.shop_a, f.branch_b, f.prod_a, 10, 'opening', f.user_a);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_movements', 'branch_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 3. stock_movements.product_id
  v_sqlstate := '00000';
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (f.shop_a, f.branch_a, f.prod_b, 10, 'opening', f.user_a);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_movements', 'product_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 4. stock_movements.created_by
  v_sqlstate := '00000';
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (f.shop_a, f.branch_a, f.prod_a, 10, 'opening', f.user_b);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_movements', 'created_by', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 5. stock_movements.sale_id
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by, sale_id)
  values (f.shop_a, f.branch_a, f.prod_a, -1, 'adjustment', f.user_a, f.sale_a);
  perform pg_temp.record_cfk('Positive Control', 'stock_movements', 'sale_id', 'PASS', 'Same-shop sale_id insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by, sale_id)
    values (f.shop_a, f.branch_a, f.prod_a, -1, 'adjustment', f.user_a, f.sale_b);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_movements', 'sale_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 6. sales.branch_id
  insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
  values (f.shop_a, f.branch_a, f.user_a, f.user_a, 'cash', 1000, 500, 'req_pos_branch');
  perform pg_temp.record_cfk('Positive Control', 'sales', 'branch_id', 'PASS', 'Same-shop branch insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (f.shop_a, f.branch_b, f.user_a, f.user_a, 'cash', 1000, 500, 'req_fail_branch');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sales', 'branch_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 7. sales.sold_by
  v_sqlstate := '00000';
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (f.shop_a, f.branch_a, f.user_b, f.user_a, 'cash', 1000, 500, 'req_fail_sold_by');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sales', 'sold_by', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 8. sales.recorded_by
  v_sqlstate := '00000';
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (f.shop_a, f.branch_a, f.user_a, f.user_b, 'cash', 1000, 500, 'req_fail_rec_by');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sales', 'recorded_by', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 9. sales.voided_by
  insert into public.sales (shop_id, branch_id, sold_by, recorded_by, voided_by, status, payment_method, total_centavos, total_cost_centavos, client_request_id)
  values (f.shop_a, f.branch_a, f.user_a, f.user_a, f.user_a, 'voided', 'cash', 1000, 500, 'req_pos_voided_by');
  perform pg_temp.record_cfk('Positive Control', 'sales', 'voided_by', 'PASS', 'Same-shop voided_by insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, voided_by, status, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (f.shop_a, f.branch_a, f.user_a, f.user_a, f.user_b, 'voided', 'cash', 1000, 500, 'req_fail_voided_by');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sales', 'voided_by', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 10. sales.corrects_sale_id
  insert into public.sales (shop_id, branch_id, sold_by, recorded_by, corrects_sale_id, payment_method, total_centavos, total_cost_centavos, client_request_id)
  values (f.shop_a, f.branch_a, f.user_a, f.user_a, f.sale_a, 'cash', 1000, 500, 'req_pos_corr_sale');
  perform pg_temp.record_cfk('Positive Control', 'sales', 'corrects_sale_id', 'PASS', 'Same-shop corrects_sale_id insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.sales (shop_id, branch_id, sold_by, recorded_by, corrects_sale_id, payment_method, total_centavos, total_cost_centavos, client_request_id)
    values (f.shop_a, f.branch_a, f.user_a, f.user_a, f.sale_b, 'cash', 1000, 500, 'req_fail_corr_sale');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sales', 'corrects_sale_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 11. sale_items.sale_id
  insert into public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
  values (f.sale_a, f.shop_a, f.prod_a, 'Product A', 1, 20000, 10000);
  perform pg_temp.record_cfk('Positive Control', 'sale_items', 'sale_id', 'PASS', 'Same-shop sale_id insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
    values (f.sale_b, f.shop_a, f.prod_a, 'Product A', 1, 20000, 10000);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sale_items', 'sale_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 12. sale_items.product_id
  v_sqlstate := '00000';
  begin
    insert into public.sale_items (sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos)
    values (f.sale_a, f.shop_a, f.prod_b, 'Product B', 1, 20000, 10000);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'sale_items', 'product_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 13. stock_counts.branch_id
  insert into public.stock_counts (shop_id, branch_id, counted_by)
  values (f.shop_a, f.branch_a, f.user_a);
  perform pg_temp.record_cfk('Positive Control', 'stock_counts', 'branch_id', 'PASS', 'Same-shop branch insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.stock_counts (shop_id, branch_id, counted_by)
    values (f.shop_a, f.branch_b, f.user_a);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_counts', 'branch_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 14. stock_counts.counted_by
  v_sqlstate := '00000';
  begin
    insert into public.stock_counts (shop_id, branch_id, counted_by)
    values (f.shop_a, f.branch_a, f.user_b);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_counts', 'counted_by', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 15. stock_count_items.stock_count_id
  insert into public.stock_count_items (stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference)
  values (f.count_a, f.shop_a, f.prod_a, 10, 10, 0);
  perform pg_temp.record_cfk('Positive Control', 'stock_count_items', 'stock_count_id', 'PASS', 'Same-shop stock_count_id insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.stock_count_items (stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference)
    values (f.count_b, f.shop_a, f.prod_a, 10, 10, 0);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_count_items', 'stock_count_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 16. stock_count_items.product_id
  v_sqlstate := '00000';
  begin
    insert into public.stock_count_items (stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference)
    values (f.count_a, f.shop_a, f.prod_b, 10, 10, 0);
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'stock_count_items', 'product_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- 17. activity_log.actor_id
  insert into public.activity_log (shop_id, actor_id, action, entity_type)
  values (f.shop_a, f.user_a, 'login', 'user');
  perform pg_temp.record_cfk('Positive Control', 'activity_log', 'actor_id', 'PASS', 'Same-shop actor_id insert succeeded');

  v_sqlstate := '00000';
  begin
    insert into public.activity_log (shop_id, actor_id, action, entity_type)
    values (f.shop_a, f.user_b, 'login', 'user');
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Cross-Shop Rejection', 'activity_log', 'actor_id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('SQLSTATE: %s', v_sqlstate));

  -- ============================================================================
  -- DELETION REFUSAL TESTS (Entities with history cannot be deleted)
  -- ============================================================================

  -- 18. Refuse DELETE on Branch with history (referenced by profiles, stock_movements, sales)
  v_sqlstate := '00000';
  begin
    delete from public.branches where id = f.branch_a;
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Delete Refusal', 'branches', 'id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('Delete branch with history rejected with SQLSTATE: %s', v_sqlstate));

  -- 19. Refuse DELETE on Product with history (referenced by stock_movements, sale_items)
  v_sqlstate := '00000';
  begin
    delete from public.products where id = f.prod_a;
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Delete Refusal', 'products', 'id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('Delete product with history rejected with SQLSTATE: %s', v_sqlstate));

  -- 20. Refuse DELETE on Profile with history (referenced by sales, stock_movements, activity_log)
  v_sqlstate := '00000';
  begin
    delete from public.profiles where id = f.user_a;
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Delete Refusal', 'profiles', 'id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('Delete profile with history rejected with SQLSTATE: %s', v_sqlstate));

  -- 21. Refuse DELETE on Sale with history (referenced by sale_items, stock_movements)
  -- Disable trigger temporarily to test the composite foreign key directly
  alter table public.sales disable trigger tr_prevent_sale_deletion;
  v_sqlstate := '00000';
  begin
    delete from public.sales where id = f.sale_a;
  exception when others then get stacked diagnostics v_sqlstate = RETURNED_SQLSTATE; end;
  perform pg_temp.record_cfk('Delete Refusal', 'sales', 'id', case when v_sqlstate = '23503' then 'PASS' else 'FAIL' end, format('Delete sale with history rejected with SQLSTATE: %s', v_sqlstate));
  alter table public.sales enable trigger tr_prevent_sale_deletion;

end;
$$;

select id, status, test_name, target_table, reference_col, detail from cfk_test_results order by id;

rollback;
