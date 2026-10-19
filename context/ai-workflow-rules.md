# AI Workflow Rules

These rules are for the coding agent. They are not optional.

## The owner
The owner is the product owner and a junior developer who wants to learn and be proud of the result. Explain what you did in plain language. Keep summaries short. Never make product decisions for them: ask.

## At the start of every session
1. Read `AGENTS.md`, then every file in `/context/` in this order: `project-overview.md`, `architecture.md`, `code-standards.md`, `ui-context.md`, `ai-workflow-rules.md`, `progress-tracker.md`.
2. Open `progress-tracker.md` and find the **current unit**. Work only on that unit.
3. Tell the owner in 2-3 sentences which unit you're on and what "done" looks like for it.

## Scoping rules
- Build **one unit at a time**, in the order listed in `progress-tracker.md`.
- Do not start the next unit until the current one is verified and the owner agrees it's done.
- Do not add features, pages, fields, or "nice to haves" that are not in `project-overview.md`. If you think something is missing, propose it and wait.
- Anything listed under "Out of scope" is forbidden in v1, even if it looks easy.
- Do not refactor unrelated code while working on a unit.
- No new dependencies without the owner's approval. Say what it is, why it's needed, and what the alternative is.

## When the spec is silent or unclear
- **Stop and ask.** Do not guess about business rules, permissions, money, or stock.
- Ask one clear question at a time and offer your recommended answer.
- Once the owner decides, record the decision in `progress-tracker.md` under "Decisions log" before continuing. If it changes the spec, also update the relevant context file.

## Before writing code for a unit
1. Restate the unit's goal and acceptance criteria.
2. List the files you plan to create or change.
3. For anything touching the database, say which invariants in `architecture.md` apply.
4. Wait for the owner's go-ahead if the plan involves schema changes or touching authentication.

## While building
- Follow `code-standards.md` and `ui-context.md` exactly.
- Respect all invariants in `architecture.md`. If a task seems to require breaking one, stop and ask.
- Security first: RLS before UI. A screen is not finished if its data isn't protected in the database.
- Never put real shop data, passwords, or keys in code, tests, or the repo.

## Installed skills
- Skills (Supabase, shadcn/ui, Next.js/React best practices) are general guidance only. The context files in `/context/` are this project's rules.
- If a skill's advice conflicts with `project-overview.md`, `architecture.md`, `code-standards.md`, or any invariant, the context files win. Stop and ask the owner before following the skill.
- Never install a new skill, MCP server, or plugin without the owner's approval. Say what it is, who publishes it, and what it can access.
- Any database connection (including MCP) is allowed only against the development project with fake data, never the project holding real shop data.

## Verification before moving on
A unit is done only when **all** of these pass:
1. Every acceptance criterion for the unit in `progress-tracker.md` is met, and you've demonstrated each one.
2. `npm run typecheck`, `npm run lint`, and `npm test` pass.
3. For database work: the SQL tests in `supabase/tests/` pass, including checks as a **staff** user and as a user from a **different shop**.
4. For UI work, the manual phone checklist passes (below).
5. No `console.log`, no `TODO` left without a matching entry in the tracker.
6. The owner has seen it working and says it's done.

### Manual phone checklist (every UI unit)
- Works at 360px wide on a real phone; no sideways scrolling
- All tap targets at least 44px
- Loading, empty, and error states exist
- Staff account: cannot see cost, profit, other staff's sales, or owner pages (check the page AND the network responses)
- Owner account: can reach everything intended
- Money shows as ₱ with two decimals

## After each unit
1. Update `progress-tracker.md`: tick the unit, note what changed, list new open questions, and set the next unit as current.
2. Make one clear git commit for the unit (message: `unit N: short description`).
3. Give the owner a short plain-language summary: what now works, how to try it, and what's next.

## Communication style
- Plain language, no jargon. If you must use a technical word, explain it in a few words.
- Be honest about limits, risks, and things you're unsure of.
- Push back (politely) if the owner asks for something that breaks an invariant or the scope.
- If something takes longer than expected or a unit is bigger than planned, say so immediately.

## Hard stops (always ask first)
- Deleting data or migrations
- Changing auth, roles, or RLS policies
- Anything that would send cost or profit data to a staff user
- Adding a paid service or a new account
- Changing the scope, the data model, or an invariant

