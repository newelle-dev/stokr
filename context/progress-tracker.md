# Progress Tracker

**Update this file after every unit.** Keep it honest and short.

## Current status
- **Phase:** Unit 3 complete (in review).
- **Current unit:** Unit 3 (App and Database complete)
- **Last updated:** 2026-10-21
- **Next milestone:** friend's "run both" week after Unit 6

## Build roadmap
Each unit must meet its acceptance criteria and the verification steps in `ai-workflow-rules.md` before the next one starts.

- [x] **Unit 1: Project setup, database foundation, shop separation** (about 2-3 days)
  - Next.js + TypeScript + Tailwind + shadcn/ui project runs locally and deploys to Vercel
  - Supabase connected; `.env.example` exists; scripts for `dev`, `build`, `typecheck`, `lint`, `test`
  - Migrations create `shops`, `branches`, `profiles`, `products`, `stock_movements`, `sales`, `sale_items`, `stock_counts`, `stock_count_items`, `activity_log` with `shop_id` and RLS on all
  - Seed creates one test shop in the first shop's shape (2 branches) with one owner and one staff
  - SQL tests prove: a user from another shop sees nothing; staff can't read cost data
- [x] **Unit 2: Login and roles** (about 2 days)
  - Email + password login and logout; session refresh works
  - Owner and staff land on different home pages; staff can't open owner pages
  - Staff cannot reach owner data even by calling the database directly
- [x] **Unit 3: Branches and products (owner)** (about 2 days)
  - Owner can add, edit, and deactivate products (name, category, selling price, cost price, low-stock level)
  - Owner can add and rename branches; owner can create staff logins and assign branches (`/team`)
  - Deactivating a staff member terminates all active sessions immediately via database trigger; password reset terminates sessions via `begin_staff_password_reset`
  - Staff can see product names and selling prices only (via `staff_products`), never cost
  - Every change appears in the activity log
- [ ] **Unit 4: Stock** (about 2-3 days)
  - Owner can enter opening stock per branch, restock (optionally updating cost price), and make adjustments with a note
  - Stock on hand per product and branch is correct and comes only from movements
  - Movements cannot be edited or deleted (proved by a test)
- [ ] **Unit 5: Record a sale** (about 3-4 days)
  - Staff can record a multi-item sale with Cash or GCash in a few taps on a phone
  - `record_sale` is atomic: sale, items, price/cost snapshot, stock reduction, and log entry all succeed together or not at all
  - Double tap creates only one sale
  - Staff can only sell at their branch; the owner can sell at any branch
  - Selling at zero stock works and is flagged
  - `/my-sales` shows only that staff member's sales, no cost or profit
  - Revoke direct owner INSERT/UPDATE/DELETE on sales and sale_items in Units 5 and 6 (database functions only: `record_sale`, `void_sale`); revoke direct INSERT on `stock_movements` from `authenticated` once the database functions exist
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

## Decisions log
| Date | Decision |
|---|---|
| (planning) | Only the owner adds or restocks inventory, and only the owner corrects sales |
| (planning) | Payment methods: Cash and GCash only |
| (planning) | One current cost per product; each sale saves cost at time of sale; no batch costing |
| (planning) | No inter-branch transfer feature; owner uses adjustments with a note |
| (planning) | Online only; low-stock alerts are a dashboard list only |
| (planning) | Data separation between shops built in now; no signup or billing in v1 |
| (planning) | Success = staff stop using the notebook and the owner checks the dashboard daily |
| (planning) | Void-and-keep instead of deleting sales; stock is the sum of movements |
| 2026-10-19 | Confirmed currency is Philippine Peso (PHP, integer centavos) and timezone is Asia/Manila |
| 2026-10-19 | Confirmed no `src/` directory; App Router stays in root `app/` with `@/*` mapping to root |
| 2026-10-19 | Single migration method: All DDL authored in `supabase/migrations/<version>_<name>.sql` and applied via Supabase migration tool (recorded in `supabase_migrations.schema_migrations`). Synchronized initial schema file to DB version `20261019073213`. |
| 2026-10-19 | Enforced append-only invariant on `activity_log`: UPDATE, DELETE, and TRUNCATE prohibited via database triggers. |
| 2026-10-19 | Unit 2 Security & Architecture Hardening: Direct writes to ledger tables are owner-only; actor columns cannot be forged (`created_by = auth.uid()`, `actor_id = auth.uid()`, `recorded_by = auth.uid()`); stock movement reasons `sale` and `void_return` are function-only; staff can read only their own profile row; every owner page calls `requireOwnerPage()` directly; and every unit includes write-path tests proving staff cannot mutate unauthorized tables. |
| 2026-10-20 | Cache Policy & Dynamic Routing: Removed `cacheComponents` and `partialPrefetching` from `next.config.ts`. Enforced invariant 18: Never use `"use cache"` or any cross-request caching for data tied to a shop or user; all such reads are dynamic (`export const dynamic = 'force-dynamic'`). |
| 2026-10-20 | Workflow Rule: "Show me before applying" means stop completely, show the complete SQL/code, and wait for the owner's explicit go before applying or executing. |
| 2026-10-20 | Full 10-Table Write-Path Matrix: Extended `unit2_security_tests.sql` to test direct INSERT, UPDATE, and DELETE by staff users across all 10 tables (`shops`, `branches`, `profiles`, `products`, `stock_movements`, `sales`, `sale_items`, `stock_counts`, `stock_count_items`, `activity_log`). |
| 2026-10-20 | Profile ID Immutability: Enforced via `validate_profile_mutation()` trigger (`id cannot be changed.`). Applied via migration `20261020083950_profile_id_immutable.sql`. |
| 2026-10-20 | Shop-Scoped Composite Foreign Keys & No Cascade: Applied composite unique keys `(shop_id, id)` and composite foreign keys `(shop_id, referenced_id)` across all 15 tenant references via migration `20261020084634_shop_scoped_composite_foreign_keys.sql`. Prohibited `CASCADE` and `SET NULL` (default `NO ACTION` enforced). Deleting entities with history refused with `23503`. Documented as Invariants 19 & 20 in `context/architecture.md`. |
| 2026-10-21 | Staff Login & Password Lockdown (Unit 3): Staff authenticate using store code + username + password (mapped internally to hidden `username.storecode@staff.stokr.invalid`). In probe test (b), GoTrue rejected staff email modification with status 400 `Email address "probe.cloudhaven@staff.stokr.invalid" is invalid` (the error named the existing address). Forced password change enforced via must_change_password locking RLS helpers, begin_staff_password_reset() security definer RPC, and fail-closed complete_password_change(). |
| 2026-10-21 | Functions-Only Write Paths & Future Revisit: Remove direct owner INSERT/UPDATE/DELETE on sales and sale_items in Units 5 and 6 (database functions only), and on stock_counts and stock_count_items in Unit 8; revisit email change if any email/recovery flow is ever added. |
| 2026-10-21 | Pre-launch Auth Requirements: Before launch, configure custom SMTP provider and an owner forgot-password recovery flow. |
| 2026-10-21 | Table Mutations Lockdown (Unit 3 Migration 2): Revoked DELETE on branches, products, stock_counts, and stock_count_items from authenticated; made store_code immutable by trigger; logged shop renames in activity_log; revoked UPDATE on sales from authenticated; restricted stock_counts insert. Applied via migration `20261021065454_lockdown_table_mutations_and_shops.sql`. |
| 2026-10-21 | Session Invalidation & Staff Email Lockdown: Applied `20261021085218_session_invalidation_on_reset_and_deactivation.sql` (invalidating auth.sessions on password reset and staff deactivation) and `20261021085231_prevent_staff_email_change.sql` (trigger on auth.users preventing modification of staff email addresses). |
| 2026-10-21 | Unit 3 App Implementation: Added strict `parseMoneyInput` in `lib/money.ts` (digits with at most 2 decimals, optional commas/peso sign, returns descriptive errors, never silently 0, selling price min 1 centavo, cost price min 0); replaced duplicated parseFloat blocks in product create and edit modals with inline errors; added sign-out button on `/change-password` page; enforced `server-only` on admin client; verified with comprehensive unit and real-session integration test suites. |
| 2026-10-23 | Confirmed final app name is Stokr. Confirmed Invariant 13: never block a sale at zero or negative stock; record the sale and flag on the dashboard instead. |

## Backlog (ideas not yet approved)
*(empty: add ideas here; do not build them until the owner approves)*

## Known limitations
- Last-owner race condition: A theoretical race could occur if two owners concurrently attempt to deactivate/demote themselves at the exact same millisecond without an explicit table lock. Given Stokr shops have at most 1-2 owners, this edge case is acknowledged as a documented limitation.

## Later (parked, not v1)
Public signup and billing, offline mode, notifications, product variants, spreadsheet import, batch costing, discount and return features, barcode scanning and receipts, report export, branch transfers, live push updates on the dashboard, deliberate shop-removal procedure (since append-only triggers on stock_movements and activity_log block cascade deletes if a shop row is deleted).

## Trial week notes
*(empty: fill in during the "run both" week: what was slow, confusing, or wrong)*

## Session log
| Date | Unit | Summary |
|---|---|---|
| 2026-10-19 | Unit 1 | Initialized Next.js 16 (root app/), Supabase schema migration with 10 tables + RLS applied to dev Supabase DB, seed applied, live SQL security tests verified (staff, cross-shop, anon), proxy route guard verified with Vitest. |
| 2026-10-19 | Unit 1 Verification | Re-ran live RLS security test suite with positive controls (sales, sale_items, stock_counts, stock_count_items, activity_log); audited anon database privileges and drafted revoke migration; audited git repo and verified zero secrets committed; synchronized local migration filename with dev DB migration history (`20261019073213_initial_schema.sql`); authored append-only trigger migration for `activity_log` and updated architecture invariants. |
| 2026-10-19 | Unit 1 Hardening | Applied migrations `20261019082401_revoke_anon_public_access`, `20261019082409_make_activity_log_append_only`, and `20261019082512_revoke_anon_and_public_function_execute`. Verified `has_table_privilege` and `has_function_privilege` return false for anon on all public tables and routines. Performed write-path audit identifying staff insert paths on sales/movements/activity_log and profile privilege escalation vulnerability; formulated RLS policy hardening fix. |
| 2026-10-19 | Unit 2 | Implemented Unit 2 (Login and Roles): Auth & session refresh via `proxy.ts`, generic error on login failure, role-based landing (`/` -> `/dashboard` or `/sell`), page-level owner guards (`requireOwnerPage()`), non-throwing action guards (`requireAuthAction`, `requireOwnerAction`), database hardening migration (`20261019095210_harden_security.sql`) enforcing unfalsifiable actors, restricted movement reasons, staff profile isolation, and last active owner protection. All unit tests (35/35), integration tests (2/2), SQL security tests (8 blocks), typecheck, lint, and build verified passing. |
| 2026-10-20 | Unit 2 Review & Hardening | Removed cacheComponents/partialPrefetching from next.config.ts; standard dynamic routing enforced via export const dynamic = 'force-dynamic'; added Invariant 18 forbidding cross-request caching of user/shop data; extended SQL test suite to cover staff INSERT, UPDATE, and DELETE on all 10 tables; recorded rule that 'show me before applying' mandates a complete stop and explicit approval. |
| 2026-10-20 | Unit 2 Signup & Write Matrix Verification | Strengthened public signup integration test to strictly assert /signups not allowed for this instance/i and fail on any other error or success; verified dev auth.users has zero stray accounts (exactly 2 seed users); executed comprehensive 58-row live security test suite (INSERT/UPDATE/DELETE rejections across all 10 tables, owner positive controls, immutability assertions); disabled public signups in dashboard and verified `npm run test:integration` passes 2/2. |
| 2026-10-20 | Unit 3 Prep / Composite Foreign Keys | Applied profile ID immutability migration (`20261020083950_profile_id_immutable.sql`) and shop-scoped composite foreign keys migration (`20261020084634_shop_scoped_composite_foreign_keys.sql`) enforcing composite keys across all 15 tenant references with default NO ACTION (all cascades/set null removed). Added Invariants 19 & 20 to architecture.md. Verified with 31/31 passing tests in `composite_foreign_keys_test.sql`. |