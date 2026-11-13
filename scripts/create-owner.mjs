// Creates an owner login, or resets the password of an existing one.
// Usage: node scripts/create-owner.mjs <email>
// Prints a temporary password ONCE. It is never written to a file.
// No profile is created here: the owner's first sign-in goes to onboarding,
// where they set shop, first branch and their own password.
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

const email = (process.argv[2] ?? '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error('Usage: node scripts/create-owner.mjs <email>');
  process.exit(1);
}
if (email.endsWith('@staff.stokr.invalid')) {
  console.error('Staff accounts are managed in the app, not with this script.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const password = crypto.randomBytes(12).toString('base64url'); // 16 characters

const { error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
let action = 'Created';
if (createError) {
  // shortcut: lists up to 1000 users to find the account, fine for a handful of owners; page through if that ever grows
  const { data, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = data?.users.find((u) => u.email?.toLowerCase() === email);
  if (listError || !existing) {
    console.error('Could not create or find that account:', createError.message);
    process.exit(1);
  }
  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, { password });
  if (updateError) {
    console.error('Could not reset the password:', updateError.message);
    process.exit(1);
  }
  action = 'Reset password for';
}

console.log(`${action} ${email}`);
console.log(`Temporary password (shown once): ${password}`);
console.log(
  action === 'Created'
    ? 'Send it to the owner privately. They set their own password at first sign-in.'
    : 'Send it to the owner privately. If they already have a shop, ask them to change it on the change-password page; it stays valid until they do.'
);
