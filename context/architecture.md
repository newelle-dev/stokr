# Architecture

## Stack
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) | Pin the current stable version at project start |
| Database | Supabase Postgres | Row Level Security (RLS) on every table |
| Auth | Supabase Auth, email + password | No public signup in v1 |
| Styling | Tailwind CSS + shadcn/ui | See ui-context.md |
| Validation | Zod | Every server action validates its input |
| Hosting | Vercel | Free plan to start; confirm limits before real customers depend on it |
| Package manager | npm | Default; change only with owner approval |
| Testing | Vitest for pure logic; SQL scripts for database rules; manual phone checklist | |
| Phone support | Installable web app (manifest + icons); no offline service worker in v1 | |

## System boundaries
- **Browser** (staff phone, owner phone or laptop): renders UI, holds the in-progress cart in component state, calls server actions.
- **Next.js server** (server components, server actions): checks the session, validates input, calls Supabase as the logged-in user. The only place that may use the service role key, and only for creating or disabling staff accounts.
- **Supabase**: stores data, enforces RLS, runs the `record_sale` and `void_sale` database functions so each is a single atomic transaction.
- No other services in v1. No third-party payment, SMS, or email providers.

## Tenancy model
- A **shop** is one business. Every row in every business table carries `shop_id`.
- A user belongs to exactly one shop (via `profiles.shop_id`).
- RLS compares `shop_id` to the logged-in user's shop. App code never relies on filtering alone.
- No public signup. The first shop and owner are created by a seed script or manually in the Supabase dashboard.

## Auth model
- Login: email + password via Supabase Auth.
- Role lives in `profiles.role`: `owner` or `staff`.
- Owner creates staff accounts from `/team` (server action using the service role key). Staff get a temporary password and are asked to change it on first login.
- Staff have a home `branch_id`. Staff can only record sales for that branch. The owner can record at any branch.
- Route guards in Next.js layouts redirect by role. Guards are for usability; **RLS is the real protection.**

## Data model
Money is stored as whole centavos (integers). Timestamps are `timestamptz` (UTC).

| Table | Key columns |
|---|---|
| `shops` | id, name, created_at |
| `branches` | id, shop_id, name, is_active |
| `profiles` | id (= auth user id), shop_id, full_name, role (`owner`/`staff`), branch_id (home branch, nullable for owner), is_active |
| `products` | id, shop_id, name, category (`liquid`/`device`/`cartridge`/`other`), selling_price_centavos, cost_price_centavos, low_stock_threshold, is_active |
| `stock_movements` | id, shop_id, branch_id, product_id, quantity_change (signed int), reason (`opening`/`restock`/`sale`/`void_return`/`adjustment`/`count_correction`), sale_id (nullable), note, created_by, created_at |
| `sales` | id, shop_id, branch_id, sold_by, recorded_by, payment_method (`cash`/`gcash`), total_centavos, total_cost_centavos, status (`completed`/`voided`), void_reason, voided_by, voided_at, corrects_sale_id (nullable), client_request_id (unique), created_at |
| `sale_items` | id, sale_id, shop_id, product_id, product_name, quantity, unit_price_centavos, unit_cost_centavos |
| `stock_counts` | id, shop_id, branch_id, counted_by, note, created_at |
| `stock_count_items` | id, stock_count_id, shop_id, product_id, expected_qty, counted_qty, difference (counted minus expected) |
| `activity_log` | id, shop_id, actor_id, action, entity_type, entity_id, details (jsonb), created_at |

**Stock on hand** for a product at a branch = sum of `quantity_change` in `stock_movements`. It is exposed through a database view (`stock_levels`). There is no editable stock number anywhere.

**Sold by vs recorded by:** for normal sales both are the same person. For an owner's replacement sale after a void, `sold_by` keeps the original seller and `recorded_by` is the owner.

## How the key actions work
- **Record a sale** (`record_sale` database function, one transaction): validates the user may sell at that branch, reads current prices and costs, inserts the sale and its items (saving name, price, and cost), inserts one negative `sale` stock movement per item, writes an activity log entry. `client_request_id` makes double taps harmless (same id returns the existing sale).
- **Void a sale** (`void_sale`, owner only): marks it `voided` with a reason, inserts positive `void_return` movements, writes to the activity log. Voided sales never count in totals.
- **Restock / adjust** (owner only): inserts movements. Restock may also update the product's current cost price (written to the log).
- **Stock count** (owner only): for each counted product, saves expected quantity (from `stock_levels`) and the counted quantity. On "accept", inserts `count_correction` movements for each difference.
- **Dashboard**:
  - Sales total = sum of `total_centavos` for completed sales today.
  - Profit = sales total minus `total_cost_centavos`.
  - Low stock = products where stock on hand is at or below the threshold, per branch.
  - Sales per staff = totals grouped by `sold_by`.
  - Missing stock = negative differences in each branch's most recent count, shown in units and in cost value.
  - Negative or zero stock from sales is flagged here too.

## What staff can and cannot see
Staff never receive cost prices, profit, or other staff members' sales. Base tables holding cost data (`products`, `sales`, `sale_items`) allow reads for the owner only. Staff read through database views that leave cost columns out (`staff_products`, `my_sales`).

## Invariants (never violate)
1. Every business table has `shop_id` and RLS enabled. No table ships without policies.
2. Stock is never stored as an editable number. It is the sum of `stock_movements`. Movements are append-only: no updates, no deletes.
3. Sales are never deleted. A mistake is a void with a reason.
4. Each sale item stores product name, price, and cost at the time of sale. Changing a product later never changes past sales.
5. Money is integer centavos everywhere (database, code, API). Format only at display time.
6. Cost price, profit, and other staff's sales never reach a staff user's browser, including in network responses.
7. Sales are created only through `record_sale` and voided only through `void_sale`, never by inserting rows directly.
8. The service role key is used only on the server and only to create or disable users. It is never sent to the browser.
9. Every owner mutation (product change, restock, adjustment, void, count, team change) writes an `activity_log` entry.
10. A staff sale always has `sold_by` equal to the logged-in user and a branch equal to their assigned branch.
11. Day boundaries ("today") are computed in Asia/Manila time, not UTC and not the device's timezone.
12. All schema changes go through migration files in `supabase/migrations`. No manual edits to the live schema.
13. A sale is never blocked by zero or negative stock. It is flagged instead. *(Assumption pending owner confirmation.)*

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: allowed in the browser.
- `SUPABASE_SERVICE_ROLE_KEY`: server only. Never prefix with `NEXT_PUBLIC_`. Never commit.
- `.env.local` is never committed; keep `.env.example` with names only.