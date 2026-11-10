-- Migration: unit5_my_sale_items_and_revokes
-- Description: Unit 5 follow-up.
--   1. Remove TRUNCATE, REFERENCES and TRIGGER from authenticated on sales, sale_items and stock_movements.
--      TRUNCATE skips the row triggers that stop deletes, and invariant 2 says truncates are prohibited.
--   2. New view my_sale_items: staff see the item lines of their own sales. No cost columns.
-- STATUS: applied to dev (dzrfgaymkznuzkuuakum) 2026-11-10 via the migration tool.
-- Verified: no TRUNCATE/REFERENCES/TRIGGER left on sales, sale_items, stock_movements for authenticated;
-- truncate on sales refused (42501); staff see only their own item lines; no cost column in the view.

revoke truncate, references, trigger on public.sales from authenticated;
revoke truncate, references, trigger on public.sale_items from authenticated;
revoke truncate, references, trigger on public.stock_movements from authenticated;

-- Same pattern as my_sales: security_barrier view, filtered to the caller's own sales.
-- Columns are listed by hand so unit_cost_centavos can never leak.
create or replace view public.my_sale_items
with (security_barrier = true) as
select
  si.id,
  si.sale_id,
  si.shop_id,
  si.product_id,
  si.product_name,
  si.quantity,
  si.unit_price_centavos,
  si.quantity * si.unit_price_centavos as line_total_centavos
from public.sale_items si
join public.sales s on s.id = si.sale_id and s.shop_id = si.shop_id
where s.shop_id = (select public.current_user_shop_id())
  and s.sold_by = (select auth.uid());

revoke all on public.my_sale_items from anon;
grant select on public.my_sale_items to authenticated;
