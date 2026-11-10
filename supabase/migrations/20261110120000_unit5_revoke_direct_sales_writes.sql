-- Migration: unit5_revoke_direct_sales_writes
-- Description: Unit 5 step 2. Sales and sale items can only be written by database functions
-- (record_sale now, void_sale in Unit 6). Direct INSERT/UPDATE/DELETE is removed from authenticated.
-- Owner read policies (sales_select_owner, sale_items_select_owner) stay.
-- STATUS: applied to dev by hand in the Supabase SQL Editor on 2026-11-10 (the migration tool declined it),
-- so it has no row in the migration history. Verified: 12 direct writes (owner and staff, 3 ops, 2 tables) refused with 42501.

drop policy if exists "sales_insert" on public.sales;
drop policy if exists "sales_insert_owner" on public.sales;
drop policy if exists "sale_items_insert" on public.sale_items;
drop policy if exists "sale_items_insert_owner" on public.sale_items;
revoke insert, update, delete on public.sales from authenticated;
revoke insert, update, delete on public.sale_items from authenticated;
