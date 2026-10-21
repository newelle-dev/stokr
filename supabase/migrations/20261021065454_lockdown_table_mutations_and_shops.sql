-- Migration: 20261021150000_lockdown_table_mutations_and_shops.sql
-- Description:
--   1. Replace FOR ALL policies with explicit INSERT and UPDATE policies on branches, products, stock_counts, stock_count_items.
--   2. Revoke DELETE on branches, products, stock_counts, stock_count_items from authenticated.
--   3. Require counted_by = auth.uid() in stock_counts insert policy.
--   4. Drop sales_update_owner policy and revoke UPDATE on sales from authenticated.
--   5. Enforce id, store_code, and created_at immutability on shops via trigger.
--   6. Add 'shops' entity handling to log_entity_activity() and attach tr_log_shop_activity trigger.

-- ============================================================================
-- 1. BRANCHES: Replace FOR ALL with INSERT/UPDATE, revoke DELETE
-- ============================================================================
drop policy if exists "branches_modify_owner" on public.branches;
drop policy if exists "branches_insert_owner" on public.branches;
drop policy if exists "branches_update_owner" on public.branches;

create policy "branches_insert_owner" on public.branches
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

create policy "branches_update_owner" on public.branches
  for update to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  )
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

revoke delete on public.branches from authenticated;

-- ============================================================================
-- 2. PRODUCTS: Replace FOR ALL with INSERT/UPDATE, revoke DELETE
-- ============================================================================
drop policy if exists "products_modify_owner" on public.products;
drop policy if exists "products_insert_owner" on public.products;
drop policy if exists "products_update_owner" on public.products;

create policy "products_insert_owner" on public.products
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

create policy "products_update_owner" on public.products
  for update to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  )
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

revoke delete on public.products from authenticated;

-- ============================================================================
-- 3. STOCK COUNTS: Replace FOR ALL with SELECT/INSERT/UPDATE, revoke DELETE
-- ============================================================================
drop policy if exists "stock_counts_owner" on public.stock_counts;
drop policy if exists "stock_counts_select_owner" on public.stock_counts;
drop policy if exists "stock_counts_insert_owner" on public.stock_counts;
drop policy if exists "stock_counts_update_owner" on public.stock_counts;

create policy "stock_counts_select_owner" on public.stock_counts
  for select to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

create policy "stock_counts_insert_owner" on public.stock_counts
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and counted_by = (select auth.uid())
    and (select public.is_owner())
  );

create policy "stock_counts_update_owner" on public.stock_counts
  for update to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  )
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

revoke delete on public.stock_counts from authenticated;

-- ============================================================================
-- 4. STOCK COUNT ITEMS: Replace FOR ALL with SELECT/INSERT/UPDATE, revoke DELETE
-- ============================================================================
drop policy if exists "stock_count_items_owner" on public.stock_count_items;
drop policy if exists "stock_count_items_select_owner" on public.stock_count_items;
drop policy if exists "stock_count_items_insert_owner" on public.stock_count_items;
drop policy if exists "stock_count_items_update_owner" on public.stock_count_items;

create policy "stock_count_items_select_owner" on public.stock_count_items
  for select to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

create policy "stock_count_items_insert_owner" on public.stock_count_items
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

create policy "stock_count_items_update_owner" on public.stock_count_items
  for update to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  )
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

revoke delete on public.stock_count_items from authenticated;

-- ============================================================================
-- 5. SALES: Drop UPDATE policy, revoke UPDATE from authenticated
-- ============================================================================
drop policy if exists "sales_update_owner" on public.sales;
revoke update on public.sales from authenticated;

-- ============================================================================
-- 6. SHOPS: Immutability Trigger (id, store_code, created_at)
-- ============================================================================
create or replace function public.validate_shop_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'id cannot be changed.';
  end if;

  if tg_op = 'UPDATE' and new.store_code is distinct from old.store_code then
    raise exception 'store_code cannot be changed.';
  end if;

  if tg_op = 'UPDATE' and new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be changed.';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_validate_shop_mutation on public.shops;
create trigger tr_validate_shop_mutation
before update on public.shops
for each row
execute function public.validate_shop_mutation();

-- ============================================================================
-- 7. SHOPS: Update log_entity_activity() with 'shops' branch
-- ============================================================================
create or replace function public.log_entity_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop_id uuid;
  v_actor_id uuid;
  v_action text;
  v_entity_type text;
  v_entity_id text;
  v_details jsonb;
begin
  if public.request_is_maintenance_mode() then
    return coalesce(NEW, OLD);
  end if;

  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'activity_log requires an authenticated user (auth.uid() is null)';
  end if;

  if TG_TABLE_NAME = 'shops' then
    v_shop_id := coalesce(NEW.id, OLD.id);
  else
    v_shop_id := coalesce(NEW.shop_id, OLD.shop_id);
  end if;

  v_entity_id := coalesce(NEW.id, OLD.id)::text;

  if TG_TABLE_NAME = 'products' then
    v_entity_type := 'product';
    if TG_OP = 'INSERT' then
      v_action := 'product_created';
      v_details := jsonb_build_object(
        'name', NEW.name,
        'category', NEW.category,
        'selling_price_centavos', NEW.selling_price_centavos,
        'cost_price_centavos', NEW.cost_price_centavos,
        'low_stock_threshold', NEW.low_stock_threshold,
        'is_active', NEW.is_active
      );
    elsif TG_OP = 'UPDATE' then
      if (OLD.name is not distinct from NEW.name) and
         (OLD.category is not distinct from NEW.category) and
         (OLD.selling_price_centavos is not distinct from NEW.selling_price_centavos) and
         (OLD.cost_price_centavos is not distinct from NEW.cost_price_centavos) and
         (OLD.low_stock_threshold is not distinct from NEW.low_stock_threshold) and
         (OLD.is_active is not distinct from NEW.is_active) then
        return coalesce(NEW, OLD);
      end if;

      if OLD.is_active = true and NEW.is_active = false then
        v_action := 'product_deactivated';
      elsif OLD.is_active = false and NEW.is_active = true then
        v_action := 'product_reactivated';
      else
        v_action := 'product_updated';
      end if;

      v_details := jsonb_build_object(
        'name', NEW.name,
        'old_name', OLD.name,
        'new_name', NEW.name,
        'old_category', OLD.category,
        'new_category', NEW.category,
        'old_selling_price_centavos', OLD.selling_price_centavos,
        'new_selling_price_centavos', NEW.selling_price_centavos,
        'old_cost_price_centavos', OLD.cost_price_centavos,
        'new_cost_price_centavos', NEW.cost_price_centavos,
        'old_low_stock_threshold', OLD.low_stock_threshold,
        'new_low_stock_threshold', NEW.low_stock_threshold,
        'old_is_active', OLD.is_active,
        'new_is_active', NEW.is_active
      );
    end if;

  elsif TG_TABLE_NAME = 'branches' then
    v_entity_type := 'branch';
    if TG_OP = 'INSERT' then
      v_action := 'branch_created';
      v_details := jsonb_build_object(
        'name', NEW.name,
        'is_active', NEW.is_active
      );
    elsif TG_OP = 'UPDATE' then
      if (OLD.name is not distinct from NEW.name) and
         (OLD.is_active is not distinct from NEW.is_active) then
        return coalesce(NEW, OLD);
      end if;

      if OLD.is_active = true and NEW.is_active = false then
        v_action := 'branch_deactivated';
      elsif OLD.is_active = false and NEW.is_active = true then
        v_action := 'branch_reactivated';
      elsif OLD.name is distinct from NEW.name then
        v_action := 'branch_renamed';
      else
        v_action := 'branch_updated';
      end if;

      v_details := jsonb_build_object(
        'old_name', OLD.name,
        'new_name', NEW.name,
        'old_is_active', OLD.is_active,
        'new_is_active', NEW.is_active
      );
    end if;

  elsif TG_TABLE_NAME = 'profiles' then
    v_entity_type := 'profile';
    if TG_OP = 'INSERT' then
      v_action := 'staff_created';
      v_details := jsonb_build_object(
        'full_name', NEW.full_name,
        'role', NEW.role,
        'branch_id', NEW.branch_id,
        'username', NEW.username,
        'is_active', NEW.is_active,
        'must_change_password', NEW.must_change_password
      );
    elsif TG_OP = 'UPDATE' then
      if (OLD.full_name is not distinct from NEW.full_name) and
         (OLD.branch_id is not distinct from NEW.branch_id) and
         (OLD.is_active is not distinct from NEW.is_active) and
         (OLD.must_change_password is not distinct from NEW.must_change_password) then
        return coalesce(NEW, OLD);
      end if;

      if coalesce(nullif(current_setting('stokr.allow_password_flag_change', true), ''), 'false') = 'true'
         and NEW.must_change_password = true then
        return coalesce(NEW, OLD);
      end if;

      if OLD.is_active = true and NEW.is_active = false then
        v_action := 'staff_deactivated';
      elsif OLD.is_active = false and NEW.is_active = true then
        v_action := 'staff_reactivated';
      elsif OLD.must_change_password = true and NEW.must_change_password = false then
        v_action := 'staff_password_changed';
      elsif OLD.branch_id is distinct from NEW.branch_id then
        v_action := 'staff_reassigned';
      else
        v_action := 'staff_updated';
      end if;

      v_details := jsonb_build_object(
        'username', NEW.username,
        'old_full_name', OLD.full_name,
        'new_full_name', NEW.full_name,
        'old_branch_id', OLD.branch_id,
        'new_branch_id', NEW.branch_id,
        'old_is_active', OLD.is_active,
        'new_is_active', NEW.is_active,
        'old_must_change_password', OLD.must_change_password,
        'new_must_change_password', NEW.must_change_password
      );
    end if;

  elsif TG_TABLE_NAME = 'shops' then
    v_entity_type := 'shop';
    if TG_OP = 'UPDATE' then
      if (OLD.name is not distinct from NEW.name) then
        return coalesce(NEW, OLD);
      end if;

      v_action := 'shop_renamed';
      v_details := jsonb_build_object(
        'old_name', OLD.name,
        'new_name', NEW.name
      );
    end if;
  end if;

  if v_action is not null then
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
      v_action,
      v_entity_type,
      v_entity_id,
      coalesce(v_details, '{}'::jsonb),
      now()
    );
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists tr_log_shop_activity on public.shops;
create trigger tr_log_shop_activity
after update on public.shops
for each row
execute function public.log_entity_activity();
