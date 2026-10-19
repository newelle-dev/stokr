'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import { loginSchema, type LoginInput } from './schemas';
import type { UserRole } from '@/lib/supabase/database.types';

export interface LoginResultData {
  role: UserRole;
  redirectTo: string;
}

/**
 * Signs in a user with email and password.
 * Always returns a generic "Incorrect email or password" error on any failure
 * to prevent user enumeration or state probing.
 */
export async function loginAction(
  rawInput: LoginInput
): Promise<ActionResult<LoginResultData>> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult(
      'INVALID_CREDENTIALS',
      'Incorrect email or password'
    );
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    return errorResult(
      'INVALID_CREDENTIALS',
      'Incorrect email or password'
    );
  }

  // Verify active profile in shop
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, shop_id, full_name, role, branch_id, is_active')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    // Immediate lockout: revoke session and return generic error
    await supabase.auth.signOut();
    return errorResult(
      'INVALID_CREDENTIALS',
      'Incorrect email or password'
    );
  }

  const redirectTo = profile.role === 'owner' ? '/dashboard' : '/sell';

  return successResult({
    role: profile.role,
    redirectTo,
  });
}

/**
 * Signs out the current user session and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
