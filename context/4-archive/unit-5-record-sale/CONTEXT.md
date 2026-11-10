---
tags: [para/project, icm/contract]
unit: 5
status: approved
---
# Unit 5: Record a sale

Approved by owner 2026-11-10. Build done 2026-11-10; waiting for owner's phone check and sign-off. Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs
- Acceptance criteria: Unit 5 in [[progress-tracker]] (source of truth).
- Invariants that apply: sales created only through `record_sale`; stock = sum of append-only `stock_movements`; money is integer centavos; staff never see cost/profit/other staff's sales; never block a sale at zero stock, flag it (decision 2026-10-23).
- Earlier decisions: [[decisions-log]]

## Process
- [x] 1. `record_sale` database function: atomic sale + items + price/cost snapshot + stock movements + activity log; safe against double tap; branch check (staff own branch, owner any). Show SQL first. (Applied to dev 2026-11-10: `20261110025755_unit5_record_sale.sql`; review fixes `20261110072418_unit5_record_sale_fixes.sql`)
- [x] 2. Revoke direct owner INSERT/UPDATE/DELETE on `sales`/`sale_items` and direct INSERT on `stock_movements` (per tracker). Show SQL first. (`stock_movements` INSERT was already revoked in Unit 4. `sales`/`sale_items` applied to dev by hand 2026-11-10: `20261110120000_unit5_revoke_direct_sales_writes.sql`.)
- [x] 3. SQL tests: staff, other-shop user, double tap, zero-stock flag, atomic rollback. (`supabase/tests/unit5_record_sale_tests.sql`, 40 checks pass on dev, all rolled back. Re-run after steps 2 and 4.)
- [x] 4. Server action + Zod + unit tests; `/my-sales` data without cost or profit. (`features/sales/`: `recordSaleAction`, schema, friendly error mapping, `getMySales` on the `my_sales` and `my_sale_items` views; 18 unit tests; typecheck, lint and all 85 tests pass. Added `record_sale` and `my_sale_items` to `lib/supabase/database.types.ts` from the generator.)
- [x] 5. UI: multi-item sale in a few taps, Cash/GCash, `/my-sales`. (Built: `app/(staff)/sell`, `app/(staff)/my-sales`, `features/sales/components/`, staff nav links. Cart logic in `features/sales/cart.ts` with 8 tests. Build passes. Not yet checked on a phone or logged in as staff; that is the phone checklist in step 6.)
- [x] 6. Verify: typecheck, lint, npm test, SQL tests, phone checklist. (Passed: typecheck, lint, 93 unit tests, production build, 40 SQL checks on dev with all test data rolled back, phone check by the owner on 2026-11-10. Sign-off given.)

## Outputs
- Database (dev project only so far): `record_sale` (with review fixes), `my_sale_items` view, revokes on `sales`, `sale_items` and `stock_movements`. Migration files in `supabase/migrations/20261110*_unit5_*.sql`.
- Tests: `supabase/tests/unit5_record_sale_tests.sql` (40 checks, run in the SQL Editor or through the MCP; rolled back). `features/sales/__tests__/` (cart, schema, error mapping, action).
- Server code: `features/sales/` (`actions.ts`, `schemas.ts`, `sale-errors.ts`, `queries.ts`, `cart.ts`, `components/`).
- Screens: `app/(staff)/sell/` (counter, error and loading screens), `app/(staff)/my-sales/` (list, error and loading screens), staff nav links and a 44px sign-out button in `app/(staff)/layout.tsx`.
- Generated types: `lib/supabase/database.types.ts` gained `record_sale` and `my_sale_items` from the generator.
- Known gaps: see the Unit 5 open items in [[progress-tracker]].

## Done when
- [x] All Unit 5 acceptance criteria demonstrated (database tests on dev, unit tests, phone check)
- [x] Owner has seen it working and says it's done (2026-11-10)
