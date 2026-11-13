# Name-based store code: plan

**Status:** migration written and committed (`supabase/migrations/20261113120000_store_code_from_name.sql`). **Not applied to the database.** Applying it and running the SQL tests below still need the owner's explicit go. Docker was not running, so the SQL tests have not been run.

## What changes
- A new store code is the shop name in lowercase (letters and digits only, cut to 14 characters) plus 4 random characters from the same alphabet as today. Example: `Ink Hale` becomes `inkhalex7k2`.
- If the shop name has no letters or digits (for example, only symbols or emoji), the base is `shop`.
- The result is at most 18 characters, so it passes the existing rule (3 to 20 lowercase letters or digits). The staff login form and the database check are unchanged.
- Existing shops keep their codes (`cloudhaven` for the sample shop).
- The retry on a taken code stays: up to 5 tries, then the same error as today.

## Decisions (my calls, you can change them)
- 14-character name cap: keeps codes short enough to type on a phone. The random part is 4 characters, about 1 million combinations per name.
- No hyphen: keeps the current validation. A hyphen would need a database and login-rule change.
- Store code stays fixed after it's made (invariant 22).

## Database change
One migration, `supabase/migrations/20261113120000_store_code_from_name.sql` (written; applying it needs the owner's go):
1. Add `generate_store_code(p_shop_name text)`. The old no-argument function stays, so nothing breaks.
2. Re-create `create_shop_for_new_owner` with one changed line. The rest is the latest version (`20261111140000_owner_onboarding_order.sql`), copied as is, including the `revoke` and `grant`.

```sql
create or replace function public.generate_store_code(p_shop_name text)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_base text;
  v_suffix text;
begin
  v_base := left(regexp_replace(lower(p_shop_name), '[^a-z0-9]', '', 'g'), 14);
  if v_base = '' then
    v_base := 'shop';
  end if;
  select string_agg(
    substr('abcdefghjklmnpqrstuvwxyz23456789', 1 + floor(random() * 32)::int, 1),
    ''
  )
  into v_suffix
  from generate_series(1, 4);
  return v_base || v_suffix;
end;
$$;
```

In `create_shop_for_new_owner`, the only change is in the insert:

```sql
values (trim(p_shop_name), public.generate_store_code(p_shop_name))
```

(Before: `public.generate_store_code()`.)

## Tests (after the go, run in the SQL Editor with "Run without RLS")
- `Ink Hale` gives a code starting `inkhale` and 10 characters long.
- `!!!` gives a code starting `shop`.
- A 30-letter name gives a base of 14 characters.
- The code only contains `a-z` and `2-9`.
- The code passes the check `^[a-z0-9]{3,20}$`.
- Two shops with the same name get different codes.

## Hard stops
- Applying the migration to the project needs your explicit go.
- Running the SQL in the Supabase SQL Editor is the owner's action, or an approved one through the database tool.
