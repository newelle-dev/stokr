'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  loginSchema,
  staffLoginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  magicLinkSchema,
  type MagicLinkInput,
  type ForgotPasswordInput,
  type LoginInput,
  type StaffLoginInput,
  type ChangePasswordInput,
} from './schemas';
import type { UserRole } from '@/lib/supabase/database.types';
import { getCurrentUser } from '@/lib/auth';
import { RECOVERY_COOKIE } from './constants';

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

  const isSamePasswordError =
    updateAuthErr &&
    (updateAuthErr.message.toLowerCase().includes('different from the old password') ||
      (updateAuthErr as unknown as { code?: string }).code === 'same_password');

  // If forced mode and same-password error, the auth password was already set
  // in a previous attempt that failed before complete_password_change was recorded.
  // Allow execution to continue to complete_password_change() for retry-safety.
  if (updateAuthErr && !(user.mustChangePassword && isSamePasswordError)) {
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


/**
 * Emails a magic sign-in link. Supabase errors are ignored on purpose, so the
 * reply never reveals whether the account exists. shouldCreateUser lets a new
 * owner sign up with the same link.
 */
export async function requestMagicLinkAction(
  rawInput: MagicLinkInput
): Promise<ActionResult<null>> {
  const parsed = magicLinkSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Please enter a valid email address');
  }

  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/login/callback`, shouldCreateUser: true },
  });

  return successResult(null);
}

/**
 * Emails a password-reset link. Always answers "ok" for a well-formed email,
 * whether or not the account exists, so nobody can probe for accounts.
 */
export async function requestPasswordResetAction(
  rawInput: ForgotPasswordInput
): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Please enter a valid email address');
  }

  const h = await headers();
  const origin = h.get('origin') ?? `https://${h.get('host')}`;
  const supabase = await createClient();
  // Supabase only honours redirectTo values on its allowed Redirect URLs list.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/login/callback`,
  });

  return successResult(null);
}

/**
 * Sets a new password after the emailed link. Requires the short-lived recovery
 * cookie that /login/callback sets, so an ordinary signed-in session cannot use
 * this to skip the current-password check.
 */
export async function resetPasswordAction(
  rawInput: ChangePasswordInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue ? firstIssue.message : 'Invalid password');
  }

  const jar = await cookies();
  const user = await getCurrentUser();
  if (!user || !jar.get(RECOVERY_COOKIE)) {
    return errorResult('UNAUTHORIZED', 'This reset link has expired. Request a new one.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return errorResult('AUTH_ERROR', error.message);
  }

  jar.delete(RECOVERY_COOKIE);
  return successResult({ redirectTo: user.role === 'owner' ? '/dashboard' : '/sell' });
}
