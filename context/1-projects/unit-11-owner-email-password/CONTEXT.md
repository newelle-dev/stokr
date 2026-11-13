---
tags: [para/project, icm/contract]
unit: 11
status: approved   # approved by the owner on 2026-11-13 ("Yes, use Native" after reading the plan)
---
# Unit 11: Owner email + password sign-in

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]
Plan: `docs/superpowers/plans/2026-11-13-owner-email-password-login.md`

## Inputs (read before starting)
- Why: no domain yet, so magic-link and email confirmation are not reliable. Google-only signup was dropped for now. Reverses the 2026-11-11 "no owner passwords" and "open signup" decisions.
- Invariants that apply: 21 (role only from `profiles.role`), 22 (store code never changes), staff never see cost, profit or other staff's sales.
- Earlier decisions: [[decisions-log]] rows of 2026-11-11 (superseded) and 2026-11-13.

## Process (security before UI; stop for owner OK at each hard stop)
- [x] 1. No database change (no migration; `create_shop_for_new_owner` is called with an empty product list)
- [ ] 2. Server actions + Zod + unit tests (owner login, onboarding password)
- [ ] 3. UI (phone first): owner login form, onboarding form
- [ ] 4. Scripts: create-owner / reset-owner-password, demo owner
- [ ] 5. Verify: typecheck, lint, npm test, manual phone walk

## Outputs (files created or changed)
- `features/auth/` (owner login action, schema, form; Google and magic link deleted)
- `app/(auth)/login/callback/route.ts` (deleted), `app/page.tsx`
- `features/onboarding/` (password instead of products)
- `scripts/create-owner.mjs`

## Done when
- [ ] Owner signs in with email and password; staff login unchanged
- [ ] New owner created by script lands on onboarding, sets a password, creates shop and branch, sees the store code once
- [ ] No Google, magic link or `/login/callback` left in the app
- [ ] Demo owner signs in and sees sample data
- [ ] Owner has seen it working and says it's done
