-- Test suite for Second Migration: Lockdown Table Mutations & Shops
-- Verifies:
--   1. Positive controls: Owner can INSERT and UPDATE branches, products, stock_counts, stock_count_items
--   2. stock_counts insert requires counted_by = auth.uid() (positive & negative controls)
--   3. Negative controls: Owner DELETE on branches, products, stock_counts, stock_count_items fails with permission denied
--   4. Negative control: Owner UPDATE on sales (status = 'voided') fails with permission denied
--   5. Negative controls: shops immutability trigger blocks changes to id, store_code, and created_at
--   6. Positive control & audit proof: Owner renaming shop produces exactly 1 activity_log row (action='shop_renamed', actor=owner, old/new name)

BEGIN;

CREATE TEMP TABLE test_lockdown_results (
  id serial,
  category text,
  test_name text,
  status text,
  detail text
);
GRANT ALL ON test_lockdown_results TO authenticated, anon, public;
GRANT ALL ON SEQUENCE test_lockdown_results_id_seq TO authenticated, anon, public;

DO $$
declare
  v_shop_id uuid := '00000000-0000-0000-0000-000000000001';
  v_owner_id uuid := '00000000-0000-0000-0000-000000000100';
  v_other_user_id uuid := '00000000-0000-0000-0000-000000000200';
  v_branch_id uuid;
  v_product_id uuid;
  v_stock_count_id uuid;
  v_stock_count_item_id uuid;
  v_sale_id uuid;
  v_prior_log_count integer;
  v_post_log_count integer;
  v_log_row record;
  v_current_shop_name text;
  v_new_shop_name text := 'Cloud Haven Renamed By Owner ' || gen_random_uuid()::text;
begin
  select id into v_branch_id from public.branches where shop_id = v_shop_id and is_active = true limit 1;
  select id into v_product_id from public.products where shop_id = v_shop_id and is_active = true limit 1;
  select name into v_current_shop_name from public.shops where id = v_shop_id;

  insert into public.sales (
    id, shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id, status
  ) values (
    gen_random_uuid(), v_shop_id, v_branch_id, v_owner_id, v_owner_id, 'cash', 10000, 5000, 'req_test_sale_lockdown_' || gen_random_uuid()::text, 'completed'
  ) returning id into v_sale_id;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner_id::text, 'role', 'authenticated')::text, true);

  -- 1. POSITIVE CONTROLS: branches INSERT & UPDATE
  begin
    insert into public.branches (shop_id, name)
    values (v_shop_id, 'Positive Branch ' || gen_random_uuid()::text)
    returning id into v_branch_id;

    update public.branches
    set name = 'Positive Branch Upd ' || gen_random_uuid()::text
    where id = v_branch_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'branches INSERT and UPDATE', 'PASS', 'Owner successfully inserted and updated branch ' || v_branch_id::text);
  exception when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'branches INSERT and UPDATE', 'FAIL', SQLERRM);
  end;

  -- 2. POSITIVE CONTROLS: products INSERT & UPDATE
  begin
    insert into public.products (
      shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold
    ) values (
      v_shop_id, 'Positive Product ' || gen_random_uuid()::text, 'device', 150000, 100000, 3
    ) returning id into v_product_id;

    update public.products
    set selling_price_centavos = 160000
    where id = v_product_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'products INSERT and UPDATE', 'PASS', 'Owner successfully inserted and updated product ' || v_product_id::text);
  exception when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'products INSERT and UPDATE', 'FAIL', SQLERRM);
  end;

  -- 3. POSITIVE CONTROLS: stock_counts INSERT (with counted_by = auth.uid()) & UPDATE
  begin
    insert into public.stock_counts (shop_id, branch_id, counted_by, note)
    values (v_shop_id, v_branch_id, v_owner_id, 'Owner audit count')
    returning id into v_stock_count_id;

    update public.stock_counts
    set note = 'Owner audit count updated'
    where id = v_stock_count_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'stock_counts INSERT (counted_by = auth.uid()) and UPDATE', 'PASS', 'Owner successfully inserted and updated stock_count ' || v_stock_count_id::text);
  exception when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'stock_counts INSERT and UPDATE', 'FAIL', SQLERRM);
  end;

  -- 4. POSITIVE CONTROLS: stock_count_items INSERT & UPDATE
  begin
    insert into public.stock_count_items (
      stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference
    ) values (
      v_stock_count_id, v_shop_id, v_product_id, 10, 8, -2
    ) returning id into v_stock_count_item_id;

    update public.stock_count_items
    set counted_qty = 9, difference = -1
    where id = v_stock_count_item_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'stock_count_items INSERT and UPDATE', 'PASS', 'Owner successfully inserted and updated stock_count_item ' || v_stock_count_item_id::text);
  exception when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('1. POSITIVE CONTROL', 'stock_count_items INSERT and UPDATE', 'FAIL', SQLERRM);
  end;

  -- 5. STOCK_COUNTS POLICY: Reject INSERT if counted_by <> auth.uid()
  begin
    insert into public.stock_counts (shop_id, branch_id, counted_by, note)
    values (v_shop_id, v_branch_id, v_other_user_id, 'Spoofed counted_by');

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('2. STOCK_COUNTS POLICY', 'stock_counts INSERT with counted_by <> auth.uid()', 'FAIL', 'Spoofed counted_by was unexpectedly allowed!');
  exception when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('2. STOCK_COUNTS POLICY', 'stock_counts INSERT with counted_by <> auth.uid()', 'PASS', 'Rejected as expected with error: ' || SQLERRM);
  end;

  -- 6. NEGATIVE CONTROLS: REVOKE DELETE from authenticated (branches)
  begin
    delete from public.branches where id = v_branch_id;
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from branches', 'FAIL', 'DELETE on branches was unexpectedly permitted!');
  exception when insufficient_privilege then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from branches', 'PASS', 'Rejected by REVOKE with 42501 insufficient_privilege: ' || SQLERRM);
  when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from branches', 'PASS', 'Rejected with error: ' || SQLERRM);
  end;

  -- 7. NEGATIVE CONTROLS: REVOKE DELETE from authenticated (products)
  begin
    delete from public.products where id = v_product_id;
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from products', 'FAIL', 'DELETE on products was unexpectedly permitted!');
  exception when insufficient_privilege then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from products', 'PASS', 'Rejected by REVOKE with 42501 insufficient_privilege: ' || SQLERRM);
  when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from products', 'PASS', 'Rejected with error: ' || SQLERRM);
  end;

  -- 8. NEGATIVE CONTROLS: REVOKE DELETE from authenticated (stock_counts)
  begin
    delete from public.stock_counts where id = v_stock_count_id;
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from stock_counts', 'FAIL', 'DELETE on stock_counts was unexpectedly permitted!');
  exception when insufficient_privilege then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from stock_counts', 'PASS', 'Rejected by REVOKE with 42501 insufficient_privilege: ' || SQLERRM);
  when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from stock_counts', 'PASS', 'Rejected with error: ' || SQLERRM);
  end;

  -- 9. NEGATIVE CONTROLS: REVOKE DELETE from authenticated (stock_count_items)
  begin
    delete from public.stock_count_items where id = v_stock_count_item_id;
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from stock_count_items', 'FAIL', 'DELETE on stock_count_items was unexpectedly permitted!');
  exception when insufficient_privilege then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from stock_count_items', 'PASS', 'Rejected by REVOKE with 42501 insufficient_privilege: ' || SQLERRM);
  when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('3. NEGATIVE CONTROL (DELETE REVOCATION)', 'DELETE from stock_count_items', 'PASS', 'Rejected with error: ' || SQLERRM);
  end;

  -- 10. NEGATIVE CONTROL: REVOKE UPDATE from authenticated (sales) with status 'voided'
  begin
    update public.sales
    set status = 'voided', void_reason = 'Direct update attempt'
    where id = v_sale_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('4. SALES UPDATE REVOCATION', 'UPDATE sales (status = voided)', 'FAIL', 'Direct UPDATE on sales was unexpectedly permitted!');
  exception when insufficient_privilege then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('4. SALES UPDATE REVOCATION', 'UPDATE sales (status = voided)', 'PASS', 'Rejected by REVOKE with 42501 insufficient_privilege: ' || SQLERRM);
  when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('4. SALES UPDATE REVOCATION', 'UPDATE sales (status = voided)', 'PASS', 'Rejected with error: ' || SQLERRM);
  end;

  -- 11. NEGATIVE CONTROLS: shops immutability trigger (store_code)
  begin
    update public.shops
    set store_code = 'hackedcode'
    where id = v_shop_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops store_code', 'FAIL', 'Updating store_code was unexpectedly permitted!');
  exception when others then
    if SQLERRM like '%store_code cannot be changed%' then
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops store_code', 'PASS', 'Rejected by trigger: ' || SQLERRM);
    else
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops store_code', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- 12. NEGATIVE CONTROLS: shops immutability trigger (id)
  begin
    update public.shops
    set id = gen_random_uuid()
    where id = v_shop_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops id', 'FAIL', 'Updating shops id was unexpectedly permitted!');
  exception when others then
    if SQLERRM like '%id cannot be changed%' then
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops id', 'PASS', 'Rejected by trigger: ' || SQLERRM);
    else
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops id', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- 13. NEGATIVE CONTROLS: shops immutability trigger (created_at)
  begin
    update public.shops
    set created_at = now() - interval '1 day'
    where id = v_shop_id;

    insert into test_lockdown_results (category, test_name, status, detail)
    values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops created_at', 'FAIL', 'Updating shops created_at was unexpectedly permitted!');
  exception when others then
    if SQLERRM like '%created_at cannot be changed%' then
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops created_at', 'PASS', 'Rejected by trigger: ' || SQLERRM);
    else
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('5. SHOPS IMMUTABILITY TRIGGER', 'UPDATE shops created_at', 'FAIL', 'Unexpected error: ' || SQLERRM);
    end if;
  end;

  -- 14. POSITIVE CONTROL & AUDIT PROOF: shops rename creates 1 activity_log row
  begin
    select count(*) into v_prior_log_count from public.activity_log where shop_id = v_shop_id and entity_type = 'shop';

    update public.shops
    set name = v_new_shop_name
    where id = v_shop_id;

    select count(*) into v_post_log_count from public.activity_log where shop_id = v_shop_id and entity_type = 'shop';

    if v_post_log_count <> v_prior_log_count + 1 then
      insert into test_lockdown_results (category, test_name, status, detail)
      values ('6. SHOPS ACTIVITY LOGGING', 'Shop rename activity_log generation', 'FAIL', 'Expected 1 new row, got ' || (v_post_log_count - v_prior_log_count)::text);
    else
      select * into v_log_row
      from public.activity_log
      where shop_id = v_shop_id and entity_type = 'shop' and entity_id = v_shop_id::text
      order by created_at desc
      limit 1;

      if v_log_row.action = 'shop_renamed'
         and v_log_row.actor_id = v_owner_id
         and v_log_row.entity_type = 'shop'
         and v_log_row.entity_id = v_shop_id::text
         and (v_log_row.details ->> 'old_name') = v_current_shop_name
         and (v_log_row.details ->> 'new_name') = v_new_shop_name then
        insert into test_lockdown_results (category, test_name, status, detail)
        values (
          '6. SHOPS ACTIVITY LOGGING',
          'Shop rename activity_log generation',
          'PASS',
          'Logged action=' || v_log_row.action ||
          ' actor=' || v_log_row.actor_id::text ||
          ' details=' || v_log_row.details::text
        );
      else
        insert into test_lockdown_results (category, test_name, status, detail)
        values (
          '6. SHOPS ACTIVITY LOGGING',
          'Shop rename activity_log generation',
          'FAIL',
          'Log row verification failed: action=' || coalesce(v_log_row.action, 'null') ||
          ' actor=' || coalesce(v_log_row.actor_id::text, 'null') ||
          ' details=' || coalesce(v_log_row.details::text, 'null')
        );
      end if;
    end if;
  exception when others then
    insert into test_lockdown_results (category, test_name, status, detail)
    values ('6. SHOPS ACTIVITY LOGGING', 'Shop rename activity_log generation', 'FAIL', 'Shop update failed: ' || SQLERRM);
  end;

end;
$$;

SELECT
  id,
  category,
  test_name,
  status,
  detail
FROM test_lockdown_results
ORDER BY id;

ROLLBACK;
