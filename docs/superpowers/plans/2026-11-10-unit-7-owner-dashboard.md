# Owner Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Unit 2 placeholder on `/dashboard` with the owner's daily view: today's sales and profit, low-stock list, sales per staff, and missing stock, filterable by branch and refreshed every 30 seconds.

**Architecture:** Pure summary functions turn plain rows into card models (tested with hand-made fixtures). One owner-only server query reads today's sales (Asia/Manila day), products and `stock_levels`, and returns a `DashboardData` view model. The page calls `requireOwnerPage()` and renders server-side cards plus two tiny client components (branch filter, 30-second refresh). No schema change; reads use existing owner RLS.

**Tech Stack:** Next.js App Router (server components), TypeScript strict, Supabase JS, Zod, Tailwind + existing `components/ui/card`, Vitest.

**Spec:** `context/1-projects/unit-7-owner-dashboard/CONTEXT.md` (contract; its five decisions need owner OK first), the Unit 7 block in `context/1-projects/progress-tracker.md`, dashboard layout in `context/2-areas/ui-context.md`.

## Global Constraints

- Money is integer centavos; display only through `MoneyText` (`components/shared/money-text.tsx`).
- "Today" is the Asia/Manila day via `lib/dates.ts` (`getManilaDateString`, `getManilaRangeBetween`).
- Owner only: the page calls `requireOwnerPage()` directly (Invariant 17). Staff never receive cost, profit, or others' sales.
- Voided sales never count in totals, profit, or per-staff figures.
- Dynamic reads only: keep `export const dynamic = 'force-dynamic'`; no `"use cache"`.
- Refresh interval exactly 30000 ms.
- No new dependencies. No schema change.
- Phone first: 360px, no sideways scroll, tap targets at least 44px, loading/empty/error state on each card.
- Card order: Today's sales and profit, Low stock, Sales per staff, Missing stock. Branch filter on top, default All branches.
- Vitest only collects `lib/**/__tests__` and `features/**/__tests__`; new unit tests go in `features/dashboard/__tests__/`. Real-session tests live in `supabase/tests/*.test.ts` and run with `npm run test:integration`.
- File names are kebab-case (`owner-sales-list.tsx`).

## Review Focus

1. Sale at 23:59 Manila is today, 00:01 next day is not. Failure: UTC day used. Pinned in Task 2 (range test).
2. Voided sale excluded from sales, profit, staff totals. Pinned in Task 1.
3. Replacement sale counts once under the original seller; voided original counts nowhere. Pinned in Task 1.
4. Product exactly at threshold is low; zero or negative is "out". Failure: off by one or oversold stock hidden. Pinned in Task 1.
5. A day with no sales shows ₱0.00 and empty states, never NaN or a crash. Pinned in Task 1 and Task 4.

## File Structure

- Create `features/dashboard/summary.ts`: pure functions and types, no Supabase import.
- Create `features/dashboard/schemas.ts`: Zod filter.
- Create `features/dashboard/queries.ts`: `getOwnerDashboard`; the only file that talks to Supabase.
- Create `features/dashboard/components/branch-filter.tsx` (client), `auto-refresh.tsx` (client), `dashboard-cards.tsx` (server).
- Create `features/dashboard/__tests__/summary.test.ts`, `schemas.test.ts`.
- Create `supabase/tests/unit7_dashboard_access.test.ts`.
- Modify `app/(owner)/dashboard/page.tsx`.

## Interfaces

**Task 1 produces** (`features/dashboard/summary.ts`):

```ts
export type SaleForSummary = {
  status: 'completed' | 'voided';
  soldById: string;
  soldByName: string;
  totalCentavos: number;
  totalCostCentavos: number;
};
export type StaffTotal = { staffId: string; name: string; salesCentavos: number; saleCount: number };
export type ProductForStock = { productId: string; name: string; threshold: number; branchId: string; branchName: string; stockOnHand: number };
export type LowStockRow = { productId: string; name: string; branchId: string; branchName: string; stockOnHand: number; state: 'out' | 'low' };

export function summarizeSales(sales: SaleForSummary[]): { salesCentavos: number; profitCentavos: number; saleCount: number };
export function salesPerStaff(sales: SaleForSummary[]): StaffTotal[]; // completed only; salesCentavos desc, then name
export function lowStock(products: ProductForStock[]): LowStockRow[]; // stockOnHand <= threshold; 'out' when <= 0 else 'low'; out first, then stockOnHand asc, then name
```

**Task 2 produces** (`features/dashboard/schemas.ts`, `queries.ts`):

```ts
export const dashboardFilterSchema: z.ZodObject<{ branchId: z.ZodOptional<z.ZodGUID> }>;
export type DashboardData = {
  date: string;                // Manila day YYYY-MM-DD
  branches: { id: string; name: string }[];   // active branches
  selectedBranchId: string | null;
  today: { salesCentavos: number; profitCentavos: number; saleCount: number };
  lowStock: LowStockRow[];
  staffTotals: StaffTotal[];
  missingStock: { branchName: string; units: number; costCentavos: number }[]; // [] until Unit 8
};
export async function getOwnerDashboard(rawFilter?: unknown): Promise<DashboardData>;
```

**Task 4 consumes** `DashboardData`; it never calls Supabase.

---

### Task 1: Pure summary logic

**Files:** Create `features/dashboard/summary.ts`; Test `features/dashboard/__tests__/summary.test.ts`

- [ ] **Step 1: Write the failing tests** (names and exact values):

```ts
it('sums completed sales and profit as sales minus saved cost', () => {
  // completed (10000, cost 6000) + (2550, cost 1000)
  expect(summarizeSales(rows)).toEqual({ salesCentavos: 12550, profitCentavos: 5550, saleCount: 2 });
});
it('ignores voided sales in totals, profit and count', () => {
  // add voided (9999, cost 1): result identical to the test above
});
it('counts a replacement once under the original seller, not the voided original', () => {
  // voided 5000 sold by Ana + completed 5000 sold by Ana -> salesPerStaff = [{ name:'Ana', salesCentavos:5000, saleCount:1 }]
});
it('returns zeros and empty lists for an empty day', () => {
  expect(summarizeSales([])).toEqual({ salesCentavos: 0, profitCentavos: 0, saleCount: 0 });
  expect(salesPerStaff([])).toEqual([]);
  expect(lowStock([])).toEqual([]);
});
it('sorts staff by sales descending, then name', () => { /* Ben and Cy tie at 3000 -> Ben first; Ana 5000 before both */ });
it('flags a product at exactly its threshold as low', () => { /* stock 5, threshold 5 -> state 'low' */ });
it('flags zero and negative stock as out and lists them first', () => { /* stock -2 and 0 -> 'out'; stock 2 threshold 5 -> 'low' after */ });
it('does not list products above their threshold', () => { /* stock 6, threshold 5 -> absent */ });
```

- [ ] **Step 2: Run to verify failure.** Run: `npm test -- features/dashboard/__tests__/summary.test.ts`. Expected: FAIL, cannot resolve `../summary`.
- [ ] **Step 3: Implement the three functions and types** in `features/dashboard/summary.ts` with the signatures above. Integer math only (`lib/money.ts` `addMoney` / `subtractMoney` if convenient); tie-break with `localeCompare`.
- [ ] **Step 4: Run to verify pass.** Same command. Expected: PASS, 8 tests.
- [ ] **Step 5: Commit**

```bash
git add features/dashboard/summary.ts features/dashboard/__tests__/summary.test.ts
git commit -m "unit 7: dashboard summary logic with tests"
```

---

### Task 2: Filter schema and owner-only query

**Files:** Create `features/dashboard/schemas.ts`, `features/dashboard/queries.ts`; Test `features/dashboard/__tests__/schemas.test.ts`

**Interfaces:** Consumes Task 1 functions and types. Produces `dashboardFilterSchema`, `DashboardData`, `getOwnerDashboard`.

- [ ] **Step 1: Write the failing tests** in `schemas.test.ts`:

```ts
it('accepts no filter and a guid branch id, rejects a non-guid', () => {
  expect(dashboardFilterSchema.parse({})).toEqual({});
  expect(dashboardFilterSchema.parse({ branchId: '00000000-0000-0000-0000-000000000010' }).branchId).toBeDefined();
  expect(() => dashboardFilterSchema.parse({ branchId: 'abc' })).toThrow();
});
it('Manila today spans 16:00Z the day before to 15:59:59.999Z', () => {
  const r = getManilaRangeBetween('2026-11-10', '2026-11-10');
  expect(r.startUtc).toBe('2026-11-09T16:00:00.000Z');
  expect(r.endUtc).toBe('2026-11-10T15:59:59.999Z');
  // 23:59 Manila (15:59Z) is inside; 00:01 next day (16:01Z) is outside
  expect('2026-11-10T15:59:00.000Z' <= r.endUtc).toBe(true);
  expect('2026-11-10T16:01:00.000Z' <= r.endUtc).toBe(false);
});
```

- [ ] **Step 2: Run to verify failure.** Run: `npm test -- features/dashboard/__tests__/schemas.test.ts`. Expected: FAIL, cannot resolve `../schemas`.
- [ ] **Step 3: Implement `dashboardFilterSchema`** (`z.guid()`, matching the Unit 6 sales schemas) **and `getOwnerDashboard`** in `queries.ts`, following the pattern of `features/stock/queries.ts` (`requireOwnerPage()` first, `createClient()` from `@/lib/supabase/server`, scoped by `user.shopId`):
  - Invalid or missing filter falls back to all branches (do not throw on a bad `?branch=`).
  - Range from `getManilaRangeBetween(date, date)` with `date = getManilaDateString()`.
  - Read `sales` (`status, branch_id, sold_by, total_centavos, total_cost_centavos`) in range, plus `.eq('branch_id', …)` when filtered; names from `profiles` (`id, full_name`).
  - Read active `branches`, active `products` (`id, name, low_stock_threshold`), and `stock_levels` (`branch_id, product_id, stock_on_hand`). Build one `ProductForStock` per `stock_levels` row whose product is active and branch is active and in scope (decision 2: no row, not listed).
  - `missingStock: []` with comment `// shortcut: Unit 8 fills this from the latest stock count; empty until counts exist`.
  - Any Supabase error throws `new Error('Failed to load the dashboard.')`; never the raw error.
- [ ] **Step 4: Run to verify pass.** Same command, then `npm run typecheck`. Expected: PASS, exit 0.
- [ ] **Step 5: Commit**

```bash
git add features/dashboard/schemas.ts features/dashboard/queries.ts features/dashboard/__tests__/schemas.test.ts
git commit -m "unit 7: owner dashboard query and filter schema"
```

---

### Task 3: Staff cannot read owner numbers (real session)

**Files:** Test `supabase/tests/unit7_dashboard_access.test.ts` (copy the sign-in setup from `supabase/tests/unit4_actions_integration.test.ts`: `.env` load, `scratch/dev_credentials.local.json`, owner and staff clients).

- [ ] **Step 1: Write the test.** Assertions:

```ts
it('staff reading sales returns no rows (RLS) and no cost or profit columns exist on my_sales', async () => {
  const { data } = await staffClient.from('sales').select('id, total_cost_centavos');
  expect(data ?? []).toEqual([]);
  const mine = await staffClient.from('my_sales').select('*').limit(1);
  expect(Object.keys(mine.data?.[0] ?? {})).not.toContain('total_cost_centavos');
});
it('staff reading stock_counts returns no rows', async () => { /* same shape */ });
it('owner can read today sales for their own shop', async () => { /* select from sales as owner: no error */ });
```

- [ ] **Step 2: Run.** `npm run test:integration -- supabase/tests/unit7_dashboard_access.test.ts`. Expected: PASS (this proves existing RLS; it needs no new source). If it fails, stop and report: that is a real security gap, not a test fix.
- [ ] **Step 3: Commit**

```bash
git add supabase/tests/unit7_dashboard_access.test.ts
git commit -m "unit 7: prove dashboard source tables are owner-only"
```

---

### Task 4: Dashboard UI (phone first)

**Files:** Create `features/dashboard/components/branch-filter.tsx`, `auto-refresh.tsx`, `dashboard-cards.tsx`; Modify `app/(owner)/dashboard/page.tsx`.

**Interfaces:** Consumes `DashboardData`. Uses `MoneyText` and `components/ui/card`.

- [ ] **Step 1: Read the Next docs for `searchParams` in this version** under `node_modules/next/dist/docs/` (AGENTS.md requires it) and use the documented page-props signature. Check how `app/(owner)/sales/page.tsx` already reads it and match.
- [ ] **Step 2: Implement the components.**
  - `auto-refresh.tsx` (client): `export function AutoRefresh()`; `useEffect` with `setInterval(() => router.refresh(), 30000)` and `clearInterval` on cleanup. Renders nothing.
  - `branch-filter.tsx` (client): `export function BranchFilter({ branches, selectedBranchId })`; a native `<select>` at least 44px tall, "All branches" first; on change `router.push` to `/dashboard?branch=<id>` or `/dashboard`.
  - `dashboard-cards.tsx` (server): `export function DashboardCards({ data }: { data: DashboardData })`, four `Card`s in contract order. Today: sales and profit as 32px/700 `MoneyText`, plus sale count. Low stock: rows with a text label ("Out of stock" / "Low stock") and the on-hand number; show branch name only when All branches; empty: "Nothing is low right now." Sales per staff: name, count, `MoneyText`; empty: "No sales yet today." Missing stock: empty: "No stock count yet. Missing stock shows here after your first count."
- [ ] **Step 3: Rewrite `page.tsx`.** Keep `force-dynamic`, metadata, and the direct `requireOwnerPage()` call; read `?branch`, call `getOwnerDashboard({ branchId })`, render heading, `BranchFilter`, `AutoRefresh`, `DashboardCards`; remove the Unit 2 placeholder card. Add `app/(owner)/dashboard/error.tsx`-style handling only if the other owner pages have one; otherwise let the thrown message surface through the existing error boundary.
- [ ] **Step 4: Run** `npm run typecheck` then `npm run lint`. Expected: both exit 0.
- [ ] **Step 5: Verify in the browser** (`preview_start`, sign in as owner): four cards in order at 360px with no sideways scroll; changing the branch changes the numbers and the URL; the network panel shows a refresh request to `/dashboard` about every 30 seconds and the branch stays selected; a staff login is redirected away from `/dashboard`.
- [ ] **Step 6: Commit**

```bash
git add features/dashboard/components "app/(owner)/dashboard/page.tsx"
git commit -m "unit 7: owner dashboard cards, branch filter and 30-second refresh"
```

---

### Task 5: Verification and hand calculation

- [ ] **Step 1: Full checks.** Run `npm run typecheck`, `npm run lint`, `npm test`. Expected: all exit 0; no `console.log` or unlinked `TODO`.
- [ ] **Step 2: Hand calculation.** On dev seed data record a known set of today's sales (include one voided and one replacement) at two branches. For each branch and for All, compare dashboard sales total, profit, sale count, and per-staff totals with hand totals from `/sales` (same day). Expected: identical.
- [ ] **Step 3: Phone checklist** from `ai-workflow-rules.md` at 360px (no sideways scroll, 44px taps, loading/empty/error, staff cannot see cost/profit or owner pages in page or network, money as ₱ with two decimals).
- [ ] **Step 4: Owner sign-off.** Show the dashboard on a phone. When the owner says done: tick Unit 7 in `progress-tracker.md`, add a `decisions-log.md` row, `git mv context/1-projects/unit-7-owner-dashboard context/4-archive/`, run `graphify --update`, commit `unit 7: owner dashboard`.

---

## Self-Review

- **Spec coverage:** card order (Task 4), today's sales/profit (1, 2), low stock (1), per staff (1), missing stock empty until Unit 8 (2, 4), branch filter (2, 4), Asia/Manila (2), 30s refresh (4), matches hand calculation (5). No gaps.
- **Types:** `SaleForSummary`, `ProductForStock` (`productId`), `LowStockRow`, `StaffTotal`, `DashboardData` defined once in Interfaces and reused by name.
- **Known limits:** sales for the day are read in full and summed in code (a shop-day is small; move to a database sum if volume grows). Task 3 cannot test cross-shop reads: the dev credentials file holds one shop; cross-shop RLS is already covered by the Unit 2 SQL tests.
