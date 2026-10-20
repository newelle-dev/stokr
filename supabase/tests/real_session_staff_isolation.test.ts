import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
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

describe('Real Session Staff Isolation (Live DB)', () => {
  it('signs in as staff and verifies strict read isolation and profile immutability', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Sign in as the seeded staff member
    const { data: authData, error: authError } = await staffClient.auth.signInWithPassword({
      email: creds.staff.email,
      password: creds.staff.password,
    });

    expect(authError).toBeNull();
    expect(authData.session).not.toBeNull();
    expect(authData.user?.id).toBe(creds.staff.id);

    // 2. Try to directly read base products table (must return 0 rows)
    const { data: productsData, error: productsError } = await staffClient
      .from('products')
      .select('*');
    expect(productsError).toBeNull();
    expect(productsData).toEqual([]);

    // 3. Try to directly read base sales table (must return 0 rows)
    const { data: salesData, error: salesError } = await staffClient
      .from('sales')
      .select('*');
    expect(salesError).toBeNull();
    expect(salesData).toEqual([]);

    // 4. Try to directly read activity_log table (must return 0 rows)
    const { data: activityData, error: activityError } = await staffClient
      .from('activity_log')
      .select('*');
    expect(activityError).toBeNull();
    expect(activityData).toEqual([]);

    // 5. Read profiles: Staff user must see ONLY their own row
    const { data: profilesData, error: profilesError } = await staffClient
      .from('profiles')
      .select('*');
    expect(profilesError).toBeNull();
    expect(profilesData).toHaveLength(1);
    expect(profilesData![0].id).toBe(creds.staff.id);
    expect(profilesData![0].role).toBe('staff');

    // 6. Attempt privilege escalation: Staff attempts to update own role to 'owner',
    // modify shop_id, branch_id, and is_active.
    const { data: updateData } = await staffClient
      .from('profiles')
      .update({
        role: 'owner',
        shop_id: '00000000-0000-0000-0000-999999999999',
        branch_id: null,
        is_active: false,
      })
      .eq('id', creds.staff.id)
      .select();

    // RLS policy profiles_update_owner permits UPDATE only where is_owner() = true.
    // As staff, the update returns 0 affected rows or an error.
    if (updateData) {
      expect(updateData).toEqual([]);
    }

    // 7. Re-fetch profile and assert ALL fields remain exact and unchanged
    const { data: verifiedProfile, error: verifyError } = await staffClient
      .from('profiles')
      .select('id, shop_id, role, branch_id, is_active')
      .eq('id', creds.staff.id)
      .single();

    expect(verifyError).toBeNull();
    expect(verifiedProfile).toEqual({
      id: creds.staff.id,
      shop_id: '00000000-0000-0000-0000-000000000001',
      role: 'staff',
      branch_id: '00000000-0000-0000-0000-000000000010',
      is_active: true,
    });
  });

  it('rejects attempts to change profiles.id by the owner with "id cannot be changed."', async () => {
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });

    expect(authError).toBeNull();
    expect(authData.session).not.toBeNull();

    // Owner attempts to modify a profile's id
    const { error: updateError } = await ownerClient
      .from('profiles')
      .update({ id: '00000000-0000-0000-0000-999999999999' })
      .eq('id', creds.staff.id);

    expect(updateError).not.toBeNull();
    expect(updateError?.message).toMatch(/id cannot be changed/i);
  });
});

