-- Migration: 20261023100000_unit4_stock_functions_and_security.sql
-- Description: Unit 4 Stock Management:
--   1. Partial unique index ensuring opening stock is entered at most once per product and branch.
--   2. Update stock_levels view: staff see stock at their own branch only; owner sees all.
--   3. Revoke direct INSERT on stock_movements from authenticated (functions-only write path).
--   4. SECURITY DEFINER function record_bulk_opening_stock() with atomic activity_log entry.
--   5. SECURITY DEFINER function record_restock() with optional cost update and atomic activity_log entry.
--   6. SECURITY DEFINER function record_adjustment() with required reason/note and atomic activity_log entry.

-- ============================================================================
-- 1. UNIQUE OPENING STOCK CONSTRAINT
-- ============================================================================
-- Invariant: Opening stock is entered once per product and branch.
create unique index if not exists uq_stock_movements_opening_once
  on public.stock_movements (shop_id, branch_id, product_id)
  where reason = 'opening';

-- ============================================================================
-- 2. UPDATE stock_levels VIEW (Staff own-branch isolation)
-- ============================================================================
create or replace view public.stock_levels
with (security_barrier = true) as
select
  shop_id,
  branch_id,
  product_id,
  coalesce(sum(quantity_change), 0)::integer as stock_on_hand
from public.stock_movements
where shop_id = (select public.current_user_shop_id())
  and (
    (select public.is_owner())
    or branch_id = (select branch_id from public.profiles where id = (select auth.uid()))
  )
group by shop_id, branch_id, product_id;

-- Grant select to authenticated (anon was revoked in Unit 1)
grant select on public.stock_levels to authenticated;

-- ============================================================================
-- 3. REVOKE DIRECT INSERT ON stock_movements
-- ============================================================================
-- Invariant: All stock writes must go through database functions.
drop policy if exists "stock_movements_insert_owner" on public.stock_movements;
drop policy if exists "stock_movements_insert" on public.stock_movements;
revoke insert on public.stock_movements from public, anon, authenticated;

-- ============================================================================
-- 4. FUNCTION: record_bulk_opening_stock
-- ============================================================================
create or replace function public.record_bulk_opening_stock(p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_item jsonb;
  v_branch_id uuid;
  v_product_id uuid;
  v_quantity integer;
  v_inserted_count integer := 0;
  v_movement_ids uuid[] := array[]::uuid[];
  v_new_id uuid;
  v_logged_items jsonb := '[]'::jsonb;
  v_branch_name text;
  v_product_name text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  if not public.is_owner() then
    raise exception 'Forbidden: Only shop owners can record opening stock.';
  end if;

  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Invalid input: p_items must be a non-empty array.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_branch_id := (v_item->>'branch_id')::uuid;
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::integer;

    if v_branch_id is null or v_product_id is null or v_quantity is null then
      raise exception 'Invalid item: branch_id, product_id, and quantity are required.';
    end if;

    if v_quantity <= 0 or v_quantity > 100000 then
      raise exception 'Invalid quantity: Opening stock quantity must be between 1 and 100,000.';
    end if;

    -- Verify branch belongs to shop and is active
    select name into v_branch_name
    from public.branches
    where id = v_branch_id and shop_id = v_shop_id and is_active = true;

    if v_branch_name is null then
      raise exception 'Branch % not found or is inactive in current shop.', v_branch_id;
    end if;

    -- Verify product belongs to shop and is active
    select name into v_product_name
    from public.products
    where id = v_product_id and shop_id = v_shop_id and is_active = true;

    if v_product_name is null then
      raise exception 'Product % not found or is inactive in current shop.', v_product_id;
    end if;

    -- Invariant: Opening stock can only be recorded once per product and branch
    if exists (
      select 1 from public.stock_movements
      where shop_id = v_shop_id
        and branch_id = v_branch_id
        and product_id = v_product_id
        and reason = 'opening'
    ) then
      raise exception 'Opening stock has already been recorded for product "%" at branch "%".', v_product_name, v_branch_name;
    end if;

    -- Insert movement
    insert into public.stock_movements (
      shop_id,
      branch_id,
      product_id,
      quantity_change,
      reason,
      note,
      created_by,
      created_at
    ) values (
      v_shop_id,
      v_branch_id,
      v_product_id,
      v_quantity,
      'opening',
      'Opening stock',
      v_actor_id,
      now()
    ) returning id into v_new_id;

    v_movement_ids := array_append(v_movement_ids, v_new_id);
    v_inserted_count := v_inserted_count + 1;

    v_logged_items := v_logged_items || jsonb_build_object(
      'movement_id', v_new_id,
      'branch_id', v_branch_id,
      'branch_name', v_branch_name,
      'product_id', v_product_id,
      'product_name', v_product_name,
      'quantity', v_quantity
    );
  end loop;

  -- Atomic activity log entry
  insert into public.activity_log (
    shop_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) values (
    v_shop_id,
    v_actor_id,
    'stock_opening_recorded',
    'stock_movement',
    v_movement_ids[1]::text,
    jsonb_build_object(
      'item_count', v_inserted_count,
      'items', v_logged_items
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'count', v_inserted_count,
    'movement_ids', to_jsonb(v_movement_ids)
  );
end;
$$;

revoke all on function public.record_bulk_opening_stock(jsonb) from public, anon;
grant execute on function public.record_bulk_opening_stock(jsonb) to authenticated;

-- ============================================================================
-- 5. FUNCTION: record_restock
-- ============================================================================
create or replace function public.record_restock(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_new_cost_price_centavos integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_product record;
  v_branch record;
  v_movement_id uuid;
  v_old_cost integer;
  v_new_cost integer;
  v_cost_updated boolean := false;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  if not public.is_owner() then
    raise exception 'Forbidden: Only shop owners can record restocks.';
  end if;

  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  if p_quantity is null or p_quantity <= 0 or p_quantity > 100000 then
    raise exception 'Invalid quantity: Restock quantity must be between 1 and 100,000.';
  end if;

  if p_new_cost_price_centavos is not null and p_new_cost_price_centavos < 0 then
    raise exception 'Invalid cost price: Cost price cannot be negative.';
  end if;

  -- Verify active branch in shop
  select id, name into v_branch
  from public.branches
  where id = p_branch_id and shop_id = v_shop_id and is_active = true;

  if v_branch.id is null then
    raise exception 'Branch % not found or is inactive in current shop.', p_branch_id;
  end if;

  -- Verify active product in shop
  select id, name, cost_price_centavos into v_product
  from public.products
  where id = p_product_id and shop_id = v_shop_id and is_active = true;

  if v_product.id is null then
    raise exception 'Product % not found or is inactive in current shop.', p_product_id;
  end if;

  v_old_cost := v_product.cost_price_centavos;
  v_new_cost := coalesce(p_new_cost_price_centavos, v_old_cost);

  -- If new cost price is provided and different, update the product
  if p_new_cost_price_centavos is not null and p_new_cost_price_centavos <> v_old_cost then
    update public.products
    set cost_price_centavos = p_new_cost_price_centavos
    where id = p_product_id and shop_id = v_shop_id;
    v_cost_updated := true;
  end if;

  -- Insert stock movement
  insert into public.stock_movements (
    shop_id,
    branch_id,
    product_id,
    quantity_change,
    reason,
    note,
    created_by,
    created_at
  ) values (
    v_shop_id,
    p_branch_id,
    p_product_id,
    p_quantity,
    'restock',
    nullif(trim(p_note), ''),
    v_actor_id,
    now()
  ) returning id into v_movement_id;

  -- Atomic activity log entry
  insert into public.activity_log (
    shop_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) values (
    v_shop_id,
    v_actor_id,
    'stock_restocked',
    'stock_movement',
    v_movement_id::text,
    jsonb_build_object(
      'product_id', p_product_id,
      'product_name', v_product.name,
      'branch_id', p_branch_id,
      'branch_name', v_branch.name,
      'quantity', p_quantity,
      'old_cost_price_centavos', v_old_cost,
      'new_cost_price_centavos', v_new_cost,
      'cost_updated', v_cost_updated,
      'note', nullif(trim(p_note), '')
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'quantity', p_quantity,
    'old_cost_price_centavos', v_old_cost,
    'new_cost_price_centavos', v_new_cost,
    'cost_updated', v_cost_updated
  );
end;
$$;

revoke all on function public.record_restock(uuid, uuid, integer, integer, text) from public, anon;
grant execute on function public.record_restock(uuid, uuid, integer, integer, text) to authenticated;

-- ============================================================================
-- 6. FUNCTION: record_adjustment
-- ============================================================================
create or replace function public.record_adjustment(
  p_branch_id uuid,
  p_product_id uuid,
  p_quantity_change integer,
  p_reason text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_product record;
  v_branch record;
  v_movement_id uuid;
  v_trimmed_reason text;
  v_trimmed_note text;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  if not public.is_owner() then
    raise exception 'Forbidden: Only shop owners can record stock adjustments.';
  end if;

  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  v_trimmed_reason := nullif(trim(p_reason), '');
  if v_trimmed_reason is null then
    raise exception 'Invalid reason: Adjustment reason is required.';
  end if;

  v_trimmed_note := nullif(trim(p_note), '');
  if v_trimmed_note is null then
    raise exception 'Invalid note: Adjustment note is required.';
  end if;

  if p_quantity_change is null or p_quantity_change = 0 or p_quantity_change < -100000 or p_quantity_change > 100000 then
    raise exception 'Invalid quantity: Adjustment quantity cannot be zero and must be between -100,000 and 100,000.';
  end if;

  -- Verify active branch in shop
  select id, name into v_branch
  from public.branches
  where id = p_branch_id and shop_id = v_shop_id and is_active = true;

  if v_branch.id is null then
    raise exception 'Branch % not found or is inactive in current shop.', p_branch_id;
  end if;

  -- Verify active product in shop
  select id, name into v_product
  from public.products
  where id = p_product_id and shop_id = v_shop_id and is_active = true;

  if v_product.id is null then
    raise exception 'Product % not found or is inactive in current shop.', p_product_id;
  end if;

  -- Insert stock movement
  insert into public.stock_movements (
    shop_id,
    branch_id,
    product_id,
    quantity_change,
    reason,
    note,
    created_by,
    created_at
  ) values (
    v_shop_id,
    p_branch_id,
    p_product_id,
    p_quantity_change,
    'adjustment',
    v_trimmed_reason || ': ' || v_trimmed_note,
    v_actor_id,
    now()
  ) returning id into v_movement_id;

  -- Atomic activity log entry
  insert into public.activity_log (
    shop_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) values (
    v_shop_id,
    v_actor_id,
    'stock_adjusted',
    'stock_movement',
    v_movement_id::text,
    jsonb_build_object(
      'product_id', p_product_id,
      'product_name', v_product.name,
      'branch_id', p_branch_id,
      'branch_name', v_branch.name,
      'quantity_change', p_quantity_change,
      'adjustment_reason', v_trimmed_reason,
      'note', v_trimmed_note
    ),
    now()
  );

  return jsonb_build_object(
    'success', true,
    'movement_id', v_movement_id,
    'quantity_change', p_quantity_change,
    'adjustment_reason', v_trimmed_reason,
    'note', v_trimmed_note
  );
end;
$$;

revoke all on function public.record_adjustment(uuid, uuid, integer, text, text) from public, anon;
grant execute on function public.record_adjustment(uuid, uuid, integer, text, text) to authenticated;
