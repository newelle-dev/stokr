---
tags: [para/project, icm/contract]
unit: 10
status: approved   # draft -> approved -> in-progress -> verified -> done
---
# Unit 10: Owner magic-link sign-in and onboarding (Unit A)

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]
Design: `docs/superpowers/specs/2026-11-11-owner-login-onboarding-design.md`
Plan: `docs/superpowers/plans/2026-11-11-owner-magic-link-onboarding.md`

## Goal
Owners sign in with a magic link (no password). Anyone can sign up as an owner. A new owner sets up their shop on an onboarding page (shop name, first branch, optional first products, store code shown once). Owner passwords are removed after a magic-link sign-in is proven. Google is Unit B, not this unit.

## Acceptance criteria (owner-approved)
- An owner gets a sign-in link by email and signs in without a password.
- Email replies are the same whether or not the account exists.
- A new owner with no profile lands on `/onboarding`; an active owner lands on `/dashboard`.
- Onboarding creates one shop, one branch and the owner profile in one step; a second run creates nothing.
- The store code is generated (6 characters, no look-alike letters), set once, and shown once.
- New products start at zero stock; no stock movements are written by onboarding.
- A new owner cannot read or write any other shop's rows.
- Forgot-password and owner password code are removed (after owner confirms the magic-link sign-in works).
- Sign-in emails are tested with the Resend account email; the real-email test waits for the domain.

## Inputs (read before starting)
- Acceptance criteria above (the tracker is the source once the unit is added to it)
- Invariants that apply: 1 (RLS), 2 (stock as movements), 9 (activity log), 12 (migrations), 19 and 20 (composite keys, no cascade), 21 (roles from profiles only), 22 (store code immutable)
- Earlier decisions: [[decisions-log]] (2026-11-11 rows: open signup, Unit A/B split, Resend for testing)

## Process (security before UI; stop for owner OK at each hard stop)
- [ ] 1. Database + RLS (show SQL, wait for owner go-ahead before applying)
- [ ] 2. SQL tests (as staff, and as a user from another shop)
- [ ] 3. Server actions + Zod + unit tests
- [ ] 4. UI (phone first)
- [ ] 5. Verify: typecheck, lint, npm test, SQL tests, phone checklist

## Outputs (files created or changed)
- `features/auth/actions.ts`, `features/auth/schemas.ts`, `features/auth/components/login-form.tsx`
- `app/(auth)/login/callback/route.ts`
- `features/onboarding/` (schemas, actions, form, tests)
- `app/(auth)/onboarding/page.tsx`
- `supabase/migrations/<version>_owner_onboarding.sql` (not applied until owner go)
- `supabase/tests/unit10_onboarding_tests.sql`
- Removed on owner confirmation: forgot-password and reset-password pages and actions, `RECOVERY_COOKIE`

## Done when
- [ ] Every acceptance criterion demonstrated
- [ ] Owner has seen it working and says it's done
