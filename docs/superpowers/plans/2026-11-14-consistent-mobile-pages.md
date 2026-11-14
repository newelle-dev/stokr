# Consistent Mobile Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every owner page below 1024px uses the same title, rows, floating "+" and bottom action sheet, so the app feels like a phone app and is consistent.

**Architecture:** Four small shared components in `components/shell/` (`ListRow`/`RowList`, `Fab`, `RowActionSheet`, `PageBody`). Each page keeps its table/buttons for `lg` (1024px) and up, and gains a row list for below `lg`; the switch is CSS only. Row actions open the existing `Modal` as a sheet, then close it and open the action's own existing modal.

**Tech Stack:** Next.js App Router (read `node_modules/next/dist/docs/` first if any routing/layout API is touched; this plan should not need it), React, Tailwind with CSS-variable tokens, `lucide-react`, existing `Modal` (Base UI dialog). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-consistent-mobile-pages-design.md`

## Global Constraints

- Precondition: the uncommitted nav/header/More changes in the working tree are committed first (spec, "Uncommitted work"). Do not start before that.
- No desktop work: from `lg` (1024px) up, tables and top-right buttons stay as they are. Sidebar/tab-bar shell (`md`) is untouched.
- No change to data, schema, auth, permissions, queries or server actions. Owner pages keep `requireOwnerPage()` in `page.tsx`.
- No new dependencies. Tokens only (no raw hex). Touch targets 44px, base text 16px, page padding 16px.
- Confirm/form steps unchanged (void reason + confirm, disable staff, accept count, temporary-password dialog cannot be dismissed by outside tap or Escape).
- Do not hide information the owner sees today (cost, threshold, store code, status).
- Commit messages: Conventional Commits, no Co-Authored-By trailer (owner's memory rule).
- Tests: the repo's vitest runs `node` env on `.ts` only and has no component-test library; adding one needs owner approval. So there are no component unit tests. Each task is verified by `npm run typecheck`, `npm run lint`, `npm run build`, and a browser check at 360px, 768px and 1024px (needs an owner login: ask the owner for the dev test account, never invent credentials).

## Review Focus

- Empty list on a phone (no products, branches or staff): the "+" and the empty-state add button must both work. Checked in Tasks 2-4.
- Very long names (product, branch, staff): truncate in the row, no horizontal scroll at 360px. Tasks 2-4, 7.
- Last row hidden behind the "+" or tab bar: list has enough bottom padding to scroll it clear. Tasks 1-2.
- Inactive product/branch/staff: sheet shows Reactivate (not Deactivate); inactive rows look muted. Tasks 2-4.
- Voided or already-replaced sale: no Void, and no Replace if `replacedBySaleId` is set; Void still needs a reason. Task 5.

---

## Phase 1: shared pieces and Products

### Task 1: Shared pieces

**Files:**
- Create: `components/shell/list-row.tsx`, `components/shell/fab.tsx`, `components/shell/row-action-sheet.tsx`, `components/shell/page-body.tsx`

**Interfaces:**
- Produces:
  - `RowList({ children }: { children: React.ReactNode }): JSX.Element`: container `div` with `divide-y` border, `rounded-[var(--radius-xl)]`, `bg-[var(--card)]`, `overflow-hidden`, `lg:hidden`.
  - `ListRow(props: { title: React.ReactNode; detail?: React.ReactNode; trailing?: React.ReactNode; muted?: boolean; onClick: () => void }): JSX.Element`: full-width `button type="button"`, min height 56px, title truncated, detail below in `text-sm` muted, `trailing` right-aligned, a `ChevronRight`, `active:bg-[var(--muted)]`, opacity reduced when `muted`.
  - `Fab(props: { label: string; onClick: () => void }): JSX.Element`: 56px round primary button with `Plus` icon and `aria-label={label}`, `fixed right-4 z-30 lg:hidden`, bottom offset `calc(5rem + env(safe-area-inset-bottom) + 0.5rem)` below `md`, and `md:bottom-6 md:right-6` from `md` (no tab bar there).
  - `SheetAction = { label: string; icon?: LucideIcon; onSelect: () => void; destructive?: boolean; disabled?: boolean }`
  - `RowActionSheet(props: { title: string; description?: string; isOpen: boolean; onClose: () => void; actions: SheetAction[] }): JSX.Element`: renders `Modal`; each action is a full-width 48px button; selecting calls `onClose()` first, then `onSelect()` (avoids stacked dialogs).
  - `PageBody({ children }): JSX.Element`: plain `div` below `lg`; from `lg` it gets the old card look (`lg:rounded-[var(--radius-xl)] lg:border lg:border-[var(--border)] lg:bg-[var(--card)] lg:p-6 lg:shadow-xs`).
- Consumes: `Modal` from `@/components/ui/modal`.

- [ ] **Step 1: Create the four files** with the signatures above. `'use client'` on `ListRow`, `Fab`, `RowActionSheet`; `RowList` and `PageBody` can be server components.
- [ ] **Step 2: Verify** `npm run typecheck && npm run lint`. Expected: no errors.
- [ ] **Step 3: Commit** `feat(shell): add row list, floating add button and row action sheet`

### Task 2: Products on the new pieces

**Files:**
- Modify: `app/(owner)/products/page.tsx`, `features/products/components/product-list.tsx`

**Interfaces:**
- Consumes: Task 1 pieces; existing `CreateProductModal`, `EditProductModal`, `toggleProductActiveAction`, `ProductItem`.

- [ ] **Step 1: `page.tsx`** renders `PageHeader title="Products"` with a one-line description, then `PageBody` around `ProductList` (replaces the hand-written card).
- [ ] **Step 2: In `product-list.tsx`**, remove the `h2` heading block and its description (title now comes from the page; keep the active-count in the `PageHeader` description). Keep the Add button but make it `hidden lg:flex`, and add `Fab label="Add product"` opening the create modal.
- [ ] **Step 3: Search and filters** at 44px: `Input` `h-11 text-base`; "Show inactive" and category pills `min-h-11`, `text-sm`.
- [ ] **Step 4: Table** `hidden md:block` becomes `hidden lg:block`. Replace the `md:hidden` card grid with `RowList` of `ListRow`: title = name; detail = `Category · Cost ₱x · Alert at N`; trailing = selling `MoneyText` (destructive style when below cost); a "Below cost" or "Inactive" text badge next to the title (icon + text, not color alone); `muted` when inactive. Row `onClick` sets a `sheetProduct` state.
- [ ] **Step 5: `RowActionSheet`** for `sheetProduct`: title = name; actions Edit (opens `EditProductModal`), Deactivate/Reactivate (calls `handleToggleActive`, destructive when deactivating).
- [ ] **Step 6: Empty state** keeps its add button (works on phone); give the list wrapper `pb-24` so the last row scrolls clear of the "+".
- [ ] **Step 7: Verify** typecheck, lint, build; browser at 360px (title, rows, "+", sheet, edit, toggle, last row clear, no horizontal scroll), 768px (sidebar + rows + "+" bottom-right), 1024px (table and Add button as before, inside the card).
- [ ] **Step 8: Commit** `feat(products): rows, floating add and action sheet below 1024px`

**Phase 1 gate:** owner checks Products on a phone before Phase 2 starts.

---

## Phase 2: Branches, Team, Shop, Sales, Replace sale

### Task 3: Branches

**Files:**
- Modify: `app/(owner)/branches/page.tsx`, `features/branches/components/branch-list.tsx`

- [ ] **Step 1: `page.tsx`**: keep `PageHeader`, wrap `BranchList` in `PageBody` (drop the hand-written card).
- [ ] **Step 2: `branch-list.tsx`**: remove the duplicate `h3` heading (keep the count in the page description); Add button `hidden lg:flex` plus `Fab label="Add branch"`. Below `lg`, show the branch cards as `RowList`/`ListRow` (title = name, detail = staff count, trailing = Active text badge); keep the existing 2-column card grid for `lg` and up. Row opens `RowActionSheet` with Rename and Deactivate (opening the existing `RenameBranchModal` / `DeactivateBranchModal`).
- [ ] **Step 3: Verify** as in Task 2 Step 7, including an empty list and a long branch name.
- [ ] **Step 4: Commit** `feat(branches): rows, floating add and action sheet below 1024px`

### Task 4: Team

**Files:**
- Modify: `app/(owner)/team/page.tsx`, `features/team/components/staff-list.tsx`

- [ ] **Step 1: `page.tsx`**: add `PageHeader title="Team & staff"`, wrap in `PageBody`.
- [ ] **Step 2: `staff-list.tsx`**: remove the `h2`; Add button `hidden lg:flex` plus `Fab label="Add staff"`. The store code card stays at the top, copy button at 44px. Below `lg`, staff cards become `ListRow` (title = name, detail = username and branch, trailing = Active/Inactive badge). Row opens `RowActionSheet` with the same actions the card has today (reassign branch, reset password, deactivate/reactivate), each opening its existing modal. The temporary-password modals are unchanged.
- [ ] **Step 3: Verify** as in Task 2 Step 7, plus: reset password still shows the non-dismissible temporary-password dialog.
- [ ] **Step 4: Commit** `feat(team): rows, floating add and action sheet below 1024px`

### Task 5: Owner Sales

**Files:**
- Modify: `features/sales/components/owner-sales-list.tsx`; check `app/(owner)/sales/page.tsx`

- [ ] **Step 1:** Below `lg`, each sale becomes a `ListRow` (title = amount, detail = staff, time and payment method, trailing = Completed/Voided/Replacement text badge). No "+" here (sales are created only by `record_sale`).
- [ ] **Step 2:** Row opens `RowActionSheet`. Actions: Void sale (only if completed; opens the existing `VoidSaleModal`, which still needs a reason) and Replace sale (only if voided and `replacedBySaleId` is empty; navigates to `/sales/replace/[saleId]`, so use `router.push`). A voided sale with a reason shows that reason in the sheet `description`. If a sale has no available action, the row is not tappable.
- [ ] **Step 3:** Filter form: inputs 44px, base text 16px.
- [ ] **Step 4: Verify** as in Task 2 Step 7; void a test sale end to end on 360px; confirm a replaced sale has no actions.
- [ ] **Step 5: Commit** `feat(sales): rows and action sheet below 1024px`

### Task 6: Shop details and Replace sale (forms)

**Files:**
- Modify: `app/(owner)/shop/page.tsx`, `features/shop/components/shop-name-form.tsx`, `app/(owner)/sales/replace/[saleId]/page.tsx` and its form components only if needed

- [ ] **Step 1:** Keep `PageHeader`; page padding, 44px inputs and buttons, 16px text; add a `loading.tsx` skeleton if the route has none (match the `animate-pulse rounded-[var(--radius-xl)] bg-[var(--muted)]` style in `app/(owner)/sales/loading.tsx`).
- [ ] **Step 2: Verify** at 360px and 768px; submit a shop rename and open a replace-sale form.
- [ ] **Step 3: Commit** `feat(shell): consistent spacing and controls on shop and replace-sale forms`

**Phase 2 gate:** owner checks Branches, Team, Sales, Shop on a phone before Phase 3.

---

## Phase 3: Stock

### Task 7: Stock

**Files:**
- Modify: `features/stock/components/stock-table.tsx` (521 lines; no restructuring beyond this task), check `app/(owner)/stock/page.tsx`

- [ ] **Step 1:** The `md:hidden` card grid (starts near line 402) becomes `RowList` of `ListRow` (title = product, detail = branch and quantity, trailing = Low stock / Out / Negative text badge). The desktop table switches from `md:block` to `lg:block`; the toolbar buttons that show at `md` (near line 238) move to `lg`. No "+" on Stock.
- [ ] **Step 2:** Row opens `RowActionSheet` with Adjust and Restock, calling the existing `openAdjust(item)` / `openRestock(item)`. Opening stock and Count stay in More. Stock quantity must show exactly as today (negative values included).
- [ ] **Step 3:** Filter chips, search and summary tiles at 44px / 16px text.
- [ ] **Step 4: Verify** as in Task 2 Step 7; adjust and restock a test item on 360px; pull-to-refresh on Stock still works.
- [ ] **Step 5: Commit** `feat(stock): rows and action sheet below 1024px`

### Task 8: Docs and final check

**Files:**
- Modify: `context/2-areas/ui-context.md` (Layout patterns: add the row list, "+" button and sheet pattern and the `lg` rule), `context/1-projects/progress-tracker.md` (Unit 9 part I), `context/2-areas/decisions-log.md` (the `lg` breakpoint decision)

- [ ] **Step 1:** Update the three context files.
- [ ] **Step 2: Verify** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: all pass. Then a final pass at 360, 768 and 1024px over every page in the spec, and one staff login to confirm Sell and My sales are unchanged.
- [ ] **Step 3: Commit** `docs: record consistent mobile pages unit`
