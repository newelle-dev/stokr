-- Migration: 20261019000001_initial_schema.sql
-- Description: Unit 1 foundational schema: shops, branches, profiles, products,
--              stock movements, sales, items, stock counts, activity log,
--              RLS policies, views, indexes, and immutability triggers.

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Shops (Tenancy Root)
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Branches
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Profiles (Linked to Supabase Auth users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner', 'staff')),
  branch_id uuid references public.branches(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  name text not null,
  category text not null check (category in ('liquid', 'device', 'cartridge', 'other')),
  selling_price_centavos bigint not null check (selling_price_centavos >= 0),
  cost_price_centavos bigint not null check (cost_price_centavos >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Stock Movements (Append-only ledger)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity_change integer not null check (quantity_change <> 0),
  reason text not null check (reason in ('opening', 'restock', 'sale', 'void_return', 'adjustment', 'count_correction')),
  sale_id uuid,
  note text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- Sales
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  sold_by uuid not null references auth.users(id),
  recorded_by uuid not null references auth.users(id),
  payment_method text not null check (payment_method in ('cash', 'gcash')),
  total_centavos bigint not null check (total_centavos >= 0),
  total_cost_centavos bigint not null check (total_cost_centavos >= 0),
  status text not null default 'completed' check (status in ('completed', 'voided')),
  void_reason text,
  voided_by uuid references auth.users(id),
  voided_at timestamptz,
  corrects_sale_id uuid references public.sales(id),
  client_request_id text not null,
  created_at timestamptz not null default now(),
  constraint uq_sales_shop_client_request unique (shop_id, client_request_id)
);

-- Sale Items
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_centavos bigint not null check (unit_price_centavos >= 0),
  unit_cost_centavos bigint not null check (unit_cost_centavos >= 0)
);

-- Stock Counts
create table if not exists public.stock_counts (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  counted_by uuid not null references auth.users(id),
  note text,
  created_at timestamptz not null default now()
);

-- Stock Count Items
create table if not exists public.stock_count_items (
  id uuid primary key default gen_random_uuid(),
  stock_count_id uuid not null references public.stock_counts(id) on delete cascade,
  shop_id uuid not null references public.shops(id) on delete cascade,
  product_id uuid not null references public.products(id),
  expected_qty integer not null,
  counted_qty integer not null check (counted_qty >= 0),
  difference integer not null
);

-- Activity Log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 3. INDEXES (shop_id on all tables + foreign keys)
-- ============================================================================
create index if not exists idx_branches_shop_id on public.branches (shop_id);
create index if not exists idx_profiles_shop_id on public.profiles (shop_id);
create index if not exists idx_profiles_branch_id on public.profiles (branch_id);
create index if not exists idx_products_shop_id on public.products (shop_id);
create index if not exists idx_stock_movements_shop_id on public.stock_movements (shop_id);
create index if not exists idx_stock_movements_branch_id on public.stock_movements (branch_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements (product_id);
create index if not exists idx_sales_shop_id on public.sales (shop_id);
create index if not exists idx_sales_branch_id on public.sales (branch_id);
create index if not exists idx_sales_sold_by on public.sales (sold_by);
create index if not exists idx_sale_items_sale_id on public.sale_items (sale_id);
create index if not exists idx_sale_items_shop_id on public.sale_items (shop_id);
create index if not exists idx_sale_items_product_id on public.sale_items (product_id);
create index if not exists idx_stock_counts_shop_id on public.stock_counts (shop_id);
create index if not exists idx_stock_counts_branch_id on public.stock_counts (branch_id);
create index if not exists idx_stock_count_items_count_id on public.stock_count_items (stock_count_id);
create index if not exists idx_stock_count_items_shop_id on public.stock_count_items (shop_id);
create index if not exists idx_activity_log_shop_id on public.activity_log (shop_id);
create index if not exists idx_activity_log_created_at on public.activity_log (created_at desc);

-- ============================================================================
-- 4. HELPER FUNCTIONS FOR RLS
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

-- ============================================================================
-- 5. IMMUTABILITY & PROTECTION TRIGGERS
-- ============================================================================

-- Stock movements cannot be updated or deleted
create or replace function public.prevent_stock_movement_modification()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock_movements is an append-only ledger: updates and deletes are prohibited.';
end;
$$;

drop trigger if exists tr_prevent_stock_movement_mutation on public.stock_movements;
create trigger tr_prevent_stock_movement_mutation
before update or delete on public.stock_movements
for each row
execute function public.prevent_stock_movement_modification();

-- Sales and items cannot be deleted (mistakes are voided)
create or replace function public.prevent_sale_deletion()
returns trigger
language plpgsql
as $$
begin
  raise exception 'sales and sale_items cannot be deleted. Void the sale instead.';
end;
$$;

drop trigger if exists tr_prevent_sale_deletion on public.sales;
create trigger tr_prevent_sale_deletion
before delete on public.sales
for each row
execute function public.prevent_sale_deletion();

drop trigger if exists tr_prevent_sale_item_deletion on public.sale_items;
create trigger tr_prevent_sale_item_deletion
before delete on public.sale_items
for each row
execute function public.prevent_sale_deletion();

-- ============================================================================
-- 6. VIEWS
-- ============================================================================

-- Calculated stock on hand per product and branch (sum of movements)
create or replace view public.stock_levels
with (security_barrier = true) as
select
  shop_id,
  branch_id,
  product_id,
  coalesce(sum(quantity_change), 0)::integer as stock_on_hand
from public.stock_movements
where shop_id = (select public.current_user_shop_id())
group by shop_id, branch_id, product_id;

-- Staff safe products view (omits cost_price_centavos)
create or replace view public.staff_products
with (security_barrier = true) as
select
  id,
  shop_id,
  name,
  category,
  selling_price_centavos,
  low_stock_threshold,
  is_active
from public.products
where shop_id = (select public.current_user_shop_id());

-- Staff safe sales view (omits total_cost_centavos; staff only sees their own sales)
create or replace view public.my_sales
with (security_barrier = true) as
select
  id,
  shop_id,
  branch_id,
  sold_by,
  payment_method,
  total_centavos,
  status,
  client_request_id,
  created_at
from public.sales
where shop_id = (select public.current_user_shop_id())
  and sold_by = (select auth.uid());

-- Explicitly revoke public/anon access from all views
revoke all on public.stock_levels from anon;
revoke all on public.staff_products from anon;
revoke all on public.my_sales from anon;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on every business table
alter table public.shops enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_counts enable row level security;
alter table public.stock_count_items enable row level security;
alter table public.activity_log enable row level security;

-- Shops
create policy "shops_select" on public.shops
  for select to authenticated
  using (id = (select public.current_user_shop_id()));

create policy "shops_update_owner" on public.shops
  for update to authenticated
  using (id = (select public.current_user_shop_id()) and (select public.is_owner()))
  with check (id = (select public.current_user_shop_id()) and (select public.is_owner()));

-- Branches
create policy "branches_select" on public.branches
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()));

create policy "branches_modify_owner" on public.branches
  for all to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()))
  with check (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

-- Profiles
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()));

create policy "profiles_update_owner" on public.profiles
  for update to authenticated
  using (shop_id = (select public.current_user_shop_id()) and ((select public.is_owner()) or id = (select auth.uid())))
  with check (shop_id = (select public.current_user_shop_id()) and ((select public.is_owner()) or id = (select auth.uid())));

-- Products (Base table reads: Owner only! Staff must read via staff_products view)
create policy "products_select_owner" on public.products
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

create policy "products_modify_owner" on public.products
  for all to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()))
  with check (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

-- Stock Movements
create policy "stock_movements_select_owner" on public.stock_movements
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

create policy "stock_movements_insert" on public.stock_movements
  for insert to authenticated
  with check (shop_id = (select public.current_user_shop_id()));

-- Sales (Base table reads: Owner only! Staff reads via my_sales view)
create policy "sales_select_owner" on public.sales
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

create policy "sales_insert" on public.sales
  for insert to authenticated
  with check (shop_id = (select public.current_user_shop_id()));

create policy "sales_update_owner" on public.sales
  for update to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()))
  with check (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

-- Sale Items
create policy "sale_items_select_owner" on public.sale_items
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

create policy "sale_items_insert" on public.sale_items
  for insert to authenticated
  with check (shop_id = (select public.current_user_shop_id()));

-- Stock Counts & Items (Owner only)
create policy "stock_counts_owner" on public.stock_counts
  for all to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()))
  with check (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

create policy "stock_count_items_owner" on public.stock_count_items
  for all to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()))
  with check (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

-- Activity Log
create policy "activity_log_select_owner" on public.activity_log
  for select to authenticated
  using (shop_id = (select public.current_user_shop_id()) and (select public.is_owner()));

create policy "activity_log_insert" on public.activity_log
  for insert to authenticated
  with check (shop_id = (select public.current_user_shop_id()));

-- ============================================================================
-- 8. PERMISSIONS & GRANTS
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.stock_levels to anon, authenticated;
grant select on public.staff_products to anon, authenticated;
grant select on public.my_sales to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;
