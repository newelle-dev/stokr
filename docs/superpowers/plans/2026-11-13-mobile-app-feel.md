# Mobile App Feel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Stokr's phone view feel like a native app: bottom tab bars for owner and staff, one consistent top bar, bottom-sheet dialogs, then page transitions, pull-to-refresh and swipe-back.

**Architecture:** All route knowledge (tabs, More items, titles, back targets, which screens allow gestures) lives in one pure module, `lib/nav.ts`, with unit tests. Small client components under `components/shell/` render it; the owner and staff layouts use the same shell. Gesture maths lives in `lib/gestures.ts` (pure, tested); components only wire touch events to it. Phase 1 (Tasks 1-5) ships without any motion; Phase 2 (Tasks 6-8) can be dropped without breaking Phase 1.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, `@base-ui/react` Dialog, lucide-react, Vitest (node environment, pure-logic tests only). **No new dependencies.**

**Spec:** `docs/superpowers/specs/2026-11-13-mobile-app-feel-design.md`

## Global Constraints

- Read the Next.js guide in `node_modules/next/dist/docs/` before writing any `template.tsx`, `viewport` or layout code (AGENTS.md: this Next version differs from older ones).
- No new dependencies, skills, MCP servers or plugins. Tailwind, CSS and the existing `@base-ui/react` Dialog only.
- No schema, auth, permission or data changes. Staff never receive cost, profit or other staff's sales.
- Tokens only (`var(--primary)` etc.), never raw hex. Touch targets at least 44px; counter actions 48px. Base text 16px. Design at 360px.
- Every `page.tsx` under `app/(owner)` keeps its own `requireOwnerPage()` call; layouts are structure only (invariant 17).
- Owner phone bar is exactly **Dashboard, Sales, Stock, More**. Staff bar is **Sell, My sales**; owners in the staff view also get **Owner** (`/dashboard`), staff never do.
- No swipe or pull gesture on any money or stock control, the sell cart/review step, or any form page (Stock count, Stock opening, Replace sale).
- Motion is about 150-200ms and switched off under `prefers-reduced-motion`.
- The temporary-password dialog stays centered, non-dismissible by outside tap or Escape.
- Commits follow Conventional Commits with no `Co-Authored-By: Claude` trailer (the owner's saved preference `commit-message-style` overrides the default attribution).
- Verify each task with `npm run typecheck`, `npm run lint`, `npm test`; UI tasks also get a check at 360px width in the browser preview.

## Review Focus

1. A staff account is handed an owner-only link (Owner tab, Products, Team, Settings): `staffTabsFor('staff')` must contain only Sell and My sales. (Task 1)
2. Prefix route false matches: `/salesforce` must not light the Sales tab; `/stock/count` must light Stock. (Task 1)
3. Deep link or refresh on a sub-page, including a trailing slash (`/stock/count/`): back goes to the fixed parent; unknown routes get no back arrow. (Task 1)
4. Gesture misfires: pulling when the page is scrolled, mostly vertical swipes, and swipes that do not start at the left edge must not trigger refresh or back. (Task 6)
5. The temporary-password dialog on a phone: centered, and tapping outside or pressing Escape does nothing. (Task 4, manual)
6. The sticky "Review sale" bar hides behind the tab bar, or content is hidden under the iPhone home bar. (Tasks 3 and 5, manual)

---

## Phase 1: Shell

### Task 1: Navigation model

**Files:**
- Create: `lib/nav.ts`
- Test: `lib/__tests__/nav.test.ts`

**Interfaces:**
- Produces (exact exports, all pure):
  - `type NavIcon = 'dashboard' | 'sales' | 'stock' | 'more' | 'sell' | 'mySales' | 'owner' | 'products' | 'team' | 'settings' | 'reports'`
  - `interface NavItem { label: string; href: string; icon: NavIcon }`
  - `OWNER_TABS: NavItem[]` (Dashboard `/dashboard`, Sales `/sales`, Stock `/stock`; the fourth tab, More, is rendered by the shell, not a link)
  - `MORE_ITEMS: NavItem[]` (Sell `/sell`, Products `/products`, Team `/team`, Settings `/settings`)
  - `SIDEBAR_ITEMS: (NavItem & { enabled: boolean; badge?: string })[]` (the current desktop list in its current order: Dashboard, Products, Team, Settings, Stock, Sales, then Reports disabled with badge `Unit 5`)
  - `staffTabsFor(role: 'owner' | 'staff'): NavItem[]` (Sell `/sell`, My sales `/my-sales`; plus Owner `/dashboard` only when role is `owner`)
  - `isActive(pathname: string, href: string): boolean`
  - `isMoreActive(pathname: string): boolean` (true under `/products`, `/team`, `/settings`)
  - `parentRoute(pathname: string): string | null`
  - `pageTitle(pathname: string): string | null`
  - `canPullRefresh(pathname: string): boolean`
  - `canSwipeBack(pathname: string): boolean`

- [ ] **Step 1: Write the failing tests** in `lib/__tests__/nav.test.ts`. Assertions:
  - `OWNER_TABS.map(t => t.label)` equals `['Dashboard','Sales','Stock']`.
  - `staffTabsFor('staff').map(t => t.href)` equals `['/sell','/my-sales']`; `staffTabsFor('owner').map(t => t.href)` equals `['/sell','/my-sales','/dashboard']`.
  - `isActive('/stock/count','/stock')` is true; `isActive('/salesforce','/sales')` is false; `isActive('/sales','/sales')` is true.
  - `isMoreActive('/team')` true; `isMoreActive('/dashboard')` false.
  - `parentRoute`: `/products`, `/team`, `/settings` give `/dashboard`; `/stock/opening` and `/stock/count` give `/stock`; `/sales/replace/abc` gives `/sales`; `/stock/count/` (trailing slash) gives `/stock`; `/dashboard`, `/sales`, `/stock`, `/sell`, `/my-sales`, `/nope` give `null`.
  - `pageTitle`: `/products` Products, `/team` Team, `/settings` Settings, `/stock/opening` Opening stock, `/stock/count` Stock count, `/sales/replace/abc` Replacement sale, `/dashboard` null.
  - `canPullRefresh` true for `/dashboard`, `/sales`, `/my-sales`, `/stock`; false for `/stock/count`, `/stock/opening`, `/sales/replace/abc`, `/sell`, `/products`.
  - `canSwipeBack` true for `/products`, `/team`, `/settings`; false for `/stock/count`, `/stock/opening`, `/sales/replace/abc`, `/sell`, `/dashboard`.
- [ ] **Step 2: Run** `npx vitest run lib/__tests__/nav.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `lib/nav.ts`** to the interface above. Normalize a trailing slash before matching; `isActive` matches `pathname === href` or `pathname.startsWith(href + '/')`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(nav): add pure navigation model for the phone shell`.

### Task 2: Shell components and owner layout

**Files:**
- Create: `components/shell/nav-icons.ts`, `components/shell/bottom-tab-bar.tsx`, `components/shell/more-sheet.tsx`, `components/shell/app-header.tsx`
- Modify: `components/owner/owner-nav.tsx` (delete `OwnerMobileTabBar`; `OwnerDesktopSidebar` reads `SIDEBAR_ITEMS` from `lib/nav.ts` instead of its own list), `app/(owner)/layout.tsx`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces:
  - `NAV_ICONS: Record<NavIcon, React.ComponentType<{ className?: string }>>` in `nav-icons.ts` (lucide: dashboard `LayoutDashboard`, sales `ShoppingCart`, stock `Boxes`, more `Menu`, sell `ScanLine` or `ShoppingBag`, mySales `Receipt`, owner `LayoutDashboard`, products `Package`, team `Users`, settings `Settings`, reports `BarChart3`).
  - `BottomTabBar({ tabs, moreItems, signOut }: { tabs: NavItem[]; moreItems?: NavItem[]; signOut?: React.ReactNode })` (client). Renders `tabs` as links, plus a **More** button when `moreItems` is given. Fixed to the bottom, `md:hidden` when `hideOnDesktop` is true (see Task 3 for the staff variant, so add `hideOnDesktop?: boolean`, default false). Height `h-16` plus `pb-[env(safe-area-inset-bottom)]`. Active tab uses `isActive`, More uses `isMoreActive`. Each tab is at least 44px wide and tall, label 11px, `aria-current="page"` on the active link.
  - `MoreSheet({ open, onClose, items, signOut }: { open: boolean; onClose: () => void; items: NavItem[]; signOut?: React.ReactNode })` (client). A bottom sheet built from `@base-ui/react/dialog` (same primitives as `components/ui/modal.tsx`). Rows are links of at least 48px; tapping a row closes the sheet; shows `signOut` at the bottom.
  - `AppHeader({ right }: { right?: React.ReactNode })` (client). Reads `usePathname()`. Top-level routes (where `parentRoute` is null) show the `LogoMark` and wordmark; sub-pages show a back arrow `Link` to `parentRoute(pathname)` (44px tap target, `aria-label="Back"`) and the `pageTitle`. Height `h-14`, top padding `pt-[env(safe-area-inset-top)]`, sticky, `bg-[var(--card)]`. `right` goes on the far right.

- [ ] **Step 1: Implement** the four shell files to the interfaces above.
- [ ] **Step 2: Modify `owner-nav.tsx`**: sidebar maps `SIDEBAR_ITEMS` using `NAV_ICONS`, no behavior change on desktop.
- [ ] **Step 3: Modify `app/(owner)/layout.tsx`**: phone header becomes `<AppHeader />` wrapped in `md:hidden`; phone bottom bar becomes `<BottomTabBar tabs={OWNER_TABS} moreItems={MORE_ITEMS} signOut={<SignOutButton />} hideOnDesktop />`; main bottom padding becomes `pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8`. The desktop sidebar block is untouched.
- [ ] **Step 4: Verify** `npm run typecheck && npm run lint && npm test`. Then in the browser preview at 360px as owner: bar shows four tabs, More opens a sheet with Sell, Products, Team, Settings and Sign out; Products shows a back arrow to the dashboard; at 1024px the sidebar looks unchanged and no bottom bar shows.
- [ ] **Step 5: Commit** `feat(shell): owner bottom tab bar, More sheet and app header`.

### Task 3: Staff layout on the same shell

**Files:**
- Modify: `app/(staff)/layout.tsx`, `features/sales/components/sell-counter.tsx:135`

**Interfaces:**
- Consumes: `BottomTabBar`, `AppHeader`, `staffTabsFor`, `SignOutButton`.

- [ ] **Step 1: Modify `app/(staff)/layout.tsx`**: replace the custom header and the three top buttons with `<AppHeader right={<SignOutButton className="min-h-11 min-w-11" />} />` and `<BottomTabBar tabs={staffTabsFor(user.role)} />` (always visible, all widths). Keep `max-w-lg mx-auto` on main and the `requireStaffOrOwnerPage()` call. Main bottom padding `pb-[calc(5rem+env(safe-area-inset-bottom))]`. The user's name stays visible in the header only if it fits at 360px; otherwise drop it (my call, the name is not needed for the app feel).
- [ ] **Step 2: Modify the sticky review bar** in `sell-counter.tsx`: staff (no `correctsSaleId`) position it above the tab bar with `bottom-[calc(4rem+env(safe-area-inset-bottom))]`; the owner replacement page keeps `bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0`. Keep `z-20` so it stays under the tab bar's `z-30`.
- [ ] **Step 3: Verify** `npm run typecheck && npm run lint && npm test`. In the browser preview at 360px as staff: two tabs, no Owner tab, no link to `/dashboard` in the DOM; add an item on Sell and confirm the Review bar sits fully above the tab bar and the product list can still scroll to its last row. As owner on `/sell`: three tabs including Owner.
- [ ] **Step 4: Commit** `feat(shell): staff bottom tab bar and shared header`.

### Task 4: Modal becomes a bottom sheet on phones

**Files:**
- Modify: `components/ui/modal.tsx`

**Interfaces:**
- Consumes/Produces: `ModalProps` unchanged, so no caller changes.

- [ ] **Step 1: Modify the popup layout** in `modal.tsx`: on screens below `md`, the wrapper is `items-end p-0` and the popup is full width with `rounded-t-[var(--radius-xl)] rounded-b-none`, `max-h-[90dvh] overflow-y-auto`, bottom padding `pb-[calc(1.5rem+env(safe-area-inset-bottom))]`, and a slide-up entrance (`slide-in-from-bottom` from `tw-animate-css`). From `md` up it stays centered exactly as today. When `isTempPasswordDisplayed` is true the dialog stays centered with `p-4` and rounded on all sides at every width. Do not add drag-to-close (the X button and backdrop tap remain). Keep the existing dismissal logic untouched.
- [ ] **Step 2: Verify** `npm run typecheck && npm run lint`. In the browser preview at 360px: open Create product, Restock and Void sale; each slides up from the bottom and the form can scroll above the keyboard area; create a staff account and confirm the temporary-password dialog is centered and tapping outside and pressing Escape do nothing. At 1024px dialogs are centered as before.
- [ ] **Step 3: Commit** `feat(ui): show dialogs as bottom sheets on phones`.

### Task 5: Safe areas and shared page header

**Files:**
- Modify: `app/layout.tsx` (viewport), `app/globals.css`
- Create: `components/shell/page-header.tsx`
- Modify: page headings in `app/(owner)/dashboard/page.tsx`, `app/(owner)/sales/replace/[saleId]/page.tsx`, `app/(staff)/sell/page.tsx`, `app/(staff)/my-sales/page.tsx`, plus the heading blocks of the other owner pages

**Interfaces:**
- Produces: `PageHeader({ title, description }: { title: string; description?: string })` (server component) rendering the `h1` at the spec's page-title size (24px / 600, `tracking-tight`, `text-[var(--foreground)]`) and an optional 14px muted description.

- [ ] **Step 1: Modify `viewport` in `app/layout.tsx`** to add `viewportFit: 'cover'` (keep `themeColor`). Confirm the manifest and `appleWebApp` tags already exist (they do); add nothing else unless missing.
- [ ] **Step 2: Add to `app/globals.css`** in the base layer: `body { overscroll-behavior-y: contain; }` and `-webkit-tap-highlight-color: transparent` on interactive elements, so double scroll and grey tap flashes do not break the app feel.
- [ ] **Step 3: Implement `PageHeader`** and replace the hand-written `h1` blocks listed above so every screen has the same title size and spacing. Page behavior and queries do not change.
- [ ] **Step 4: Verify** `npm run typecheck && npm run lint && npm test && npm run build`. In the browser preview at 360px confirm no horizontal scroll on every owner and staff screen and titles look identical in size.
- [ ] **Step 5: Commit** `feat(ui): safe-area support and shared page header`.

## Phase 2: Motion (can be dropped without breaking Phase 1)

### Task 6: Gesture maths

**Files:**
- Create: `lib/gestures.ts`
- Test: `lib/__tests__/gestures.test.ts`

**Interfaces:**
- Produces:
  - `PULL_THRESHOLD_PX = 72`
  - `pullProgress(startY: number, currentY: number, scrollTop: number): number` returns 0 when `scrollTop > 0` or `currentY <= startY`, otherwise the drag distance divided by `PULL_THRESHOLD_PX`, capped at 1.
  - `isSwipeBack(startX: number, startY: number, endX: number, endY: number): boolean` true only when the swipe starts within 24px of the left edge, moves right at least 80px, and moves vertically less than 60px.

- [ ] **Step 1: Write the failing tests**: `pullProgress(0, 36, 0)` is 0.5; `pullProgress(0, 200, 0)` is 1; `pullProgress(0, 100, 10)` is 0 (page scrolled); `pullProgress(100, 50, 0)` is 0 (upward drag); `isSwipeBack(10, 300, 120, 310)` true; `isSwipeBack(100, 300, 220, 310)` false (does not start at edge); `isSwipeBack(10, 300, 120, 420)` false (mostly vertical); `isSwipeBack(10, 300, 50, 300)` false (too short).
- [ ] **Step 2: Run** `npx vitest run lib/__tests__/gestures.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/gestures.ts` to the interface.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(gestures): pure pull-to-refresh and swipe-back maths`.

### Task 7: Pull-to-refresh and swipe-back components

**Files:**
- Create: `components/shell/pull-to-refresh.tsx`, `components/shell/swipe-back.tsx`
- Modify: `app/(owner)/layout.tsx`, `app/(staff)/layout.tsx`

**Interfaces:**
- Consumes: `pullProgress`, `isSwipeBack`, `canPullRefresh`, `canSwipeBack`, `parentRoute`.
- Produces: `PullToRefresh()` and `SwipeBack()` (client, no props, render only a small indicator or nothing). Each reads `usePathname()` and does nothing unless `canPullRefresh(pathname)` / `canSwipeBack(pathname)` is true. `PullToRefresh` listens to `touchstart`, `touchmove`, `touchend` on `window` (passive), shows a small progress indicator under the header, and on release past the threshold calls `router.refresh()`. `SwipeBack` records the touch start and, on `touchend`, calls `router.push(parentRoute(pathname))` when `isSwipeBack` is true. Neither calls `preventDefault` on vertical scroll.

- [ ] **Step 1: Implement** both components to the interfaces.
- [ ] **Step 2: Mount** both once in each layout, next to the shell.
- [ ] **Step 3: Verify** `npm run typecheck && npm run lint && npm test`. In the browser preview with touch emulation: pulling down at the top of Dashboard, Sales, My sales and Stock refreshes the data; pulling on Sell, Stock count, Stock opening, Replace sale and Products does nothing; swiping right from the left edge on Products, Team and Settings goes back, and does nothing on Stock count, Replace sale, Sell. Also confirm the dashboard still auto-refreshes every 30 seconds.
- [ ] **Step 4: Commit** `feat(shell): pull-to-refresh on lists and swipe-back on read-only pages`.

### Task 8: Page transitions

**Files:**
- Create: `app/(owner)/template.tsx`, `app/(staff)/template.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: a `page-enter` CSS class (about 180ms fade plus a 6px upward slide) defined inside `@media (prefers-reduced-motion: no-preference)`; each `template.tsx` renders `<div className="page-enter">{children}</div>`.

- [ ] **Step 1: Read** the `template.tsx` section of `node_modules/next/dist/docs/` first.
- [ ] **Step 2: Implement** the CSS and both templates.
- [ ] **Step 3: Verify** `npm run typecheck && npm run lint && npm run build`. In the browser preview switching tabs fades the content in; with reduced motion on in the browser, nothing animates; the in-progress cart on Sell is not lost when the dashboard auto-refreshes or a search param changes (templates must not remount on those).
- [ ] **Step 4: Commit** `feat(ui): short page transitions that respect reduced motion`.

## Wrap-up

### Task 9: Docs, tracker and final check

**Files:**
- Modify: `context/1-projects/unit-9-polish-launch/CONTEXT.md` (add "H. Mobile app feel" part linking the spec and this plan), `context/1-projects/progress-tracker.md` (a Unit 9 line for the mobile shell and its phone checklist; do not tick anything the owner has not signed off), `context/2-areas/ui-context.md` (layout patterns now match the built shell, including the staff Owner tab and the More sheet)
- Verify: whole branch

- [ ] **Step 1: Update the three docs** as above, keeping them short and honest about what is not yet tested on a real phone.
- [ ] **Step 2: Run** `npm run typecheck && npm run lint && npm test && npm run build`. Expected: all pass.
- [ ] **Step 3: Run the phone checklist** at 360px and an iPhone-sized width as owner and as staff: every tab reachable one-handed, More and dialog sheets open and close, back works in the installed app after a refresh on a sub-page, no horizontal scroll, a typical sale takes the same number of taps as before, and the network tab shows no cost or profit fields in staff responses. Record what was and was not checked in the tracker.
- [ ] **Step 4: Commit** `docs(tracker): record the mobile app feel unit`.
