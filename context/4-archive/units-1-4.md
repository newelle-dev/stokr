---
tags: [para/archive, done]
---
# Completed units 1-4

Moved out of [[progress-tracker]] to keep the current file short.

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
- [x] **Unit 4: Stock** (about 2-3 days)
  - Owner can enter opening stock per branch, restock (optionally updating cost price), and make adjustments with a note
  - Stock on hand per product and branch is correct and comes only from movements
  - Movements cannot be edited or deleted (proved by a test)

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
| 2026-11-10 | Unit 4 Verification | Typecheck, lint, 67 unit tests, 32 integration tests pass. SQL suites run in the SQL Editor: unit4_green 18/18, unit2_security 59/59, rls_security pass, composite_foreign_keys 31/31, second_migration_lockdown 14/14, per_action_logging all 14 entries. Fixed stale tests (not app bugs): unit2 restock-direct-insert now expects rejection; rls_security needed store_code and staff username fixtures, stray `raise notice` wrapped, anon check replaced with has_table_privilege; composite_fk created_by test uses reason `restock` to avoid the opening unique index. Phone-size check of /stock and /stock/opening OK. DB password reset after accidental exposure in CLI output. |