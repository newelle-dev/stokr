# Consistent mobile pages: design

Date: 2026-11-14. Status: draft, waiting for owner approval.
Follows `2026-11-13-mobile-app-feel-design.md` (the app shell: tab bar, top bar, sheets). This one is about the page content inside the shell.

## Intent and why
The shell feels like an app, but the pages inside it still feel like a website and differ from each other. The owner wants every owner page to feel like a phone app and look and behave the same way. Phone and tablet come first; desktop is later.

Found today:
- Products and Team have no `PageHeader`; their lists draw their own headings (`text-xl` vs `text-lg`). Branches shows a page title and then a second heading.
- Products, Branches and Team wrap the list in a `p-6` card, and the rows are cards inside it (box in a box).
- Inputs are 40px, row buttons 32px, some text 10-12px. `ui-context.md` says 44px targets and 16px base text.
- "Add" is a small button top-right; each row has a strip of small Edit/Deactivate buttons.

## Goals
- Every owner page uses the same pieces: `PageHeader`, no outer card, tappable rows, a floating "+" for the main add action, a bottom sheet for row actions.
- Pages covered: Products, Branches, Team, Stock, Owner Sales, Shop details, Replace sale.
- Touch targets 44px, base text 16px, page padding 16px, tokens only.
- Same empty state, same loading skeleton pattern on each page.

## Non-goals
- No desktop work. From `lg` (1024px) up, tables, sidebar-era layouts and top-right buttons stay exactly as they are.
- No change to data, schema, auth, permissions, or what staff can see.
- No new screens, features or dependencies.
- Staff pages (Sell, My sales) are not restyled, only checked against the new look.

## Anti-goals
- Changing a confirmation step: void, disable staff, accept count and the temporary-password dialog keep their current confirm and dismiss rules. Only where they are opened from changes.
- Hiding information the owner has today on a phone (cost price, thresholds, store code, status) just to make rows shorter.
- A floating button that covers the last row or the tab bar.

## Constraints
- `ui-context.md` is law. Owner pages keep `requireOwnerPage()` in each `page.tsx`.
- Existing `Modal` is the sheet; no new dialog library.
- Breakpoints: the existing sidebar and bottom tab bar switch at `md` and stay as they are (shell untouched).

## Approaches considered
1. **Shared pieces, then move each page onto them (chosen).** Largest up front; pages cannot drift apart afterwards.
2. **Restyle each page on its own.** Faster per page, but copies the same classes four times, which caused today's inconsistency.
3. **Only Products, Branches, Team.** Smallest, but Stock, Sales, Shop would still differ.

## Decisions
Made by the owner: option 1; "+" button with tap-a-row-for-actions (not per-row buttons); phone and tablet first, desktop later.

My calls (owner can change):
- New pieces in `components/shell/`: `ListRow` (name, detail line, badge, chevron), `Fab` (floating "+"), `RowActionSheet` (Edit, Deactivate and similar, built on `Modal`).
- The phone/tablet pattern applies below `lg`, not just below `md`. So an iPad gets rows and the "+" button too. At `lg` and up the current tables and buttons are untouched.
- The "+" sits above the tab bar and the home-bar safe area on phones; bottom-right of the content on tablet where there is no tab bar. Lists get bottom padding so the last row is never covered.
- Search and filter chips stay at the top of Products and Stock, with 44px height.
- Rows show the same information the cards show today. Secondary values (cost, threshold) go on the detail line; if a row would get too long, they show in the row's sheet header.
- Stock keeps its per-row Adjust and Restock, but through the row sheet. Opening stock and Count remain reachable from More, as today.
- Confirm and form modals are unchanged; the row sheet just opens them.
- Order of work: shared pieces and Products first (proves the pattern), then Branches, Team, Shop, Sales, Replace sale, Stock last (largest file).
- Tracker and `ui-context.md` get updated as part of the unit.

More calls, added after the builder check (owner can change):
- **Which pieces each page gets.**
  - List pages with an add action get `ListRow` + `Fab` + `RowActionSheet`: Products (add product), Branches (add branch), Team (add staff).
  - Stock: `ListRow` + `RowActionSheet` (Adjust, Restock); no "+" because stock only changes through adjust, restock and count.
  - Owner Sales: `ListRow` + `RowActionSheet` (Void sale, Replace sale); **no "+"**, because sales are created only through `record_sale` on the Sell screen. Void keeps its reason + confirm step; it is just opened from the sheet. Rows today have no tap behaviour, so nothing competes with the sheet.
  - Shop details and Replace sale are forms, not lists: they get `PageHeader`, 16px spacing, 44px controls and a skeleton, and nothing else.
- **Rows and tables both render below and above `lg`, switched by CSS only** (as Products and Stock already do). No client breakpoint hook. Owner pages only, so staff network responses are not affected. Tests that look for text must scope to one tree.
- **768 to 1023px.** The sidebar shows (shell unchanged) and there is no tab bar. Content uses the row list, and the "+" sits bottom-right of the content area beside the sidebar. Check 768px as sidebar + rows. Phones (under 768px) are tab bar + rows + "+" above the tab bar.
- **Uncommitted work in the tree** (nav, headers, More, stock schema) belongs to the earlier shell work, not this unit. This unit starts after that is committed, so there are no conflicting edits.
- **Unit number and slicing.** Filed under Unit 9 as part I (phone polish), like part H, rather than a new unit. Built as three mergeable phases, each checked on its own: (1) shared pieces + Products; (2) Branches, Team, Shop details, Owner Sales, Replace sale; (3) Stock. The plan writes the unit contract and updates the tracker.

## Left to the builder
- Component APIs and file layout; whether `RowActionSheet` stacks over an action's own modal or closes first.
- Skeleton shapes per page.
- Exact FAB size, position and icon.
- Tests: unit tests for pure helpers; page checks at 360px, 768px and 1024px.

## How we know it works
At 360px and 768px: every page has the same title, spacing and row style, no horizontal scroll, every control is at least 44px, add and row actions reachable one-handed, last row never hidden under the "+" or tab bar. At 1024px and up: pages look as they did before. Typecheck, lint, tests and build pass. Staff network responses are unchanged.
