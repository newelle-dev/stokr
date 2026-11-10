-- Unit 5: record_sale tests. Run on the DEV project only (fake data).
-- Everything runs in one DO block that always ends in an exception, so all test data rolls back.
-- PASS = final error text starts with "UNIT5 PASS". A failed check raises "FAIL: <name>" instead.
-- Needs the seed data: shop ...0001, owner ...0100, staff ...0200 (Main branch ...0010),
-- Annex branch ...0020, products ...0301-0304, and the staff d0f1cbb8-... who must still change password.
do $$
declare
  c_shop   constant uuid := '00000000-0000-0000-0000-000000000001';
  c_owner  constant uuid := '00000000-0000-0000-0000-000000000100';
  c_staff  constant uuid := '00000000-0000-0000-0000-000000000200';
  c_locked constant uuid := 'd0f1cbb8-60d7-40f0-af20-032f28ae7b8e';
  c_main   constant uuid := '00000000-0000-0000-0000-000000000010';
  c_annex  constant uuid := '00000000-0000-0000-0000-000000000020';
  c_relx   constant uuid := '00000000-0000-0000-0000-000000000301';
  c_zero   constant uuid := '00000000-0000-0000-0000-0000000000f5'; -- test product created below, never has stock
  c_bacon  constant uuid := '00000000-0000-0000-0000-000000000304';
  c_shop2  constant uuid := '00000000-0000-0000-0000-0000000000f1';
  c_branch2 constant uuid := '00000000-0000-0000-0000-0000000000f2';
  c_owner2 constant uuid := '00000000-0000-0000-0000-0000000000f4';
  v_r jsonb;
  v_sale uuid;
  v_n integer := 0;
  v_before bigint;
  v_after bigint;
  v_items jsonb;
  v_items_expected integer;
begin
  -- Helper: call record_sale as a given user, return result or {"error": message}
  create function pg_temp.try_sale(p_user uuid, p_branch uuid, p_method text, p_items jsonb, p_req text)
  returns jsonb language plpgsql as $f$
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
    return public.record_sale(p_branch, p_method, p_items, p_req);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end $f$;

  -- Test stock at Main so the first sale is not a zero-stock sale (dev data has no opening stock)
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, note, created_by)
    values (c_shop, c_main, c_relx, 10, 'restock', 'u5 test stock', c_owner),
           (c_shop, c_main, c_bacon, 5, 'restock', 'u5 test stock', c_owner);

  -- Own zero-stock product, so the zero-stock check never depends on what dev data has (the product log needs an actor)
  perform set_config('request.jwt.claims', json_build_object('sub', c_owner, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_owner::text, true);
  insert into public.products (id, shop_id, name, category, selling_price_centavos, cost_price_centavos)
    values (c_zero, c_shop, 'U5 Zero Stock Test', 'other', 35000, 22000);

  -- 1. Staff sells at own branch (2 x Relx + 1 x Bacon, cash)
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 2),
    jsonb_build_object('product_id', c_bacon, 'quantity', 1)), 'u5-sale-1');
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: staff sale succeeds (%)', v_r; end if;
  v_n := v_n + 1;
  if (v_r->>'total_centavos')::bigint <> 70000 then raise exception 'FAIL: total is 70000 (%)', v_r; end if;
  v_n := v_n + 1;
  if v_r ? 'total_cost_centavos' then raise exception 'FAIL: result must not contain cost'; end if;
  v_n := v_n + 1;
  if v_r->'flagged_products' <> '[]'::jsonb then raise exception 'FAIL: nothing flagged yet (%)', v_r; end if;
  v_n := v_n + 1;

  select id into v_sale from public.sales where shop_id = c_shop and client_request_id = 'u5-sale-1';
  if v_sale is null then raise exception 'FAIL: sale row exists'; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.sales where id = v_sale and sold_by = c_staff
      and recorded_by = c_staff and branch_id = c_main and status = 'completed'
      and total_centavos = 70000 and total_cost_centavos = 48000 and payment_method = 'cash') then
    raise exception 'FAIL: sale row has sold_by/recorded_by/branch/totals/cost snapshot';
  end if;
  v_n := v_n + 1;
  if (select count(*) from public.sale_items where sale_id = v_sale) <> 2
     or not exists (select 1 from public.sale_items where sale_id = v_sale and product_id = c_relx
        and quantity = 2 and unit_price_centavos = 25000 and unit_cost_centavos = 18000
        and product_name = 'Relx Pod Menthol Plus') then
    raise exception 'FAIL: sale items snapshot name/price/cost';
  end if;
  v_n := v_n + 1;
  if (select count(*) from public.stock_movements where sale_id = v_sale and reason = 'sale') <> 2
     or (select sum(quantity_change) from public.stock_movements where sale_id = v_sale) <> -3 then
    raise exception 'FAIL: two negative sale movements totalling -3';
  end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.activity_log where shop_id = c_shop and action = 'sale_recorded'
      and entity_type = 'sale' and entity_id = v_sale::text and actor_id = c_staff) then
    raise exception 'FAIL: activity log entry written';
  end if;
  v_n := v_n + 1;

  -- 2. Staff cannot sell at another branch
  v_r := pg_temp.try_sale(c_staff, c_annex, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-wrong-branch');
  if coalesce(v_r->>'error', '') not like 'Forbidden: Staff can only sell at their own branch%' then
    raise exception 'FAIL: staff blocked at other branch (%)', v_r; end if;
  v_n := v_n + 1;
  if exists (select 1 from public.sales where client_request_id = 'u5-wrong-branch') then
    raise exception 'FAIL: no sale saved for blocked branch'; end if;
  v_n := v_n + 1;

  -- 3. Double tap: same request id returns the same sale, nothing new written
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 2),
    jsonb_build_object('product_id', c_bacon, 'quantity', 1)), 'u5-sale-1');
  if v_r->>'duplicate' is distinct from 'true' or (v_r->>'sale_id')::uuid <> v_sale then
    raise exception 'FAIL: double tap returns existing sale (%)', v_r; end if;
  v_n := v_n + 1;
  if (select count(*) from public.sales where shop_id = c_shop and client_request_id = 'u5-sale-1') <> 1
     or (select count(*) from public.stock_movements where sale_id = v_sale) <> 2 then
    raise exception 'FAIL: double tap created extra rows'; end if;
  v_n := v_n + 1;

  -- 4. Zero stock: sale works and is flagged (the test product has no stock movements)
  v_r := pg_temp.try_sale(c_staff, c_main, 'gcash', jsonb_build_array(
    jsonb_build_object('product_id', c_zero, 'quantity', 1)), 'u5-zero-stock');
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: zero-stock sale succeeds (%)', v_r; end if;
  v_n := v_n + 1;
  if v_r->'flagged_products' <> '["U5 Zero Stock Test"]'::jsonb then
    raise exception 'FAIL: zero-stock sale is flagged (%)', v_r; end if;
  v_n := v_n + 1;
  if (select coalesce(sum(quantity_change), 0) from public.stock_movements
      where shop_id = c_shop and branch_id = c_main and product_id = c_zero) <> -1 then
    raise exception 'FAIL: stock went to -1'; end if;
  v_n := v_n + 1;
  -- Selling the last units (Bacon: 5 - 1 sold in check 1 = 4 left) is not flagged
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_bacon, 'quantity', 4)), 'u5-last-unit');
  if v_r->'flagged_products' <> '[]'::jsonb then
    raise exception 'FAIL: selling down to zero is not flagged (%)', v_r; end if;
  v_n := v_n + 1;

  -- 5. Owner sells at any branch
  v_r := pg_temp.try_sale(c_owner, c_annex, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-owner');
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: owner sells at Annex (%)', v_r; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.sales where client_request_id = 'u5-owner'
      and sold_by = c_owner and recorded_by = c_owner and branch_id = c_annex) then
    raise exception 'FAIL: owner sale has owner as sold_by'; end if;
  v_n := v_n + 1;

  -- 6. Input rules
  v_items := jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 0));
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', v_items, 'u5-q0');
  if coalesce(v_r->>'error', '') not like 'Invalid quantity%' then raise exception 'FAIL: quantity 0 rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_items := jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 1001));
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', v_items, 'u5-q1001');
  if coalesce(v_r->>'error', '') not like 'Invalid quantity%' then raise exception 'FAIL: quantity 1001 rejected (%)', v_r; end if;
  v_n := v_n + 1;
  select jsonb_agg(jsonb_build_object('product_id', c_relx, 'quantity', 1)) into v_items from generate_series(1, 51);
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', v_items, 'u5-51items');
  if coalesce(v_r->>'error', '') not like 'Invalid items%' then raise exception 'FAIL: 51 items rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', '[]'::jsonb, 'u5-empty');
  if coalesce(v_r->>'error', '') not like 'Invalid items%' then raise exception 'FAIL: empty cart rejected (%)', v_r; end if;
  v_n := v_n + 1;
  -- A null cart used to skip the check and save an empty 0-peso sale
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', null, 'u5-null-items');
  if coalesce(v_r->>'error', '') not like 'Invalid items%'
     or exists (select 1 from public.sales where client_request_id = 'u5-null-items') then
    raise exception 'FAIL: null cart rejected and nothing saved (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_staff, c_main, null, jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-null-pay');
  if coalesce(v_r->>'error', '') not like 'Invalid payment method%' then raise exception 'FAIL: null payment rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_staff, c_main, 'card', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-card');
  if coalesce(v_r->>'error', '') not like 'Invalid payment method%' then raise exception 'FAIL: card rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), '   ');
  if coalesce(v_r->>'error', '') not like 'Invalid request id%' then raise exception 'FAIL: blank request id rejected (%)', v_r; end if;
  v_n := v_n + 1;

  -- 7. Inactive product is rejected
  update public.products set is_active = false where id = c_bacon;
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_bacon, 'quantity', 1)), 'u5-inactive');
  if coalesce(v_r->>'error', '') not like 'Product not found or inactive%' then
    raise exception 'FAIL: inactive product rejected (%)', v_r; end if;
  v_n := v_n + 1;
  -- Retry of an already saved sale still returns it after its product was deactivated
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 2),
    jsonb_build_object('product_id', c_bacon, 'quantity', 1)), 'u5-sale-1');
  if v_r->>'duplicate' is distinct from 'true' or (v_r->>'sale_id')::uuid <> v_sale then
    raise exception 'FAIL: retry after product deactivated returns saved sale (%)', v_r; end if;
  v_n := v_n + 1;
  update public.products set is_active = true where id = c_bacon;

  -- 8. Atomic: a bad second line leaves no sale, no items, no stock movement
  select coalesce(sum(quantity_change), 0) into v_before from public.stock_movements
    where shop_id = c_shop and branch_id = c_main and product_id = c_relx;
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1),
    jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000ffff', 'quantity', 1)), 'u5-atomic');
  if v_r->>'error' is null then raise exception 'FAIL: bad line makes the sale fail'; end if;
  v_n := v_n + 1;
  select coalesce(sum(quantity_change), 0) into v_after from public.stock_movements
    where shop_id = c_shop and branch_id = c_main and product_id = c_relx;
  if exists (select 1 from public.sales where client_request_id = 'u5-atomic') or v_before <> v_after then
    raise exception 'FAIL: failed sale left rows behind'; end if;
  v_n := v_n + 1;

  -- 9. Not logged in / must change password
  v_r := pg_temp.try_sale(null, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-anon');
  if coalesce(v_r->>'error', '') not like 'Unauthorized%' then raise exception 'FAIL: no login rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_locked, c_annex, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-locked');
  if coalesce(v_r->>'error', '') not like 'Forbidden: Active shop membership required%' then
    raise exception 'FAIL: staff who must change password blocked (%)', v_r; end if;
  v_n := v_n + 1;

  -- 10. User from a different shop cannot sell here
  -- Second shop: its own owner creates the branch (the activity log needs an actor in that shop)
  insert into public.shops (id, name, store_code) values (c_shop2, 'U5 Other Shop', 'u5other');
  insert into auth.users (id, email) values (c_owner2, 'u5-owner2@example.invalid');
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.profiles (id, shop_id, full_name, role)
    values (c_owner2, c_shop2, 'U5 Other Owner', 'owner');
  perform set_config('request.jwt.claims',
    json_build_object('sub', c_owner2, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_owner2::text, true);
  insert into public.branches (id, shop_id, name) values (c_branch2, c_shop2, 'U5 Other Branch');
  v_r := pg_temp.try_sale(c_owner2, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-xshop-branch');
  if coalesce(v_r->>'error', '') not like 'Branch not found or inactive%' then
    raise exception 'FAIL: other-shop user cannot use our branch (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_owner2, c_branch2, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-xshop-product');
  if coalesce(v_r->>'error', '') not like 'Product not found or inactive%' then
    raise exception 'FAIL: other-shop user cannot sell our product (%)', v_r; end if;
  v_n := v_n + 1;
  -- Same request id in another shop is a different sale (unique per shop)
  v_r := pg_temp.try_sale(c_staff, c_main, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-xshop-id');
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: baseline sale for request-id check (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_owner2, c_branch2, 'cash', jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u5-xshop-id');
  if coalesce(v_r->>'error', '') not like 'Product not found or inactive%' or v_r->>'duplicate' = 'true' then
    raise exception 'FAIL: other shop never sees our sale via request id (%)', v_r; end if;
  v_n := v_n + 1;

  -- 11. my_sale_items: staff see only their own sale's items, and the view has no cost column
  select id into v_sale from public.sales where client_request_id = 'u5-owner';
  select count(*) into v_items_expected from public.sale_items si
    join public.sales s on s.id = si.sale_id where s.sold_by = c_staff;
  perform set_config('request.jwt.claims', json_build_object('sub', c_staff, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', c_staff::text, true);
  set local role authenticated;
  if (select count(*) from public.my_sale_items) <> v_items_expected then
    raise exception 'FAIL: staff sees exactly their own item lines (% expected)', v_items_expected;
  end if;
  v_n := v_n + 1;
  if exists (select 1 from public.my_sale_items where sale_id = v_sale) then
    raise exception 'FAIL: staff cannot see the owner''s sale items';
  end if;
  v_n := v_n + 1;
  reset role;
  if exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'my_sale_items' and column_name like '%cost%') then
    raise exception 'FAIL: my_sale_items has no cost column';
  end if;
  v_n := v_n + 1;

  raise exception 'UNIT5 PASS: % checks passed (all test data rolled back)', v_n;
end;
$$;
