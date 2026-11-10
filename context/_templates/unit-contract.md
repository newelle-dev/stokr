---
tags: [para/project, icm/contract]
unit: N
status: draft   # draft -> approved -> in-progress -> verified -> done
---
# Unit N: <name>

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs (read before starting)
- Acceptance criteria (the tracker is the source; do not copy edits here)
- Invariants that apply (name each from [[architecture]])
- Earlier decisions: [[decisions-log]]

## Process (security before UI; stop for owner OK at each hard stop)
- [ ] 1. Database + RLS (show SQL, wait for owner go-ahead)
- [ ] 2. SQL tests (as staff, and as a user from another shop)
- [ ] 3. Server actions + Zod + unit tests
- [ ] 4. UI (phone first)
- [ ] 5. Verify: typecheck, lint, npm test, SQL tests, phone checklist

## Outputs (files created or changed)
-

## Done when
- [ ] Every acceptance criterion demonstrated
- [ ] Owner has seen it working and says it's done
