# Code Standards

## TypeScript
- `strict: true`. No `any` (use `unknown` and narrow it). No `@ts-ignore` without a comment explaining why and owner approval.
- Prefer `type` for data shapes. Use string unions for fixed choices (`'cash' | 'gcash'`).
- Database types are generated with `supabase gen types` into `lib/supabase/database.types.ts`. Never hand-edit this file.
- Database columns are `snake_case`; TypeScript is `camelCase`. Convert at the data-access boundary, in one place per feature.
- Money is an integer number of centavos. All money math and formatting goes through `lib/money.ts`. No floating-point money anywhere.
- Dates are stored in UTC. All "today" and display logic goes through `lib/dates.ts` using the `Asia/Manila` timezone.

## Folder organization
There is **no `src/` directory.** The App Router lives in the root `app/` folder, and the import alias `@/*` points to the project root.

```
  app/
    (auth)/login/
    (staff)/sell/            (owner may also use /sell)
    (staff)/my-sales/
    (owner)/dashboard/
    (owner)/sales/
    (owner)/products/
    (owner)/stock/
    (owner)/stock-count/
    (owner)/team/
    (owner)/activity/
    (owner)/settings/
    layout.tsx
  features/
    <feature>/
      actions.ts        server actions (mutations)
      queries.ts        server-side reads
      schemas.ts        Zod schemas + inferred types
      components/       UI for this feature only
  components/
    ui/                 shadcn/ui primitives (generated)
    shared/             small reusable pieces (MoneyText, EmptyState, PageHeader)
  lib/
    supabase/           server.ts, client.ts, admin.ts, proxy.ts (session helper), database.types.ts
    money.ts
    dates.ts
    auth.ts             getCurrentUser, requireOwner, requireStaffOrOwner
    errors.ts
supabase/
  migrations/           numbered SQL files, one concern per file
  tests/                SQL scripts proving RLS and function rules
  seed.sql
public/                 manifest, icons
```
- A feature never imports from another feature's `components/`. Shared things go in `components/shared` or `lib`.
- One component per file. File names in `kebab-case`; component names in `PascalCase`.

## Framework patterns
- Server components by default. Add `'use client'` only for interaction (the cart, forms, search filters).
- Reads happen in server components or `queries.ts`. Mutations happen in server actions in `actions.ts`.
- Every server action:
  1. Gets the current user (`lib/auth.ts`) and checks the role.
  2. Validates input with Zod.
  3. Calls Supabase as the logged-in user (not the service role).
  4. Returns a result object (below).
  5. Revalidates affected paths.
- Never trust the role or shop sent by the browser. Always read it from the session.
- Route handlers (`route.ts`) are not used in v1 unless the owner approves a need.
- Every `page.tsx` under `app/(owner)` must call `requireOwnerPage()` itself; layouts are for UI structure only and must not be the only guard.
- This project uses the current Next.js (16 or newer). Use `proxy.ts` in the project root, never `middleware.ts`, and export a function named `proxy`.
- `proxy.ts` only refreshes the Supabase session and does coarse redirects (logged-out users go to `/login`). It is never the only protection: every server action and every database table still checks the user and role (RLS is the real protection).
- Before using any Next.js API, check the installed version and the official docs for it. Do not rely on older patterns from memory (for example: `params`, `cookies()`, and `headers()` are async in current versions).

## API result shape
```
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string> } }
```
- `message` is human-friendly and safe to show to a shop worker. No raw database errors reach the UI.
- Unexpected errors are logged on the server and returned as a generic message.

## State management
- No global state library in v1.
- The sell screen cart lives in `useReducer` inside the sell page's client component.
- Server data refreshes through `revalidatePath` / `router.refresh()`. The dashboard refreshes itself about every 30 seconds while open.
- Forms use `react-hook-form` with the Zod resolver (shadcn Form pattern).

## Database rules
- Every migration is a new numbered file; never edit one that has been applied.
- Every new table in a migration includes: `shop_id`, RLS enabled, policies, and an index on `shop_id`.
- Business rules that must be atomic (sale, void, count accept) live in database functions and are called with `supabase.rpc(...)`.
- Every database function and RLS policy has a test script in `supabase/tests/`.

## UI and styling rules
- Tailwind utility classes with the design tokens from `ui-context.md`. No inline styles. No hard-coded hex colors in components.
- Use shadcn/ui components; extend them rather than building new base components.
- Mobile first: design at 360px wide, then enhance for tablet and desktop.
- Every screen needs a loading state, an empty state, and an error state.
- Money is always shown through `<MoneyText />` / `formatMoney()`.

## Naming and errors
- Booleans start with `is` / `has` / `can`.
- Server action names are verbs: `recordSale`, `voidSale`, `createProduct`.
- Don't swallow errors. Handle them or return them in `ActionResult`.

## Testing
- Unit tests (Vitest) for money, dates, profit math, and stock math.
- SQL test scripts prove: staff can't read cost data, staff can't see other shops or other staff's sales, movements can't be edited or deleted, `record_sale` is atomic and idempotent.
- Manual phone checklist (in `ai-workflow-rules.md`) for every UI unit.

## Do not
- Do not add a dependency without asking the owner first.
- Do not use `localStorage` for business data.
- Do not log secrets, passwords, or full user objects.
- Do not leave `console.log` in committed code.