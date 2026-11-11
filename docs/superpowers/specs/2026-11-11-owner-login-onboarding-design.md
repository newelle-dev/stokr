# Owner sign-in and new-owner onboarding: design

Date: 2026-11-11
Status: draft, builder check done; waiting for owner decisions (see "Decisions needed")

## Intent and why

Owners today sign in with email and password, and the first shop and owner are created by hand or by a seed script. The owner wants:

1. Owners to sign in without a password: a magic link sent to their email, or Google.
2. Anyone to be able to sign up as an owner and set up their own shop, without the seed script or a manual step.

Staff are not part of this change.

## Goals
- An owner signs in with a magic link or with Google. No owner passwords exist.
- A new owner who signs up gets a new, empty shop and lands on an onboarding page.
- The onboarding page sets up: shop name, first branch, and optionally first products.
- Every new owner's data is kept apart from every other shop's data (existing tenancy rules).

## Non-goals
- Billing, plans, paid trials, or any paid service.
- Staff login changes. Staff keep store code, username and password.
- Adding a second owner to an existing shop.
- Owner passwords of any kind, including a fallback.

## Anti-goals
- Any way for one shop's owner to see or change another shop's data.
- Staff seeing cost, profit, or other staff's sales through any new screen or response.
- Creating a shop row without also creating its owner profile and first branch in one step.

## Constraints (from project rules)
- Every business table has `shop_id` and RLS. No table ships without policies (invariant 1).
- Tenant rows never cascade-delete (invariant 20).
- Roles come only from `profiles.role`, never from `user_metadata` (invariant 21).
- Every owner change writes an `activity_log` entry (invariant 9).
- Schema changes go through migration files; the owner approves before any migration is applied (AI workflow rules).
- Auth changes need the owner's explicit approval (hard stop). The owner approved removing passwords and self-signup on 2026-11-11, recorded in `context/2-areas/decisions-log.md`.
- Money stays as integer centavos. Onboarding is owner-only.

## Current state (for reference)
- `features/auth/actions.ts` `loginAction` uses `signInWithPassword`. Its generic error and profile check (active profile, else sign out) are the pattern to keep.
- `app/(auth)/login/callback/route.ts` already exchanges an emailed code for a session. Magic links can reuse it.
- Owner forgot-password (`/login/forgot`, `/reset-password`, `RECOVERY_COOKIE`) exists from the Unit 9 work. It is not needed once owners have no password.
- The `shops` table has an immutable `store_code` (invariant 22). Staff sign in with it.

## The design

### Sign-in
- The owner login page offers two options: "Email me a sign-in link" and "Continue with Google". The owner password field is removed.
- Magic link: the owner enters an email address. The app asks Supabase to send a sign-in email. The reply is always the same, whether or not the account exists, so nobody can probe for accounts. The link lands on `/login/callback`, which exchanges the code for a session.
- Google: Supabase handles the Google sign-in and returns to `/login/callback`.
- After either sign-in, the server checks for a profile. If there is an active owner profile, the owner goes to `/dashboard`. If there is no profile, the owner goes to `/onboarding`. If the profile is inactive, the server signs out and shows the generic error, as the password path does today.
- Existing owner accounts: the same email address signs in with a magic link. See the decision on when the password stops working.

### Self-signup
- A brand-new email address that signs in through a magic link or Google creates an auth user with no profile. No shop data is reachable until onboarding finishes.
- Onboarding is the only way a new owner gets a shop. It is one server action, backed by one database function (security definer) that, in a single transaction:
  1. creates the shop (with the store code),
  2. creates the first branch,
  3. creates the owner profile with `role = owner` for the new user,
  4. optionally inserts the first products (no stock movements; see store code and stock below),
  5. writes `activity_log` entries.
- The function refuses to run if the user already has a profile. A second run cannot create a second shop.

### Onboarding page (`/onboarding`)
- Visible only to a signed-in user with no profile. Anyone with a profile is sent to their home page.
- Steps, shown on one page:
  1. Shop name (required).
  2. First branch name (required; one branch is created).
  3. First products (optional). Each product: name, category (liquid, device, cartridge, other), selling price, cost price, low-stock threshold. Money is entered in pesos and stored as centavos, using the existing `parseMoneyInput`.
  4. Store code, shown once, with a note to write it down.
- Empty states and error states are shown as the UI rules require.
- After finishing, the owner lands on `/dashboard`.

### Store code (settled)
- Generated by the database function, once, at onboarding. Set and never changed afterwards (invariant 22).
- Format: 6 characters from `A-Z` and `2-9`. The letters O, I and the digits 0, 1 are left out so staff do not confuse them.
- Staff type it in upper or lower case; the lookup ignores case.
- If a generated code is already taken, the function retries with a new code. The database enforces uniqueness.
- The owner cannot choose or regenerate the code. This is my call; see Minor calls.

### Stock at onboarding (settled)
- Products start at zero stock. Onboarding writes no stock movements.
- The owner adds opening stock afterwards on the existing opening-stock screen (Unit 4, `record_bulk_opening_stock`). Stock stays the sum of movements (invariant 2).

### Protection
- Server actions check the session and the profile. RLS is still the real protection.
- The new database function is the only write path for creating a shop. Direct inserts into `shops`, `branches`, and `profiles` by an authenticated user stay blocked.
- Sign-in email limits come from Supabase's built-in auth limits. No new service is added.

## What is left to the builder
- Exact screen layout (within `ui-context.md`).
- Code structure inside `features/auth` and a new `features/onboarding`.
- Test plan, following the project's verification rules, including a check that a new owner cannot see another shop's rows.
- Migration file names and their order.

## Minor calls I have made (the owner can change these)
- Owner password removal happens in this unit, but only after a magic-link sign-in works with the owner's own email. The password is switched off after that check, so the owner is never locked out. A rollback is a password reset from the Supabase dashboard.
- Existing owner accounts keep their data; they switch to magic link by using the same email.
- The onboarding steps are in the order listed above. Products can be skipped.
- Store code is generated as described above, not typed by the owner.
- Products start at zero stock; opening stock is entered on the existing screen.
- The forgot-password routes, the reset page and `RECOVERY_COOKIE` are deleted in this unit, since the password path is removed. The decision log row for 2026-11-11 is updated when that happens.
- One owner per new shop at creation. More owners are not part of this change.
- A deactivated owner who signs in by magic link is signed out with the generic error, the same as the password path today.

## Decisions needed from the owner
1. **Open signup: decided (owner, 2026-11-11).** Anyone with an email can create a shop right away. No invite code or approval step. Known risk: open signup lets anyone create shops and send sign-in emails, so Supabase's built-in limits are the only brake until billing or a gate is added later.
2. **Email sender and launch timing: decided (owner, 2026-11-11).** This unit ships now. It is tested with sign-in emails going to the Resend account email only. The real-email test waits for the domain. Testing uses Resend as the email sender rather than Supabase's built-in one, because Resend is the chosen provider and the built-in sender has tight limits. Setting Resend as the sender in Supabase is a dashboard change; the builder lists it as a step, and the owner approves it before it is done.
3. **Google sign-in: decided (owner, 2026-11-11).** Magic link ships first as its own unit, with onboarding (onboarding is needed for any new owner, so it ships with magic link). Google follows as a separate unit once the owner approves the Google Cloud account.

## Unit split (decided)
- **Unit A: magic link and onboarding.** Magic-link sign-in, owner password removal (after a tested magic-link sign-in), self-signup, onboarding page, store code, deletion of the forgot-password code.
- **Unit B: Google sign-in.** Needs the Google Cloud account approved first. Adds a Google button and provider setup; nothing else changes.
