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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const credsPath = path.resolve(process.cwd(), 'scratch', 'dev_credentials.local.json');
const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

async function main() {
  console.log('=== REAL-SESSION INTEGRATION TEST: DOUBLE PASSWORD RESET & LOCKDOWN ===');

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const staffId = creds.staff.id;
  const staffEmail = creds.staff.email;
  const restoredPermanentPassword = creds.staff.password; // 'Stokr-Dev-Staff-3bY7*kL9#mN2!wE5xT8'
  const tempPassword1 = 'TempPassOne!2026';
  const tempPassword2 = 'TempPassTwo!2026';

  try {
    // 1. Owner signs in with real session
    console.log('\n[Step 1] Signing in as owner (real session)...');
    const { data: ownerAuth, error: ownerSignInErr } = await ownerClient.auth.signInWithPassword({
      email: creds.owner.email,
      password: creds.owner.password,
    });
    if (ownerSignInErr) throw new Error(`Owner sign in failed: ${ownerSignInErr.message}`);
    console.log(`Owner signed in successfully. (Actor UID: ${ownerAuth.user.id})`);

    // 2. First password reset by owner
    console.log('\n[Step 2] Executing First Reset: Admin sets temp password 1 -> Owner calls begin_staff_password_reset()...');
    const { error: adminErr1 } = await adminClient.auth.admin.updateUserById(staffId, { password: tempPassword1 });
    if (adminErr1) throw new Error(`Admin update user 1 failed: ${adminErr1.message}`);

    const { error: rpcErr1 } = await ownerClient.rpc('begin_staff_password_reset', { p_staff_id: staffId });
    if (rpcErr1) throw new Error(`begin_staff_password_reset 1 failed: ${rpcErr1.message}`);

    const { data: sec1 } = await adminClient
      .from('profile_security')
      .select('temp_password_hash, created_at')
      .eq('profile_id', staffId)
      .single();
    console.log('Reset 1 snapshot captured: temp_password_hash exists =', !!sec1?.temp_password_hash);
    const hash1 = sec1?.temp_password_hash;

    // 3. Second password reset by owner BEFORE staff changes anything (must refresh snapshot)
    console.log('\n[Step 3] Executing Second Reset: Admin sets temp password 2 -> Owner calls begin_staff_password_reset()...');
    const { error: adminErr2 } = await adminClient.auth.admin.updateUserById(staffId, { password: tempPassword2 });
    if (adminErr2) throw new Error(`Admin update user 2 failed: ${adminErr2.message}`);

    const { error: rpcErr2 } = await ownerClient.rpc('begin_staff_password_reset', { p_staff_id: staffId });
    if (rpcErr2) throw new Error(`begin_staff_password_reset 2 failed: ${rpcErr2.message}`);

    const { data: sec2 } = await adminClient
      .from('profile_security')
      .select('temp_password_hash, created_at')
      .eq('profile_id', staffId)
      .single();
    const hash2 = sec2?.temp_password_hash;
    console.log('Reset 2 snapshot captured: temp_password_hash exists =', !!hash2);
    console.log('Verified snapshot updated:', hash1 !== hash2);
    if (hash1 === hash2) throw new Error('Snapshot hash did not change on second reset!');

    // 4. Staff signs in with Second Temp Password
    console.log('\n[Step 4] Staff signs in with Second Temp Password (TempPassTwo!2026)...');
    const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: staffAuth, error: staffSignInErr } = await staffClient.auth.signInWithPassword({
      email: staffEmail,
      password: tempPassword2,
    });
    if (staffSignInErr) throw new Error(`Staff sign in failed: ${staffSignInErr.message}`);
    console.log(`Staff signed in with temp password 2. (Staff UID: ${staffAuth.user.id})`);

    // 5. Staff calls complete_password_change() directly BEFORE changing password -> MUST FAIL
    console.log('\n[Step 5] Staff calls complete_password_change() directly without changing password...');
    const { error: prematureErr } = await staffClient.rpc('complete_password_change');
    console.log('Premature call result error message:', prematureErr?.message);
    if (!prematureErr || !/password has not been changed/i.test(prematureErr.message)) {
      throw new Error('Expected complete_password_change() to fail with "Password has not been changed", but it did not!');
    }
    console.log('PASS: Premature complete_password_change() was rejected by database trigger/function.');

    // Verify profile still has must_change_password = true
    const { data: profileCheck1 } = await staffClient
      .from('profiles')
      .select('must_change_password')
      .eq('id', staffId)
      .single();
    console.log('Staff profile must_change_password is still:', profileCheck1?.must_change_password);
    if (profileCheck1?.must_change_password !== true) {
      throw new Error('Expected must_change_password to still be true!');
    }

    // 6. Staff performs REAL password change via Supabase Auth
    console.log('\n[Step 6] Staff performs REAL password change via Supabase Auth...');
    const { data: updateData, error: updateErr } = await staffClient.auth.updateUser({
      password: restoredPermanentPassword,
    });
    if (updateErr) throw new Error(`Staff updateUser failed: ${updateErr.message}`);
    console.log('Staff updated password in Supabase Auth successfully.');

    // 7. Staff calls complete_password_change() after real change -> MUST SUCCEED
    console.log('\n[Step 7] Staff calls complete_password_change() after real password change...');
    const { error: completeSuccessErr } = await staffClient.rpc('complete_password_change');
    if (completeSuccessErr) {
      throw new Error(`complete_password_change() failed after real change: ${completeSuccessErr.message}`);
    }
    console.log('PASS: complete_password_change() succeeded without errors.');

    // 8. Verify final database state: must_change_password is false and marker row deleted
    console.log('\n[Step 8] Verifying database state post-completion...');
    const { data: profileCheck2 } = await adminClient
      .from('profiles')
      .select('must_change_password')
      .eq('id', staffId)
      .single();
    console.log('Staff profile must_change_password:', profileCheck2?.must_change_password);
    if (profileCheck2?.must_change_password !== false) {
      throw new Error('Expected must_change_password to be false!');
    }

    const { data: secCheck2 } = await adminClient
      .from('profile_security')
      .select('*')
      .eq('profile_id', staffId)
      .maybeSingle();
    console.log('profile_security marker row:', secCheck2);
    if (secCheck2 !== null) {
      throw new Error('Expected profile_security row to be deleted!');
    }

    // 9. Confirm staff signs in with permanent password
    console.log('\n[Step 9] Verifying staff can sign in with permanent password...');
    const finalStaffClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: finalSignInErr } = await finalStaffClient.auth.signInWithPassword({
      email: staffEmail,
      password: restoredPermanentPassword,
    });
    if (finalSignInErr) throw new Error(`Final sign in with permanent password failed: ${finalSignInErr.message}`);
    console.log('PASS: Staff signed in successfully with permanent password.');

    // 10. Check auth.users count
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    console.log(`\n[Step 10] auth.users total count: ${authUsers.users.length}`);
    for (const u of authUsers.users) {
      console.log(` - ${u.id}: ${u.email}`);
    }

    console.log('\n=== REAL-SESSION INTEGRATION TEST PASSED ===');
  } finally {
    // Guaranteed cleanup: ensure seed staff account password and must_change_password are fully restored
    try {
      await adminClient.auth.admin.updateUserById(staffId, { password: restoredPermanentPassword });
      await adminClient.from('profile_security').delete().eq('profile_id', staffId);
      const restoreStaff = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error: restoreLoginErr } = await restoreStaff.auth.signInWithPassword({ email: staffEmail, password: restoredPermanentPassword });
      if (!restoreLoginErr) {
        await restoreStaff.rpc('complete_password_change');
      }
    } catch (cleanupErr) {
      console.error('Warning: Seed staff account restoration encountered an error:', cleanupErr);
    }
  }
}

main().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
