import { beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    const i = t.indexOf('=');
    if (!t || t.startsWith('#') || i === -1) continue;
    const key = t.slice(0, i).trim();
    if (!process.env[key]) process.env[key] = t.slice(i + 1).trim();
  }
}

const creds = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'scratch', 'dev_credentials.local.json'), 'utf-8'),
);

async function signIn(who: { email: string; password: string }): Promise<SupabaseClient> {
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword(who);
  expect(error).toBeNull();
  return client;
}

describe('Unit 7 dashboard source tables are owner-only', () => {
  let owner: SupabaseClient;
  let staff: SupabaseClient;

  beforeAll(async () => {
    owner = await signIn(creds.owner);
    staff = await signIn(creds.staff);
  });

  it('staff reading sales and sale_items gets no rows', async () => {
    const sales = await staff.from('sales').select('id, total_cost_centavos');
    expect(sales.data ?? []).toEqual([]);
    const items = await staff.from('sale_items').select('id, unit_cost_centavos');
    expect(items.data ?? []).toEqual([]);
  });

  it('staff reading stock_counts and products (cost) gets no rows', async () => {
    const counts = await staff.from('stock_counts').select('id');
    expect(counts.data ?? []).toEqual([]);
    const products = await staff.from('products').select('id, cost_price_centavos');
    expect(products.data ?? []).toEqual([]);
  });

  it('staff my_sales view has no cost or profit column', async () => {
    const mine = await staff.from('my_sales').select('*').limit(1);
    expect(mine.error).toBeNull();
    for (const row of mine.data ?? []) {
      expect(Object.keys(row).join(',')).not.toMatch(/cost|profit/);
    }
  });

  it('owner can read sales and stock levels', async () => {
    const sales = await owner.from('sales').select('id, total_cost_centavos').limit(1);
    expect(sales.error).toBeNull();
    const stock = await owner.from('stock_levels').select('product_id').limit(1);
    expect(stock.error).toBeNull();
  });
});
