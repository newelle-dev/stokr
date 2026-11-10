---
tags: [para/project, icm/contract]
unit: 5
status: approved
---
# Unit 5: Record a sale

Approved by owner 2026-11-10 (contract only; build not started). Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs
- Acceptance criteria: Unit 5 in [[progress-tracker]] (source of truth).
- Invariants that apply: sales created only through `record_sale`; stock = sum of append-only `stock_movements`; money is integer centavos; staff never see cost/profit/other staff's sales; never block a sale at zero stock, flag it (decision 2026-10-23).
- Earlier decisions: [[decisions-log]]

## Process
- [ ] 1. `record_sale` database function: atomic sale + items + price/cost snapshot + stock movements + activity log; safe against double tap; branch check (staff own branch, owner any). Show SQL first.
- [ ] 2. Revoke direct owner INSERT/UPDATE/DELETE on `sales`/`sale_items` and direct INSERT on `stock_movements` (per tracker). Show SQL first.
- [ ] 3. SQL tests: staff, other-shop user, double tap, zero-stock flag, atomic rollback.
- [ ] 4. Server action + Zod + unit tests; `/my-sales` data without cost or profit.
- [ ] 5. UI: multi-item sale in a few taps, Cash/GCash, `/my-sales`.
- [ ] 6. Verify: typecheck, lint, npm test, SQL tests, phone checklist.

## Outputs
- (fill in as built)

## Done when
- [ ] All Unit 5 acceptance criteria demonstrated
- [ ] Owner has seen it working and says it's done
