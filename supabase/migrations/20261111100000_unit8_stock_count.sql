-- Migration: 20261111100000_unit8_stock_count.sql
-- Unit 8: stock count and gap report.
--   1. stock_counts gets status (open/accepted/cancelled), accepted_at, accepted_by.
--   2. One open count per branch; one line per product per count.
--   3. Revoke direct INSERT/UPDATE on stock_counts and stock_count_items (functions only).
--   4. save_stock_count, accept_stock_count, cancel_stock_count (owner only, each logged).

-- ============================================================================
-- 1. COLUMNS
-- ============================================================================
alter table public.stock_counts
  add column status text not null default 'open'
    check (status in ('open', 'accepted', 'cancelled')),
  add column accepted_at timestamptz,
  add column accepted_by uuid,
  add constraint stock_counts_shop_accepted_by_fkey
    foreign key (shop_id, accepted_by) references public.profiles (shop_id, id),
  add constraint stock_counts_accepted_fields_chk
    check ((status = 'accepted') = (accepted_at is not null and accepted_by is not null));

-- ============================================================================
-- 2. UNIQUENESS
-- ============================================================================
create unique index uq_stock_counts_one_open_per_branch
  on public.stock_counts (shop_id, branch_id) where status = 'open';

create unique index uq_stock_count_items_once_per_product
  on public.stock_count_items (stock_count_id, product_id);

-- ============================================================================
-- 3. FUNCTIONS-ONLY WRITES (select policies stay owner-only)
-- ============================================================================
drop policy if exists "stock_counts_insert_owner" on public.stock_counts;
drop policy if exists "stock_counts_update_owner" on public.stock_counts;
drop policy if exists "stock_count_items_insert_owner" on public.stock_count_items;
drop policy if exists "stock_count_items_update_owner" on public.stock_count_items;

revoke insert, update, delete on public.stock_counts from public, anon, authenticated;
revoke insert, update, delete on public.stock_count_items from public, anon, authenticated;

-- ============================================================================
-- 4a. save_stock_count: freeze expected qty, stock is NOT changed
-- p_items: [{"product_id": uuid, "counted_qty": int}, ...]
-- ============================================================================
create or replace function public.save_stock_count(
  p_branch_id uuid,
  p_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_branch_name text;
  v_count_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_counted integer;
  v_expected integer;
  v_item_count integer := 0;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;
  if not public.is_owner() then
    raise exception 'Forbidden: Only shop owners can save stock counts.';
  end if;
  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 500 then
    raise exception 'Invalid input: p_items must be an array of 1 to 500 products.';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id and shop_id = v_shop_id and is_active = true;
  if v_branch_name is null then
    raise exception 'Branch % not found or is inactive in current shop.', p_branch_id;
  end if;

  if exists (
    select 1 from public.stock_counts
    where shop_id = v_shop_id and branch_id = p_branch_id and status = 'open'
  ) then
    raise exception 'This branch already has an open count. Accept or cancel it first.';
  end if;

  insert into public.stock_counts (shop_id, branch_id, counted_by, note, status)
  values (v_shop_id, p_branch_id, v_actor_id, nullif(trim(p_note), ''), 'open')
  returning id into v_count_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item->>'product_id')::uuid;
    v_counted := (v_item->>'counted_qty')::integer;

    if v_product_id is null or v_counted is null
       or v_counted < 0 or v_counted > 100000 then
      raise exception 'Invalid item: product_id and counted_qty (0 to 100,000) are required.';
    end if;

    if not exists (
      select 1 from public.products
      where id = v_product_id and shop_id = v_shop_id and is_active = true
    ) then
      raise exception 'Product % not found or is inactive in current shop.', v_product_id;
    end if;

    select coalesce(sum(quantity_change), 0)::integer into v_expected
    from public.stock_movements
    where shop_id = v_shop_id and branch_id = p_branch_id and product_id = v_product_id;

    -- a repeated product trips uq_stock_count_items_once_per_product and rolls everything back
    insert into public.stock_count_items (
      stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference
    ) values (
      v_count_id, v_shop_id, v_product_id, v_expected, v_counted, v_counted - v_expected
    );
    v_item_count := v_item_count + 1;
  end loop;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details, created_at)
  values (
    v_shop_id, v_actor_id, 'stock_count_saved', 'stock_count', v_count_id::text,
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'item_count', v_item_count,
      'note', nullif(trim(p_note), '')
    ),
    now()
  );

  return jsonb_build_object('success', true, 'stock_count_id', v_count_id, 'item_count', v_item_count);
end;
$$;

revoke all on function public.save_stock_count(uuid, text, jsonb) from public, anon;
grant execute on function public.save_stock_count(uuid, text, jsonb) to authenticated;

-- ============================================================================
-- 4b. accept_stock_count: one count_correction movement per non-zero difference
-- The correction is the saved difference (counted minus expected at save time),
-- so sales made after the count was saved are kept.
-- ============================================================================
create or replace function public.accept_stock_count(p_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_count record;
  v_item record;
  v_corrections integer := 0;
  v_missing_units integer := 0;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;
  if not public.is_owner() then
    raise exception 'Forbidden: Only shop owners can accept stock counts.';
  end if;
  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  -- row lock: a second concurrent accept waits, then sees status <> 'open'
  select id, branch_id, status into v_count
  from public.stock_counts
  where id = p_count_id and shop_id = v_shop_id
  for update;

  if v_count.id is null then
    raise exception 'Stock count % not found.', p_count_id;
  end if;
  if v_count.status <> 'open' then
    raise exception 'This count is already %.', v_count.status;
  end if;

  for v_item in
    select product_id, difference
    from public.stock_count_items
    where stock_count_id = p_count_id and shop_id = v_shop_id and difference <> 0
  loop
    insert into public.stock_movements (
      shop_id, branch_id, product_id, quantity_change, reason, note, created_by, created_at
    ) values (
      v_shop_id, v_count.branch_id, v_item.product_id, v_item.difference,
      'count_correction', 'Stock count ' || p_count_id::text, v_actor_id, now()
    );
    v_corrections := v_corrections + 1;
    if v_item.difference < 0 then
      v_missing_units := v_missing_units - v_item.difference;
    end if;
  end loop;

  update public.stock_counts
  set status = 'accepted', accepted_at = now(), accepted_by = v_actor_id
  where id = p_count_id and shop_id = v_shop_id;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details, created_at)
  values (
    v_shop_id, v_actor_id, 'stock_count_accepted', 'stock_count', p_count_id::text,
    jsonb_build_object(
      'branch_id', v_count.branch_id,
      'corrections', v_corrections,
      'missing_units', v_missing_units
    ),
    now()
  );

  return jsonb_build_object('success', true, 'corrections', v_corrections, 'missing_units', v_missing_units);
end;
$$;

revoke all on function public.accept_stock_count(uuid) from public, anon;
grant execute on function public.accept_stock_count(uuid) to authenticated;

-- ============================================================================
-- 4c. cancel_stock_count: an open count is cancelled, never deleted
-- ============================================================================
create or replace function public.cancel_stock_count(p_count_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_count record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;
  if not public.is_owner() then
    raise exception 'Forbidden: Only shop owners can cancel stock counts.';
  end if;
  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  select id, branch_id, status into v_count
  from public.stock_counts
  where id = p_count_id and shop_id = v_shop_id
  for update;

  if v_count.id is null then
    raise exception 'Stock count % not found.', p_count_id;
  end if;
  if v_count.status <> 'open' then
    raise exception 'This count is already %.', v_count.status;
  end if;

  update public.stock_counts set status = 'cancelled'
  where id = p_count_id and shop_id = v_shop_id;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details, created_at)
  values (
    v_shop_id, v_actor_id, 'stock_count_cancelled', 'stock_count', p_count_id::text,
    jsonb_build_object('branch_id', v_count.branch_id),
    now()
  );

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.cancel_stock_count(uuid) from public, anon;
grant execute on function public.cancel_stock_count(uuid) to authenticated;
