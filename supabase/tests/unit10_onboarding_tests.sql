-- Unit 10 onboarding tests. Run in the Supabase SQL Editor ("Run without RLS").
-- Everything runs inside BEGIN/ROLLBACK. Any failed check raises an exception.
-- Adjust the auth.users insert if your project requires more columns.

begin;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner1@new.test'),
  ('22222222-2222-2222-2222-222222222222', 'owner2@new.test');

-- Act as owner 1.
select set_config('request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated', 'email', 'owner1@new.test')::text, true);
set local role authenticated;

select public.create_shop_for_new_owner(
  'Cloud Haven', 'Main',
  '[{"name":"Mango Salt 30ml","category":"liquid","sellingPrice":45000,"costPrice":21050,"lowStockThreshold":5}]'::jsonb
);

-- A second onboarding run must fail.
do $$
begin
  perform public.create_shop_for_new_owner('Second', 'Main', '[]'::jsonb);
  raise exception 'CHECK FAILED: second onboarding created a shop';
exception when others then
  if sqlerrm <> 'already_onboarded' then
    raise exception 'CHECK FAILED: wrong error on second onboarding: %', sqlerrm;
  end if;
end $$;

-- Owner 2 cannot see owner 1's products.
select set_config('request.jwt.claims',
  json_build_object('sub', '22222222-2222-2222-2222-222222222222', 'role', 'authenticated', 'email', 'owner2@new.test')::text, true);
do $$
begin
  if (select count(*) from public.products where name = 'Mango Salt 30ml') <> 0 then
    raise exception 'CHECK FAILED: another shop can read products';
  end if;
end $$;

-- Owner 2 cannot insert a shop directly.
do $$
begin
  insert into public.shops (name, store_code) values ('Sneaky', 'sneaky1');
  raise exception 'CHECK FAILED: direct shop insert allowed';
exception when insufficient_privilege then
  null;
end $$;

reset role;

-- Checks as the database owner.
do $$
declare
  v_code text;
begin
  select store_code into v_code from public.shops where name = 'Cloud Haven';
  if v_code !~ '^[abcdefghjklmnpqrstuvwxyz23456789]{6}$' then
    raise exception 'CHECK FAILED: store code format: %', v_code;
  end if;
  if (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111' and role = 'owner') <> 1 then
    raise exception 'CHECK FAILED: owner profile missing';
  end if;
  if (select count(*) from public.stock_movements sm join public.shops s on s.id = sm.shop_id where s.name = 'Cloud Haven') <> 0 then
    raise exception 'CHECK FAILED: onboarding wrote stock movements';
  end if;
  if (select count(*) from public.activity_log al join public.shops s on s.id = al.shop_id where s.name = 'Cloud Haven') < 3 then
    raise exception 'CHECK FAILED: activity log entries missing';
  end if;
end $$;

rollback;

select 'unit10 onboarding tests passed' as result;
