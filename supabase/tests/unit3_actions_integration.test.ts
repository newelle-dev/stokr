import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { parseMoneyInput } from '@/lib/money';

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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const credsPath = path.resolve(process.cwd(), 'scratch', 'dev_credentials.local.json');
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe('Unit 3 Real-Session Actions & Policy Integration Tests', () => {
  let ownerClient: SupabaseClient;
  let staffClient: SupabaseClient;
  let ownerShopId: string;
  let assignedBranchId: string;
  const createdProductIds: string[] = [];
  const createdBranchIds: string[] = [];

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

    const { data: staffProfile } = await staffClient
      .from('profiles')
      .select('branch_id')
      .eq('id', creds.staff.id)
      .single();
    expect(staffProfile?.branch_id).toBeTruthy();
    assignedBranchId = staffProfile!.branch_id;
  });

  afterAll(async () => {
    // Teardown created products and branches via adminClient
    for (const prodId of createdProductIds) {
      await adminClient.from('activity_log').delete().eq('entity_id', prodId);
      await adminClient.from('products').delete().eq('id', prodId);
    }
    for (const bId of createdBranchIds) {
      await adminClient.from('activity_log').delete().eq('entity_id', bId);
      await adminClient.from('branches').delete().eq('id', bId);
    }
  });

  it('owner creates a product at 19.99 and the DB holds exactly 1999 centavos', async () => {
    const rawPrice = '19.99';
    const parsed = parseMoneyInput(rawPrice, { minCentavos: 1, fieldName: 'Selling price' });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const sellingCentavos = parsed.centavos;
    expect(sellingCentavos).toBe(1999);

    const testProductName = `Test 19.99 Pod ${Date.now()}`;
    const { data: newProd, error: insertErr } = await ownerClient
      .from('products')
      .insert({
        shop_id: ownerShopId,
        name: testProductName,
        category: 'cartridge',
        selling_price_centavos: sellingCentavos,
        cost_price_centavos: 1200,
        low_stock_threshold: 5,
        is_active: true,
      })
      .select()
      .single();

    expect(insertErr).toBeNull();
    expect(newProd).toBeDefined();
    createdProductIds.push(newProd.id);

    // Verify DB holds exactly 1999
    expect(newProd.selling_price_centavos).toBe(1999);
    expect(newProd.cost_price_centavos).toBe(1200);

    // Read directly from DB via admin client to confirm persistence
    const { data: dbCheck, error: checkErr } = await adminClient
      .from('products')
      .select('selling_price_centavos, cost_price_centavos')
      .eq('id', newProd.id)
      .single();

    expect(checkErr).toBeNull();
    expect(dbCheck!.selling_price_centavos).toBe(1999);
  });

  it('rejects duplicate product name (case-insensitive)', async () => {
    const baseName = `Juice Flavor Alpha ${Date.now()}`;
    const upperName = baseName.toUpperCase();

    // 1. First insert with original casing
    const { data: prod1, error: err1 } = await ownerClient
      .from('products')
      .insert({
        shop_id: ownerShopId,
        name: baseName,
        category: 'liquid',
        selling_price_centavos: 25000,
        cost_price_centavos: 18000,
        low_stock_threshold: 3,
        is_active: true,
      })
      .select()
      .single();

    expect(err1).toBeNull();
    createdProductIds.push(prod1.id);

    // 2. Second insert with uppercase casing -> must fail with unique constraint violation
    const { error: err2 } = await ownerClient
      .from('products')
      .insert({
        shop_id: ownerShopId,
        name: upperName,
        category: 'liquid',
        selling_price_centavos: 30000,
        cost_price_centavos: 20000,
        low_stock_threshold: 3,
        is_active: true,
      });

    expect(err2).not.toBeNull();
    expect(err2!.code).toBe('23505');
  });

  it('proves staff cannot create or update products (RLS blocks direct table mutations)', async () => {
    // 1. Staff attempts to insert a product
    const { error: staffInsertErr } = await staffClient
      .from('products')
      .insert({
        shop_id: ownerShopId,
        name: `Unauthorized Staff Product ${Date.now()}`,
        category: 'device',
        selling_price_centavos: 50000,
        cost_price_centavos: 30000,
        low_stock_threshold: 2,
        is_active: true,
      });

    expect(staffInsertErr).not.toBeNull();
    // PostgREST with RLS returns 42501 permission denied or violates row-level security
    expect(staffInsertErr!.code).toMatch(/42501|PGRST/);

    // 2. Staff attempts to update an existing product
    const existingProdId = createdProductIds[0];
    const { data: updateData, error: staffUpdateErr } = await staffClient
      .from('products')
      .update({ name: 'Hacked By Staff', selling_price_centavos: 1 })
      .eq('id', existingProdId)
      .select();

    // With RLS, either returns error or affects 0 rows
    if (staffUpdateErr) {
      expect(staffUpdateErr).toBeDefined();
    } else {
      expect(updateData).toEqual([]);
    }

    // Verify product was not altered
    const { data: currentProd } = await adminClient
      .from('products')
      .select('name, selling_price_centavos')
      .eq('id', existingProdId)
      .single();

    expect(currentProd!.name).not.toBe('Hacked By Staff');
    expect(currentProd!.selling_price_centavos).not.toBe(1);
  });

  it('product update writes one activity_log row with old and new prices', async () => {
    const targetProdId = createdProductIds[0];
    const oldSelling = 1999;
    const newSelling = 2499;
    const oldCost = 1200;
    const newCost = 1500;

    // Get log count before update
    const { data: preLogs } = await adminClient
      .from('activity_log')
      .select('id')
      .eq('entity_id', targetProdId)
      .eq('action', 'product_updated');
    const preCount = preLogs?.length ?? 0;

    // Perform update as owner
    const { data: updated, error: updateErr } = await ownerClient
      .from('products')
      .update({
        selling_price_centavos: newSelling,
        cost_price_centavos: newCost,
      })
      .eq('id', targetProdId)
      .select()
      .single();

    expect(updateErr).toBeNull();
    expect(updated.selling_price_centavos).toBe(newSelling);

    // Check activity_log
    const { data: postLogs, error: logErr } = await adminClient
      .from('activity_log')
      .select('*')
      .eq('entity_id', targetProdId)
      .eq('action', 'product_updated')
      .order('created_at', { ascending: false });

    expect(logErr).toBeNull();
    expect(postLogs).toBeDefined();
    expect(postLogs!.length).toBe(preCount + 1);

    const latestLog = postLogs![0];
    expect(latestLog.actor_id).toBe(creds.owner.id);
    expect(latestLog.shop_id).toBe(ownerShopId);
    expect(latestLog.details.old_selling_price_centavos).toBe(oldSelling);
    expect(latestLog.details.new_selling_price_centavos).toBe(newSelling);
    expect(latestLog.details.old_cost_price_centavos).toBe(oldCost);
    expect(latestLog.details.new_cost_price_centavos).toBe(newCost);
  });

  it('rejects branch duplicate-name error', async () => {
    const branchName = `East Branch ${Date.now()}`;

    // 1. Owner creates branch
    const { data: b1, error: err1 } = await ownerClient
      .from('branches')
      .insert({
        shop_id: ownerShopId,
        name: branchName,
        is_active: true,
      })
      .select()
      .single();

    expect(err1).toBeNull();
    createdBranchIds.push(b1.id);

    // 2. Owner attempts to create duplicate branch name in same shop
    const { error: err2 } = await ownerClient
      .from('branches')
      .insert({
        shop_id: ownerShopId,
        name: branchName,
        is_active: true,
      });

    expect(err2).not.toBeNull();
    expect(err2!.code).toBe('23505');
  });

  it('blocks branch deactivation while active staff are assigned', async () => {
    expect(assignedBranchId).toBeTruthy();

    // Owner attempts to deactivate branch that has active staff assigned
    const { error: deactErr } = await ownerClient
      .from('branches')
      .update({ is_active: false })
      .eq('id', assignedBranchId);

    expect(deactErr).not.toBeNull();
    expect(deactErr!.message).toMatch(/Cannot deactivate branch while active staff members are assigned/i);

    // Verify branch is still active
    const { data: branchCheck } = await ownerClient
      .from('branches')
      .select('is_active')
      .eq('id', assignedBranchId)
      .single();

    expect(branchCheck?.is_active).toBe(true);
  });
});
