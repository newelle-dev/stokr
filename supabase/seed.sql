-- supabase/seed.sql
-- Seed script for Unit 1: 1 shop in the first shop's shape (2 branches), 1 owner, 1 staff, sample inventory.

-- 1. Create Demo Shop
insert into public.shops (id, name, created_at)
values ('00000000-0000-0000-0000-000000000001', 'Cloud Haven Vape Shop', now())
on conflict (id) do nothing;

-- 2. Create 2 Branches
insert into public.branches (id, shop_id, name, is_active, created_at)
values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Main Branch', true, now()),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Annex Branch', true, now())
on conflict (id) do nothing;

-- 3. Create Auth Users and Profiles
-- Note: inserting mock users into auth.users allows running seed/tests in local or dev Supabase environment
insert into auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
)
values
  (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000000',
    'owner@stokr.local',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Shop Owner"}',
    false,
    'authenticated',
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000200',
    '00000000-0000-0000-0000-000000000000',
    'staff@stokr.local',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Staff Member 1"}',
    false,
    'authenticated',
    'authenticated'
  )
on conflict (id) do nothing;

-- Profiles
insert into public.profiles (id, shop_id, full_name, role, branch_id, is_active, created_at)
values
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', 'Shop Owner', 'owner', null, true, now()),
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000001', 'Staff Member 1', 'staff', '00000000-0000-0000-0000-000000000010', true, now())
on conflict (id) do nothing;

-- 4. Sample Products
insert into public.products (
  id,
  shop_id,
  name,
  category,
  selling_price_centavos,
  cost_price_centavos,
  low_stock_threshold,
  is_active,
  created_at
)
values
  (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000001',
    'Relx Pod Menthol Plus',
    'cartridge',
    25000, -- ₱250.00
    18000, -- ₱180.00
    10,
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000001',
    'Aegis Legend 2 Mod',
    'device',
    280000, -- ₱2,800.00
    210000, -- ₱2,100.00
    3,
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000303',
    '00000000-0000-0000-0000-000000000001',
    'Pastry Vapor Salt 30ml',
    'liquid',
    35000, -- ₱350.00
    22000, -- ₱220.00
    5,
    true,
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000304',
    '00000000-0000-0000-0000-000000000001',
    'Organic Cotton Bacon Prime',
    'other',
    20000, -- ₱200.00
    12000, -- ₱120.00
    5,
    true,
    now()
  )
on conflict (id) do nothing;

-- 5. Opening Stock Movements
insert into public.stock_movements (
  id,
  shop_id,
  branch_id,
  product_id,
  quantity_change,
  reason,
  note,
  created_by,
  created_at
)
values
  -- Main Branch Opening Stock
  (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000301',
    50,
    'opening',
    'Initial count',
    '00000000-0000-0000-0000-000000000100',
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000402',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000302',
    8,
    'opening',
    'Initial count',
    '00000000-0000-0000-0000-000000000100',
    now()
  ),
  -- Annex Branch Opening Stock
  (
    '00000000-0000-0000-0000-000000000403',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000301',
    30,
    'opening',
    'Initial count',
    '00000000-0000-0000-0000-000000000100',
    now()
  )
on conflict (id) do nothing;
