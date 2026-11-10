-- Migration: unit6_void_and_replacement
-- NOT YET APPLIED. Shown to the owner first (hard stop: database and permissions).
-- 1. void_sale(): owner only; reason required; marks voided; returns stock; logs.
-- 2. record_sale() gets an optional 5th argument p_corrects_sale_id for the owner's replacement sale.
--    The old 4-argument version is dropped so there is one function only.
-- 3. Data rules: voided rows must carry reason/by/at; one replacement per original.
-- Direct owner UPDATE/DELETE on sales and sale_items is already revoked (Unit 5 migrations); re-asserted here.

-- ---------- Data rules ----------
alter table public.sales
  add constraint chk_sales_status_values check (status in ('completed', 'voided')),
  add constraint chk_sales_void_fields check (
    (status = 'voided') = (voided_at is not null and voided_by is not null and void_reason is not null)
  ),
  add constraint chk_sales_not_self_correcting check (corrects_sale_id is distinct from id);

-- One replacement per original sale
create unique index uq_sales_one_replacement
  on public.sales (shop_id, corrects_sale_id)
  where corrects_sale_id is not null;

-- ---------- void_sale ----------
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_shop_id uuid;
  v_reason text := nullif(trim(p_reason), '');
  v_sale record;
begin
  if v_actor_id is null then
    raise exception 'Unauthorized: Authentication required.';
  end if;

  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  if not public.is_owner() then
    raise exception 'Forbidden: Only the owner can void a sale.';
  end if;

  if v_reason is null or length(v_reason) > 200 then
    raise exception 'Invalid reason: a void reason is required (max 200 characters).';
  end if;

  -- Lock the row so two voids at once cannot both return stock
  select id, branch_id, status, total_centavos into v_sale
  from public.sales
  where id = p_sale_id and shop_id = v_shop_id
  for update;
  if not found then
    raise exception 'Sale not found in current shop.';
  end if;
  if v_sale.status = 'voided' then
    raise exception 'Conflict: this sale is already voided.';
  end if;

  update public.sales
  set status = 'voided', void_reason = v_reason, voided_by = v_actor_id, voided_at = now()
  where id = v_sale.id;

  insert into public.stock_movements (shop_id, branch_id, product_id, quantity_change,
    reason, sale_id, created_by, created_at)
  select v_shop_id, v_sale.branch_id, si.product_id, si.quantity,
    'void_return', v_sale.id, v_actor_id, now()
  from public.sale_items si
  where si.sale_id = v_sale.id and si.shop_id = v_shop_id;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details, created_at)
  values (v_shop_id, v_actor_id, 'sale_voided', 'sale', v_sale.id::text,
    jsonb_build_object('reason', v_reason, 'total_centavos', v_sale.total_centavos,
      'branch_id', v_sale.branch_id),
    now());

  return jsonb_build_object('success', true, 'sale_id', v_sale.id);
end;
$$;

revoke all on function public.void_sale(uuid, text) from public, anon;
grant execute on function public.void_sale(uuid, text) to authenticated;

-- ---------- record_sale with optional replacement ----------
drop function public.record_sale(uuid, text, jsonb, text);

create or replace function public.record_sale(
  p_branch_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_client_request_id text,
  p_corrects_sale_id uuid default null
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
  v_original record;
  v_sold_by uuid;
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

  v_shop_id := public.current_user_shop_id();
  if v_shop_id is null then
    raise exception 'Forbidden: Active shop membership required.';
  end if;

  v_is_owner := public.is_owner();

  if v_request_id is null or length(v_request_id) > 100 then
    raise exception 'Invalid request id: client_request_id is required (max 100 characters).';
  end if;

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

  v_sold_by := v_actor_id;

  -- Replacement sale: owner only, original must be voided and not yet replaced.
  -- The original seller stays as sold_by; the owner is recorded_by.
  if p_corrects_sale_id is not null then
    if not v_is_owner then
      raise exception 'Forbidden: Only the owner can record a replacement sale.';
    end if;
    select id, sold_by, status into v_original
    from public.sales
    where id = p_corrects_sale_id and shop_id = v_shop_id
    for update;
    if not found then
      raise exception 'Original sale not found in current shop.';
    end if;
    if v_original.status <> 'voided' then
      raise exception 'Conflict: only a voided sale can be replaced.';
    end if;
    if exists (select 1 from public.sales
               where shop_id = v_shop_id and corrects_sale_id = p_corrects_sale_id) then
      raise exception 'Conflict: this sale already has a replacement.';
    end if;
    v_sold_by := v_original.sold_by;
  end if;

  select branch_id into v_home_branch_id from public.profiles where id = v_actor_id;

  if p_payment_method is null or p_payment_method not in ('cash', 'gcash') then
    raise exception 'Invalid payment method: must be cash or gcash.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
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
    total_centavos, total_cost_centavos, client_request_id, corrects_sale_id)
  values (v_sale_id, v_shop_id, p_branch_id, v_sold_by, v_actor_id, p_payment_method,
    v_total, v_total_cost, v_request_id, p_corrects_sale_id);

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

    if v_stock_after < 0 then
      v_flagged := v_flagged || jsonb_build_array(v_line->>'product_name');
    end if;
  end loop;

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details, created_at)
  values (v_shop_id, v_actor_id,
    case when p_corrects_sale_id is null then 'sale_recorded' else 'sale_replacement_recorded' end,
    'sale', v_sale_id::text,
    jsonb_build_object('branch_id', p_branch_id, 'branch_name', v_branch_name,
      'payment_method', p_payment_method, 'total_centavos', v_total,
      'total_cost_centavos', v_total_cost, 'item_count', jsonb_array_length(v_lines),
      'zero_stock_products', v_flagged, 'sold_by', v_sold_by,
      'corrects_sale_id', p_corrects_sale_id),
    now());

  return jsonb_build_object('success', true, 'duplicate', false, 'sale_id', v_sale_id,
    'total_centavos', v_total, 'flagged_products', v_flagged);
end;
$$;

revoke all on function public.record_sale(uuid, text, jsonb, text, uuid) from public, anon;
grant execute on function public.record_sale(uuid, text, jsonb, text, uuid) to authenticated;

-- ---------- Re-assert: no direct writes to sales / sale_items ----------
revoke insert, update, delete, truncate on public.sales from authenticated, anon;
revoke insert, update, delete, truncate on public.sale_items from authenticated, anon;
