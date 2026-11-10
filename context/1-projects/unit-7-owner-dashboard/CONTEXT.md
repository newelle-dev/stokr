---
tags: [para/project, icm/contract]
unit: 7
status: approved   # draft -> approved -> in-progress -> verified -> done
---
# Unit 7: Owner dashboard

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs (read before starting)
- Acceptance criteria: the Unit 7 block in [[progress-tracker]] (source of truth; do not copy edits here)
- Layout: Dashboard block in [[ui-context]] (four cards in order, branch filter on top)
- Invariants that apply (from [[architecture]]): 1 (shop_id + RLS), 3 (voids, never deletes), 5 (centavos), 6 (staff never see cost/profit/others' sales), 11 (Asia/Manila days), 13 (zero stock flagged, not blocked), 17 (`requireOwnerPage()` on the page), 18 (no caching)
- Earlier decisions: [[decisions-log]]

## Decisions to confirm before approval (recommended answer first)
1. Low stock includes products at zero or below (shown as "Out of stock", listed first); a product exactly at its threshold counts as low. **Recommended: yes.**
2. Only product/branch pairs that have stock movements are checked. A product never given opening stock at a branch is not listed. **Recommended: yes** (avoids flagging products a branch never carried).
3. Missing stock card stays empty ("No stock count yet") until Unit 8 adds counts. **Recommended: yes.**
4. Profit = sum of completed sales minus the cost saved on each sale. Voided sales count nowhere. **Recommended: yes.**
5. Refresh every 30 seconds keeps the chosen branch (it is in the URL). No schema change, no new dependency. **Recommended: yes.**

## Process (read-only unit: no schema change, so no database hard stop)
- [ ] 1. Pure summary functions + Vitest tests
- [ ] 2. Filter schema + owner-only query (Manila day)
- [ ] 3. Real-session test: staff cannot read owner numbers; owner sees own shop only
- [ ] 4. UI (phone first): four cards, branch filter, 30-second refresh
- [ ] 5. Verify: typecheck, lint, npm test, hand calculation against `/sales`, phone checklist

## Outputs (files created or changed)
- New `features/dashboard/` (summary, schemas, queries, components, `__tests__`)
- `app/(owner)/dashboard/page.tsx` (replaces the Unit 2 placeholder)
- `supabase/tests/unit7_dashboard_access.test.ts`
- Update [[progress-tracker]] and [[decisions-log]]

## Done when
- [ ] Every acceptance criterion demonstrated
- [ ] Owner has seen it working and says it's done
