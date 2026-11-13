-- Store code made from the shop name: lowercase letters and digits of the name
-- (max 14) plus 4 random characters. Example: "Ink Hale" -> "inkhalex7k2".
-- Existing shops keep their codes. The old generate_store_code() is kept so
-- nothing else breaks. create_shop_for_new_owner is re-created unchanged except
-- for the store code call.

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

create or replace function public.create_shop_for_new_owner(
  p_shop_name text,
  p_branch_name text,
  p_products jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt() ->> 'email', 'Owner');
  v_shop_id uuid;
  v_store_code text;
  v_branch_id uuid;
  v_product jsonb;
  i int;
begin
  if v_uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_onboarded' using errcode = 'P0001';
  end if;

  if p_shop_name is null or length(trim(p_shop_name)) = 0 or length(p_shop_name) > 80 then
    raise exception 'invalid_shop_name' using errcode = '22023';
  end if;
  if p_branch_name is null or length(trim(p_branch_name)) = 0 or length(p_branch_name) > 80 then
    raise exception 'invalid_branch_name' using errcode = '22023';
  end if;
  if p_products is null or jsonb_typeof(p_products) <> 'array' or jsonb_array_length(p_products) > 50 then
    raise exception 'invalid_products' using errcode = '22023';
  end if;

  -- Retry on the rare store code collision; the unique constraint is the real guard.
  for i in 1..5 loop
    begin
      insert into public.shops (name, store_code)
      values (trim(p_shop_name), public.generate_store_code(p_shop_name))
      returning id, store_code into v_shop_id, v_store_code;
      exit;
    exception when unique_violation then
      if i = 5 then
        raise exception 'could_not_generate_store_code' using errcode = 'P0001';
      end if;
    end;
  end loop;

  -- Owner profile: the allow flag is transaction-local and only this function sets it.
  perform set_config('stokr.allow_owner_onboarding', 'true', true);
  insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active)
  values (v_uid, v_shop_id, v_email, 'owner', null, true);
  perform set_config('stokr.allow_owner_onboarding', 'false', true);

  insert into public.activity_log (shop_id, actor_id, action, entity_type, entity_id, details)
  values (v_shop_id, v_uid, 'shop_created', 'shop', v_shop_id::text, jsonb_build_object('name', trim(p_shop_name)));

  -- Branch and product inserts are logged by tr_log_branch_activity and tr_log_product_activity.
  insert into public.branches (shop_id, name)
  values (v_shop_id, trim(p_branch_name))
  returning id into v_branch_id;

  for v_product in select * from jsonb_array_elements(p_products) loop
    insert into public.products (
      shop_id, name, category, selling_price_centavos, cost_price_centavos, low_stock_threshold
    )
    values (
      v_shop_id,
      trim(v_product ->> 'name'),
      v_product ->> 'category',
      (v_product ->> 'sellingPrice')::bigint,
      (v_product ->> 'costPrice')::bigint,
      (v_product ->> 'lowStockThreshold')::int
    );
  end loop;

  return v_store_code;
end;
$$;

revoke all on function public.create_shop_for_new_owner(text, text, jsonb) from public, anon;
grant execute on function public.create_shop_for_new_owner(text, text, jsonb) to authenticated;
