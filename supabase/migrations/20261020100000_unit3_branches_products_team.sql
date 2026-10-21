-- Migration: 20261020100000_unit3_branches_products_team.sql
-- Description: Unit 3 Database Foundation:
--   1. Add store_code to shops with unique constraint and format validation.
--   2. Add username and must_change_password to profiles; role='staff' requires username and branch_id; username and role immutable.
--   3. Create private profile_security table for password-change verification markers (shop-scoped composite FK, no cascade).
--   4. Shared maintenance mode helper request_is_maintenance_mode() (revoked from public/anon/authenticated).
--   5. Database-level forced password change enforcement:
--      current_user_shop_id(), is_owner(), and current_user_role() return NULL while must_change_password is true.
--   6. complete_password_change() security-definer function: fail-closed, verifies genuine password change against auth.users.
--   7. Profile mutation trigger (role immutability, username immutability, staff-only app insert, active branch validation, last active owner protect).
--   8. Profile security snapshot trigger (AFTER INSERT OR UPDATE) capturing current temp password hash.
--   9. Profiles RLS: Active owners can insert staff profiles only.
--   10. Revoke direct INSERT on activity_log from authenticated.
--   11. Automated activity logging trigger for products, branches, and profiles recording old and new values.
--   12. Branch deactivation guard trigger blocking deactivation when active staff are assigned.
--   13. Case-insensitive unique product name constraint per shop.

-- ============================================================================
-- 1. SHOPS: store_code
-- ============================================================================
alter table public.shops
  add column if not exists store_code text;

-- Safe backfill: ensure every existing shop has a unique store_code matching regex
update public.shops
set store_code = 'cloudhaven'
where id = '00000000-0000-0000-0000-000000000001' and store_code is null;

update public.shops
set store_code = 'shop' || substr(replace(id::text, '-', ''), 1, 10)
where store_code is null;

alter table public.shops alter column store_code set not null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'uq_shops_store_code') then
    alter table public.shops add constraint uq_shops_store_code unique (store_code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_shops_store_code_format') then
    alter table public.shops add constraint chk_shops_store_code_format check (store_code ~ '^[a-z0-9]{3,20}$');
  end if;
end $$;

-- ============================================================================
-- 2. PROFILES: username, must_change_password, constraints
-- ============================================================================
alter table public.profiles
  add column if not exists username text,
  add column if not exists must_change_password boolean not null default false;

-- Backfill demo staff username
update public.profiles
set username = 'staff1'
where id = '00000000-0000-0000-0000-000000000200' and username is null;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'chk_profiles_username_format') then
    alter table public.profiles add constraint chk_profiles_username_format check (username is null or username ~ '^[a-z0-9._-]{3,30}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'uq_profiles_shop_username') then
    alter table public.profiles add constraint uq_profiles_shop_username unique (shop_id, username);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_profiles_staff_username') then
    alter table public.profiles add constraint chk_profiles_staff_username check (role <> 'staff' or username is not null);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_profiles_staff_branch') then
    alter table public.profiles add constraint chk_profiles_staff_branch check (role <> 'staff' or branch_id is not null);
  end if;
end $$;

-- ============================================================================
-- 3. PROFILE SECURITY (Invariants 1, 19, 20: shop_id, composite FK, no cascade)
-- ============================================================================
create table if not exists public.profile_security (
  shop_id uuid not null,
  profile_id uuid not null,
  temp_password_hash text not null,
  created_at timestamptz not null default now(),
  constraint pk_profile_security primary key (shop_id, profile_id),
  constraint uq_profile_security_profile_id unique (profile_id),
  constraint fk_profile_security_profile foreign key (shop_id, profile_id)
    references public.profiles (shop_id, id)
);

alter table public.profile_security enable row level security;
revoke all on public.profile_security from public, anon, authenticated;

-- ============================================================================
-- 4. MAINTENANCE MODE HELPER (Revoked from public, anon, authenticated)
-- ============================================================================
create or replace function public.request_is_maintenance_mode()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claims', true), '') is null;
$$;

revoke all on function public.request_is_maintenance_mode() from public, anon, authenticated;

-- ============================================================================
-- 5. DATABASE-LEVEL FORCED PASSWORD CHANGE ENFORCEMENT & FAIL-CLOSED VERIFICATION
-- ============================================================================
create or replace function public.current_user_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select shop_id from public.profiles
  where id = (select auth.uid())
    and is_active = true
    and must_change_password = false;
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
      and must_change_password = false
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
  where id = (select auth.uid())
    and is_active = true
    and must_change_password = false;
$$;

-- Function for shop owner to initiate staff password reset
create or replace function public.begin_staff_password_reset(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_shop_id uuid;
  v_staff_shop_id uuid;
  v_staff_role text;
  v_staff_username text;
  v_staff_is_active boolean;
  v_auth_hash text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required.';
  end if;

  -- Caller must be an active owner
  select shop_id into v_caller_shop_id
  from public.profiles
  where id = v_caller_id
    and is_active = true
    and role = 'owner';

  if v_caller_shop_id is null then
    raise exception 'Caller must be an active shop owner.';
  end if;

  -- Target must be an active staff member of the same shop
  select shop_id, role, username, is_active
  into v_staff_shop_id, v_staff_role, v_staff_username, v_staff_is_active
  from public.profiles
  where id = p_staff_id;

  if v_staff_shop_id is null or v_staff_shop_id <> v_caller_shop_id then
    raise exception 'Staff member not found in your shop.';
  end if;

  if v_staff_role <> 'staff' then
    raise exception 'Only staff passwords can be reset via this function.';
  end if;

  if not v_staff_is_active then
    raise exception 'Cannot reset password for deactivated staff member.';
  end if;

  -- Fetch current auth encrypted password
  select encrypted_password into v_auth_hash
  from auth.users
  where id = p_staff_id;

  if v_auth_hash is null or v_auth_hash = '' then
    raise exception 'Auth user record or password hash not found.';
  end if;

  -- Refresh snapshot in profile_security (ALWAYS refreshes, regardless of flag state)
  insert into public.profile_security (shop_id, profile_id, temp_password_hash, created_at)
  values (v_caller_shop_id, p_staff_id, v_auth_hash, now())
  on conflict (profile_id) do update
  set temp_password_hash = excluded.temp_password_hash,
      created_at = now();

  -- Allow trigger to update must_change_password
  perform set_config('stokr.allow_password_flag_change', 'true', true);

  -- Set must_change_password = true
  update public.profiles
  set must_change_password = true
  where id = p_staff_id;

  perform set_config('stokr.allow_password_flag_change', 'false', true);

  -- Record in activity log
  insert into public.activity_log (
    shop_id,
    actor_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) values (
    v_caller_shop_id,
    v_caller_id,
    'staff_password_reset_initiated',
    'profile',
    p_staff_id::text,
    jsonb_build_object('username', v_staff_username),
    now()
  );
end;
$$;

revoke all on function public.begin_staff_password_reset(uuid) from public, anon;
grant execute on function public.begin_staff_password_reset(uuid) to authenticated;

-- Function for authenticated user to complete password change (fail-closed)
create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_shop_id uuid;
  v_must_change boolean;
  v_current_hash text;
  v_temp_hash text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required to complete password change.';
  end if;

  select shop_id, must_change_password into v_shop_id, v_must_change
  from public.profiles
  where id = v_user_id and is_active = true;

  if v_shop_id is null then
    raise exception 'Profile not found or inactive.';
  end if;

  if not v_must_change then
    -- Already completed or not required
    return;
  end if;

  -- Fail-closed: must have a marker row when must_change_password is true
  select encrypted_password into v_current_hash from auth.users where id = v_user_id;
  select temp_password_hash into v_temp_hash from public.profile_security where profile_id = v_user_id;

  if v_temp_hash is null then
    raise exception 'Password change verification failed: no temporary password marker found.';
  end if;

  if v_current_hash = v_temp_hash then
    raise exception 'Password has not been changed. You must update your password in Supabase Auth before completing this step.';
  end if;

  -- Allow trigger to clear must_change_password
  perform set_config('stokr.allow_password_flag_change', 'true', true);

  -- Clear must_change_password
  update public.profiles
  set must_change_password = false
  where id = v_user_id;

  perform set_config('stokr.allow_password_flag_change', 'false', true);

  -- Clean up security marker
  delete from public.profile_security where profile_id = v_user_id;
end;
$$;

revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

-- ============================================================================
-- 6. PROFILE VALIDATION TRIGGER (BEFORE INSERT OR UPDATE)
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
  -- Invariant: profiles.id cannot be changed
  if tg_op = 'UPDATE' and new.id is distinct from old.id then
    raise exception 'id cannot be changed.';
  end if;

  -- Invariant: shop_id cannot be changed once assigned
  if tg_op = 'UPDATE' and new.shop_id is distinct from old.shop_id then
    raise exception 'shop_id cannot be changed.';
  end if;

  -- Invariant: profiles.role cannot be changed once assigned
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    raise exception 'role cannot be changed.';
  end if;

  -- Invariant: username cannot be changed once assigned
  if tg_op = 'UPDATE' and new.username is distinct from old.username then
    raise exception 'username cannot be changed.';
  end if;

  -- Invariant: Direct profile inserts through the app may only create role='staff'
  if tg_op = 'INSERT' and not public.request_is_maintenance_mode() and new.role <> 'staff' then
    raise exception 'Only staff profiles can be created through the application.';
  end if;

  -- Invariant: Staff profiles require a branch assignment
  if new.role = 'staff' and new.branch_id is null then
    raise exception 'Staff profiles require a branch assignment.';
  end if;

  -- Invariant: App-created staff profiles must have must_change_password = true
  if tg_op = 'INSERT' and not public.request_is_maintenance_mode() and new.role = 'staff' and new.must_change_password is not true then
    raise exception 'App-created staff profiles must have must_change_password = true.';
  end if;

  -- Invariant: must_change_password can only be true when role = 'staff'
  if new.must_change_password = true and new.role <> 'staff' then
    raise exception 'must_change_password can only be true for staff profiles.';
  end if;

  -- Invariant: must_change_password cannot be modified directly
  if tg_op = 'UPDATE' and new.must_change_password is distinct from old.must_change_password then
    if not public.request_is_maintenance_mode() and
       coalesce(nullif(current_setting('stokr.allow_password_flag_change', true), ''), 'false') <> 'true' then
      raise exception 'must_change_password cannot be modified directly. Use begin_staff_password_reset() or complete_password_change().';
    end if;
  end if;

  -- Invariant: branch_id must belong to an ACTIVE branch in the same shop when created or reassigned
  if (tg_op = 'INSERT' and new.branch_id is not null) or
     (tg_op = 'UPDATE' and new.branch_id is distinct from old.branch_id) then
    if not exists (
      select 1 from public.branches
      where id = new.branch_id
        and shop_id = new.shop_id
        and is_active = true
    ) then
      raise exception 'branch_id does not belong to an active branch in the same shop.';
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

-- ============================================================================
-- 7. PROFILE SECURITY SNAPSHOT TRIGGER (AFTER INSERT ONLY)
-- ============================================================================
create or replace function public.snapshot_profile_temp_password()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.must_change_password = true then
    insert into public.profile_security (shop_id, profile_id, temp_password_hash, created_at)
    values (new.shop_id, new.id, coalesce((select encrypted_password from auth.users where id = new.id), ''), now())
    on conflict (profile_id) do update
    set temp_password_hash = excluded.temp_password_hash,
        created_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists tr_snapshot_profile_temp_password on public.profiles;
create trigger tr_snapshot_profile_temp_password
after insert on public.profiles
for each row
execute function public.snapshot_profile_temp_password();

-- ============================================================================
-- 8. PROFILES RLS: Staff-only insert by active owner
-- ============================================================================
drop policy if exists "profiles_insert_owner" on public.profiles;
create policy "profiles_insert_owner" on public.profiles
  for insert to authenticated
  with check (
    shop_id = (select public.current_user_shop_id())
    and (select public.is_owner())
    and role = 'staff'
  );

-- ============================================================================
-- 9. REVOKE DIRECT INSERT ON ACTIVITY_LOG FROM AUTHENTICATED
-- ============================================================================
drop policy if exists "activity_log_insert" on public.activity_log;
drop policy if exists "activity_log_insert_owner" on public.activity_log;
revoke insert on public.activity_log from authenticated;

-- ============================================================================
-- 10. AUTOMATED ACTIVITY LOG TRIGGER (Old & new values, non-null actor rule)
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
  -- Rule 1: Skip logging in maintenance mode (migrations, psql seeds, direct DB connection)
  if public.request_is_maintenance_mode() then
    return coalesce(NEW, OLD);
  end if;

  -- For any app request, auth.uid() must not be null
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'activity_log requires an authenticated user (auth.uid() is null)';
  end if;

  v_shop_id := coalesce(NEW.shop_id, OLD.shop_id);
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
      -- Skip logging when UPDATE changes nothing
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
      -- Skip logging when UPDATE changes nothing
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
      -- Skip logging when UPDATE changes nothing
      if (OLD.full_name is not distinct from NEW.full_name) and
         (OLD.branch_id is not distinct from NEW.branch_id) and
         (OLD.is_active is not distinct from NEW.is_active) and
         (OLD.must_change_password is not distinct from NEW.must_change_password) then
        return coalesce(NEW, OLD);
      end if;

      -- If update was initiated by begin_staff_password_reset(), that function
      -- records staff_password_reset_initiated directly. Skip redundant trigger row.
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

drop trigger if exists tr_log_product_activity on public.products;
create trigger tr_log_product_activity
after insert or update on public.products
for each row execute function public.log_entity_activity();

drop trigger if exists tr_log_branch_activity on public.branches;
create trigger tr_log_branch_activity
after insert or update on public.branches
for each row execute function public.log_entity_activity();

drop trigger if exists tr_log_profile_activity on public.profiles;
create trigger tr_log_profile_activity
after insert or update on public.profiles
for each row execute function public.log_entity_activity();

-- ============================================================================
-- 11. BRANCH DEACTIVATION GUARD TRIGGER
-- ============================================================================
create or replace function public.validate_branch_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.is_active = true and new.is_active = false then
    if exists (
      select 1 from public.profiles
      where branch_id = old.id
        and is_active = true
    ) then
      raise exception 'Cannot deactivate branch while active staff members are assigned to it.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_validate_branch_mutation on public.branches;
create trigger tr_validate_branch_mutation
before update on public.branches
for each row
execute function public.validate_branch_mutation();

-- ============================================================================
-- 12. CASE-INSENSITIVE UNIQUE PRODUCT AND BRANCH CONSTRAINTS PER SHOP
-- ============================================================================
create unique index if not exists uq_products_shop_name_ci
  on public.products (shop_id, lower(trim(name)));

create unique index if not exists uq_branches_shop_name_ci
  on public.branches (shop_id, lower(trim(name)));
