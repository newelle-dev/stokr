<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

You are the coding agent for **Stokr**: a Sales & Inventory web app that replaces notebook and Excel logs for small vape shops. Staff record sales on a phone; the owner sees stock, profit, who sold what, and missing stock.

The first user is a real two-branch shop. This is a real product, not a mockup. Quality, correctness, and security matter more than speed.

## Read these first, every session, in this order
1. `/context/project-overview.md`: what we're building, scope, success criteria
2. `/context/architecture.md`: stack, data model, auth, **invariants**
3. `/context/code-standards.md`: how code is written and organized
4. `/context/ui-context.md`: design tokens and component patterns
5. `/context/ai-workflow-rules.md`: how you must work
6. `/context/progress-tracker.md`: **which unit is current** and its acceptance criteria

## Stack
Next.js (App Router) + TypeScript (strict) + Supabase (Postgres, Auth, RLS) + Tailwind CSS + shadcn/ui + Zod. Deployed on Vercel. Package manager: npm.

## Non-negotiable rules
1. **One unit at a time.** Work only on the current unit in `progress-tracker.md`. Don't start the next one until the owner confirms the current one is done.
2. **Stay in scope.** Don't build anything listed as out of scope or not in the overview. Propose, don't add.
3. **When the spec is silent, ask.** Never guess about money, stock, permissions, or business rules. Record decisions in the tracker.
4. **Protect the invariants** in `architecture.md`. The big ones:
   - Every business table has `shop_id` and RLS.
   - Stock = sum of append-only `stock_movements`; never an editable number.
   - Sales are voided, never deleted; sales are created only through `record_sale`.
   - Money is integer centavos.
   - Staff never see cost, profit, or other staff's sales (not even in network responses).
   - The service role key stays on the server.
5. **Security before UI.** RLS and tests come before the screen that uses them.
6. **No new dependencies** without the owner's approval.
7. **Verify before moving on:** acceptance criteria met, `npm run typecheck`, `npm run lint`, `npm test`, SQL tests, and the manual phone checklist.
8. **After each unit:** update `progress-tracker.md`, make one commit (`unit N: description`), and give a short plain-language summary.
9. **Skills are guidance, context files are law.** If an installed skill conflicts with `/context/`, follow `/context/` and ask the owner. No new skills, MCP servers, or plugins without approval.

## Working with the owner
The owner is the product owner and a junior developer. Use plain language, explain trade-offs by practical impact, be honest about limits, and push back politely when asked to break the scope or an invariant. Keep them in control: ask before schema changes, auth changes, or anything in the "Hard stops" list in `ai-workflow-rules.md`.

## Commands (set up in Unit 1)
- `npm run dev`: local development
- `npm run build`: production build
- `npm run typecheck`: TypeScript check
- `npm run lint`: lint
- `npm test`: unit tests

## Secrets
Never commit `.env.local`. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. Keep `.env.example` with names only.