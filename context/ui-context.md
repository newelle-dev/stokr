# UI Context

**Status:** the palette and fonts below are a proposal. The owner should approve or change them before Unit 3.

## Design principles
1. **Speed at the counter beats beauty.** The sell screen must feel instant and be usable one-handed.
2. **Calm and trustworthy.** This handles someone's money. Clear, quiet, no clutter.
3. **Numbers first.** Owners care about totals and problems; show them big and clear.
4. **Phone first.** Design at 360px, then tablet, then desktop.

## Color tokens
Use semantic names (matching shadcn/ui CSS variables). Components never use raw hex values.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#0B1210` | Page background |
| `--foreground` | `#0F1A17` | `#ECF3F0` | Main text |
| `--muted` | `#F1F5F3` | `#16211E` | Subtle panels |
| `--muted-foreground` | `#5B6B66` | `#9DB0A9` | Secondary text |
| `--border` | `#DCE5E1` | `#26342F` | Borders, dividers |
| `--primary` | `#0F766E` | `#2DD4BF` | Main buttons, links, active items |
| `--primary-foreground` | `#FFFFFF` | `#04211D` | Text on primary |
| `--success` | `#15803D` | `#4ADE80` | Positive profit, completed |
| `--warning` | `#B45309` | `#FBBF24` | Low stock, needs attention |
| `--destructive` | `#B91C1C` | `#F87171` | Void, missing stock, errors |
| `--card` | `#FFFFFF` | `#111A17` | Cards |

Rules:
- Never use color alone to carry meaning; pair it with text or an icon (for example "Low stock" with a warning icon).
- Text contrast must meet WCAG AA.
- Light mode is the default. Dark mode follows the device setting.

## Typography
- Font: **Inter**, falling back to the system sans-serif.
- Base text: 16px minimum on mobile (smaller text makes iPhones zoom into form fields).

| Role | Size / weight |
|---|---|
| Page title | 24px / 600 |
| Section title | 18px / 600 |
| Body | 16px / 400 |
| Small / helper | 14px / 400 |
| Big number (dashboard) | 32px / 700, tabular numbers |

- Numbers and money use tabular figures so columns line up.

## Spacing and radius
- Spacing follows Tailwind's 4px scale. Prefer 8, 12, 16, 24 between elements. Page padding: 16px on mobile, 24px on larger screens.
- Border radius scale:

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Badges, small inputs |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 14px | Cards |
| `--radius-xl` | 20px | Sheets, dialogs |
| `--radius-full` | 9999px | Avatars, pills |

## Component conventions
- **Touch targets:** at least 44 x 44px. Primary actions at the counter are at least 48px tall.
- **Buttons:** one primary button per screen area. Destructive actions (void) use the destructive style and always ask for confirmation with a reason.
- **Money:** `<MoneyText />` shows `₱1,234.50`, right-aligned in tables, tabular figures.
- **Badges:** `Cash` / `GCash` for payment; `Low stock` (warning); `Voided` (destructive); `Completed` (success).
- **Forms:** label above field, helper text below, error text in destructive color next to the field. Numeric fields open the numeric keypad on phones.
- **Empty states:** a short sentence plus the one action that fixes it ("No products yet. Add your first product").
- **Loading:** skeletons, not spinners, for lists and dashboard cards.
- **Feedback:** a toast after every successful action ("Sale recorded"). Errors say what to do next, in plain language.
- **Confirmation:** voiding a sale, accepting a stock count, and disabling a staff account always need an explicit confirm step.

## Layout patterns
- **Staff layout (phone):** top bar with branch name and user menu; a bottom tab bar with `Sell` and `My sales`.
- **Owner layout:** bottom tab bar on phone (Dashboard, Sales, Stock, More). On tablet and desktop, a left sidebar with all owner pages.
- **Sell screen:**
  - Search box at the top; product list or grid below (large tappable rows with name and price).
  - A sticky bottom bar shows item count and total with a **Review sale** button.
  - Review step: items with quantity steppers, Cash / GCash toggle, **Confirm sale** button.
  - Success: a clear confirmation and a one-tap **New sale** button.
  - Tapping a product adds one; tapping again adds another. A recorded sale must take only a few taps for a typical purchase.
- **Dashboard:** a stack of cards in this order: Today's sales and profit, Low stock, Sales per staff, Missing stock. A branch filter sits at the top (All branches by default).
- **Tables on phones:** collapse to stacked cards, never horizontal scroll.
- **Max content width:** 1100px centered on large screens.

## Tone of text
Short, friendly, plain words. Say "Sale recorded" and "Out of stock at this branch", not technical messages.

## Installable app
- Name: "Stokr". Theme color: `--primary`. Standalone display mode.
- Provide 192px and 512px icons and a maskable icon.