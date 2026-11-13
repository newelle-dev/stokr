# Owner email + password sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owners sign in with email and password. Google sign-in and the magic link are removed. A new owner is created by hand (script or Supabase dashboard), signs in with a temporary password, and finishes onboarding (shop, first branch, new password). A demo owner with sample data exists for portfolio visitors.

**Architecture:** The login page's Owner tab gets a plain email + password form that calls a new `ownerLoginAction` (`signInWithPassword`, generic error, profile check). A signed-in user with no profile is sent to `/onboarding`. Onboarding drops the products step and asks for a new password instead; the password is set first, then the existing `create_shop_for_new_owner` database function runs with an empty product list. No database migration, no new dependency.

**Tech Stack:** Next.js App Router, TypeScript strict, Supabase Auth + Postgres (RLS), Zod, Tailwind + shadcn/ui, Vitest. Node scripts in `scripts/` use the existing `@supabase/supabase-js`.

**Spec:** No separate spec file; the decisions below came from the chat brainstorm (2026-11-12 to 2026-11-13). Background and the parts that stay unchanged: [docs/superpowers/specs/2026-11-11-owner-login-onboarding-design.md](../specs/2026-11-11-owner-login-onboarding-design.md). This plan replaces its sign-in, self-signup and "no owner passwords" sections.

## Decisions (owner, 2026-11-13)
- Owner signs in with **email + password**. Staff keep store code + username + password.
- **No Google, no magic link.** Both are deleted from the app.
- **No self-signup.** Public signup stays off in Supabase. The product owner creates each owner account by hand.
- **First sign-in:** the new owner lands on onboarding: shop name, first branch, new password. **No products step**; owners add products on the normal products screen.
- **Demo account: yes**, for portfolio visitors, with sample data.
- Verified read-only on 2026-11-13: Email provider on, signup off, confirmation off (Supabase `/auth/v1/settings`).

## My calls (the owner can change these)
- No "forgot password" email (no domain, so no reliable email). The product owner resets an owner's password with the script in Task 5. A signed-in owner can still change their own password on `/change-password`.
- The new password at onboarding is required (min 10, max 72 characters, same rule as `changePasswordSchema`).
- Wrong email, wrong password, a staff account used on the owner form, and a deactivated owner all show the same "Incorrect login details".
- The DB function keeps its `p_products` argument; the app passes `[]`. No migration, so no schema hard stop.
- The demo owner is the existing seed owner (`Cloud Haven Vape Shop`, fake data). Its password becomes public on purpose. There is no automatic reset of demo data (`shortcut:` noted in Task 6).

## Global Constraints
- Money is integer centavos; no money code changes here.
- Roles come only from `profiles.role`, never `user_metadata` (invariant 21).
- Staff never see cost, profit or other staff's sales; no new response carries them.
- Service role key only in local scripts and server code; never commit `.env.local` or `scratch/dev_credentials.local.json`; passwords never in code, tests or docs.
- No new dependencies, skills, MCP servers or plugins.
- Dashboard setting changes (Google provider off) are done by the product owner, not the agent.
- Each task ends with `npm run typecheck`, `npm run lint`, `npm test` passing before its commit. Commits use Conventional Commits with **no `Co-Authored-By` or other AI trailer** (project rule in `ai-workflow-rules.md`).
- Work on a new branch from `main`: `feat/owner-email-password-login`.

## Review Focus
- A signed-in user with no profile who opens `/` (or reloads mid-onboarding) lands on `/onboarding`, not in a redirect loop. Test: Task 3.
- Unknown email and wrong password give the identical reply, and a staff account typed into the owner form is rejected. Test: Task 1.
- Onboarding retried after the password was already changed (first try failed at shop creation) still succeeds. Test: Task 4.
- Password too short, too long or not matching is rejected before any Supabase call; blank, spaces-only or 81-character shop and branch names are rejected. Test: Task 4.
- Google, magic link and `/login/callback` are really gone: no import, route or env var left. Check: Task 2.

## Task order
0. Contract and decision record (owner OK needed)
1. Owner login action and schema
2. Login form; delete Google, magic link, callback
3. Root page: user with no profile goes to onboarding
4. Onboarding: password instead of products
5. Owner account script
6. Demo owner
7. Verification and owner check
8. Docs, tracker, archive

---

### Task 0: Unit contract and decision record

**Files:**
- Create: `context/1-projects/unit-11-owner-email-password/CONTEXT.md` (from `context/_templates/unit-contract.md`)
- Modify: `context/1-projects/progress-tracker.md` (add Unit 11 as current; Unit 9 stays open)
- Modify: `context/2-areas/decisions-log.md` (new row, dated 2026-11-13: owner sign-in is email + password, Google and magic link removed, no self-signup, no products at onboarding, demo account, reset by script, reason: no domain yet)
- Modify: `context/2-areas/architecture.md` (the Auth rows at lines 8 and 31: owners by email + password, created by hand; staff unchanged)

- [ ] **Step 1: Fill the contract** from this plan's Decisions and acceptance criteria (Task 7 checks). Invariants that apply: 21, 22, plus the staff-privacy rule.
- [ ] **Step 2: Ask the owner for the OK to set the contract to `approved`.** This reverses the 2026-11-11 "no owner passwords" decision and changes auth, which is a hard stop. No code before the OK.
- [ ] **Step 3: Commit** `docs(workflow): add unit 11 owner email-password contract`

---

### Task 1: Owner login action and schema

**Files:**
- Modify: `features/auth/schemas.ts` (replace `magicLinkSchema`/`MagicLinkInput` with `ownerLoginSchema`/`OwnerLoginInput`; also export `newPasswordSchema`, the existing 10 to 72 character rule pulled out of `changePasswordSchema` so Task 4 reuses it)
- Modify: `features/auth/actions.ts` (add `ownerLoginAction`, delete `requestMagicLinkAction`)
- Modify: `features/auth/__tests__/schemas.test.ts` (swap the magic-link cases for owner-login cases)
- Test: `features/auth/__tests__/owner-login.test.ts`

**Interfaces:**
- Produces: `ownerLoginSchema` (`email`: trimmed, lowercased, valid, max 254; `password`: min 1); `ownerLoginAction(input: OwnerLoginInput): Promise<ActionResult<{ redirectTo: string }>>`; `newPasswordSchema` (string, min 10, max 72, messages as in `changePasswordSchema`).
- Behavior of `ownerLoginAction`: invalid input or any Supabase auth error → `errorResult('INVALID_CREDENTIALS', 'Incorrect login details')`. After a good sign-in, read the user's `profiles` row (`role, is_active`): no row → `redirectTo: '/onboarding'` (stay signed in); row inactive or `role !== 'owner'` → `signOut()` then the same generic error; active owner → `redirectTo: '/dashboard'`.

- [ ] **Step 1: Write failing tests** in `owner-login.test.ts` (mock `@/lib/supabase/server` as the existing `actions.test.ts` does): bad email format → `INVALID_CREDENTIALS` with no Supabase call; Supabase auth error → same code and message as the bad-format case (identical reply); no profile → `ok` with `/onboarding` and `signOut` not called; inactive owner → `signOut` called, generic error; active staff profile → `signOut` called, generic error; active owner → `/dashboard`. In `schemas.test.ts`: `'  Owner@Stokr.Local  '` parses to `owner@stokr.local`; `''` and `'not-an-email'` fail for email; empty password fails.
- [ ] **Step 2: Run** `npm test -- owner-login schemas` — expect FAIL.
- [ ] **Step 3: Implement** the schema, `newPasswordSchema` (and use it inside `changePasswordSchema`) and `ownerLoginAction`, following the pattern of `staffLoginAction` in the same file.
- [ ] **Step 4: Run** `npm test -- owner-login schemas` — expect PASS.
- [ ] **Step 5: Commit** `feat(auth): add owner email and password sign-in action`

---

### Task 2: Login form; delete Google, magic link and the callback

**Files:**
- Create: `features/auth/components/owner-login-form.tsx` (`OwnerLoginForm`: email, password with the show/hide eye button, "Sign In as Owner" button; same look, 48px inputs and button as the staff form; calls `ownerLoginAction`, then `router.push(result.data.redirectTo)` and `router.refresh()`; shows the generic error in the same alert box)
- Modify: `features/auth/components/login-form.tsx` (Owner tab renders `OwnerLoginForm`; remove the `MagicLinkForm` and `GoogleSignInButton` imports and the "or" divider; Owner description text becomes "Enter your owner email and password")
- Delete: `features/auth/components/magic-link-form.tsx`, `features/auth/components/google-sign-in-button.tsx`, `features/auth/__tests__/magic-link.test.ts`, `app/(auth)/login/callback/route.ts`, `features/auth/__tests__/callback-routing.test.ts`
- Modify: `.env.example` (remove `SITE_URL=`; it is no longer read by any code)

**Interfaces:**
- Consumes: `ownerLoginAction`, `ownerLoginSchema`, `OwnerLoginInput` (Task 1).
- Produces: `OwnerLoginForm` with no props.

- [ ] **Step 1: Build the form and swap it into the Owner tab.**
- [ ] **Step 2: Delete the files listed above.**
- [ ] **Step 3: Check nothing is left.** Run `git grep -n -i "magiclink\|magic-link\|GoogleSignIn\|signInWithOAuth\|signInWithOtp\|login/callback\|SITE_URL" -- . ":!docs" ":!context" ":!node_modules"`. Expected: no output.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm test` — expect PASS.
- [ ] **Step 5: Look at it** at 360px wide in the browser: no sideways scroll, tap targets at least 44px, Staff tab unchanged, Owner tab shows only email and password.
- [ ] **Step 6: Commit** `feat(auth): replace owner magic link and Google with email and password`

---

### Task 3: Root page sends a user with no profile to onboarding

Without this, a signed-in owner who has no shop yet and opens `/` is sent to `/login`, and the proxy sends signed-in users on `/login` back to `/`, so the page loops.

**Files:**
- Modify: `app/page.tsx`
- Test: `app/__tests__/home-redirect.test.ts` (new; mock `@/lib/auth` and `@/lib/supabase/server`, assert on the `redirect` target)

**Interfaces:**
- Consumes: `getCurrentUser` from `@/lib/auth`; `createClient` from `@/lib/supabase/server`.
- Behavior: when `getCurrentUser()` is null, call `supabase.auth.getUser()`. No auth user → `redirect('/login')`. Auth user exists: look up their `profiles` row (`id` only, `maybeSingle`); no row → `redirect('/onboarding')`; a row exists (inactive profile) → `redirect('/login')` as today.
- Known limit, not fixed here: a deactivated owner whose session is still alive can still loop between `/` and `/login`, because a server component cannot clear the session cookie. This already exists today. Add it to the tracker's open items in Task 8 instead of widening this task.

- [ ] **Step 1: Write failing tests:** no auth user → `/login`; auth user without profile → `/onboarding`; auth user with an inactive profile → `/login`; active owner → `/dashboard`; active staff → `/sell`.
- [ ] **Step 2: Run** `npm test -- home-redirect` — expect FAIL.
- [ ] **Step 3: Implement** the extra branch in `HomePage`.
- [ ] **Step 4: Run** `npm test -- home-redirect` — expect PASS.
- [ ] **Step 5: Commit** `fix(auth): send signed-in users without a shop to onboarding`

---

### Task 4: Onboarding asks for a password, not products

**Files:**
- Modify: `features/onboarding/schemas.ts` (`onboardingSchema` = `shopName`, `branchName` as today, plus `newPassword` (use `newPasswordSchema` from `features/auth/schemas`) and `confirmPassword`, with a refine that they match and the error on `confirmPassword`; delete `onboardingProductSchema`, `pesosToCentavos`, the `products` field and the unused `OnboardingParsed` if nothing imports it)
- Modify: `features/onboarding/actions.ts`
- Modify: `features/onboarding/components/onboarding-form.tsx` (remove product rows and `ProductRow`; add "New password" and "Confirm password" inputs with show/hide; card text: "Add your shop and first branch, and choose your own password.")
- Modify: `features/onboarding/__tests__/schemas.test.ts`, `features/onboarding/__tests__/actions.test.ts`

**Interfaces:**
- Consumes: `newPasswordSchema` (Task 1); `create_shop_for_new_owner(p_shop_name, p_branch_name, p_products)` (unchanged).
- Produces: `OnboardingInput` = `{ shopName: string; branchName: string; newPassword: string; confirmPassword: string }`; `createShopAction(input: OnboardingInput): Promise<ActionResult<CreateShopResultData>>` where `CreateShopResultData` is unchanged (`redirectTo`, `storeCode`).
- Action order: validate → `getUser` (no user → `UNAUTHORIZED`) → `supabase.auth.updateUser({ password })`; an error is returned as `AUTH_ERROR` **unless** it is the same-password error (message contains "different from the old password" or code `same_password`), which is ignored so a retry works → call the RPC with `p_products: []` → map `already_onboarded` as today.

- [ ] **Step 1: Update tests first.** Schema: blank, spaces-only and 81-character shop name rejected; same for branch name; password of 9 characters rejected; 73 characters rejected; mismatched confirm rejected on `confirmPassword`; a valid input accepted. Action: invalid input returns `VALIDATION_ERROR` and calls neither `updateUser` nor the RPC; success calls `updateUser` before the RPC, passes `p_products: []`, and returns `/dashboard` with the store code; `updateUser` same-password error is ignored and the RPC still runs; any other `updateUser` error returns `AUTH_ERROR` and the RPC is not called; `already_onboarded` returns `ALREADY_ONBOARDED`.
- [ ] **Step 2: Run** `npm test -- onboarding` — expect FAIL.
- [ ] **Step 3: Implement** the schema, action and form changes. Keep the store-code-shown-once screen as it is. Keep the `shortcut:` untyped RPC wrapper unless `lib/supabase/database.types.ts` already has the function; if it does, call `supabase.rpc` directly and delete the wrapper.
- [ ] **Step 4: Run** `npm test -- onboarding` — expect PASS.
- [ ] **Step 5: Look at it** at 360px: no sideways scroll, 44px tap targets, error text readable.
- [ ] **Step 6: Commit** `feat(onboarding): ask for a new password instead of products`

---

### Task 5: Owner account script

**Files:**
- Create: `scripts/create-owner.mjs`

**Interfaces:**
- Usage: `node scripts/create-owner.mjs <email>`. Reads `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (same loader approach as `scripts/setup-dev-auth.mjs`, but reading `.env.local`). Exits with a clear message if either is missing or the email is missing or malformed.
- Behavior: generate a temporary password (`crypto.randomBytes(12).toString('base64url')`, 16 characters, so it passes the 10-character rule). Call `auth.admin.createUser({ email, password, email_confirm: true })`. If the email already exists, find that user (`auth.admin.listUsers`, match the email) and call `auth.admin.updateUserById(id, { password })` so the script doubles as the "reset a forgotten password" tool. Print the email and the temporary password **once** to the terminal and nothing else secret. Never write the password to a file. Creates **no** profile; onboarding does that.
- Safety: refuse to run if the email ends with `@staff.stokr.invalid` (staff accounts are managed in the app).

- [ ] **Step 1: Write the script** with a short comment on what it does and that the password is shown once.
- [ ] **Step 2: Check it** with a throwaway email the owner picks: run the script, sign in on the new login page with the printed password, confirm it lands on `/onboarding`. Run it again for the same email, confirm the password changes and the old one fails.
- [ ] **Step 3: Remove the throwaway user** in the Supabase dashboard (Authentication, Users) or tell the owner to. Deleting a user is a hard stop, so ask first.
- [ ] **Step 4: Commit** `feat(scripts): add create-owner script for new and reset owner accounts`

---

### Task 6: Demo owner

Uses the existing seed shop (fake data: 2 branches, owner, 1 staff, sample products with opening stock). No new SQL.

**Files:**
- Modify: nothing in the repo unless a `README` demo line is wanted (owner decides; out of scope here).
- Local only, not committed: `scratch/dev_credentials.local.json` (already read by `scripts/setup-dev-auth.mjs`)

- [ ] **Step 1: Check the seed data exists** on the project: ask the owner to confirm the shop `cloudhaven` is there (the SQL tests and earlier units rely on it). If not, the owner runs `supabase/seed.sql` in the SQL Editor after approving.
- [ ] **Step 2: Choose the demo login with the owner.** The password will be shown publicly in the portfolio, so it must be one the owner uses nowhere else. The owner puts it in `scratch/dev_credentials.local.json` (the file stays out of git). Check `git check-ignore scratch/dev_credentials.local.json` prints the path; if it does not, stop and tell the owner.
- [ ] **Step 3: Run** `node scripts/setup-dev-auth.mjs` to set the demo owner's email and password on the existing seed owner account.
- [ ] **Step 4: Sign in as the demo owner** on the new login page: lands on `/dashboard`, sees Main Branch and Annex Branch and the sample products, cannot see any other shop's data (RLS), and the staff demo account is not advertised.
- [ ] **Step 5: Record the limits** in the progress tracker (Task 8): `shortcut:` no automatic reset, a visitor can change or void demo data and the owner re-seeds by hand; the demo shares the Supabase project with the real shop (RLS keeps them apart); SQL integration tests sign in as this same owner, so a visitor's changes can break their baselines.

---

### Task 7: Verification and owner check

- [ ] **Step 1: Run** `npm run typecheck`, `npm run lint`, `npm test`. Show the output.
- [ ] **Step 2: No SQL tests needed**, since there is no migration and no function change. Say so in the summary. Re-run `unit2_security_tests.sql` only if the owner wants extra assurance.
- [ ] **Step 3: Manual walk on a phone-size screen** (360px), each shown to the owner:
  1. Script creates an owner for a throwaway email; the Owner tab signs in; lands on onboarding.
  2. Close the tab mid-onboarding, open `/`: lands on onboarding, no redirect loop.
  3. Finish onboarding with a new password: store code shown once, dashboard opens; sign out; the temporary password no longer works, the new one does.
  4. Wrong password and unknown email show the same message; a staff internal address on the owner form is rejected.
  5. Staff login (store code, username, password) still works and reaches `/sell`; staff network responses carry no cost or profit.
  6. Deactivated owner is rejected with the same message (use a test owner; deactivating real data is a hard stop).
  7. The login page shows no Google button and no magic-link form; `/login/callback` returns 404.
  8. Demo owner signs in and sees the sample data.
- [ ] **Step 4: Product owner turns off the Google provider** in the Supabase dashboard (Authentication, Sign In / Providers). Re-run the read-only check: `curl -s <project-url>/auth/v1/settings -H "apikey: <publishable key>"` shows `"google":false`, `"email":true`, `"disable_signup":true`.
- [ ] **Step 5: Ask the owner to say the unit is done.**

---

### Task 8: Docs, tracker and archive

- [ ] **Step 1: Update** `progress-tracker.md`: Unit 11 ticked with the date; correct the Unit 10 and Unit B notes (magic link and Google removed); move "buy a domain and verify in Resend" from launch blocker to "needed before public signup"; keep the production-project password check as a pre-launch line; add the Task 6 limits and the Task 3 known limit (deactivated owner with a live session can loop between `/` and `/login`).
- [ ] **Step 2: Update** the decisions-log row from Task 0 if anything changed during the build; mention that the 2026-11-11 "no owner passwords" and "open signup" rows are superseded.
- [ ] **Step 3: `git mv`** `context/1-projects/unit-11-owner-email-password` to `context/4-archive/`.
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm test`. Show the output.
- [ ] **Step 5: Commit** `docs(tracker): close unit 11 owner email and password sign-in`

---

## Out of scope
- Self-signup, invites, email confirmation, "forgot password" emails (all need a domain; parked until then).
- Google or any other social sign-in.
- Automatic demo reset, sample sales in the demo, a staff demo account.
- Rebuilding the store-code-shown-once conflict with the settings page (already an open tracker item).
- Production-project cleanup of old owner passwords (still a separate pre-launch item).
