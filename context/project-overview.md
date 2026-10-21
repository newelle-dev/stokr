# Project Overview

## App name
Stokr

## What this is
A web app that replaces notebook and Excel logs for small vape shops. Staff record each sale on their phone in a few taps. The owner sees real stock, real profit, who sold what, and where stock is going missing, from any device, with no special hardware.

## Why it exists
The first customer is a friend's vape shop with 2 branches and 1 staff member per branch. They track sales and stock in notebooks (sometimes Excel). Their pains:
- Stock goes missing and nobody notices until much later
- The owner can't fully trust what staff write down
- Low-stock checks are done by hand
- Profit and sales totals are worked out by hand

## Goals
1. **Replace the notebook completely** at the first shop.
2. **Make missing stock visible** by comparing what the system expects with what is physically counted.
3. **Show real profit**, not only sales totals.
4. **Be proud to show it:** a real portfolio piece that can later be sold to other vape shops.

## Who uses it
| Role | Who | What they can do |
|---|---|---|
| Owner | The shop owner (also sometimes works the counter) | Everything, across all branches |
| Staff | One per branch | Record sales at their assigned branch and view their own sales. Never sees cost or profit. |

The first shop is the only shop in the system at first, but data separation between shops is built in from day one so more shops can be added later.

## Daily flow
1. **Staff** opens the app on their own phone (or a shop tablet), picks products, sets quantities, chooses Cash or GCash, confirms. Stock goes down automatically.
2. **Owner** opens the dashboard: today's sales and profit, low-stock items, sales per staff, and missing stock.
3. **Owner** restocks when stock arrives (and updates cost price if the supplier price changed), and occasionally does a physical stock count to compare against the system.
4. **Owner** corrects mistakes by voiding a sale (staff cannot edit or delete sales).

## Version 1 features (in scope)
1. Login with two roles (Owner, Staff). Each person has their own login, including the owner. Owner logs in via email; staff log in via store code + username (with internal hidden email address).
2. Branches (the first shop has 2). Staff are assigned to one branch; the owner can reassign them.
3. Products: name, category, selling price, cost price, low-stock level. Owner only.
4. Opening stock, restock, and manual stock adjustments with a note. Owner only. Branch-to-branch moves are done as two adjustments with a note.
5. **Record a sale:** multiple items, quantity per item, payment method (Cash or GCash). Fast and phone-first.
6. Automatic stock reduction per sale.
7. Sale correction: owner voids a sale with a reason (never deleted). If needed, owner records a replacement sale linked to the original.
8. **Stock count:** owner enters physical counts per branch and the app shows the gap against expected stock. Owner can accept the count to correct stock.
9. **Owner dashboard:** (in this order) today's sales and profit, low-stock list, sales per staff, missing stock.
10. Sales list with filters (date, branch, staff, status).
11. Activity log of important changes (who, what, when).
12. Installable to the phone home screen; works on phone and tablet.
13. Online only.

## Out of scope for Version 1 (do not build)
- Public signup, pricing plans, billing
- Offline mode
- Email or push notifications (low stock is a dashboard list only)
- Product variants (size, strength, color)
- Spreadsheet or CSV import
- Cost tracking per delivery batch
- Discounts and returns as dedicated features
- Barcode scanning, receipt printing, GCash integration, any hardware
- A dedicated branch-to-branch transfer feature
- Report export (PDF or Excel)
- Customer accounts or loyalty
- Multiple shops using the app at the same time (the data model supports it; no UI for it yet)

## Key decisions already made
- Only the owner can add products, add stock, restock, or correct sales.
- Staff cannot edit or delete recorded sales.
- Payment methods: Cash and GCash only.
- Each product has one current cost price, updated by the owner on restock. Each sale saves the cost at the time of sale, so past profit never changes.
- One item = one price (no variants).
- Both branches have reliable internet, so no offline mode.
- Build data separation between shops now; no signup or billing yet.

## User journey: first week with the real shop
1. Owner creates the shop, branches, products, and staff logins; enters starting stock after a first physical count.
2. **"Run both" week:** staff record every sale in the app AND the notebook. The owner compares them and reports anything slow, confusing, or wrong.
3. Staff stop using the notebook.

## Success criteria
After two weeks of real use at the first shop:
1. Staff have **stopped using the notebook completely**.
2. The owner **checks the dashboard every day**.

Supporting checks:
- Recording a sale takes only a few taps and feels as fast as writing a line.
- No sale is ever lost or double-counted.
- Stock shown always equals the sum of recorded movements.
- At least one stock count has been done and the gap report was understandable to the owner.

## Open questions (to ask the owner of the first shop)
1. How often will they do a physical stock count?
2. How often do discounts or returns happen at the counter?
3. How often do supplier prices change?
4. ~Do staff have email addresses to log in with?~ (Resolved: Staff log in using store code + username; internal dummy email `username.store_code@staff.stokr.invalid` is generated and hidden).

## Assumptions to confirm
- Currency is Philippine pesos (PHP); timezone is Asia/Manila.
- A sale is never blocked when system stock is zero or negative; it is flagged on the dashboard instead.
- Product categories: liquid, device, cartridge, other.