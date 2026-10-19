import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// Load .env if present
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const credsPath = path.resolve(process.cwd(), 'scratch', 'dev_credentials.local.json');
if (!fs.existsSync(credsPath)) {
  console.error('Credentials file not found at', credsPath);
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));

async function setupUser(account) {
  console.log(`Setting up dev user ${account.email} (${account.id})...`);
  
  // Try to update user if already exists
  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    account.id,
    {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.role === 'owner' ? 'Shop Owner' : 'Staff Member 1' },
    }
  );

  if (updateError) {
    console.error(`updateUserById error for ${account.email}:`, updateError);
    // If not found, create user
    const { error: createError } = await adminClient.auth.admin.createUser({
      id: account.id,
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: { full_name: account.role === 'owner' ? 'Shop Owner' : 'Staff Member 1' },
    });

    if (createError) {
      console.error(`Failed to create ${account.email}:`, createError.message);
      throw createError;
    }
    console.log(`Created user ${account.email}`);
  } else {
    console.log(`Rotated password for user ${account.email}`);
  }
}

async function main() {
  await setupUser(creds.owner);
  await setupUser(creds.staff);
  console.log('Dev accounts setup and passwords rotated successfully.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
