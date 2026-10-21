import { describe, expect, it, afterAll } from 'vitest';
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
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const credsPath = path.resolve(process.cwd(), 'scratch', 'dev_credentials.local.json');
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

describe('Unit 3 Real-Session Staff Lifecycle & Password Lockdown Tests', () => {
  let createdStaffUserId: string | null = null;
  const testUsername = `staff_${Date.now().toString(36)}`;
  const testEmail = `${testUsername}.cloudhaven@staff.stokr.invalid`;
  const initialTempPassword = `Temp_${Date.now()}_Aa1!`;
  const updatedTempPassword = `NewTemp_${Date.now()}_Bb2!`;
  const permanentPassword = `Perm_${Date.now()}_Cc3!`;

  afterAll(async () => {
    if (createdStaffUserId) {
      // Clean up test user
      await adminClient.from('profile_security').delete().eq('profile_id', createdStaffUserId);
      await adminClient.from('profiles').delete().eq('id', createdStaffUserId);
      await adminClient.auth.admin.deleteUser(createdStaffUserId);
    }
  });

  it('proves staff creation end-to-end: owner creates auth user & inserts profile', async () => {
    // 1. Sign in as owner
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: ownerAuth, error: ownerAuthErr } = await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });
    expect(ownerAuthErr).toBeNull();
    expect(ownerAuth.session).not.toBeNull();

    const { data: ownerProfile } = await ownerClient
      .from('profiles')
      .select('shop_id')
      .eq('id', creds.owner.id)
      .single();
    const ownerShopId = ownerProfile!.shop_id;

    const { data: branch } = await ownerClient
      .from('branches')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();
    const activeBranchId = branch!.id;

    // 2. Admin creates the auth user with the temp password
    const { data: authUser, error: authUserErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: initialTempPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Test Lifecycle Staff' },
    });
    expect(authUserErr).toBeNull();
    expect(authUser.user).toBeDefined();
    createdStaffUserId = authUser.user!.id;

    // 3. Owner session inserts the staff profile (actor = owner, shop_id matches owner)
    const { data: profileInsert, error: profileInsertErr } = await ownerClient
      .from('profiles')
      .insert({
        id: createdStaffUserId,
        shop_id: ownerShopId,
        branch_id: activeBranchId,
        role: 'staff',
        full_name: 'Test Lifecycle Staff',
        username: testUsername,
        must_change_password: true,
      })
      .select()
      .single();

    expect(profileInsertErr).toBeNull();
    expect(profileInsert.id).toBe(createdStaffUserId);
    expect(profileInsert.must_change_password).toBe(true);

    // 4. Verify that AFTER INSERT trigger took snapshot of temp password hash in profile_security
    const { data: secRow, error: secErr } = await adminClient
      .from('profile_security')
      .select('*')
      .eq('profile_id', createdStaffUserId)
      .single();

    expect(secErr).toBeNull();
    expect(secRow).toBeDefined();
    expect(secRow.shop_id).toBe(ownerShopId);
    expect(secRow.temp_password_hash).toBeTruthy();
  });

  it('proves staff signs in with temp password and complete_password_change fails before real change', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Staff signs in with the initial temp password
    const { data: staffAuth, error: staffAuthErr } = await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });
    expect(staffAuthErr).toBeNull();
    expect(staffAuth.session).not.toBeNull();

    // Verification 8(a): Calling complete_password_change() without changing password MUST FAIL
    const { error: completeErr } = await staffClient.rpc('complete_password_change');
    expect(completeErr).not.toBeNull();
    expect(completeErr!.message).toMatch(/password has not been changed/i);

    // Profile must still require password change
    const { data: profileCheck } = await staffClient
      .from('profiles')
      .select('must_change_password')
      .eq('id', createdStaffUserId!)
      .single();
    expect(profileCheck?.must_change_password).toBe(true);

    // Database lockdown: current_user_shop_id() returns null while must_change_password is true
    const { data: staffProducts } = await staffClient.from('staff_products').select('*');
    expect(staffProducts).toEqual([]);
  });

  it('records actual behavior for 8(b): staff tries to change login email', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });

    const { data: emailData, error: emailErr } = await staffClient.auth.updateUser({
      email: 'hacked_staff@example.com',
    });

    console.log('[Actual Behavior 8(b) - Email Change Request]');
    if (emailErr) {
      console.log('Error message:', emailErr.message);
    } else {
      console.log('GoTrue returned:', {
        userEmail: emailData.user?.email,
        newEmail: emailData.user?.new_email,
      });
    }
    // Whether rejected or held in confirmation state, staff's active login email remains unchanged:
    expect(emailData?.user?.email ?? testEmail).toBe(testEmail);
  });

  it('records actual behavior for 8(c): staff sets SAME password as temp one', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });

    const { data: sameData, error: sameErr } = await staffClient.auth.updateUser({
      password: initialTempPassword,
    });

    console.log('[Actual Behavior 8(c) - Same Password]');
    if (sameErr) {
      console.log('Error message:', sameErr.message);
    } else {
      console.log('GoTrue returned data without error:', sameData);
    }
    expect(sameErr).not.toBeNull();
    expect(sameErr!.message).toMatch(/different from the old password/i);
  });

  it('records actual behavior for 8(d): staff sets password shorter than 10 characters', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });

    const { data: shortData, error: shortErr } = await staffClient.auth.updateUser({
      password: '12345',
    });

    console.log('[Actual Behavior 8(d) - Short Password (< 10 chars)]');
    if (shortErr) {
      console.log('Error message for 5-character password:', shortErr.message);
    } else {
      console.log('GoTrue accepted 5-character password:', shortData);
    }
    expect(shortErr).not.toBeNull();
    expect(shortErr!.message).toMatch(/at least (?:6|10) characters/i);
  });

  it('records actual behavior for 8(e): staff edits their own user_metadata', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });

    const { data: metaData, error: metaErr } = await staffClient.auth.updateUser({
      data: { role: 'owner', is_superadmin: true },
    });

    console.log('[Actual Behavior 8(e) - user_metadata update]');
    if (metaErr) {
      console.log('Error message:', metaErr.message);
    } else {
      console.log('GoTrue accepted metadata:', metaData.user?.user_metadata);
    }

    // Invariant 21: Stokr NEVER uses user_metadata for authorization.
    // Query the database to verify the role in profiles is unchanged.
    const { data: dbProfile } = await staffClient
      .from('profiles')
      .select('role')
      .eq('id', createdStaffUserId!)
      .single();

    expect(dbProfile?.role).toBe('staff');
  });

  it('proves successful password change clears must_change_password and removes marker', async () => {
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: initialTempPassword,
    });

    // 1. Staff changes password to a valid, different, >=10 char password
    const { error: updateAuthErr } = await staffClient.auth.updateUser({
      password: permanentPassword,
    });
    expect(updateAuthErr).toBeNull();

    // 2. Staff calls complete_password_change()
    const { error: completeErr } = await staffClient.rpc('complete_password_change');
    expect(completeErr).toBeNull();

    // 3. Verify must_change_password is now false
    const { data: updatedProfile } = await staffClient
      .from('profiles')
      .select('must_change_password')
      .eq('id', createdStaffUserId!)
      .single();
    expect(updatedProfile?.must_change_password).toBe(false);

    // 4. Verify security marker was cleaned up
    const { data: secCheck } = await adminClient
      .from('profile_security')
      .select('*')
      .eq('profile_id', createdStaffUserId!);
    expect(secCheck).toEqual([]);

    // 5. Database access is now unlocked: staff_products returns the shop products
    const { data: staffProducts } = await staffClient.from('staff_products').select('*');
    expect(staffProducts).not.toBeNull();
    expect(staffProducts!.length).toBeGreaterThan(0);
  });

  it('proves fail-closed refusal when must_change_password is true but no marker exists', async () => {
    // Owner initiates password reset via begin_staff_password_reset
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });

    const { error: resetErr } = await ownerClient.rpc('begin_staff_password_reset', {
      p_staff_id: createdStaffUserId!,
    });
    expect(resetErr).toBeNull();

    // Now remove the marker row created by the function to simulate missing marker
    const { error: delSecErr } = await adminClient
      .from('profile_security')
      .delete()
      .eq('profile_id', createdStaffUserId!);
    expect(delSecErr).toBeNull();

    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: permanentPassword,
    });

    // complete_password_change() must refuse
    const { error: refuseErr } = await staffClient.rpc('complete_password_change');
    expect(refuseErr).not.toBeNull();
    expect(refuseErr!.message).toMatch(/no temporary password marker found/i);
  });

  it('proves password-reset flow: owner sets temp password via admin, calls begin_staff_password_reset, snapshots fresh hash', async () => {
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });

    // Direct UPDATE of must_change_password by owner must be rejected (currently true -> attempt false)
    const { error: directFlagErr } = await ownerClient
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', createdStaffUserId!);
    expect(directFlagErr).not.toBeNull();
    expect(directFlagErr!.message).toMatch(/must_change_password cannot be modified directly/i);

    // Reset flow order:
    // (a) Admin sets new temp password
    const { error: adminUpdateErr } = await adminClient.auth.admin.updateUserById(
      createdStaffUserId!,
      { password: updatedTempPassword }
    );
    expect(adminUpdateErr).toBeNull();

    // (b) Owner initiates password reset via begin_staff_password_reset()
    const { error: ownerResetErr } = await ownerClient.rpc('begin_staff_password_reset', {
      p_staff_id: createdStaffUserId!,
    });
    expect(ownerResetErr).toBeNull();

    // Verify snapshot in profile_security matches new temp password hash
    const { data: newSecRow } = await adminClient
      .from('profile_security')
      .select('temp_password_hash')
      .eq('profile_id', createdStaffUserId!)
      .single();
    expect(newSecRow?.temp_password_hash).toBeTruthy();

    // Staff signs in with the updated temp password
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInErr } = await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: updatedTempPassword,
    });
    expect(signInErr).toBeNull();

    // Calling complete_password_change directly without changing password must fail
    const { error: directErr } = await staffClient.rpc('complete_password_change');
    expect(directErr).not.toBeNull();
    expect(directErr!.message).toMatch(/password has not been changed/i);
  });

  it('proves genuine duplicate username rollback leaves no orphan auth user behind', async () => {
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });

    const { data: ownerProfile } = await ownerClient
      .from('profiles')
      .select('shop_id')
      .eq('id', creds.owner.id)
      .single();
    const ownerShopId = ownerProfile!.shop_id;

    const { data: branch } = await ownerClient
      .from('branches')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();
    const activeBranchId = branch!.id;

    // Use the existing staff username (already committed in the DB)
    const duplicateUsername = testUsername;
    const dupEmail = `${duplicateUsername}.dup_${Date.now()}@staff.stokr.invalid`;
    const dupPassword = `TempDup_${Date.now()}!Aa1`;

    // 1. Simulate creation flow: Admin creates auth user
    const { data: dupAuthUser, error: dupAuthErr } = await adminClient.auth.admin.createUser({
      email: dupEmail,
      password: dupPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Duplicate Staff Candidate' },
    });
    expect(dupAuthErr).toBeNull();
    const dupUserId = dupAuthUser.user!.id;

    // 2. Owner attempts to insert profile with duplicate username in same shop -> Postgres rejects with 23505
    const { error: profileErr } = await ownerClient
      .from('profiles')
      .insert({
        id: dupUserId,
        shop_id: ownerShopId,
        branch_id: activeBranchId,
        role: 'staff',
        full_name: 'Duplicate Staff Candidate',
        username: duplicateUsername,
        must_change_password: true,
        is_active: true,
      });

    expect(profileErr).not.toBeNull();
    expect(profileErr!.code).toBe('23505');

    // 3. Compensating rollback: Admin deletes the created auth user
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(dupUserId);
    expect(deleteErr).toBeNull();

    // 4. Assert that no orphan auth user is left behind
    const { data: orphanCheck, error: orphanErr } = await adminClient.auth.admin.getUserById(dupUserId);
    expect(orphanErr).not.toBeNull();
    expect(orphanCheck?.user).toBeNull();
  });

  it('proves staff deactivation leaves old access and refresh tokens unusable', async () => {
    // 1. Staff signs in to get active session tokens
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInErr } = await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: updatedTempPassword,
    });
    expect(signInErr).toBeNull();
    const oldAccessToken = signInData.session!.access_token;
    const oldRefreshToken = signInData.session!.refresh_token;

    // Positive Control: Bearer token is valid against GoTrue before deactivation (GET and PUT)
    const preCheckRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
      },
    });
    expect(preCheckRes.status).toBe(200);

    const prePutCheckRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { test_claim: 'valid_before_deactivation' } }),
    });
    expect(prePutCheckRes.status).toBe(200);

    // 2. Owner deactivates the staff member (trigger deletes auth.sessions row)
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });

    const { error: deactErr } = await ownerClient
      .from('profiles')
      .update({ is_active: false })
      .eq('id', createdStaffUserId!);
    expect(deactErr).toBeNull();

    // 3. Old access token must be rejected when sent to GoTrue
    const postCheckRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
      },
    });
    expect([401, 403]).toContain(postCheckRes.status);

    // 4. Old refresh token must be rejected when attempting to refresh session
    const { error: refreshErr } = await staffClient.auth.refreshSession({
      refresh_token: oldRefreshToken,
    });
    expect(refreshErr).not.toBeNull();

    // 5. Raw PUT /auth/v1/user with old bearer token must be rejected
    const putRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { hacked: true } }),
    });
    expect([401, 403]).toContain(putRes.status);

    // 6. Restore staff is_active = true via owner session for subsequent cleanup in afterAll
    const { error: reactErr } = await ownerClient
      .from('profiles')
      .update({ is_active: true })
      .eq('id', createdStaffUserId!);
    expect(reactErr).toBeNull();
  });

  it('proves old sessions die after a password reset with positive control before reset', async () => {
    // 1. Staff signs in to get active session tokens
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signInData, error: signInErr } = await staffClient.auth.signInWithPassword({
      email: testEmail,
      password: updatedTempPassword,
    });
    expect(signInErr).toBeNull();
    const oldAccessToken = signInData.session!.access_token;
    const oldRefreshToken = signInData.session!.refresh_token;

    // Positive Control: Bearer token is valid against GoTrue before reset
    // (a) Raw bearer GET
    const preGetRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
      },
    });
    expect(preGetRes.status).toBe(200);

    // (b) Raw bearer PUT
    const prePutRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { test_claim: 'valid_before_reset' } }),
    });
    expect(prePutRes.status).toBe(200);

    // 2. Owner resets staff password via begin_staff_password_reset
    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });

    const { error: resetErr } = await ownerClient.rpc('begin_staff_password_reset', {
      p_staff_id: createdStaffUserId!,
    });
    expect(resetErr).toBeNull();

    // 3. Post-reset checks: Old access token must be rejected by GoTrue
    // (a) Raw bearer GET must fail (401 / 403)
    const postGetRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
      },
    });
    expect([401, 403]).toContain(postGetRes.status);

    // (b) Raw bearer PUT must fail (401 / 403)
    const postPutRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${oldAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: { hacked: true } }),
    });
    expect([401, 403]).toContain(postPutRes.status);

    // (c) Refresh token must be rejected
    const { error: refreshErr } = await staffClient.auth.refreshSession({
      refresh_token: oldRefreshToken,
    });
    expect(refreshErr).not.toBeNull();
  });

  it('proves auth.users trigger prevents email change on staff accounts via admin API', async () => {
    // 1. Positive Control: Admin update on throwaway non-staff user succeeds
    const throwawayEmail = `throwaway_test_${Date.now()}@test.invalid`;
    const changedThrowawayEmail = `changed_test_${Date.now()}@test.invalid`;
    const randomThrowawayPass = `RandPass_${Date.now()}_${Math.random().toString(36).slice(2)}!Aa1`;

    let throwawayId: string | null = null;
    try {
      const { data: throwawayUser, error: throwawayCreateErr } = await adminClient.auth.admin.createUser({
        email: throwawayEmail,
        password: randomThrowawayPass,
        email_confirm: true,
      });
      expect(throwawayCreateErr).toBeNull();
      throwawayId = throwawayUser!.user!.id;

      const { data: updatedThrowaway, error: updateThrowawayErr } = await adminClient.auth.admin.updateUserById(
        throwawayId,
        { email: changedThrowawayEmail }
      );
      expect(updateThrowawayErr).toBeNull();
      expect(updatedThrowaway!.user!.email).toBe(changedThrowawayEmail);

      // Restore throwaway email
      const { error: restoreThrowawayErr } = await adminClient.auth.admin.updateUserById(throwawayId, {
        email: throwawayEmail,
      });
      expect(restoreThrowawayErr).toBeNull();

      // 2. Admin attempts to update staff email -> MUST FAIL via trigger
      const tempStaffEmail = `staff_blocked_${Date.now()}@test.invalid`;
      const { error: staffEmailUpdateErr } = await adminClient.auth.admin.updateUserById(
        createdStaffUserId!,
        { email: tempStaffEmail }
      );
      expect(staffEmailUpdateErr).not.toBeNull();

      // 3. Verify staff email remains strictly unchanged
      const { data: staffData, error: staffGetErr } = await adminClient.auth.admin.getUserById(
        createdStaffUserId!
      );
      expect(staffGetErr).toBeNull();
      expect(staffData!.user!.email).toBe(testEmail);

      // 4. Staff login still works with existing credentials
      const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: loginData, error: loginErr } = await staffClient.auth.signInWithPassword({
        email: testEmail,
        password: updatedTempPassword,
      });
      expect(loginErr).toBeNull();
      expect(loginData.user?.id).toBe(createdStaffUserId);

      // 5. Admin password update on staff account still works
      const { error: passUpdateErr } = await adminClient.auth.admin.updateUserById(
        createdStaffUserId!,
        { password: updatedTempPassword }
      );
      expect(passUpdateErr).toBeNull();
    } finally {
      if (throwawayId) {
        await adminClient.auth.admin.deleteUser(throwawayId);
      }
    }
  });
});
