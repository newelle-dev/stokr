'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  staffLoginSchema,
  changePasswordSchema,
  magicLinkSchema,
  type MagicLinkInput,
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

  // The return address comes from server config, never from the request headers.
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error('SITE_URL is not set');
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl}/login/callback`, shouldCreateUser: true },
  });

  return successResult(null);
}

