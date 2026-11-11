---
tags: [para/project, icm/contract]
unit: 8
status: done   # draft -> approved -> in-progress -> verified -> done
---
# Unit 8: Stock count and gap report

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs (read before starting)
- Acceptance criteria: the Unit 8 block in [[progress-tracker]] (source of truth)
- Invariants that apply (from [[architecture]]): 1 (shop_id + RLS), 2 (stock is only movements, append-only), 5 (centavos), 6 (staff never see cost), 9 (owner mutations are logged), 12 (migration file only), 14 (actor = auth.uid()), 15, 17 (`requireOwnerPage()`), 18 (no caching), 19/20 (composite FKs, no deletes)
- Earlier decisions: [[decisions-log]] (2026-10-21: counts are database-functions-only in Unit 8)

## Decisions to confirm before approval (recommended answer first)
1. **Two steps.** Save a count (freezes expected qty, stock unchanged, shows gap report), then Accept (writes corrections). **Confirmed by owner.**
2. **Correction size = counted minus expected at save time** (the stored `difference`), not minus today's stock. Sales made after the count was saved are kept. **Recommended: yes.**
3. **Status column** on `stock_counts`: `open` / `accepted` / `cancelled`. An open count can be cancelled (never deleted). **Recommended: yes.**
4. **One open count per branch at a time.** **Recommended: yes.**
5. **Partial counts allowed.** Only the products the owner enters are in the count; only active products; counted qty 0 to 100,000. **Recommended: yes.**
6. **Missing stock on the dashboard** = negative differences in each branch's most recent *accepted* count, in units and in cost value at the product's current cost. Positive differences (extra stock) are not "missing". **Recommended: yes.**
7. Accept needs an explicit confirm step (ui-context). No new dependency.

## Process (schema change: SHOW SQL TO OWNER BEFORE APPLYING)
- [x] 1. Migration: add `status`, `accepted_at`, `accepted_by` to `stock_counts`; partial unique index for one open count per branch; revoke direct INSERT/UPDATE on both tables; functions `save_stock_count`, `accept_stock_count`, `cancel_stock_count` (owner only, each writes `activity_log`)
- [x] 2. SQL tests (UNIT8 PASS, 29 checks): staff blocked, other-shop blocked, direct writes blocked, accept writes correct movements, double accept fails
- [x] 3. Pure gap/missing-stock functions + Vitest tests
- [x] 4. Zod schemas, server actions, owner queries
- [x] 5. UI (phone first): count entry under Stock, gap report, Accept/Cancel, dashboard missing-stock card
- [x] 6. Verify: typecheck, lint, npm test, SQL tests, phone checklist

## Outputs
- New migration in `supabase/migrations/`, `supabase/tests/unit8_*.sql`
- New `features/stock-count/` (or inside `features/stock/`), a page under `app/(owner)/stock/`
- Dashboard missing-stock card filled in
- Update [[progress-tracker]] and [[decisions-log]]

## Done when
- [x] Every acceptance criterion demonstrated
- [x] Owner has seen it working and says it's done
