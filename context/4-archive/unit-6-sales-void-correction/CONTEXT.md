---
tags: [para/project, icm/contract]
unit: 6
status: done   # draft -> approved -> in-progress -> verified -> done
---
# Unit 6: Sales list, void and correction

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs (read before starting)
- Acceptance criteria: the Unit 6 block in [[progress-tracker]] (source of truth; do not copy edits here)
- Invariants that apply (from [[architecture]]): 1 (shop_id + RLS), 3 (never delete sales), 4 (item snapshots), 5 (centavos), 6 (staff never see cost/profit/others' sales), 7 (sales only via `record_sale` / `void_sale`), 9 (activity_log on owner mutations), 10 (staff sale rules), 11 (Asia/Manila days), 14 (actor columns not forgeable), 15 (`void_return` movements function-only), 17 (`requireOwnerPage()` on every owner page), 18 (no caching), 19 (composite FKs), 20 (no cascade)
- Earlier decisions: [[decisions-log]]

## Decisions to confirm before approval (recommended answer first)
1. Void reason is required (non-empty, max ~200 chars). **Recommended: yes.**
2. A replacement sale can be recorded only from a `voided` sale, and only one replacement per original. `sold_by` keeps the original seller; `recorded_by` is the owner. **Recommended: yes.**
3. Default sales-list filter: today (Asia/Manila), all branches, all staff, all statuses. **Recommended: today.**
4. Unit 5 leftover grants (TRUNCATE/REFERENCES/TRIGGER on `profiles`, `shops` etc.) and the two-session double-tap test stay out of Unit 6 and remain in Known limitations. **Recommended: out of scope.**
5. Sales list is paged (e.g. 50 per page) so it never loads everything. **Recommended: yes.**

## Model split (PIV)
Plan: Sonnet · Implement DB + SQL tests: Sonnet · Implement server actions + UI: Haiku · Validate: Sonnet (includes review of Haiku's server-action code for permissions)

## Process (security before UI; stop for owner OK at each hard stop)
- [x] 1. Database + RLS (show SQL, wait for owner go-ahead): `void_sale` (owner only, reason, `void_return` movements, activity_log, rejects already-voided); `record_sale` extension (or owner replacement path) for `corrects_sale_id`, `sold_by` = original seller; revoke direct owner UPDATE/DELETE on `sales` and `sale_items` from `authenticated`
- [x] 2. SQL tests (as owner, as staff, as a user from another shop): staff cannot void/edit/delete; owner direct UPDATE/DELETE fails; void returns stock once; double void rejected; replacement rules; cross-shop blocked
- [x] 3. Server actions + Zod + unit tests: `voidSaleAction`, replacement via sale action, `getOwnerSales` with filters (date, branch, staff, status) and paging
- [x] 4. UI (phone first): owner sales list with filters, voided badge, void modal with reason, "record replacement" flow keeping original seller
- [x] 5. Verify: typecheck, lint, npm test, SQL tests, phone checklist

## Outputs (files created or changed)
- New migration in `supabase/migrations/` (void_sale, replacement support, revokes)
- New SQL test file in `supabase/tests/`
- `features/sales/` additions (schemas, actions, queries, components); owner sales page under `app/(owner)/`
- Update owner nav if needed; update [[progress-tracker]] and [[decisions-log]]

## Done when
- [x] Every acceptance criterion demonstrated
- [x] Owner has seen it working and says it's done
