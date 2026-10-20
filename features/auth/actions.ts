'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  loginSchema,
  staffLoginSchema,
  changePasswordSchema,
  type LoginInput,
  type StaffLoginInput,
  type ChangePasswordInput,
} from './schemas';
import type { UserRole } from '@/lib/supabase/database.types';
import { getCurrentUser } from '@/lib/auth';

export interface LoginResultData {
  role: UserRole;
  redirectTo: string;
  mustChangePassword: boolean;
}

/**
 * Signs in an owner with email and password.
 * Always returns a generic "Incorrect login details" error on any failure
 * to prevent user enumeration or state probing.
 */
export async function loginAction(
  rawInput: LoginInput
): Promise<ActionResult<LoginResultData>> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('INVALID_CREDENTIALS', 'Incorrect login details');
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError || !authData.user) {
    return errorResult('INVALID_CREDENTIALS', 'Incorrect login details');
  }

  // Verify active profile in shop
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, shop_id, full_name, role, branch_id, is_active, must_change_password')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    // Immediate lockout: revoke session and return generic error
    await supabase.auth.signOut();
    return errorResult('INVALID_CREDENTIALS', 'Incorrect login details');
  }

  const role = profile.role as UserRole;
  let redirectTo = role === 'owner' ? '/dashboard' : '/sell';
  if (profile.must_change_password) {
    redirectTo = '/change-password';
  }

  return successResult({
    role,
    redirectTo,
    mustChangePassword: profile.must_change_password,
  });
}

/**
 * Signs in a staff member with store code, username, and password.
 * Mapped to the internal hidden address: username.storecode@staff.stokr.invalid
 * Always returns a generic "Incorrect login details" error on any failure.
 */
export async function staffLoginAction(
  rawInput: StaffLoginInput
): Promise<ActionResult<LoginResultData>> {
  const parsed = staffLoginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('INVALID_CREDENTIALS', 'Incorrect login details');
  }

  const { storeCode, username, password } = parsed.data;
  const internalEmail = `${username}.${storeCode}@staff.stokr.invalid`;
  const supabase = await createClient();

  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

  if (authError || !authData.user) {
    return errorResult('INVALID_CREDENTIALS', 'Incorrect login details');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, shop_id, full_name, role, branch_id, is_active, must_change_password')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    await supabase.auth.signOut();
    return errorResult('INVALID_CREDENTIALS', 'Incorrect login details');
  }

  const role = profile.role as UserRole;
  let redirectTo = role === 'owner' ? '/dashboard' : '/sell';
  if (profile.must_change_password) {
    redirectTo = '/change-password';
  }

  return successResult({
    role,
    redirectTo,
    mustChangePassword: profile.must_change_password,
  });
}

/**
 * Completes a forced or voluntary password change.
 * If must_change_password is true, invokes the fail-closed complete_password_change() database function.
 * If voluntary, verifies current password first.
 */
export async function completePasswordChangeAction(
  rawInput: ChangePasswordInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue ? firstIssue.message : 'Invalid password');
  }

  const user = await getCurrentUser();
  if (!user) {
    return errorResult('UNAUTHORIZED', 'You must be signed in to change your password.');
  }

  const supabase = await createClient();

  // If voluntary change (not forced), require and verify current password
  if (!user.mustChangePassword) {
    if (!parsed.data.currentPassword) {
      return errorResult('VALIDATION_ERROR', 'Current password is required to change password.');
    }

    if (!user.email) {
      return errorResult('ERROR', 'Unable to verify account email.');
    }

    // Verify current password against Supabase Auth
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: parsed.data.currentPassword,
    });

    if (verifyErr) {
      return errorResult('INVALID_CREDENTIALS', 'Current password is incorrect.');
    }
  }

  // 1. Update password in Supabase Auth
  const { error: updateAuthErr } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateAuthErr) {
    return errorResult('AUTH_ERROR', updateAuthErr.message);
  }

  // 2. If forced change, complete password change in database
  if (user.mustChangePassword) {
    const { error: rpcErr } = await supabase.rpc('complete_password_change');
    if (rpcErr) {
      return errorResult('DB_ERROR', rpcErr.message);
    }
  }

  const redirectTo = user.role === 'owner' ? '/dashboard' : '/sell';
  return successResult({ redirectTo });
}

/**
 * Signs out the current user session and redirects to /login.
 */
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
