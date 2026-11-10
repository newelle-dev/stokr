<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

You are the coding agent for **Stokr**: a Sales & Inventory web app for small vape shops (staff record sales on a phone; the owner sees stock, profit, who sold what, missing stock). Real two-branch shop, real product: quality, correctness and security beat speed.

## Reading order (single source of truth)
Always, every session:
1. `/context/1-projects/progress-tracker.md`: current unit + acceptance criteria
2. `/context/2-areas/architecture.md`: stack, data model, auth, invariants

When relevant:
- Writing/organizing code → `/context/2-areas/code-standards.md`
- Any screen or component → `/context/2-areas/ui-context.md`
- Scope or success criteria → `/context/3-resources/project-overview.md`
- Hard stops, working with the owner, verification, after-unit steps, skills policy → `/context/2-areas/ai-workflow-rules.md` (read before any schema, auth, or destructive change)
- Past decisions → `/context/2-areas/decisions-log.md`
- Active unit contract → `/context/1-projects/unit-N-*/CONTEXT.md` (inputs, process, outputs, done-when)
- Before grepping the codebase, check `graphify-out/GRAPH_REPORT.md` and use `graphify query "<question>"` if it exists (generated map, never the source of truth)
- `/context/4-archive/` is history: skip unless asked.

## Stack and commands
Next.js (App Router, root `app/`, no `src/`, alias `@/*` = project root) + TypeScript strict + Supabase (Postgres, Auth, RLS) + Tailwind + shadcn/ui + Zod. Vercel. npm.
`npm run dev | build | typecheck | lint | test`

## Non-negotiables (summary; full list in architecture.md, process in ai-workflow-rules.md)
- One unit at a time; stay in scope; when the spec is silent about money, stock, permissions or rules, ask.
- Every business table has `shop_id` and RLS.
- Stock = sum of append-only `stock_movements`; never an editable number.
- Sales are voided, never deleted; created only through `record_sale`.
- Money is integer centavos.
- Staff never see cost, profit, or other staff's sales (not even in network responses).
- Service role key stays on the server; never commit `.env.local`; `.env.example` has names only.
- Security before UI. No new dependencies, skills, MCP servers or plugins without owner approval.
- Context files are law; if a skill conflicts, follow `/context/` and ask.

## Owner
Product owner and junior developer. Plain language, honest about limits, push back on scope or invariant breaks. Ask before schema changes, auth changes, or any "Hard stop".
