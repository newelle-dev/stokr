---
tags: [para/project]
---
# Progress Tracker

**Update this file after every unit.** Keep it honest and short.

## Current status
- **Phase:** Units 1-8 done (owner sign-off, 2026-11-11). Unit 9 is started, not done.
- **SQL tests passed on dev (2026-11-12, SQL Editor, "Run without RLS"):** Unit 5 `unit5_record_sale_tests.sql` (40 checks), Unit 6 `unit6_void_and_replacement_tests.sql` (38 checks), Unit 8 `unit8_stock_count_tests.sql` (29 checks). Unit 8 test was fixed first: it assumed the seed shop had no count rows, but dev has two real counts from 2026-11-11; it now compares against a baseline.
- **Manual checks not yet recorded (2026-11-12):** Unit 6 phone check; Unit 7 hand calculation vs `/sales`; two-session concurrency tests (sales double tap, stock accept); Unit 9 phone checklist and install test.
- **Current unit:** Unit 11 (owner email + password sign-in, started 2026-11-13; contract `1-projects/unit-11-owner-email-password/CONTEXT.md`). Unit 9 stays open. Unit 10 (owner magic-link sign-in and onboarding) is closed; Unit B (Google sign-in) is built and merged to `main` on 2026-11-11, and was tested with a new owner account (onboarding worked end to end). Units 1-8 complete.
- **Last updated:** 2026-11-12 (status re-checked against code by subagents; see Unit 9 and Unit 10 notes)
- **Supabase:** this repo has one Supabase project ("Stokr"). Older notes that say "dev" or "production" both mean this project. A separate production project is not set up; decide before launch.
- **Next milestone:** start the friend's "run both" week (app and notebook side by side)

## Build roadmap
Done: Units 1-4, see [[units-1-4]] (archive). Decisions: [[decisions-log]]. Rules: [[architecture]], [[ai-workflow-rules]].
Each unit must meet its acceptance criteria and the verification steps in `ai-workflow-rules.md` before the next one starts.

- [x] **Unit 5: Record a sale** (about 3-4 days). Done 2026-11-10; owner phone check passed. Contract archived in `4-archive/unit-5-record-sale/`.
  - Staff can record a multi-item sale with Cash or GCash in a few taps on a phone
  - `record_sale` is atomic: sale, items, price/cost snapshot, stock reduction, and log entry all succeed together or not at all
  - Double tap creates only one sale
  - Staff can only sell at their branch; the owner can sell at any branch
  - Selling at zero stock works and is flagged
  - `/my-sales` shows only that staff member's sales, no cost or profit
  - Revoke direct owner INSERT/UPDATE/DELETE on sales and sale_items in Units 5 and 6 (database functions only: `record_sale`, `void_sale`); revoke direct INSERT on `stock_movements` from `authenticated` once the database functions exist
- [x] **Unit 6: Sales list, void and correction** (about 2-3 days). Done 2026-11-10; owner sign-off. Contract archived in `4-archive/unit-6-sales-void-correction/`.
  - Owner sees all sales with filters (date, branch, staff, status)
  - Owner can void a sale with a reason; stock returns; the sale stays visible as voided; totals exclude it
  - Owner can record a replacement sale linked to the original, keeping the original seller
  - Staff cannot edit or delete any sale (proved by a test)
  - Direct owner UPDATE and DELETE on `sales` and `sale_items` completely revoked from `authenticated` (voids via `void_sale` database function only)
- [ ] **>> MILESTONE: start the friend's "run both" week (app and notebook side by side)**
- [x] **Unit 7: Owner dashboard** (about 3 days). Done 2026-11-11; owner sign-off. Contract archived in `4-archive/unit-7-owner-dashboard/`.
  - Shows, in order: today's sales and profit, low-stock list, sales per staff, missing stock
  - Branch filter works; "today" uses Asia/Manila time
  - Numbers match a hand calculation from the sales list
  - Refreshes about every 30 seconds while open
- [x] **Unit 8: Stock count and gap report** (about 2-3 days). Done 2026-11-11; owner sign-off. Contract archived in `4-archive/unit-8-stock-count-gap-report/`.
  - Owner can count some or all products at a branch and sees expected vs counted vs difference
  - Accepting a count writes correction movements and appears in the log
  - Missing stock (units and cost value) appears on the dashboard
  - Direct owner INSERT/UPDATE/DELETE on `stock_counts` and `stock_count_items` completely revoked from `authenticated` (database functions only)
- [ ] **Unit 9: Polish, phone testing, real data, trial fixes** (about 3-5 days)
  - Installable to the phone home screen with icons: BUILT (code check 2026-11-12: `app/manifest.ts`, `public/icon-*.png`, apple-touch-icon in `app/layout.tsx`); phone install test still open
  - Loading, empty, and error states on every screen: PARTIAL (checked 2026-11-12: loading and error files cover owner and staff routes; missing on auth pages, onboarding, and the root; no `not-found` pages; empty states not checked on my-sales, opening stock, replacement sale, settings)
  - Real products loaded; issues from the trial week fixed
  - Manual phone checklist passes on at least one iPhone-sized and one Android-sized screen
  - Owner forgot-password (updated 2026-11-13): owners now sign in with email + password (Unit 11). There is no reset email; the product owner resets a password with `scripts/create-owner.mjs`. `/login/callback` is deleted. An emailed reset flow is only needed once a domain exists and public signup is opened. **Domain and email blockers (only for public signup or emailed resets):** (1) buy a domain and verify it in Resend (sandbox only delivers to the Resend account email); (2) DONE per owner 2026-11-12: custom SMTP with Resend, and site URL + `/login/callback` added to Auth > URL Configuration > Redirect URLs; (3) test one real reset email end to end
  - Pre-launch requirement: re-run npm audit before launch (7 production-side transitive findings via shadcn CLI deps); never use audit fix --force. No audit re-run record exists in the repo as of 2026-11-12.
  - Built, not yet ticked (2026-11-12 check): app manifest and icons (`app/manifest.ts`, `public/icon-*.png`, apple icon, theme colour). Not tested on a real phone.
  - Not verifiable from the repo: domain, SMTP and redirect URL setup in Resend and Supabase; real product data (repo has demo seed only).
- [x] **Unit 10: Owner magic-link sign-in and onboarding (Unit A)**. Closed for now, 2026-11-11, by owner decision. SUPERSEDED 2026-11-13 by Unit 11: the magic link is removed; onboarding stays but asks for a password instead of products. Contract: `4-archive/unit-10-owner-magic-link-onboarding/CONTEXT.md`. Plan: `docs/superpowers/plans/2026-11-11-owner-magic-link-onboarding.md`. Branch `feat/owner-magic-link-onboarding` (not merged).
  - Open, carried forward: (1) a new owner going through onboarding in a browser is not yet tested (needs a verified domain in Resend, or a fake dev account); (2) clear owner passwords on the production project before launch (dev is done; not verifiable from the repo); (3) DONE per owner 2026-11-12: `SITE_URL` set on Vercel (code uses it and throws if unset); (4) the owner profile log says `staff_created` on every profiles insert (still open, `supabase/migrations/20261021065454_lockdown_table_mutations_and_shops.sql:289`); (5) CONFLICT: the store code is shown once on onboarding, but `app/(owner)/settings/page.tsx` shows it on every visit. Decide: hide it on settings, or accept it and drop this line.
  - Checked 2026-11-12: magic-link owner sign-in, `SITE_URL` use, and the staff-only password path are implemented in code. Owner password sign-in is removed from the UI.
  - Owners sign in with a magic link; no owner password after a proven magic-link sign-in
  - Anyone can sign up as an owner; new owner sets up shop name, first branch, optional products on `/onboarding`
  - Store code generated and shown once; new products start at zero stock
  - New owner cannot see or change any other shop's rows (SQL test as a user from another shop)
  - Sign-in emails tested with the Resend account email; real-email test waits for the domain
  - Unit B (Google sign-in) follows after the owner approves the Google Cloud account
- [x] **Unit B: Google sign-in** (done 2026-11-11; REMOVED 2026-11-13 by Unit 11, no domain yet. The product owner turns the Google provider off in the Supabase dashboard). Owner tab has "Continue with Google". Google client set up by the owner. Tested: a new Google account reached onboarding and created a shop end to end. Open: Google sign-in works only for listed test users until the consent screen is published.

- [ ] **Unit 11: Owner email + password sign-in** (started 2026-11-13). Replaces the magic link and Google sign-in (decisions-log, 2026-11-13). Plan: `docs/superpowers/plans/2026-11-13-owner-email-password-login.md`.
  - Owner signs in with email and password; staff login unchanged
  - Owner accounts are created by hand with `scripts/create-owner.mjs`; no self-signup
  - First sign-in goes to onboarding: shop name, first branch, new password (no products step)
  - Google, magic link and `/login/callback` removed from the app
  - Demo owner with sample data for portfolio visitors

## Open questions
| # | Question | Who answers | Blocks |
|---|---|---|---|
| 1 | ~Confirm currency is PHP and timezone is Asia/Manila~ (Confirmed: PHP & Asia/Manila) | Owner of the app | Unit 1 (Resolved) |
| 2 | ~Final app name~ (Confirmed: Stokr) | Owner of the app | Unit 9 (Resolved) |
| 3 | ~Do staff have email addresses to log in with?~ (Closed: staff log in by store code and username with hidden address) | Owner of the app / friend | Unit 3 (Resolved) |
| 4 | Is the product category list (liquid, device, cartridge, other) right? | Friend | Unit 3 |
| 5 | ~Confirm: never block a sale at zero stock, only flag it~ (Confirmed: Never block a sale at zero stock; flag on dashboard) | Owner of the app | Unit 5 (Resolved) |
| 6 | How often will the friend do a physical stock count? | Friend | Unit 9 (screen is built; the answer may shape reminders) |
| 7 | How often do discounts and returns happen? | Friend | After Unit 6 |
| 8 | How often do supplier prices change? | Friend | After Unit 4 |
| 9 | ~Approve the color palette and fonts in `ui-context.md`~ (Closed: dark palette, Geist font, emerald/gold accents approved) | Owner of the app | Unit 3 (Resolved) |

## Backlog (ideas not yet approved)
*(empty: add ideas here; do not build them until the owner approves)*

## Known limitations
- Unit 5 open items: (1) other tables still give the logged-in role TRUNCATE, REFERENCES and TRIGGER (`branches`, `products`, `profiles`, `shops`, `stock_counts`, `stock_count_items`); `profiles` and `shops` are auth-related, so this needs owner approval. (2) The concurrent double-tap test has not been run with two sessions at once. (3) The sell screen creates sale ids with `crypto.randomUUID()`, which needs HTTPS: new sales fail on a phone testing plain-HTTP dev over the LAN. (4) `/my-sales` shows only the latest 100 sales. (5) Migrations `20261110120000` (revoke on sales and sale items) was applied in the SQL Editor, so it has no entry in the migration history.
- Unit 7 open items: (1) a sale in the last sub-millisecond before Manila midnight can fall in no day (shared date helper with `/sales`); (2) negative stock reads as "-2 left"; (3) dashboard reads of today's sales are summed in code (paged, 1000 per request), move to a database sum if volume grows; (4) missing stock card is filled in by Unit 8.
- SQL suites run on dev 2026-11-12 (Supabase SQL Editor, "Run without RLS"): Unit 2 59/59 PASS, Unit 5 40 PASS, Unit 6 38 PASS, Unit 8 29 PASS. Not yet run on production.
- Migration history on dev (fixed 2026-11-12): rows now match the files for `20261110120000` (renamed to `unit5_revoke_direct_sales_writes`), `20261110130000` (was recorded under a different version, `20261110073523`; corrected), `20261110140000`, `20261111100000` and `20261111160000` (`restore_profile_insert`, added). Production still needs the same check. The file header of `20261110140000` still says "NOT YET APPLIED"; update it.
- Open on dev: `authenticated` has DELETE, TRUNCATE, REFERENCES and TRIGGER on `profiles` (only INSERT was meant to be restored). Owner decision needed.
- Unit 8 open items: (1) migration `20261111100000` was applied in the SQL Editor; it needs a row in `supabase_migrations.schema_migrations` (version `20261111100000`, name `unit8_stock_count`). (2) No list of past counts on screen; they appear only in the activity log. (3) Missing-stock cost uses each product's current cost price, not the cost at count time. (4) Two owners accepting the same count at once is covered by a row lock in `accept_stock_count` but has not been tested with two sessions. (5) The `/stock/count` entry list has no search box, so a long product list means scrolling.
- Unit 6 open items: (1) migration `20261110140000_unit6_void_and_replacement` was applied in the SQL Editor; it needs a row in `supabase_migrations.schema_migrations` (insert version `20261110140000`, name `unit6_void_and_replacement`) if not already added. (2) Two owners voiding the same sale at the same instant is covered by a row lock in `void_sale` but has not been tested with two sessions. (3) The owner sales totals read every matching row (marked `shortcut:` in `features/sales/queries.ts`); move to a database sum if date ranges get large. (4) Strict `z.string().uuid()` in branches, products, stock and team schemas rejects the all-zero seed ids (e.g. `...0010`); sales schemas now use `z.guid()`. Real ids from `gen_random_uuid()` are fine. Decide whether to switch the other schemas to `guid()`.
- Last-owner race condition: A theoretical race could occur if two owners concurrently attempt to deactivate/demote themselves at the exact same millisecond without an explicit table lock. Given Stokr shops have at most 1-2 owners, this edge case is acknowledged as a documented limitation.

- `rls_security_tests.sql` sections 6.1-6.7 catch every error (`exception when others then null`), which also swallows their own FAIL, so those checks cannot fail. Immutability is genuinely proved by `unit2_security_tests.sql` (stock_movements UPDATE/DELETE blocked by trigger). Tighten or delete 6.1-6.7 when next touching that file.
- SQL test files must be run by pasting into the Supabase SQL Editor (choose "Run without RLS": they only create temp tables inside BEGIN/ROLLBACK). The Supabase CLI `db query` rejects multi-statement files, so `npm run test:logging` and the `run_*_test.mjs` runners currently fail.

## Later (parked, not v1)
Public signup and billing, offline mode, notifications, product variants, spreadsheet import, batch costing, discount and return features, barcode scanning and receipts, report export, branch transfers, live push updates on the dashboard, deliberate shop-removal procedure (since append-only triggers on stock_movements and activity_log block cascade deletes if a shop row is deleted).

## Trial week notes
*(empty: fill in during the "run both" week: what was slow, confusing, or wrong)*

