-- Migration: 20261020084500_shop_scoped_composite_foreign_keys.sql
-- Description: Enforce strict multi-tenant referential integrity by replacing single-column
--              foreign keys with composite foreign keys (shop_id, ref_id) without cascade.

-- 1. COMPOSITE UNIQUE CONSTRAINTS ON PARENT TABLES
alter table public.branches
  add constraint uq_branches_shop_id_id unique (shop_id, id);

alter table public.profiles
  add constraint uq_profiles_shop_id_id unique (shop_id, id);

alter table public.products
  add constraint uq_products_shop_id_id unique (shop_id, id);

alter table public.sales
  add constraint uq_sales_shop_id_id unique (shop_id, id);

alter table public.stock_counts
  add constraint uq_stock_counts_shop_id_id unique (shop_id, id);

-- 2. PROFILES
alter table public.profiles
  drop constraint profiles_branch_id_fkey,
  add constraint profiles_shop_branch_fkey
    foreign key (shop_id, branch_id)
    references public.branches (shop_id, id);

-- 3. STOCK MOVEMENTS
alter table public.stock_movements
  drop constraint stock_movements_branch_id_fkey,
  add constraint stock_movements_shop_branch_fkey
    foreign key (shop_id, branch_id)
    references public.branches (shop_id, id);

alter table public.stock_movements
  drop constraint stock_movements_product_id_fkey,
  add constraint stock_movements_shop_product_fkey
    foreign key (shop_id, product_id)
    references public.products (shop_id, id);

alter table public.stock_movements
  drop constraint stock_movements_created_by_fkey,
  add constraint stock_movements_shop_created_by_fkey
    foreign key (shop_id, created_by)
    references public.profiles (shop_id, id);

alter table public.stock_movements
  add constraint stock_movements_shop_sale_fkey
    foreign key (shop_id, sale_id)
    references public.sales (shop_id, id);

-- 4. SALES
alter table public.sales
  drop constraint sales_branch_id_fkey,
  add constraint sales_shop_branch_fkey
    foreign key (shop_id, branch_id)
    references public.branches (shop_id, id);

alter table public.sales
  drop constraint sales_sold_by_fkey,
  add constraint sales_shop_sold_by_fkey
    foreign key (shop_id, sold_by)
    references public.profiles (shop_id, id);

alter table public.sales
  drop constraint sales_recorded_by_fkey,
  add constraint sales_shop_recorded_by_fkey
    foreign key (shop_id, recorded_by)
    references public.profiles (shop_id, id);

alter table public.sales
  drop constraint sales_voided_by_fkey,
  add constraint sales_shop_voided_by_fkey
    foreign key (shop_id, voided_by)
    references public.profiles (shop_id, id);

alter table public.sales
  drop constraint sales_corrects_sale_id_fkey,
  add constraint sales_shop_corrects_sale_fkey
    foreign key (shop_id, corrects_sale_id)
    references public.sales (shop_id, id);

-- 5. SALE ITEMS
alter table public.sale_items
  drop constraint sale_items_sale_id_fkey,
  add constraint sale_items_shop_sale_fkey
    foreign key (shop_id, sale_id)
    references public.sales (shop_id, id);

alter table public.sale_items
  drop constraint sale_items_product_id_fkey,
  add constraint sale_items_shop_product_fkey
    foreign key (shop_id, product_id)
    references public.products (shop_id, id);

-- 6. STOCK COUNTS
alter table public.stock_counts
  drop constraint stock_counts_branch_id_fkey,
  add constraint stock_counts_shop_branch_fkey
    foreign key (shop_id, branch_id)
    references public.branches (shop_id, id);

alter table public.stock_counts
  drop constraint stock_counts_counted_by_fkey,
  add constraint stock_counts_shop_counted_by_fkey
    foreign key (shop_id, counted_by)
    references public.profiles (shop_id, id);

-- 7. STOCK COUNT ITEMS
alter table public.stock_count_items
  drop constraint stock_count_items_stock_count_id_fkey,
  add constraint stock_count_items_shop_count_fkey
    foreign key (shop_id, stock_count_id)
    references public.stock_counts (shop_id, id);

alter table public.stock_count_items
  drop constraint stock_count_items_product_id_fkey,
  add constraint stock_count_items_shop_product_fkey
    foreign key (shop_id, product_id)
    references public.products (shop_id, id);

-- 8. ACTIVITY LOG
alter table public.activity_log
  drop constraint activity_log_actor_id_fkey,
  add constraint activity_log_shop_actor_fkey
    foreign key (shop_id, actor_id)
    references public.profiles (shop_id, id);
