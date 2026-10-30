import { describe, expect, it, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const credsPath = path.resolve(process.cwd(), 'scratch', 'dev_credentials.local.json');
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

describe('Unit 4 Real-Session Stock Operations & Policy Integration', () => {
  let ownerClient: SupabaseClient;
  let staffClient: SupabaseClient;
  let ownerShopId: string;
  let staffBranchId: string;
  let otherBranchId: string;
  let testProductId: string;

  beforeAll(async () => {
    // 1. Establish Owner Session
    ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ownerAuth, error: ownerAuthErr } = await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });
    expect(ownerAuthErr).toBeNull();
    expect(ownerAuth.session).not.toBeNull();

    const { data: ownerProfile, error: profileErr } = await ownerClient
      .from('profiles')
      .select('shop_id')
      .eq('id', creds.owner.id)
      .single();
    expect(profileErr).toBeNull();
    ownerShopId = ownerProfile!.shop_id;

    // 2. Establish Staff Session
    staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: staffAuth, error: staffAuthErr } = await staffClient.auth.signInWithPassword({
      email: creds.staff.email,
      password: creds.staff.password,
    });
    expect(staffAuthErr).toBeNull();
    expect(staffAuth.session).not.toBeNull();

    const { data: staffProfile, error: staffProfileErr } = await staffClient
      .from('profiles')
      .select('branch_id')
      .eq('id', creds.staff.id)
      .single();
    expect(staffProfileErr).toBeNull();
    staffBranchId = staffProfile!.branch_id!;

    // Resolve second branch
    const { data: branches, error: branchErr } = await ownerClient
      .from('branches')
      .select('id')
      .eq('shop_id', ownerShopId)
      .eq('is_active', true)
      .neq('id', staffBranchId)
      .limit(1);
    expect(branchErr).toBeNull();
    expect(branches!.length).toBeGreaterThan(0);
    otherBranchId = branches![0].id;

    // Create a dedicated product for this test suite
    const { data: newProd, error: prodErr } = await ownerClient
      .from('products')
      .insert({
        shop_id: ownerShopId,
        name: `Integration Stock Test SKU ${Date.now()}`,
        category: 'liquid',
        selling_price_centavos: 60000,
        cost_price_centavos: 35000,
        low_stock_threshold: 5,
        is_active: true,
      })
      .select('id')
      .single();
    expect(prodErr).toBeNull();
    testProductId = newProd!.id;
  });

  it('prohibits direct INSERT on stock_movements by owner', async () => {
    const { error } = await ownerClient.from('stock_movements').insert({
      shop_id: ownerShopId,
      branch_id: staffBranchId,
      product_id: testProductId,
      quantity_change: 10,
      reason: 'restock',
      created_by: creds.owner.id,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501'); // insufficient_privilege
  });

  it('prohibits direct INSERT on stock_movements by staff', async () => {
    const { error } = await staffClient.from('stock_movements').insert({
      shop_id: ownerShopId,
      branch_id: staffBranchId,
      product_id: testProductId,
      quantity_change: 10,
      reason: 'restock',
      created_by: creds.staff.id,
    });
    expect(error).not.toBeNull();
    expect(error!.code).toBe('42501'); // insufficient_privilege
  });

  it('rejects staff calling record_bulk_opening_stock', async () => {
    const { data, error } = await staffClient.rpc('record_bulk_opening_stock', {
      p_items: [
        {
          branch_id: staffBranchId,
          product_id: testProductId,
          quantity: 25,
        },
      ],
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/Only shop owners can record opening stock/i);
    expect(data).toBeNull();
  });

  it('allows owner to record bulk opening stock atomically', async () => {
    const { data, error } = await ownerClient.rpc('record_bulk_opening_stock', {
      p_items: [
        {
          branch_id: staffBranchId,
          product_id: testProductId,
          quantity: 25,
        },
      ],
    });
    expect(error).toBeNull();
    const result = data as { success: boolean; count: number };
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);

    // Verify stock_levels updated
    const { data: stockRow, error: stockErr } = await ownerClient
      .from('stock_levels')
      .select('stock_on_hand')
      .eq('branch_id', staffBranchId)
      .eq('product_id', testProductId)
      .single();
    expect(stockErr).toBeNull();
    expect(stockRow!.stock_on_hand).toBe(25);
  });

  it('rejects duplicate opening stock for the same product and branch', async () => {
    const { error } = await ownerClient.rpc('record_bulk_opening_stock', {
      p_items: [
        {
          branch_id: staffBranchId,
          product_id: testProductId,
          quantity: 10,
        },
      ],
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/Opening stock has already been recorded/i);
  });

  it('rejects staff calling record_restock', async () => {
    const { error } = await staffClient.rpc('record_restock', {
      p_branch_id: staffBranchId,
      p_product_id: testProductId,
      p_quantity: 10,
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/Only shop owners can record restocks/i);
  });

  it('allows owner to restock with optional cost update and atomic log', async () => {
    const { data, error } = await ownerClient.rpc('record_restock', {
      p_branch_id: staffBranchId,
      p_product_id: testProductId,
      p_quantity: 15,
      p_new_cost_price_centavos: 39000,
      p_note: 'New batch with supplier price increase',
    });
    expect(error).toBeNull();
    const res = data as { success: boolean; quantity: number; new_cost_price_centavos: number };
    expect(res.success).toBe(true);
    expect(res.quantity).toBe(15);
    expect(res.new_cost_price_centavos).toBe(39000);

    // Verify stock_levels: 25 (opening) + 15 (restock) = 40
    const { data: stockRow } = await ownerClient
      .from('stock_levels')
      .select('stock_on_hand')
      .eq('branch_id', staffBranchId)
      .eq('product_id', testProductId)
      .single();
    expect(stockRow!.stock_on_hand).toBe(40);

    // Verify product cost was updated
    const { data: prodRow } = await ownerClient
      .from('products')
      .select('cost_price_centavos')
      .eq('id', testProductId)
      .single();
    expect(prodRow!.cost_price_centavos).toBe(39000);
  });

  it('rejects staff calling record_adjustment', async () => {
    const { error } = await staffClient.rpc('record_adjustment', {
      p_branch_id: staffBranchId,
      p_product_id: testProductId,
      p_quantity_change: -2,
      p_reason: 'Damaged / Expired',
      p_note: 'Staff unauthorized test',
    });
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/Only shop owners can record stock adjustments/i);
  });

  it('allows owner to record stock adjustments', async () => {
    const { data, error } = await ownerClient.rpc('record_adjustment', {
      p_branch_id: staffBranchId,
      p_product_id: testProductId,
      p_quantity_change: -5,
      p_reason: 'Damaged / Expired',
      p_note: '5 bottles dropped and broken',
    });
    expect(error).toBeNull();
    const res = data as { success: boolean; quantity_change: number };
    expect(res.success).toBe(true);
    expect(res.quantity_change).toBe(-5);

    // Verify stock_levels: 40 - 5 = 35
    const { data: stockRow } = await ownerClient
      .from('stock_levels')
      .select('stock_on_hand')
      .eq('branch_id', staffBranchId)
      .eq('product_id', testProductId)
      .single();
    expect(stockRow!.stock_on_hand).toBe(35);
  });

  it('enforces branch isolation in stock_levels: staff sees only home branch', async () => {
    // Restock other branch as owner
    await ownerClient.rpc('record_restock', {
      p_branch_id: otherBranchId,
      p_product_id: testProductId,
      p_quantity: 50,
      p_note: 'Other branch stock',
    });

    // Staff queries stock_levels
    const { data: staffView, error: staffErr } = await staffClient
      .from('stock_levels')
      .select('branch_id, product_id, stock_on_hand')
      .eq('product_id', testProductId);
    expect(staffErr).toBeNull();
    expect(staffView).not.toBeNull();

    // Staff must see exactly 1 branch: their own branch
    expect(staffView!.length).toBe(1);
    expect(staffView![0].branch_id).toBe(staffBranchId);
    expect(staffView![0].stock_on_hand).toBe(35);

    // Owner queries stock_levels -> sees BOTH branches
    const { data: ownerView, error: ownerErr } = await ownerClient
      .from('stock_levels')
      .select('branch_id, product_id, stock_on_hand')
      .eq('product_id', testProductId);
    expect(ownerErr).toBeNull();
    expect(ownerView!.length).toBe(2);
    const branchIds = ownerView!.map((r) => r.branch_id);
    expect(branchIds).toContain(staffBranchId);
    expect(branchIds).toContain(otherBranchId);
  });
});
