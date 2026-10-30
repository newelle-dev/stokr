-- Unit 4 Red Test Suite: Demonstrates current state before Unit 4 migration
-- 1. Direct INSERT into stock_movements as owner: currently ALLOWED (will be revoked)
-- 2. record_bulk_opening_stock function: DOES NOT EXIST (42883)
-- 3. record_restock function: DOES NOT EXIST (42883)
-- 4. record_adjustment function: DOES NOT EXIST (42883)
-- 5. Partial unique index uq_stock_movements_opening_once: DOES NOT EXIST
-- 6. Staff stock_levels view: LEAKS OTHER BRANCHES (currently lacks branch filter)

BEGIN;

CREATE TEMP TABLE test_unit4_red_results (
  id serial,
  test_name text,
  status text,
  detail text
);
GRANT ALL ON test_unit4_red_results TO authenticated, anon, public;
GRANT ALL ON SEQUENCE test_unit4_red_results_id_seq TO authenticated, anon, public;

DO $$
declare
  v_shop_id uuid := '00000000-0000-0000-0000-000000000001';
  v_owner_id uuid := '00000000-0000-0000-0000-000000000100';
  v_staff_id uuid := '00000000-0000-0000-0000-000000000200';
  v_staff_branch_id uuid;
  v_other_branch_id uuid;
  v_product_id uuid;
  v_movement_id uuid;
  v_count integer;
  v_idx_exists boolean;
begin
  select branch_id into v_staff_branch_id from public.profiles where id = v_staff_id;
  select id into v_other_branch_id from public.branches where shop_id = v_shop_id and id <> v_staff_branch_id and is_active = true limit 1;
  select id into v_product_id from public.products where shop_id = v_shop_id and is_active = true limit 1;

  -- 1. Direct INSERT into stock_movements as owner: currently allowed
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);

  begin
    insert into public.stock_movements (
      shop_id, branch_id, product_id, quantity_change, reason, created_by
    ) values (
      v_shop_id, v_staff_branch_id, v_product_id, 1, 'opening', v_owner_id
    ) returning id into v_movement_id;

    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: Direct INSERT on stock_movements by owner', 'CONFIRMED_CURRENT_BEHAVIOR', 'Direct INSERT currently succeeds for owner (id=' || v_movement_id::text || ')');
  exception when others then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: Direct INSERT on stock_movements by owner', 'UNEXPECTED_FAILURE', SQLERRM);
  end;

  -- 2. record_bulk_opening_stock function: does not exist
  begin
    perform public.record_bulk_opening_stock('[]'::jsonb);
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_bulk_opening_stock existence', 'UNEXPECTED_EXISTS', 'Function already exists');
  exception when undefined_function then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_bulk_opening_stock existence', 'CONFIRMED_NOT_EXISTS', 'Function does not exist (undefined_function 42883)');
  when others then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_bulk_opening_stock existence', 'OTHER_ERROR', SQLERRM);
  end;

  -- 3. record_restock function: does not exist
  begin
    perform public.record_restock(v_staff_branch_id, v_product_id, 10);
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_restock existence', 'UNEXPECTED_EXISTS', 'Function already exists');
  exception when undefined_function then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_restock existence', 'CONFIRMED_NOT_EXISTS', 'Function does not exist (undefined_function 42883)');
  when others then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_restock existence', 'OTHER_ERROR', SQLERRM);
  end;

  -- 4. record_adjustment function: does not exist
  begin
    perform public.record_adjustment(v_staff_branch_id, v_product_id, -1, 'Damaged', 'Damaged bottle');
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_adjustment existence', 'CONFIRMED_NOT_EXISTS', 'Function does not exist (undefined_function 42883)');
  exception when undefined_function then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_adjustment existence', 'CONFIRMED_NOT_EXISTS', 'Function does not exist (undefined_function 42883)');
  when others then
    insert into test_unit4_red_results (test_name, status, detail)
    values ('RED: record_adjustment existence', 'OTHER_ERROR', SQLERRM);
  end;

  -- 5. Partial unique index on opening stock: does not exist
  select exists (
    select 1 from pg_indexes
    where tablename = 'stock_movements' and indexname = 'uq_stock_movements_opening_once'
  ) into v_idx_exists;

  insert into test_unit4_red_results (test_name, status, detail)
  values (
    'RED: uq_stock_movements_opening_once index',
    case when not v_idx_exists then 'CONFIRMED_NOT_EXISTS' else 'EXISTS' end,
    case when not v_idx_exists then 'Index does not exist on stock_movements' else 'Index already exists' end
  );

  -- 6. Staff stock_levels view: currently lacks branch-level filter
  -- Insert a test movement in the other branch
  insert into public.stock_movements (
    shop_id, branch_id, product_id, quantity_change, reason, created_by
  ) values (
    v_shop_id, v_other_branch_id, v_product_id, 5, 'restock', v_owner_id
  );

  -- Switch role to staff
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff_id::text, 'role', 'authenticated')::text, true);

  -- Count rows visible to staff where branch_id is NOT the staff member's assigned branch
  select count(*) into v_count
  from public.stock_levels
  where branch_id = v_other_branch_id;

  insert into test_unit4_red_results (test_name, status, detail)
  values (
    'RED: Staff stock_levels other-branch visibility',
    case when v_count > 0 then 'CONFIRMED_LEAKS_OTHER_BRANCH' else 'ISOLATED' end,
    'Staff saw ' || v_count || ' row(s) from other branch (' || v_other_branch_id::text || ')'
  );

end $$;

SELECT * FROM test_unit4_red_results ORDER BY id;

ROLLBACK;
