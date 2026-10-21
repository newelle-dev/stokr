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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe('Public Signup Disabled (Live DB)', () => {
  it('rejects public signUp calls from anonymous clients', async () => {
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const randomEmail = `unauthorized_signup_${Date.now()}@example.com`;
    const { data, error } = await client.auth.signUp({
      email: randomEmail,
      password: 'Strong-Password-123!@#',
    });

    if (!error && data.user) {
      // Clean up the created test user using admin API
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await adminClient.auth.admin.deleteUser(data.user.id);

      throw new Error(
        'Public signup is still enabled in the Supabase Dashboard. Please turn off "Allow new users to sign up" in Supabase under Authentication > Providers > Email.'
      );
    }

    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/signups not allowed for this instance/i);
    expect(data.session).toBeNull();
    expect(data.user).toBeNull();
  });
});
