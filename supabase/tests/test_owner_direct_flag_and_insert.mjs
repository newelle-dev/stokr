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
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ownerClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log('Signing in as owner...');
  const { error: signInError } = await ownerClient.auth.signInWithPassword({
    email: creds.owner.email,
    password: creds.owner.password,
  });

  if (signInError) {
    console.error('Owner sign-in failed:', signInError);
    process.exit(1);
  }
  console.log('Signed in as owner successfully.');

  const staffId = creds.staff.id;
  const staffEmail = creds.staff.email;
  const staffPassword = creds.staff.password;

  // Step 1: Ensure staff has must_change_password = false
  // Test 4a: Staff is currently false. Owner tries direct UPDATE of must_change_password = true -> must FAIL
  console.log('\n--- Test 4a: Staff is false. Owner direct UPDATE must_change_password = true ---');
  const { error: updateTrueErr } = await ownerClient
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', staffId)
    .select();

  console.log('Result updateTrueErr (expected failure):');
  console.log(JSON.stringify(updateTrueErr, null, 2));
  if (!updateTrueErr || !/must_change_password cannot be modified directly/i.test(updateTrueErr.message)) {
    throw new Error('Test 4a failed: Owner direct update of must_change_password = true was not rejected!');
  }

  // Step 2: Use begin_staff_password_reset() to legitimately set must_change_password = true
  console.log('\nSetting must_change_password = true via legitimate begin_staff_password_reset()...');
  const tempPassword = 'TempPasswordForTest4b!2026';
  await adminClient.auth.admin.updateUserById(staffId, { password: tempPassword });
  const { error: rpcErr } = await ownerClient.rpc('begin_staff_password_reset', { p_staff_id: staffId });
  if (rpcErr) {
    console.error('RPC begin_staff_password_reset error:', rpcErr);
    throw rpcErr;
  }
  console.log('Legitimate reset initiated successfully. Staff now has must_change_password = true.');

  // Test 4b: Staff is now true. Owner tries direct UPDATE of must_change_password = false -> must FAIL
  console.log('\n--- Test 4b: Staff is true. Owner direct UPDATE must_change_password = false ---');
  const { error: updateFalseErr } = await ownerClient
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', staffId)
    .select();

  console.log('Result updateFalseErr (expected failure):');
  console.log(JSON.stringify(updateFalseErr, null, 2));
  if (!updateFalseErr || !/must_change_password cannot be modified directly/i.test(updateFalseErr.message)) {
    throw new Error('Test 4b failed: Owner direct update of must_change_password = false was not rejected!');
  }

  // Test 5: Owner tries to INSERT staff profile with must_change_password = false
  console.log('\n--- Test 5: Owner INSERT staff profile with must_change_password = false ---');
  const dummyStaffId = '00000000-0000-0000-0000-000000000999';
  const { error: insertErr } = await ownerClient
    .from('profiles')
    .insert({
      id: dummyStaffId,
      shop_id: '00000000-0000-0000-0000-000000000001',
      branch_id: '00000000-0000-0000-0000-000000000010',
      role: 'staff',
      full_name: 'Reject Staff Test',
      username: 'rejectstafftest',
      must_change_password: false,
    })
    .select();

  console.log('Result insertErr:');
  console.log(JSON.stringify(insertErr, null, 2));
  if (!insertErr || !/must_change_password/i.test(insertErr.message)) {
    throw new Error('Test 5 failed: Owner direct insert with must_change_password = false was not rejected!');
  }

  // Cleanup: Restore staff to must_change_password = false and permanent password
  console.log('\nRestoring staff1 state...');
  const staffClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await staffClient.auth.signInWithPassword({ email: staffEmail, password: tempPassword });
  await staffClient.auth.updateUser({ password: staffPassword });
  await staffClient.rpc('complete_password_change');
  console.log('staff1 state restored cleanly.');

  // Confirm auth.users has exactly 2 seed users
  const { data: userList } = await adminClient.auth.admin.listUsers();
  console.log(`\nFinal auth.users count: ${userList.users.length}`);
  for (const u of userList.users) {
    console.log(` - ${u.id}: ${u.email}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
