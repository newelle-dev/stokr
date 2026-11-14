-- Unit 6: void_sale and replacement-sale tests. Run on the DEV project only (fake data).
-- Paste into the Supabase SQL Editor and choose "Run without RLS".
-- One DO block that always ends in an exception, so all test data rolls back.
-- PASS = final error text starts with "UNIT6 PASS". A failed check raises "FAIL: <name>" instead.
-- Needs the same seed data as unit5_record_sale_tests.sql (shop ...0001, owner ...0100,
-- staff ...0200 at Main ...0010, Annex ...0020, products ...0301 Relx and ...0304 Bacon).
do $$
declare
  c_shop   constant uuid := '00000000-0000-4000-8000-000000000001';
  c_owner  constant uuid := '00000000-0000-4000-8000-000000000100';
  c_staff  constant uuid := '00000000-0000-4000-8000-000000000200';
  c_main   constant uuid := '00000000-0000-4000-8000-000000000010';
  c_relx   constant uuid := '00000000-0000-4000-8000-000000000301';
  c_bacon  constant uuid := '00000000-0000-4000-8000-000000000304';
  c_shop2  constant uuid := '00000000-0000-4000-8000-0000000000f1';
  c_owner2 constant uuid := '00000000-0000-4000-8000-0000000000f4';
  v_r jsonb;
  v_a uuid;
  v_b uuid;
  v_n integer := 0;
  v_relx_before bigint;
  v_relx_sold bigint;
  v_relx_after bigint;
  v_state text;
begin
  -- Helpers: call as a given user, return result or {"error": message}
  create function pg_temp.as_user(p_user uuid) returns void language plpgsql as $f$
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), true);
  end $f$;

  create function pg_temp.try_void(p_user uuid, p_sale uuid, p_reason text)
  returns jsonb language plpgsql as $f$
  begin
    perform pg_temp.as_user(p_user);
    return public.void_sale(p_sale, p_reason);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end $f$;

  create function pg_temp.try_sale(p_user uuid, p_items jsonb, p_req text, p_corrects uuid default null)
  returns jsonb language plpgsql as $f$
  begin
    perform pg_temp.as_user(p_user);
    return public.record_sale('00000000-0000-4000-8000-000000000010'::uuid, 'cash', p_items, p_req, p_corrects);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end $f$;

  create function pg_temp.stock(p_product uuid) returns bigint language sql as $f$
    select coalesce(sum(quantity_change), 0) from public.stock_movements
    where shop_id = '00000000-0000-4000-8000-000000000001'
      and branch_id = '00000000-0000-4000-8000-000000000010' and product_id = p_product $f$;

  -- Test stock at Main (as the owner)
  perform pg_temp.as_user(c_owner);
  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change, reason, note, created_by)
    values (c_shop, c_main, c_relx, 10, 'restock', 'u6 test stock', c_owner),
           (c_shop, c_main, c_bacon, 5, 'restock', 'u6 test stock', c_owner);
  v_relx_before := pg_temp.stock(c_relx);

  -- Sale A by staff: 2 x Relx + 1 x Bacon
  v_r := pg_temp.try_sale(c_staff, jsonb_build_array(
    jsonb_build_object('product_id', c_relx, 'quantity', 2),
    jsonb_build_object('product_id', c_bacon, 'quantity', 1)), 'u6-sale-a');
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: setup sale A (%)', v_r; end if;
  v_a := (v_r->>'sale_id')::uuid;
  v_relx_sold := pg_temp.stock(c_relx);
  if v_relx_sold <> v_relx_before - 2 then raise exception 'FAIL: setup stock after sale A'; end if;

  -- 1. Staff cannot void
  v_r := pg_temp.try_void(c_staff, v_a, 'staff trying');
  if coalesce(v_r->>'error', '') not like 'Forbidden: Only the owner can void%' then
    raise exception 'FAIL: staff cannot void (%)', v_r; end if;
  v_n := v_n + 1;
  if (select status from public.sales where id = v_a) <> 'completed' then
    raise exception 'FAIL: sale untouched after staff void attempt'; end if;
  v_n := v_n + 1;

  -- 2. Not logged in
  v_r := pg_temp.try_void(null, v_a, 'nobody');
  if coalesce(v_r->>'error', '') not like 'Unauthorized%' then raise exception 'FAIL: no login rejected (%)', v_r; end if;
  v_n := v_n + 1;

  -- 3. Reason is required and limited
  v_r := pg_temp.try_void(c_owner, v_a, '   ');
  if coalesce(v_r->>'error', '') not like 'Invalid reason%' then raise exception 'FAIL: blank reason rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_void(c_owner, v_a, null);
  if coalesce(v_r->>'error', '') not like 'Invalid reason%' then raise exception 'FAIL: null reason rejected (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_void(c_owner, v_a, repeat('x', 201));
  if coalesce(v_r->>'error', '') not like 'Invalid reason%' then raise exception 'FAIL: 201-char reason rejected (%)', v_r; end if;
  v_n := v_n + 1;

  -- 4. Owner voids: sale stays visible as voided, stock returns, log written
  v_r := pg_temp.try_void(c_owner, v_a, 'Wrong item rung up');
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: owner void succeeds (%)', v_r; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.sales where id = v_a and status = 'voided'
      and void_reason = 'Wrong item rung up' and voided_by = c_owner and voided_at is not null
      and total_centavos = 70000) then
    raise exception 'FAIL: sale row is voided with reason/by/at and keeps its total'; end if;
  v_n := v_n + 1;
  if (select count(*) from public.sale_items where sale_id = v_a) <> 2 then
    raise exception 'FAIL: sale items still there after void'; end if;
  v_n := v_n + 1;
  if (select count(*) from public.stock_movements where sale_id = v_a and reason = 'void_return' and quantity_change > 0) <> 2
     or (select sum(quantity_change) from public.stock_movements where sale_id = v_a) <> 0 then
    raise exception 'FAIL: two void_return movements cancel the sale movements'; end if;
  v_n := v_n + 1;
  if pg_temp.stock(c_relx) <> v_relx_before or pg_temp.stock(c_bacon) <> 5 then
    raise exception 'FAIL: stock is back to where it started'; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.activity_log where shop_id = c_shop and action = 'sale_voided'
      and entity_type = 'sale' and entity_id = v_a::text and actor_id = c_owner
      and details->>'reason' = 'Wrong item rung up') then
    raise exception 'FAIL: void written to activity log'; end if;
  v_n := v_n + 1;

  -- 5. Second void is rejected and does not return stock twice
  v_r := pg_temp.try_void(c_owner, v_a, 'again');
  if coalesce(v_r->>'error', '') not like 'Conflict: this sale is already voided%' then
    raise exception 'FAIL: double void rejected (%)', v_r; end if;
  v_n := v_n + 1;
  if pg_temp.stock(c_relx) <> v_relx_before then raise exception 'FAIL: stock unchanged by double void'; end if;
  v_n := v_n + 1;

  -- 6. Unknown sale; other shop's owner cannot void our sale
  v_r := pg_temp.try_void(c_owner, '00000000-0000-4000-8000-00000000ffff', 'x');
  if coalesce(v_r->>'error', '') not like 'Sale not found%' then raise exception 'FAIL: unknown sale (%)', v_r; end if;
  v_n := v_n + 1;
  insert into public.shops (id, name, store_code) values (c_shop2, 'U6 Other Shop', 'u6other');
  insert into auth.users (id, email) values (c_owner2, 'u6-owner2@example.invalid');
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.profiles (id, shop_id, full_name, role) values (c_owner2, c_shop2, 'U6 Other Owner', 'owner');
  -- a second, still-completed sale to attack
  v_r := pg_temp.try_sale(c_staff, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 1)), 'u6-sale-b');
  v_b := (v_r->>'sale_id')::uuid;
  v_r := pg_temp.try_void(c_owner2, v_b, 'cross shop');
  if coalesce(v_r->>'error', '') not like 'Sale not found%' then
    raise exception 'FAIL: other shop cannot void our sale (%)', v_r; end if;
  v_n := v_n + 1;
  if (select status from public.sales where id = v_b) <> 'completed' then
    raise exception 'FAIL: sale B untouched by other shop'; end if;
  v_n := v_n + 1;

  -- 7. Replacement rules
  v_r := pg_temp.try_sale(c_staff, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 1)),
    'u6-staff-repl', v_a);
  if coalesce(v_r->>'error', '') not like 'Forbidden: Only the owner can record a replacement%' then
    raise exception 'FAIL: staff cannot record a replacement (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_owner, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 1)),
    'u6-repl-completed', v_b);
  if coalesce(v_r->>'error', '') not like 'Conflict: only a voided sale can be replaced%' then
    raise exception 'FAIL: completed sale cannot be replaced (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_owner2, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 1)),
    'u6-repl-xshop', v_a);
  if coalesce(v_r->>'error', '') not like 'Original sale not found%'
     and coalesce(v_r->>'error', '') not like 'Branch not found%' then
    raise exception 'FAIL: other shop cannot replace our sale (%)', v_r; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_owner, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 2)),
    'u6-repl-ok', v_a);
  if v_r->>'success' is distinct from 'true' then raise exception 'FAIL: owner replacement succeeds (%)', v_r; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.sales where id = (v_r->>'sale_id')::uuid
      and corrects_sale_id = v_a and sold_by = c_staff and recorded_by = c_owner and status = 'completed') then
    raise exception 'FAIL: replacement keeps original seller, owner recorded it, linked to original'; end if;
  v_n := v_n + 1;
  if not exists (select 1 from public.activity_log where action = 'sale_replacement_recorded'
      and entity_id = (v_r->>'sale_id') and actor_id = c_owner) then
    raise exception 'FAIL: replacement written to activity log'; end if;
  v_n := v_n + 1;
  if pg_temp.stock(c_relx) <> v_relx_before - 1 - 2 then
    raise exception 'FAIL: replacement took stock out (B 1 + replacement 2)'; end if;
  v_n := v_n + 1;
  v_r := pg_temp.try_sale(c_owner, jsonb_build_array(jsonb_build_object('product_id', c_relx, 'quantity', 1)),
    'u6-repl-second', v_a);
  if coalesce(v_r->>'error', '') not like 'Conflict: this sale already has a replacement%' then
    raise exception 'FAIL: only one replacement per original (%)', v_r; end if;
  v_n := v_n + 1;

  -- 8. Database rules hold even for direct writes
  begin
    update public.sales set status = 'voided' where id = v_b;
    raise exception 'FAIL: voided without reason must be refused';
  exception when check_violation then null;
  end;
  v_n := v_n + 1;
  begin
    update public.sales set corrects_sale_id = id where id = v_b;
    raise exception 'FAIL: self-correcting sale must be refused';
  exception when check_violation then null;
  end;
  v_n := v_n + 1;

  -- 9. Direct UPDATE / DELETE / INSERT on sales and sale_items refused for owner and staff
  declare
    u uuid;
    stmt text;
  begin
    foreach u in array array[c_owner, c_staff] loop
      perform pg_temp.as_user(u);
      set local role authenticated;
      foreach stmt in array array[
        format('update public.sales set total_centavos = 1 where id = %L', v_b),
        format('delete from public.sales where id = %L', v_b),
        format('update public.sale_items set quantity = 99 where sale_id = %L', v_b),
        format('delete from public.sale_items where sale_id = %L', v_b),
        format('insert into public.sales (shop_id, branch_id, sold_by, recorded_by, payment_method, total_centavos, total_cost_centavos, client_request_id) values (%L, %L, %L, %L, ''cash'', 1, 1, ''u6-direct'')', c_shop, c_main, u, u)
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
  if (select total_centavos from public.sales where id = v_b) <> 25000 then
    raise exception 'FAIL: sale B total unchanged'; end if;
  v_n := v_n + 1;

  raise exception 'UNIT6 PASS: % checks passed (all test data rolled back)', v_n;
end;
$$;
