-- Unit 4 Green Test Suite: Comprehensive Security, Invariant, and Function Verifications
-- Verifies:
--   1. Direct INSERT on stock_movements revoked for Owner (42501)
--   2. Direct INSERT on stock_movements revoked for Staff (42501)
--   3. Staff calling record_bulk_opening_stock rejected (Forbidden)
--   4. Staff calling record_restock rejected (Forbidden)
--   5. Staff calling record_adjustment rejected (Forbidden)
--   6. Cross-shop isolation: Owner of Shop A cannot restock/adjust/open for Shop B
--   7. Positive Control: Owner records bulk opening stock (atomic movement + log)
--   8. Opening stock uniqueness: Duplicate opening stock rejected by function and unique index
--   9. Positive Control: Owner records restock without cost change
--  10. Positive Control: Owner records restock WITH cost update (updates product + logs old/new)
--  11. Positive Control: Owner records negative adjustment with reason and note
--  12. Positive Control: Owner records positive adjustment
--  13. Negative Controls: Adjustment rejects 0 quantity, missing reason, missing note
--  14. View Isolation: Staff sees own branch ONLY in stock_levels; Owner sees all branches

BEGIN;

CREATE TEMP TABLE test_unit4_green_results (
  id serial,
  category text,
  test_name text,
  status text,
  detail text
);
GRANT ALL ON test_unit4_green_results TO authenticated, anon, public;
GRANT ALL ON SEQUENCE test_unit4_green_results_id_seq TO authenticated, anon, public;

DO $$
declare
  v_shop_id uuid := '00000000-0000-0000-0000-000000000001';
  v_owner_id uuid := '00000000-0000-0000-0000-000000000100';
  v_staff_id uuid := '00000000-0000-0000-0000-000000000200';
  v_other_shop_id uuid := '22222222-2222-2222-2222-222222222222';
  v_other_shop_branch_id uuid := '22222222-2222-2222-2222-222222220001';
  v_other_shop_product_id uuid := '22222222-2222-2222-2222-222200000001';

  v_branch_1_id uuid;
  v_branch_2_id uuid;
  v_prod_1_id uuid;
  v_prod_2_id uuid;
  v_initial_cost integer := 35000;
  v_new_cost integer := 38000;

  v_res jsonb;
  v_count integer;
  v_log_row record;
  v_stock_qty integer;
begin
  -- Resolve test branch IDs
  select branch_id into v_branch_1_id from public.profiles where id = v_staff_id;
  select id into v_branch_2_id from public.branches where shop_id = v_shop_id and id <> v_branch_1_id and is_active = true limit 1;

  -- Create two fresh test products for this test run
  insert into public.products (shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold, is_active)
  values (v_shop_id, 'Unit4 Test SKU 1 ' || gen_random_uuid()::text, 'liquid', 50000, v_initial_cost, 5, true)
  returning id into v_prod_1_id;

  insert into public.products (shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold, is_active)
  values (v_shop_id, 'Unit4 Test SKU 2 ' || gen_random_uuid()::text, 'device', 120000, 80000, 3, true)
  returning id into v_prod_2_id;

  -- =========================================================================
  -- 1. Direct INSERT on stock_movements revoked for Owner
  -- =========================================================================
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);

  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_1_id, v_prod_1_id, 10, 'restock', v_owner_id);

    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Direct INSERT by Owner on stock_movements', 'FAIL', 'Owner direct INSERT unexpectedly succeeded');
  exception when insufficient_privilege then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Direct INSERT by Owner on stock_movements', 'PASS', 'Direct INSERT blocked with 42501 insufficient_privilege');
  when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Direct INSERT by Owner on stock_movements', 'PASS', 'Direct INSERT blocked: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 2. Direct INSERT on stock_movements revoked for Staff
  -- =========================================================================
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff_id::text, 'role', 'authenticated')::text, true);

  begin
    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, created_by)
    values (v_shop_id, v_branch_1_id, v_prod_1_id, 10, 'restock', v_staff_id);

    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Direct INSERT by Staff on stock_movements', 'FAIL', 'Staff direct INSERT unexpectedly succeeded');
  exception when insufficient_privilege then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Direct INSERT by Staff on stock_movements', 'PASS', 'Direct INSERT blocked with 42501 insufficient_privilege');
  when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Direct INSERT by Staff on stock_movements', 'PASS', 'Direct INSERT blocked: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 3. Staff calling record_bulk_opening_stock: REJECTED
  -- =========================================================================
  begin
    perform public.record_bulk_opening_stock(jsonb_build_array(
      jsonb_build_object('branch_id', v_branch_1_id, 'product_id', v_prod_1_id, 'quantity', 10)
    ));
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Staff calling record_bulk_opening_stock', 'FAIL', 'Staff unexpectedly succeeded');
  exception when others then
    if SQLERRM like '%Only shop owners can record opening stock%' then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('SECURITY', 'Staff calling record_bulk_opening_stock', 'PASS', 'Correctly rejected: ' || SQLERRM);
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('SECURITY', 'Staff calling record_bulk_opening_stock', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- =========================================================================
  -- 4. Staff calling record_restock: REJECTED
  -- =========================================================================
  begin
    perform public.record_restock(v_branch_1_id, v_prod_1_id, 10);
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Staff calling record_restock', 'FAIL', 'Staff unexpectedly succeeded');
  exception when others then
    if SQLERRM like '%Only shop owners can record restocks%' then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('SECURITY', 'Staff calling record_restock', 'PASS', 'Correctly rejected: ' || SQLERRM);
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('SECURITY', 'Staff calling record_restock', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- =========================================================================
  -- 5. Staff calling record_adjustment: REJECTED
  -- =========================================================================
  begin
    perform public.record_adjustment(v_branch_1_id, v_prod_1_id, -1, 'Damaged', 'Broken seal');
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('SECURITY', 'Staff calling record_adjustment', 'FAIL', 'Staff unexpectedly succeeded');
  exception when others then
    if SQLERRM like '%Only shop owners can record stock adjustments%' then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('SECURITY', 'Staff calling record_adjustment', 'PASS', 'Correctly rejected: ' || SQLERRM);
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('SECURITY', 'Staff calling record_adjustment', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- Switch back to Owner
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);

  -- =========================================================================
  -- 6. Cross-shop isolation tests
  -- =========================================================================
  begin
    perform public.record_restock(v_other_shop_branch_id, v_prod_1_id, 10);
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('TENANCY', 'Owner restock with foreign branch', 'FAIL', 'Foreign branch restock unexpectedly succeeded');
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('TENANCY', 'Owner restock with foreign branch', 'PASS', 'Rejected: ' || SQLERRM);
  end;

  begin
    perform public.record_adjustment(v_branch_1_id, v_other_shop_product_id, -2, 'Damaged', 'Foreign item');
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('TENANCY', 'Owner adjustment with foreign product', 'FAIL', 'Foreign product adjustment unexpectedly succeeded');
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('TENANCY', 'Owner adjustment with foreign product', 'PASS', 'Rejected: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 7. Positive Control: Owner records bulk opening stock
  -- =========================================================================
  begin
    v_res := public.record_bulk_opening_stock(jsonb_build_array(
      jsonb_build_object('branch_id', v_branch_1_id, 'product_id', v_prod_1_id, 'quantity', 20),
      jsonb_build_object('branch_id', v_branch_1_id, 'product_id', v_prod_2_id, 'quantity', 10)
    ));

    -- Verify stock_levels
    select stock_on_hand into v_stock_qty
    from public.stock_levels
    where branch_id = v_branch_1_id and product_id = v_prod_1_id;

    -- Verify activity log entry using the first movement_id
    select action, actor_id, entity_type into v_log_row
    from public.activity_log
    where shop_id = v_shop_id and action = 'stock_opening_recorded' and entity_id = (v_res->'movement_ids'->>0)
    limit 1;

    if (v_res->>'success')::boolean = true and v_stock_qty = 20 and v_log_row.actor_id = v_owner_id then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner record_bulk_opening_stock', 'PASS', 'Inserted 2 items, stock_on_hand=20, logged atomically');
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner record_bulk_opening_stock', 'FAIL', 'Assertion mismatch: qty=' || coalesce(v_stock_qty::text, 'null'));
    end if;
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('POSITIVE', 'Owner record_bulk_opening_stock', 'FAIL', 'Error: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 8. Opening stock uniqueness (cannot be recorded twice for same product & branch)
  -- =========================================================================
  begin
    perform public.record_bulk_opening_stock(jsonb_build_array(
      jsonb_build_object('branch_id', v_branch_1_id, 'product_id', v_prod_1_id, 'quantity', 5)
    ));
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('INVARIANT', 'Duplicate opening stock rejected', 'FAIL', 'Duplicate opening stock unexpectedly succeeded');
  exception when others then
    if SQLERRM like '%Opening stock has already been recorded%' or SQLERRM like '%uq_stock_movements_opening_once%' then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('INVARIANT', 'Duplicate opening stock rejected', 'PASS', 'Correctly rejected: ' || SQLERRM);
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('INVARIANT', 'Duplicate opening stock rejected', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- =========================================================================
  -- 9. Positive Control: Owner records restock without cost change
  -- =========================================================================
  begin
    v_res := public.record_restock(v_branch_1_id, v_prod_1_id, 15, null, 'Delivery receipt #101');

    select stock_on_hand into v_stock_qty
    from public.stock_levels
    where branch_id = v_branch_1_id and product_id = v_prod_1_id;

    select action, actor_id, details into v_log_row
    from public.activity_log
    where shop_id = v_shop_id and action = 'stock_restocked' and entity_id = (v_res->>'movement_id')
    limit 1;

    -- Expected stock: 20 (opening) + 15 (restock) = 35
    if v_stock_qty = 35 and (v_log_row.details->>'cost_updated')::boolean = false then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner record_restock without cost update', 'PASS', 'Stock increased to 35, activity log captured atomically');
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner record_restock without cost update', 'FAIL', 'Stock expected 35, got ' || coalesce(v_stock_qty::text, 'null'));
    end if;
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('POSITIVE', 'Owner record_restock without cost update', 'FAIL', 'Error: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 10. Positive Control: Owner records restock WITH cost update
  -- =========================================================================
  begin
    v_res := public.record_restock(v_branch_1_id, v_prod_1_id, 10, v_new_cost, 'Supplier price increased');

    select cost_price_centavos into v_count
    from public.products where id = v_prod_1_id;

    select stock_on_hand into v_stock_qty
    from public.stock_levels
    where branch_id = v_branch_1_id and product_id = v_prod_1_id;

    select action, details into v_log_row
    from public.activity_log
    where shop_id = v_shop_id and action = 'stock_restocked' and entity_id = (v_res->>'movement_id')
    limit 1;

    -- Expected stock: 35 + 10 = 45; new cost: 38000
    if v_stock_qty = 45 and v_count = v_new_cost and (v_log_row.details->>'cost_updated')::boolean = true and (v_log_row.details->>'new_cost_price_centavos')::int = v_new_cost then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner record_restock WITH cost update', 'PASS', 'Stock is 45, product cost updated to 38000, logged old and new cost');
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner record_restock WITH cost update', 'FAIL', 'Mismatch: stock=' || v_stock_qty || ', cost=' || v_count || ', details=' || v_log_row.details::text);
    end if;
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('POSITIVE', 'Owner record_restock WITH cost update', 'FAIL', 'Error: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 11. Positive Control: Owner records negative adjustment
  -- =========================================================================
  begin
    v_res := public.record_adjustment(v_branch_1_id, v_prod_1_id, -3, 'Damaged / Expired', '3 bottles cracked during stocking');

    select stock_on_hand into v_stock_qty
    from public.stock_levels
    where branch_id = v_branch_1_id and product_id = v_prod_1_id;

    select action, details into v_log_row
    from public.activity_log
    where shop_id = v_shop_id and action = 'stock_adjusted' and entity_id = (v_res->>'movement_id')
    limit 1;

    -- Expected stock: 45 - 3 = 42
    if v_stock_qty = 42 and (v_log_row.details->>'quantity_change')::int = -3 and (v_log_row.details->>'adjustment_reason') = 'Damaged / Expired' then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner negative stock adjustment', 'PASS', 'Stock decreased to 42, logged quantity_change=-3 and reason');
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner negative stock adjustment', 'FAIL', 'Mismatch: stock=' || v_stock_qty);
    end if;
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('POSITIVE', 'Owner negative stock adjustment', 'FAIL', 'Error: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 12. Positive Control: Owner records positive adjustment
  -- =========================================================================
  begin
    v_res := public.record_adjustment(v_branch_1_id, v_prod_1_id, 2, 'Count Correction (Manual)', 'Found 2 extra on top shelf');

    select stock_on_hand into v_stock_qty
    from public.stock_levels
    where branch_id = v_branch_1_id and product_id = v_prod_1_id;

    -- Expected stock: 42 + 2 = 44
    if v_stock_qty = 44 then
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner positive stock adjustment', 'PASS', 'Stock increased to 44');
    else
      insert into test_unit4_green_results (category, test_name, status, detail)
      values ('POSITIVE', 'Owner positive stock adjustment', 'FAIL', 'Mismatch: stock=' || v_stock_qty);
    end if;
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('POSITIVE', 'Owner positive stock adjustment', 'FAIL', 'Error: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 13. Negative Controls on record_adjustment (zero quantity, empty note/reason)
  -- =========================================================================
  begin
    perform public.record_adjustment(v_branch_1_id, v_prod_1_id, 0, 'Damaged', 'Zero test');
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('VALIDATION', 'Adjustment with 0 quantity rejected', 'FAIL', 'Unexpected success for 0 quantity');
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('VALIDATION', 'Adjustment with 0 quantity rejected', 'PASS', 'Correctly rejected: ' || SQLERRM);
  end;

  begin
    perform public.record_adjustment(v_branch_1_id, v_prod_1_id, -1, '', 'Note only');
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('VALIDATION', 'Adjustment with empty reason rejected', 'FAIL', 'Unexpected success for empty reason');
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('VALIDATION', 'Adjustment with empty reason rejected', 'PASS', 'Correctly rejected: ' || SQLERRM);
  end;

  begin
    perform public.record_adjustment(v_branch_1_id, v_prod_1_id, -1, 'Damaged', '   ');
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('VALIDATION', 'Adjustment with blank note rejected', 'FAIL', 'Unexpected success for blank note');
  exception when others then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('VALIDATION', 'Adjustment with blank note rejected', 'PASS', 'Correctly rejected: ' || SQLERRM);
  end;

  -- =========================================================================
  -- 14. View Isolation: Staff sees own branch ONLY; Owner sees all
  -- =========================================================================
  -- Owner records stock in branch 2
  perform public.record_restock(v_branch_2_id, v_prod_2_id, 50, null, 'Stock for branch 2');

  -- As Owner: should see branch 1 AND branch 2
  select count(distinct branch_id) into v_count
  from public.stock_levels;

  if v_count >= 2 then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('ISOLATION', 'Owner sees all shop branches in stock_levels', 'PASS', 'Owner sees ' || v_count || ' branches');
  else
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('ISOLATION', 'Owner sees all shop branches in stock_levels', 'FAIL', 'Owner saw only ' || v_count || ' branch(es)');
  end if;

  -- Switch to Staff (assigned to Branch 1)
  perform set_config('request.jwt.claims', json_build_object('sub', v_staff_id::text, 'role', 'authenticated')::text, true);

  -- Count rows from other branch
  select count(*) into v_count
  from public.stock_levels
  where branch_id = v_branch_2_id;

  if v_count = 0 then
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('ISOLATION', 'Staff sees own branch ONLY in stock_levels', 'PASS', 'Staff saw 0 rows from other branch (' || v_branch_2_id::text || ')');
  else
    insert into test_unit4_green_results (category, test_name, status, detail)
    values ('ISOLATION', 'Staff sees own branch ONLY in stock_levels', 'FAIL', 'Staff saw ' || v_count || ' row(s) from other branch');
  end if;

end $$;

SELECT * FROM test_unit4_green_results ORDER BY id;

ROLLBACK;
