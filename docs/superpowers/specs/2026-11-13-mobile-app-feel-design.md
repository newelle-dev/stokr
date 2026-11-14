# Mobile app feel: design

Date: 2026-11-13. Status: draft, waiting for owner approval.

## Intent and why
Stokr is used on phones: staff record sales at the counter, the owner checks stock and profit. Today the phone view feels like a website: six crowded owner tabs, no bottom bar for staff, two different headers, plain-page forms. The owner wants it to **feel like a mobile app**, look **consistent** on every screen, and have a **better structure**, starting with how many items the navigation holds.

## Goals
- Owner phone bottom bar: **Dashboard, Sales, Stock, More** (confirmed by owner). Products, Team, Settings, Reports live under More.
- Staff phone bottom bar: **Sell, My sales** (my call; owner confirmed only the owner bar). An owner using the staff view gets the same bar plus a way back to the owner area.
- One top bar, one height, same pattern on owner and staff screens; sub-pages show a back arrow and a page title.
- "More" opens as a bottom sheet.
- Forms and confirmations (existing `Modal`) show as bottom sheets on phones and stay centered dialogs on tablet and desktop.
- Shared page pieces (page header, section, list row) so every screen has the same spacing, type and radius from `ui-context.md`.
- Phone-safe layout: bottom padding for the iPhone home bar, sticky bars that do not cover content, 44px touch targets (48px for counter actions).
- Option 3 extras: CSS page transitions, pull-to-refresh on list screens, swipe-back on sub-pages.

## Non-goals
- No change to data, schema, auth, permissions or what staff can see.
- No offline mode, no push notifications, no new screens or features.
- No new dependencies (AGENTS.md needs owner approval); everything uses Tailwind, CSS and the existing Base UI dialog.
- Desktop layout (left sidebar) stays as is, except sharing the same nav list so tabs and sidebar cannot drift.

## Anti-goals (failure even if it "works")
- A swipe or pull gesture that records, voids or changes money or stock by accident.
- Any change that lets staff see cost, profit or other staff's sales.
- Motion that slows the sell screen, or ignores `prefers-reduced-motion`.
- Breaking the Modal rule that "temporary password" dialogs cannot be dismissed by tapping outside or pressing escape.

## Constraints
- `ui-context.md` is law: phone first at 360px, tokens only (no raw hex), 16px base text, skeletons not spinners, tables collapse to cards.
- Owner pages keep `requireOwnerPage()` in each `page.tsx` (invariant 17); layouts are structure only.
- Light mode default, dark follows the device.
- Installed (standalone) web app: safe-area insets matter and there is no browser back button, so in-app back must always work.
- Work happens after Unit 11 is done; my call is to file it under Unit 9 (phone polish) rather than a new unit. Owner can say otherwise.

## Approaches considered
1. **Minimal fix**: four owner tabs, staff bottom bar, one header height. Smallest, but pages still feel like websites.
2. **App-style shell**: option 1 plus More sheet, back-arrow sub-pages, modals as phone sheets, shared page pieces, safe-area padding. Was my recommendation.
3. **Full app feel** (chosen by owner): option 2 plus page transitions, pull-to-refresh and swipe gestures. Largest; gestures and motion are the risky part, so see Decisions.

## Decisions
Made by the owner: option 3; owner tabs Dashboard / Sales / Stock / More.

My calls (owner can change):
- Staff tabs Sell / My sales.
- Gestures are limited to navigation and refresh. **No swipe actions on sale rows, cart lines or any money or stock control.**
- Swipe-back only on sub-pages (Products, Team, Settings, Stock opening, Stock count, Replace sale), never on the sell screen's cart or review step.
- Pull-to-refresh only on read-only list screens (Dashboard, Sales, My sales, Stock); it re-runs the same server read the screen already does. The dashboard keeps its 30-second auto refresh.
- Transitions are short CSS fades or slides (about 150-200ms), switched off under `prefers-reduced-motion`.
- The tab list lives in one place and feeds the phone bar, the More sheet and the desktop sidebar. The disabled "Reports / Unit 5" placeholder does not show on phones.
- The sell screen's own sticky "Review sale" bar sits above the tab bar, not under it.

More calls, added after the builder check:
- **Route map (owner).** Dashboard tab: `/dashboard`. Sales tab: `/sales` (all-staff list), with `/sales/replace/[saleId]` as its sub-page. Stock tab: `/stock`, with `/stock/opening` and `/stock/count` as sub-pages. More sheet: Sell (the staff sell screen), Products, Team, Settings, Sign out. Reports is not a real route yet, so it is hidden on phones until it exists (and the "Unit 5" desktop placeholder is untouched).
- **Owner in the staff view (superseded 2026-11-14).** Owners now get the same bar as staff: Sell, My sales and **Profile** (`/me`). Owners reach the dashboard from the Dashboard button in the top bar on Sell pages. Decided by the product owner; see the decisions log.
- **Modals.** All `Modal` uses become bottom sheets on phones, including void confirmations. The temporary-password dialog stays a centered dialog on phones, with no drag-to-close and the existing outside-tap and escape block. Sheets with form fields do not close on drag.
- **Unsaved input.** Swipe-back is on read-only sub-pages only (Settings, Products, Team). It is **off** on form pages (Stock count, Stock opening, Replace sale) and on the sell screen, so no half-entered data can be lost by a swipe. Their back arrow stays and works as a normal tap.
- **Back target.** The back arrow goes to a fixed parent route per page (a small map), not `router.back()`, so it works after a refresh or a deep link in the installed app.
- **Installed mode.** The manifest, icons and apple-touch-icon already exist (tracker, Unit 9). The builder checks `viewport-fit=cover` and the apple web-app meta tags and adds them if missing; that is in scope because safe-area padding depends on it.
- **Sequencing.** One unit, built in two phases: (1) shell: nav, headers, sheets, shared pieces; (2) motion: transitions, pull-to-refresh, swipe-back. The plan also updates the tracker and writes the unit contract. Phase 2 can be dropped or delayed without breaking phase 1.

## Left to the builder
- Exact icons, sheet animation, drag-to-close handling, and file layout.
- How pull-to-refresh and swipe-back are implemented without a library (touch events or CSS overscroll), and testing them on iOS Safari and Android Chrome.
- Whether `Modal` gets a variant prop or switches by screen width.
- Loading skeletons for screens that lack them, as part of the same pass.

## How we know it works
Phone checklist on one iPhone-sized and one Android-sized screen (360px width included): every tab reachable one-handed, sheets open and close, back works in installed mode, no horizontal scroll, a typical sale still takes the same few taps, staff network responses unchanged.
