-- Migration: 20261019090000_harden_security.sql
-- Description: Unit 2 Security Hardening:
--   1. Explicit is_active = true check in auth helper functions.
--   2. Profiles SELECT: Staff sees only own row (even if inactive); Owner sees all shop profiles.
--   3. Profiles UPDATE: Only active owners of the same shop can update profiles.
--   4. Sales INSERT: Owner only, recorded_by = auth.uid(), shop_id = current_user_shop_id().
--   5. Sale Items INSERT: Owner only, shop_id = current_user_shop_id().
--   6. Stock Movements INSERT: Owner only, created_by = auth.uid(), shop_id = current_user_shop_id(),
--      reason limited to ('opening', 'restock', 'adjustment', 'count_correction').
--      (Reasons 'sale' and 'void_return' are function-only in Unit 5).
--   7. Activity Log INSERT: Owner only, actor_id = auth.uid(), shop_id = current_user_shop_id().
--   8. Profile validation trigger:
--      - branch_id must belong to profile's shop_id
--      - shop_id is immutable
--      - Cannot deactivate or demote the last active owner of a shop

-- ============================================================================
-- 1. AUTH HELPER FUNCTIONS (Explicit is_active = true check)
-- ============================================================================
create or replace function public.current_user_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select shop_id from public.profiles
  where id = (select auth.uid()) and is_active = true;
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'owner'
      and is_active = true
  );
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles
  where id = (select auth.uid()) and is_active = true;
$$;

-- ============================================================================
-- 2. PROFILES POLICIES
-- ============================================================================
-- Staff sees only own row (even if inactive); Active owners see all in shop
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (
      shop_id = (select public.current_user_shop_id())
      and (select public.is_owner())
    )
  );

-- Only active owners can update profiles (eliminates staff self-promotion)
drop policy if exists "profiles_update_owner" on public.profiles;
create policy "profiles_update_owner" on public.profiles
  for update to authenticated
  using (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  )
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

-- ============================================================================
-- 3. WRITE-PATH POLICIES (Sales, Sale Items, Stock Movements, Activity Log)
-- ============================================================================
-- Sales INSERT: Owner only, recorded_by = auth.uid(), shop_id = current_user_shop_id()
drop policy if exists "sales_insert" on public.sales;
drop policy if exists "sales_insert_owner" on public.sales;
create policy "sales_insert_owner" on public.sales
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and recorded_by = (select auth.uid())
    and (select public.is_owner())
  );

-- Sale Items INSERT: Owner only, shop_id = current_user_shop_id()
drop policy if exists "sale_items_insert" on public.sale_items;
drop policy if exists "sale_items_insert_owner" on public.sale_items;
create policy "sale_items_insert_owner" on public.sale_items
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
  );

-- Stock Movements INSERT: Owner only, created_by = auth.uid(), reason restricted
drop policy if exists "stock_movements_insert" on public.stock_movements;
drop policy if exists "stock_movements_insert_owner" on public.stock_movements;
create policy "stock_movements_insert_owner" on public.stock_movements
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and created_by = (select auth.uid())
    and (select public.is_owner())
    and reason in ('opening', 'restock', 'adjustment', 'count_correction')
  );

-- Activity Log INSERT: Owner only, actor_id = auth.uid()
drop policy if exists "activity_log_insert" on public.activity_log;
drop policy if exists "activity_log_insert_owner" on public.activity_log;
create policy "activity_log_insert_owner" on public.activity_log
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and actor_id = (select auth.uid())
    and (select public.is_owner())
  );

-- ============================================================================
-- 4. PROFILE TRIGGER (Branch validation, shop_id immutability, last-owner protect)
-- ============================================================================
create or replace function public.validate_profile_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_other_active_owners integer;
begin
  -- Invariant: shop_id cannot be changed once assigned
  if tg_op = 'UPDATE' and new.shop_id is distinct from old.shop_id then
    raise exception 'shop_id cannot be changed.';
  end if;

  -- Invariant: branch_id must belong to the same shop as the profile
  if new.branch_id is not null then
    if not exists (
      select 1 from public.branches
      where id = new.branch_id
        and shop_id = new.shop_id
    ) then
      raise exception 'branch_id does not belong to the same shop as the profile.';
    end if;
  end if;

  -- Business Invariant: Cannot deactivate or demote the last active owner of a shop
  if tg_op = 'UPDATE' and old.role = 'owner' and old.is_active = true and (new.role <> 'owner' or new.is_active = false) then
    select count(*)
    into v_other_active_owners
    from public.profiles
    where shop_id = old.shop_id
      and role = 'owner'
      and is_active = true
      and id <> old.id;

    if v_other_active_owners = 0 then
      raise exception 'Cannot deactivate or demote the last active owner of a shop.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_validate_profile_mutation on public.profiles;
create trigger tr_validate_profile_mutation
before insert or update on public.profiles
for each row
execute function public.validate_profile_mutation();
