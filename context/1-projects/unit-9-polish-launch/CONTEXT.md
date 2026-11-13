---
tags: [para/project, icm/contract]
unit: 9
status: in-progress
---
# Unit 9: Polish, phone testing, real data, trial fixes

Tracker: [[progress-tracker]] · Rules: [[architecture]], [[ai-workflow-rules]]

## Inputs (read before starting)
- Acceptance criteria: see Unit 9 in the tracker (source of truth).
- Invariants that apply: staff never see cost/profit (check network responses on every new/changed screen); service role key stays server-side; no new dependencies without owner approval.
- Earlier decisions: [[decisions-log]]

## Starting state (checked 2026-11-11)
- No web app manifest, no PWA icons (only brand images in `public/brand/`), no theme color.
- `loading.tsx` + `error.tsx` exist only for dashboard, sales, my-sales, sell. Missing: products, stock, stock/count, stock/opening, team, settings, sales/replace, auth pages.
- No forgot-password flow; no custom SMTP.

## Parts (each is independent; the owner can reorder or drop)
- **A. Installable app** (no schema/auth): manifest, icons 192/512/maskable + apple-touch-icon made from the existing app-icon PNG, theme color, standalone display. No service worker (offline is out of scope).
- **B. Loading / empty / error states** on every screen that lacks them (UI only).
- **C. Phone checklist** run at iPhone-sized and Android-sized widths; fixes from it. The owner does the real-phone pass.
- **D. Real data**: owner loads real products via the app (no import feature; spreadsheet import is parked). Needs only owner time.
- **E. Trial-week fixes**: driven by "Trial week notes" in the tracker (currently empty). Cannot start until the trial runs.
- **F. Forgot-password + custom SMTP** (HARD STOP: auth change + possibly a paid service/new account). Needs owner decision on SMTP provider and approval before any work.
- **G. `npm audit` re-run** before launch; never `audit fix --force`.
- **H. Mobile app feel** (UI only, no schema/auth; built 2026-11-13 on branch `feat/mobile-app-feel`): bottom tab bars for owner and staff, one top bar, More sheet, bottom-sheet dialogs, safe-area support, shared page header, then pull-to-refresh, swipe-back and page fade. Spec: `docs/superpowers/specs/2026-11-13-mobile-app-feel-design.md`. Plan: `docs/superpowers/plans/2026-11-13-mobile-app-feel.md`. Not yet seen on a real phone.

## Process (security before UI; stop for owner OK at each hard stop)
- [ ] 1. Owner approves this contract and the order of parts
- [ ] 2. A (manifest + icons), then B (states), small commits worth of change
- [ ] 3. F only after owner picks SMTP provider (show the plan before touching auth)
- [ ] 4. Unit tests for any new logic (forgot-password); SQL tests only if schema changes
- [ ] 5. Verify: typecheck, lint, npm test, phone checklist (360px, 44px taps, staff sees no cost/profit)

## Outputs (files created or changed)
- `app/manifest.ts`, icon files in `public/`, `app/layout.tsx` (viewport/themeColor)
- new `loading.tsx` / `error.tsx` files under `app/(owner)/*`, `app/(auth)/*`
- (F) forgot-password page + action under `features/auth/`

## Done when
- [ ] Every acceptance criterion in the tracker demonstrated
- [ ] Owner has seen it working and says it's done
