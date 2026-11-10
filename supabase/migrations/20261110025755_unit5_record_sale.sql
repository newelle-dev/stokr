-- Migration: 20261110025755_unit5_record_sale.sql
-- Description: Unit 5 step 1: record_sale() database function.
--   Atomic sale + items + price/cost snapshot + stock movements + activity log.
--   Double tap safe (client_request_id). Staff: own branch only. Owner: any active branch.
--   Zero stock is flagged, never blocked. Inactive products are rejected.
--   Limits: 1-50 items per sale, 1-1,000 units per line.
--   Returns no cost data (staff may call this function).
-- NOT YET APPLIED. Step 2 (revoke direct owner writes on sales/sale_items) is a separate migration.

create or replace function public.record_sale(
  p_branch_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_client_request_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_shop_id uuid;
  v_is_owner boolean;
  v_home_branch_id uuid;
  v_branch_name text;
  v_request_id text := nullif(trim(p_client_request_id), '');
  v_existing record;
  v_sale_id uuid := gen_random_uuid();
  v_item jsonb;
  v_line jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_product record;
  v_quantity integer;
  v_total bigint := 0;
  v_total_cost bigint := 0;
  v_stock_after integer;
  v_flagged jsonb := '[]'::jsonb;
begin
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  -- Null when the profile is inactive or must change its password
  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  v_is_owner := public.is_owner();
  select branch_id into v_home_branch_id from public.profiles where id = v_actor_id;

  if p_payment_method not in ('cash', 'gcash') then
    raise exception 'Invalid payment method: must be cash or gcash.';
  end if;

  if v_request_id is null or length(v_request_id) > 100 then
    raise exception 'Invalid request id: client_request_id is required (max 100 characters).';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Invalid items: a sale needs 1 to 50 items.';
  end if;

  select name into v_branch_name from public.branches
  where id = p_branch_id and shop_id = v_shop_id and is_active = true;
  if v_branch_name is null then
    raise exception 'Branch not found or inactive in current shop.';
  end if;
  if not v_is_owner and v_home_branch_id is distinct from p_branch_id then
    raise exception 'Forbidden: Staff can only sell at their own branch.';
  end if;

  -- Double tap: serialize on the request id, then return the existing sale
  perform pg_advisory_xact_lock(hashtextextended(v_shop_id::text || ':' || v_request_id, 0));
  select id, sold_by, total_centavos into v_existing
  from public.sales
  where shop_id = v_shop_id and client_request_id = v_request_id;
  if found then
    if v_existing.sold_by <> v_actor_id and not v_is_owner then
      raise exception 'Conflict: this request id was already used.';
    end if;
    return jsonb_build_object('success', true, 'duplicate', true,
      'sale_id', v_existing.id, 'total_centavos', v_existing.total_centavos);
  end if;

  -- Pass 1: validate and snapshot price and cost once, so totals match the lines
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity < 1 or v_quantity > 1000 then
      raise exception 'Invalid quantity: each item must be between 1 and 1,000.';
    end if;

    select id, name, selling_price_centavos, cost_price_centavos into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid and shop_id = v_shop_id and is_active = true;
    if v_product.id is null then
      raise exception 'Product not found or inactive in current shop.';
    end if;

    v_total := v_total + v_product.selling_price_centavos::bigint * v_quantity;
    v_total_cost := v_total_cost + v_product.cost_price_centavos::bigint * v_quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'quantity', v_quantity,
      'unit_price_centavos', v_product.selling_price_centavos,
      'unit_cost_centavos', v_product.cost_price_centavos);
  end loop;

  insert into public.sales (id, shop_id, branch_id, sold_by, recorded_by, payment_method,
    total_centavos, total_cost_centavos, client_request_id)
  values (v_sale_id, v_shop_id, p_branch_id, v_actor_id, v_actor_id, p_payment_method,
    v_total, v_total_cost, v_request_id);

  -- Pass 2: items and stock movements from the same snapshot
  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into public.sale_items (sale_id, shop_id, product_id, product_name, quantity,
      unit_price_centavos, unit_cost_centavos)
    values (v_sale_id, v_shop_id, (v_line->>'product_id')::uuid, v_line->>'product_name',
      (v_line->>'quantity')::integer, (v_line->>'unit_price_centavos')::bigint,
      (v_line->>'unit_cost_centavos')::bigint);

    insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change,
      reason, sale_id, created_by, created_at)
    values (v_shop_id, p_branch_id, (v_line->>'product_id')::uuid,
      -((v_line->>'quantity')::integer), 'sale', v_sale_id, v_actor_id, now());

    select coalesce(sum(quantity_change), 0) into v_stock_after
    from public.stock_movements
    where shop_id = v_shop_id and branch_id = p_branch_id
      and product_id = (v_line->>'product_id')::uuid;

    -- Sale still goes through; flagged when it takes stock below zero
    if v_stock_after < 0 then
      v_flagged := v_flagged || jsonb_build_array(v_line->>'product_name');
    end if;
  end loop;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details, created_at)
  values (v_shop_id, v_actor_id, 'sale_recorded', 'sale', v_sale_id::text,
    jsonb_build_object('branch_id', p_branch_id, 'branch_name', v_branch_name,
      'payment_method', p_payment_method, 'total_centavos', v_total,
      'total_cost_centavos', v_total_cost, 'item_count', jsonb_array_length(v_lines),
      'zero_stock_products', v_flagged),
    now());

  -- Cost is not returned: staff may call this function
  return jsonb_build_object('success', true, 'duplicate', false, 'sale_id', v_sale_id,
    'total_centavos', v_total, 'flagged_products', v_flagged);
end;
$$;

revoke all on function public.record_sale(uuid, text, jsonb, text) from public, anon;
grant execute on function public.record_sale(uuid, text, jsonb, text) to authenticated;
