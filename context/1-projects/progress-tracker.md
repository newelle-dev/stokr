---
tags: [para/project]
---
# Progress Tracker

**Update this file after every unit.** Keep it honest and short.

## Current status
- **Phase:** Unit 5 built and passing automated checks. Waiting for the owner's phone check and sign-off.
- **Current unit:** Unit 5 (Record a sale), awaiting sign-off. Unit 4 complete.
- **Last updated:** 2026-11-10
- **Next milestone:** friend's "run both" week after Unit 6

## Build roadmap
Done: Units 1-4, see [[units-1-4]] (archive). Decisions: [[decisions-log]]. Rules: [[architecture]], [[ai-workflow-rules]].
Each unit must meet its acceptance criteria and the verification steps in `ai-workflow-rules.md` before the next one starts.

- [ ] **Unit 5: Record a sale** (about 3-4 days)
  - Staff can record a multi-item sale with Cash or GCash in a few taps on a phone
  - `record_sale` is atomic: sale, items, price/cost snapshot, stock reduction, and log entry all succeed together or not at all
  - Double tap creates only one sale
  - Staff can only sell at their branch; the owner can sell at any branch
  - Selling at zero stock works and is flagged
  - `/my-sales` shows only that staff member's sales, no cost or profit
  - Revoke direct owner INSERT/UPDATE/DELETE on sales and sale_items in Units 5 and 6 (database functions only: `record_sale`, `void_sale`); revoke direct INSERT on `stock_movements` from `authenticated` once the database functions exist
  - **Status:** built. Automated checks pass (typecheck, lint, 93 unit tests, build, 40 SQL checks on dev). Not yet done: owner's phone check and sign-off (phone checklist in `ai-workflow-rules.md`). Once signed off, tick this box and archive the unit folder.
- [ ] **Unit 6: Sales list, void and correction** (about 2-3 days)
  - Owner sees all sales with filters (date, branch, staff, status)
  - Owner can void a sale with a reason; stock returns; the sale stays visible as voided; totals exclude it
  - Owner can record a replacement sale linked to the original, keeping the original seller
  - Staff cannot edit or delete any sale (proved by a test)
  - Direct owner UPDATE and DELETE on `sales` and `sale_items` completely revoked from `authenticated` (voids via `void_sale` database function only)
- [ ] **>> MILESTONE: start the friend's "run both" week (app and notebook side by side)**
- [ ] **Unit 7: Owner dashboard** (about 3 days)
  - Shows, in order: today's sales and profit, low-stock list, sales per staff, missing stock
  - Branch filter works; "today" uses Asia/Manila time
  - Numbers match a hand calculation from the sales list
  - Refreshes about every 30 seconds while open
- [ ] **Unit 8: Stock count and gap report** (about 2-3 days)
  - Owner can count some or all products at a branch and sees expected vs counted vs difference
  - Accepting a count writes correction movements and appears in the log
  - Missing stock (units and cost value) appears on the dashboard
  - Direct owner INSERT/UPDATE/DELETE on `stock_counts` and `stock_count_items` completely revoked from `authenticated` (database functions only)
- [ ] **Unit 9: Polish, phone testing, real data, trial fixes** (about 3-5 days)
  - Installable to the phone home screen with icons
  - Loading, empty, and error states on every screen
  - Real products loaded; issues from the trial week fixed
  - Manual phone checklist passes on at least one iPhone-sized and one Android-sized screen
  - Pre-launch requirement: configure custom SMTP provider and implement owner forgot-password recovery flow
  - Pre-launch requirement: re-run npm audit before launch (7 production-side transitive findings via shadcn CLI deps); never use audit fix --force

## Open questions
| # | Question | Who answers | Blocks |
|---|---|---|---|
| 1 | ~Confirm currency is PHP and timezone is Asia/Manila~ (Confirmed: PHP & Asia/Manila) | Owner of the app | Unit 1 (Resolved) |
| 2 | ~Final app name~ (Confirmed: Stokr) | Owner of the app | Unit 9 (Resolved) |
| 3 | ~Do staff have email addresses to log in with?~ (Closed: staff log in by store code and username with hidden address) | Owner of the app / friend | Unit 3 (Resolved) |
| 4 | Is the product category list (liquid, device, cartridge, other) right? | Friend | Unit 3 |
| 5 | ~Confirm: never block a sale at zero stock, only flag it~ (Confirmed: Never block a sale at zero stock; flag on dashboard) | Owner of the app | Unit 5 (Resolved) |
| 6 | How often will the friend do a physical stock count? | Friend | Unit 8 |
| 7 | How often do discounts and returns happen? | Friend | After Unit 6 |
| 8 | How often do supplier prices change? | Friend | After Unit 4 |
| 9 | ~Approve the color palette and fonts in `ui-context.md`~ (Closed: dark palette, Geist font, emerald/gold accents approved) | Owner of the app | Unit 3 (Resolved) |

## Backlog (ideas not yet approved)
*(empty: add ideas here; do not build them until the owner approves)*

## Known limitations
- Unit 5 open items: (1) other tables still give the logged-in role TRUNCATE, REFERENCES and TRIGGER (`branches`, `products`, `profiles`, `shops`, `stock_counts`, `stock_count_items`); `profiles` and `shops` are auth-related, so this needs owner approval. (2) The concurrent double-tap test has not been run with two sessions at once. (3) The sell screen creates sale ids with `crypto.randomUUID()`, which needs HTTPS: new sales fail on a phone testing plain-HTTP dev over the LAN. (4) `/my-sales` shows only the latest 100 sales. (5) Migrations `20261110120000` (revoke on sales and sale items) was applied in the SQL Editor, so it has no entry in the migration history.
- Last-owner race condition: A theoretical race could occur if two owners concurrently attempt to deactivate/demote themselves at the exact same millisecond without an explicit table lock. Given Stokr shops have at most 1-2 owners, this edge case is acknowledged as a documented limitation.

- `rls_security_tests.sql` sections 6.1-6.7 catch every error (`exception when others then null`), which also swallows their own FAIL, so those checks cannot fail. Immutability is genuinely proved by `unit2_security_tests.sql` (stock_movements UPDATE/DELETE blocked by trigger). Tighten or delete 6.1-6.7 when next touching that file.
- SQL test files must be run by pasting into the Supabase SQL Editor (choose "Run without RLS": they only create temp tables inside BEGIN/ROLLBACK). The Supabase CLI `db query` rejects multi-statement files, so `npm run test:logging` and the `run_*_test.mjs` runners currently fail.

## Later (parked, not v1)
Public signup and billing, offline mode, notifications, product variants, spreadsheet import, batch costing, discount and return features, barcode scanning and receipts, report export, branch transfers, live push updates on the dashboard, deliberate shop-removal procedure (since append-only triggers on stock_movements and activity_log block cascade deletes if a shop row is deleted).

## Trial week notes
*(empty: fill in during the "run both" week: what was slow, confusing, or wrong)*

