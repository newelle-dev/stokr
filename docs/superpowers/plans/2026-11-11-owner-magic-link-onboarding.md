# Owner magic-link sign-in and onboarding (Unit A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners sign in with a magic link instead of a password, anyone can self-sign-up as an owner, and a new owner sets up their shop on an onboarding page. Owner passwords are removed once a magic-link sign-in is proven.

**Architecture:** Supabase Auth sends a one-time email link (magic link) that lands on the existing `/login/callback` route. A new owner with no profile is sent to `/onboarding`, which calls one security-definer database function that creates the shop, its first branch, the owner profile and optional products in one transaction. Staff login and all other pages are unchanged.

**Tech Stack:** Next.js App Router, TypeScript strict, Supabase Auth and Postgres (RLS), Zod, Tailwind + shadcn/ui, Vitest, SQL test scripts. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-11-11-owner-login-onboarding-design.md](../specs/2026-11-11-owner-login-onboarding-design.md)

## Global Constraints
- Money is integer centavos everywhere; `parseMoneyInput` in `lib/money.ts` converts pesos input.
- Store code: 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O, I, 0, 1); generated once; never changed (invariant 22).
- Sign-in responses are the same whether or not the account exists.
- Owner role comes only from `profiles.role`, never `user_metadata` (invariant 21).
- Every owner write to shop data writes an `activity_log` entry (invariant 9).
- Every new table or column has RLS; every tenant foreign key is composite `(shop_id, id)` with NO ACTION (invariants 1, 19, 20).
- Migrations are written as files in `supabase/migrations/`. Do not apply any migration to the remote project until the owner says "show me before applying" is approved; present the SQL first.
- Each task ends with `npm run typecheck`, `npm run lint`, `npm test` passing before its commit.

## Review Focus
- An email that is not registered gets the same reply as one that is (no account probing). Test: Task 3.
- A signed-in user with an active profile opens `/onboarding` and is sent to `/dashboard`; a second onboarding run cannot create a second shop. Test: Tasks 5 and 6.
- Shop name or branch name that is blank, only spaces, or very long is rejected before the database. Test: Task 4.
- A deactivated owner who signs in by magic link is signed out with the generic error. Test: Task 3.
- A new owner cannot read or write any other shop's rows (SQL test as a user from a different shop). Test: Task 6.

## Task-level order
1. Project contract and decision record (no code)
2. Magic-link sign-in action and login form
3. Callback routing: new user to onboarding, owner to dashboard
4. Onboarding schema (Zod)
5. Onboarding database function (migration + SQL tests)
6. Onboarding server action and page
7. Remove owner password and forgot-password code
8. Verification and owner check

---

### Task 1: Unit contract and progress tracker

**Files:**
- Create: `context/1-projects/unit-10-owner-magic-link-onboarding/CONTEXT.md` (from `context/_templates/unit-contract.md`)
- Modify: `context/1-projects/progress-tracker.md` (add Unit A as the current unit; Unit 9 stays open)

- [ ] **Step 1: Fill the contract from the spec** — goal, acceptance criteria (the spec's goals and "Decisions needed" answers), files, invariants that apply (1, 2, 9, 12, 19, 20, 21, 22).
- [ ] **Step 2: Ask the owner for the OK to set the contract to `approved`.** Do not write code before this.
- [ ] **Step 3: Commit** `docs(workflow): add unit 10 owner magic-link contract`

---

### Task 2: Magic-link sign-in action and login form

**Files:**
- Modify: `features/auth/actions.ts` (add `requestMagicLinkAction`)
- Modify: `features/auth/schemas.ts` (add `magicLinkSchema`: email, trimmed, max 254, valid email)
- Modify: `features/auth/components/login-form.tsx` (owner tab: email field and "Email me a sign-in link" button; password field kept until Task 7)
- Test: `features/auth/__tests__/magic-link.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server`; `errorResult`, `successResult`, `ActionResult` from `@/lib/errors`.
- Produces: `requestMagicLinkAction(input: { email: string }): Promise<ActionResult<null>>`.

- [ ] **Step 1: Write the failing test.** Assert: invalid email returns `VALIDATION_ERROR`; a valid email calls `signInWithOtp` with `{ email, options: { emailRedirectTo: <origin>/login/callback } }` and returns success even when Supabase returns an error for an unknown account.
- [ ] **Step 2: Run** `npm test -- magic-link` — expect FAIL (function not defined).
- [ ] **Step 3: Implement** `requestMagicLinkAction` using the same origin logic as `requestPasswordResetAction`. Ignore Supabase's `error` (no account probing) and return `successResult(null)`.
- [ ] **Step 4: Run** `npm test -- magic-link` — expect PASS.
- [ ] **Step 5: Wire the form.** The owner tab sends the email to the action and shows "Check your email for a sign-in link." on success.
- [ ] **Step 6: Commit** `feat(auth): add owner magic-link sign-in request`

---

### Task 3: Callback routing for new and existing owners

**Files:**
- Modify: `app/(auth)/login/callback/route.ts`
- Test: `features/auth/__tests__/callback-routing.test.ts`

**Interfaces:**
- Consumes: `createClient`; `profiles` table (`id, role, is_active`).
- Produces: `GET /login/callback?code=…` redirects to `/dashboard` (active owner), `/onboarding` (no profile), or the generic login error (inactive profile, after signing out).

- [ ] **Step 1: Write the failing test.** Three cases: no profile → redirect `/onboarding`; active owner profile → `/dashboard`; inactive profile → sign-out called and redirect to `/login?error=...` with the generic text.
- [ ] **Step 2: Run** the test — expect FAIL.
- [ ] **Step 3: Implement** the branch after `exchangeCodeForSession` succeeds. The recovery cookie path stays only until Task 7.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: Commit** `feat(auth): route magic-link callback to dashboard or onboarding`

---

### Task 4: Onboarding input schema

**Files:**
- Create: `features/onboarding/schemas.ts`
- Test: `features/onboarding/__tests__/schemas.test.ts`

**Interfaces:**
- Produces: `onboardingSchema` (Zod) with `shopName` (trimmed, 1–80), `branchName` (trimmed, 1–80), `products` (array, 0–50, each: `name` 1–80, `category` in `liquid|device|cartridge|other`, `sellingPrice` as peso string parsed by `parseMoneyInput` min 1 centavo, `costPrice` min 0, `lowStockThreshold` integer 0–10000); type `OnboardingInput`.

- [ ] **Step 1: Write failing tests:** blank shop name rejected; 81-character branch name rejected; `"12.345"` price rejected; zero selling price rejected; `products: []` accepted; 51 products rejected.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** the schema.
- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Commit** `feat(onboarding): add onboarding input schema`

---

### Task 5: Onboarding database function

**Files:**
- Create: `supabase/migrations/<version>_owner_onboarding.sql` (version = current timestamp; do not apply)
- Create: `supabase/tests/unit10_onboarding_tests.sql`

**Interfaces:**
- Produces: SQL function `create_shop_for_new_owner(p_shop_name text, p_branch_name text, p_products jsonb) returns uuid` (security definer, `set search_path = public`, execute granted to `authenticated` only). Returns the new shop id.
- Behavior: raises `already_onboarded` if `auth.uid()` already has a profile; generates `store_code` (spec format) with up to 5 retries on unique violation; inserts `shops`, one `branches` row (active), one `profiles` row (`role = 'owner'`, `is_active = true`, `must_change_password = false`), one `products` row per entry (`stock_levels` starts at zero, no `stock_movements`); writes `activity_log` entries (`shop_created`, `branch_created`, `product_created` per product) with `actor_id = auth.uid()`.

- [ ] **Step 1: Write SQL tests first** (`unit10_onboarding_tests.sql`, run in the Supabase SQL Editor as the spec requires): a new user creates one shop; the second call raises `already_onboarded`; store code matches the format; products have no stock movements; a user from another shop cannot read the new shop's products; direct INSERT into `shops`/`profiles` by `authenticated` is denied.
- [ ] **Step 2: Show the migration SQL and the test file to the owner, and wait for the explicit "go" before applying.** Apply only after the go.
- [ ] **Step 3: Write the migration** to satisfy the tests; revoke direct INSERT on `shops` and `profiles` from `authenticated` if not already revoked.
- [ ] **Step 4: Run the SQL tests** in the SQL Editor (choose "Run without RLS"); show the output.
- [ ] **Step 5: Commit** `feat(db): add owner onboarding function`

---

### Task 6: Onboarding server action and page

**Files:**
- Create: `features/onboarding/actions.ts` (`createShopAction(input: OnboardingInput): Promise<ActionResult<{ redirectTo: string }>>`)
- Create: `app/(auth)/onboarding/page.tsx` (server component: no session → `/login`; profile exists → `/dashboard`)
- Create: `features/onboarding/components/onboarding-form.tsx` (shop name, branch name, optional product rows; shows the store code once after success)
- Test: `features/onboarding/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: `onboardingSchema` (Task 4); `create_shop_for_new_owner` (Task 5); `getCurrentUser` from `@/lib/auth`.
- Produces: `createShopAction` maps `already_onboarded` to a plain error and calls the RPC with `p_products` as JSON.

- [ ] **Step 1: Write failing test:** invalid input returns `VALIDATION_ERROR` without calling the RPC; RPC success returns `redirectTo: '/dashboard'`; `already_onboarded` returns a plain error.
- [ ] **Step 2: Run** — expect FAIL.
- [ ] **Step 3: Implement** the action, page and form. Page shows loading, empty and error states; 44px tap targets; no sideways scroll at 360px.
- [ ] **Step 4: Run** — expect PASS. Then run the manual phone checklist from `ai-workflow-rules.md`.
- [ ] **Step 5: Commit** `feat(onboarding): add shop setup page for new owners`

---

### Task 7: Remove owner password and forgot-password code

Do this only after the owner confirms a magic-link sign-in works with their own email.

**Files:**
- Modify: `features/auth/components/login-form.tsx` (remove the owner password field and its tab)
- Modify: `features/auth/actions.ts` (remove `loginAction`'s password path; keep the generic error and profile check pattern for the magic-link path)
- Delete: `app/(auth)/login/forgot/page.tsx`, `app/(auth)/reset-password/page.tsx`, `features/auth/components/forgot-password-form.tsx`, `features/auth/__tests__/reset-password.test.ts`
- Modify: `features/auth/actions.ts` (remove `requestPasswordResetAction`, `resetPasswordAction`); `features/auth/constants.ts` (remove `RECOVERY_COOKIE`)
- Modify: `app/(auth)/login/callback/route.ts` (remove the recovery cookie)
- Modify: `context/2-areas/decisions-log.md` (record the removal date)

- [ ] **Step 1: Confirm with the owner** that magic-link sign-in worked with their own email.
- [ ] **Step 2: Update the tests** that reference the removed actions so they fail first, then delete the code.
- [ ] **Step 3: Run** `npm run typecheck && npm run lint && npm test` — expect PASS.
- [ ] **Step 4: Commit** `feat(auth): remove owner password sign-in`

---

### Task 8: Verification and owner check

- [ ] **Step 1: Run** `npm run typecheck`, `npm run lint`, `npm test`. Show output.
- [ ] **Step 2: Run the SQL tests** from Task 5 and the existing `supabase/tests` suite. Show output.
- [ ] **Step 3: Manual check.** Sign in by magic link to the Resend account email; create a new owner shop; add stock on the opening-stock screen; confirm the dashboard works. Show the owner.
- [ ] **Step 4: Ask the owner** to say the unit is done. Then update the progress tracker and archive the unit folder as the workflow rules require.

---

## Out of scope for this plan
- Google sign-in (Unit B, after the owner approves the Google Cloud account).
- Domain and custom SMTP setup in Supabase (launch blocker; owner approves the dashboard change before it is done).
- Billing, trials, invites.
