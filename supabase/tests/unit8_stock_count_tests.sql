-- Unit 8: stock count (save / accept / cancel) tests. Run on the DEV project only (fake data).
-- Paste into the Supabase SQL Editor and choose "Run without RLS".
-- One DO block that always ends in an exception, so all test data rolls back.
-- PASS = final error text starts with "UNIT8 PASS". A failed check raises "FAIL: <name>" instead.
-- Needs the same seed data as unit5_record_sale_tests.sql (shop ...0001, owner ...0100,
-- staff ...0200 at Main ...0010, products ...0301 Relx and ...0304 Bacon).
do $$
declare
  c_shop   constant uuid := '00000000-0000-0000-0000-000000000001';
  c_owner  constant uuid := '00000000-0000-0000-0000-000000000100';
  c_staff  constant uuid := '00000000-0000-0000-0000-000000000200';
  c_main   constant uuid := '00000000-0000-0000-0000-000000000010';
  c_relx   constant uuid := '00000000-0000-0000-0000-000000000301';
  c_bacon  constant uuid := '00000000-0000-0000-0000-000000000304';
  c_shop2  constant uuid := '00000000-0000-0000-0000-0000000000f1';
  c_owner2 constant uuid := '00000000-0000-0000-0000-0000000000f4';
  v_r jsonb;
  v_count uuid;
  v_n integer := 0;
  v_relx0 bigint;
  v_bacon0 bigint;
  v_moves0 bigint;
begin
  create function pg_temp.as_user(p_user uuid) returns void language plpgsql as $f$
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  end $f$;

  create function pg_temp.try_save(p_user uuid, p_items jsonb) returns jsonb language plpgsql as $f$
  begin
    perform pg_temp.as_user(p_user);
    return public.save_stock_count('00000000-0000-0000-0000-000000000010'::uuid, 'u8 test', p_items);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end $f$;

  create function pg_temp.try_accept(p_user uuid, p_count uuid) returns jsonb language plpgsql as $f$
  begin
    perform pg_temp.as_user(p_user);
    return public.accept_stock_count(p_count);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end $f$;

  create function pg_temp.try_cancel(p_user uuid, p_count uuid) returns jsonb language plpgsql as $f$
  begin
    perform pg_temp.as_user(p_user);
    return public.cancel_stock_count(p_count);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end $f$;

  create function pg_temp.stock(p_product uuid) returns bigint language sql as $f$
    select coalesce(sum(quantity_change), 0) from public.stock_movements
    where shop_id = '00000000-0000-0000-0000-000000000001'
      and branch_id = '00000000-0000-0000-0000-000000000010' and product_id = p_product $f$;

  -- Known stock at Main: Relx 10 more, Bacon 5 more than whatever is there
  perform pg_temp.as_user(c_owner);
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, note, created_by)
    values (c_shop, c_main, c_relx, 10, 'restock', 'u8 test stock', c_owner),
           (c_shop, c_main, c_bacon, 5, 'restock', 'u8 test stock', c_owner);
  v_relx0 := pg_temp.stock(c_relx);
  v_bacon0 := pg_temp.stock(c_bacon);
  v_moves0 := (select count(*) from public.stock_movements where shop_id = c_shop);

  -- 1. Staff and logged-out users cannot save, accept or cancel
  v_r := pg_temp.try_save(c_staff, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'counted_qty', 1)));
  if coalesce(v_r->>'error', '') not like 'Forbidden%' then raise exception 'FAIL: staff cannot save (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_save(null, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'counted_qty', 1)));
  if coalesce(v_r->>'error', '') not like 'Unauthorized%' then raise exception 'FAIL: logged out cannot save (%)', v_r; end if;
  v_n := v_n + 1;

  -- 2. Bad input is rejected and leaves no count behind
  v_r := pg_temp.try_save(c_owner, '[]'::jsonb);
  if v_r->>'error' is null then raise exception 'FAIL: empty items rejected'; end if;
  v_r := pg_temp.try_save(c_owner, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'counted_qty', -1)));
  if v_r->>'error' is null then raise exception 'FAIL: negative qty rejected'; end if;
  v_r := pg_temp.try_save(c_owner, jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'counted_qty', 1),
    jsonb_build_object('product_id', c_relx, 'counted_qty', 2)));
  if v_r->>'error' is null then raise exception 'FAIL: duplicate product rejected'; end if;
  v_r := pg_temp.try_save(c_owner, jsonb_build_array(
    jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000ffff', 'counted_qty', 1)));
  if v_r->>'error' is null then raise exception 'FAIL: unknown product rejected'; end if;
  if exists (select 1 from public.stock_counts where shop_id = c_shop) then
    raise exception 'FAIL: rejected saves leave no count rows'; end if;
  v_n := v_n + 1;

  -- 3. Owner saves: Relx short by 3, Bacon has 2 extra. Stock is NOT changed by saving.
  v_r := pg_temp.try_save(c_owner, jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'counted_qty', v_relx0 - 3),
    jsonb_build_object('product_id', c_bacon, 'counted_qty', v_bacon0 + 2)));
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: owner save (%)', v_r; end if;
  v_count := (v_r->>'stock_count_id')::uuid;
  v_n := v_n + 1;
  if (select count(*) from public.stock_count_items where stock_count_id = v_count
        and ((product_id = c_relx and expected_qty = v_relx0 and counted_qty = v_relx0 - 3 and difference = -3)
          or (product_id = c_bacon and expected_qty = v_bacon0 and counted_qty = v_bacon0 + 2 and difference = 2))) <> 2 then
    raise exception 'FAIL: expected/counted/difference stored correctly'; end if;
  v_n := v_n + 1;
  if (select count(*) from public.stock_movements where shop_id = c_shop) <> v_moves0 then
    raise exception 'FAIL: saving a count does not change stock'; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.activity_log where shop_id = c_shop and action = 'stock_count_saved'
      and entity_id = v_count::text and actor_id = c_owner) then
    raise exception 'FAIL: save written to activity log'; end if;
  v_n := v_n + 1;

  -- 4. Only one open count per branch
  v_r := pg_temp.try_save(c_owner, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'counted_qty', 1)));
  if coalesce(v_r->>'error', '') not like '%already has an open count%' then
    raise exception 'FAIL: second open count rejected (%)', v_r; end if;
  v_n := v_n + 1;

  -- 5. Staff and another shop's owner cannot accept or cancel it
  v_r := pg_temp.try_accept(c_staff, v_count);
  if coalesce(v_r->>'error', '') not like 'Forbidden%' then raise exception 'FAIL: staff cannot accept (%)', v_r; end if;
  v_r := pg_temp.try_cancel(c_staff, v_count);
  if coalesce(v_r->>'error', '') not like 'Forbidden%' then raise exception 'FAIL: staff cannot cancel (%)', v_r; end if;
  insert into public.shops (id, name, store_code) values (c_shop2, 'U8 Other Shop', 'u8other');
  insert into auth.users (id, email) values (c_owner2, 'u8-owner2@example.invalid');
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.profiles (id, shop_id, full_name, role) values (c_owner2, c_shop2, 'U8 Other Owner', 'owner');
  v_r := pg_temp.try_accept(c_owner2, v_count);
  if coalesce(v_r->>'error', '') not like 'Stock count % not found.' then raise exception 'FAIL: other shop cannot accept (%)', v_r; end if;
  v_r := pg_temp.try_cancel(c_owner2, v_count);
  if coalesce(v_r->>'error', '') not like 'Stock count % not found.' then raise exception 'FAIL: other shop cannot cancel (%)', v_r; end if;
  if (select status from public.stock_counts where id = v_count) <> 'open' then
    raise exception 'FAIL: count still open after refused attempts'; end if;
  v_n := v_n + 1;

  -- 6. A sale of 1 Relx lands after the count was saved, then the owner accepts.
  --    Correction is the saved difference (-3), so the sale is kept: stock = start - 1 - 3.
  perform pg_temp.as_user(c_owner);
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, note, created_by)
    values (c_shop, c_main, c_relx, -1, 'adjustment', 'u8 simulated later sale', c_owner);
  v_r := pg_temp.try_accept(c_owner, v_count);
  if v_r->>'success' is distinct from 'true' or (v_r->>'corrections')::int <> 2 or (v_r->>'missing_units')::int <> 3 then
    raise exception 'FAIL: owner accept (%)', v_r; end if;
  v_n := v_n + 1;
  if pg_temp.stock(c_relx) <> v_relx0 - 1 - 3 or pg_temp.stock(c_bacon) <> v_bacon0 + 2 then
    raise exception 'FAIL: stock after accept keeps later sale and applies saved difference'; end if;
  v_n := v_n + 1;
  if (select count(*) from public.stock_movements where note = 'Stock count ' || v_count::text
        and reason = 'count_correction' and created_by = c_owner) <> 2 then
    raise exception 'FAIL: two count_correction movements written'; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.stock_counts where id = v_count and status = 'accepted'
      and accepted_by = c_owner and accepted_at is not null) then
    raise exception 'FAIL: count marked accepted'; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.activity_log where shop_id = c_shop and action = 'stock_count_accepted'
      and entity_id = v_count::text and actor_id = c_owner) then
    raise exception 'FAIL: accept written to activity log'; end if;
  v_n := v_n + 1;

  -- 7. Double accept and cancel-after-accept are refused; stock not corrected twice
  v_r := pg_temp.try_accept(c_owner, v_count);
  if coalesce(v_r->>'error', '') not like 'This count is already accepted%' then
    raise exception 'FAIL: double accept rejected (%)', v_r; end if;
  v_r := pg_temp.try_cancel(c_owner, v_count);
  if coalesce(v_r->>'error', '') not like 'This count is already accepted%' then
    raise exception 'FAIL: cancel after accept rejected (%)', v_r; end if;
  if pg_temp.stock(c_relx) <> v_relx0 - 1 - 3 then raise exception 'FAIL: stock unchanged by refused calls'; end if;
  v_n := v_n + 1;

  -- 8. A new count can be opened after the first was accepted; cancelling changes nothing
  v_moves0 := (select count(*) from public.stock_movements where shop_id = c_shop);
  v_r := pg_temp.try_save(c_owner, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'counted_qty', 0)));
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: new count after accept (%)', v_r; end if;
  v_count := (v_r->>'stock_count_id')::uuid;
  v_r := pg_temp.try_cancel(c_owner, v_count);
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: owner cancel (%)', v_r; end if;
  if (select status from public.stock_counts where id = v_count) <> 'cancelled'
     or (select count(*) from public.stock_movements where shop_id = c_shop) <> v_moves0 then
    raise exception 'FAIL: cancelled count changed no stock'; end if;
  v_r := pg_temp.try_accept(c_owner, v_count);
  if coalesce(v_r->>'error', '') not like 'This count is already cancelled%' then
    raise exception 'FAIL: cancelled count cannot be accepted (%)', v_r; end if;
  if not exists (select 1 from public.activity_log where shop_id = c_shop and action = 'stock_count_cancelled'
      and entity_id = v_count::text) then
    raise exception 'FAIL: cancel written to activity log'; end if;
  v_n := v_n + 1;

  -- 9. Direct INSERT / UPDATE / DELETE on both tables refused for owner and staff
  declare
    u uuid;
    stmt text;
  begin
    foreach u in array array[c_owner, c_staff] loop
      perform pg_temp.as_user(u);
      set local role authenticated;
      foreach stmt in array array[
        format('insert into public.stock_counts (shop_id, branch_id, counted_by) values (%L, %L, %L)', c_shop, c_main, u),
        format('update public.stock_counts set note = ''x'' where id = %L', v_count),
        format('delete from public.stock_counts where id = %L', v_count),
        format('insert into public.stock_count_items (stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference) values (%L, %L, %L, 1, 1, 0)', v_count, c_shop, c_bacon),
        format('update public.stock_count_items set counted_qty = 9 where stock_count_id = %L', v_count),
        format('delete from public.stock_count_items where stock_count_id = %L', v_count)
      ] loop
        begin
          execute stmt;
          reset role;
          raise exception 'FAIL: direct write allowed for % (%)', u, stmt;
        exception when insufficient_privilege then null;
        end;
        v_n := v_n + 1;
      end loop;
      reset role;
    end loop;
  end;

  -- 10. Staff cannot read counts (owner-only select)
  perform pg_temp.as_user(c_staff);
  set local role authenticated;
  if exists (select 1 from public.stock_counts) or exists (select 1 from public.stock_count_items) then
    reset role;
    raise exception 'FAIL: staff can read counts';
  end if;
  reset role;
  v_n := v_n + 1;

  raise exception 'UNIT8 PASS: % checks passed (all test data rolled back)', v_n;
end;
$$;
