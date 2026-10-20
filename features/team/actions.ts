'use server';

import crypto from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  createStaffSchema,
  resetStaffPasswordSchema,
  deactivateStaffSchema,
  reassignStaffBranchSchema,
  type CreateStaffInput,
  type ResetStaffPasswordInput,
  type DeactivateStaffInput,
  type ReassignStaffBranchInput,
} from './schemas';

/**
 * Generates a cryptographically strong, 16-character temporary password
 * containing uppercase, lowercase, numbers, and symbols.
 */
function generateSecureTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude I, O
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Exclude l
  const numbers = '23456789'; // Exclude 0, 1
  const symbols = '!@#$%^&*';
  const all = upper + lower + numbers + symbols;

  const bytes = crypto.randomBytes(16);
  const result: string[] = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    numbers[bytes[2] % numbers.length],
    symbols[bytes[3] % symbols.length],
  ];

  for (let i = 4; i < 16; i++) {
    result.push(all[bytes[i] % all.length]);
  }

  // Shuffle array using Fisher-Yates
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result.join('');
}

export interface CreatedStaffResult {
  fullName: string;
  username: string;
  storeCode: string;
  tempPassword: string;
}

/**
 * Creates a new staff member account.
 * 1. Admin client creates auth user with email: username.storecode@staff.stokr.invalid
 * 2. Owner session client inserts profile row.
 * 3. If profile insert fails, deletes the newly created auth user (compensating rollback).
 */
export async function createStaffAction(
  rawInput: CreateStaffInput
): Promise<ActionResult<CreatedStaffResult>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = createStaffSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid staff data');
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // 1. Fetch store_code
  const { data: shop } = await supabase
    .from('shops')
    .select('store_code')
    .eq('id', owner.shopId)
    .single();

  if (!shop?.store_code) {
    return errorResult('ERROR', 'Store code not found for this shop.');
  }

  const storeCode = shop.store_code;
  const { fullName, username, branchId } = parsed.data;
  const tempPassword = generateSecureTempPassword();
  const internalEmail = `${username}.${storeCode}@staff.stokr.invalid`;

  // 2. Check if username is already taken in this shop
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('shop_id', owner.shopId)
    .eq('username', username)
    .maybeSingle();

  if (existingUser) {
    return errorResult(
      'DUPLICATE_USERNAME',
      `Username "${username}" is already taken in this shop. Please choose another username.`
    );
  }

  // 3. Admin client creates the auth user
  const { data: authUser, error: authUserErr } = await adminClient.auth.admin.createUser({
    email: internalEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authUserErr || !authUser.user) {
    return errorResult(
      'AUTH_ERROR',
      authUserErr?.message ?? 'Failed to provision staff authentication account.'
    );
  }

  const newUserId = authUser.user.id;

  // 4. Owner session client inserts the profile row
  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({
      id: newUserId,
      shop_id: owner.shopId,
      branch_id: branchId,
      role: 'staff',
      full_name: fullName,
      username,
      must_change_password: true,
      is_active: true,
    });

  if (profileErr) {
    // Compensating rollback: delete newly created auth user so no orphan remains
    await adminClient.auth.admin.deleteUser(newUserId);

    if (profileErr.code === '23505' || profileErr.message.includes('uq_profiles_shop_username')) {
      return errorResult(
        'DUPLICATE_USERNAME',
        `Username "${username}" is already taken in this shop.`
      );
    }
    return errorResult('DB_ERROR', 'Failed to create staff profile. Please try again.');
  }

  revalidatePath('/team');
  revalidatePath('/settings');

  return successResult({
    fullName,
    username,
    storeCode,
    tempPassword,
  });
}

/**
 * Resets a staff member's password:
 * 1. Admin client updates auth.users password.
 * 2. Owner session updates must_change_password = true (trigger snapshots hash).
 */
export async function resetStaffPasswordAction(
  rawInput: ResetStaffPasswordInput
): Promise<ActionResult<{ tempPassword: string; username: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = resetStaffPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Invalid staff ID');
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Verify staff exists in owner's shop and is staff
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, role, must_change_password')
    .eq('id', parsed.data.staffId)
    .eq('shop_id', owner.shopId)
    .single();

  if (!profile || profile.role !== 'staff') {
    return errorResult('NOT_FOUND', 'Staff member not found in your shop.');
  }

  const tempPassword = generateSecureTempPassword();

  // (a) Admin sets new temp password in auth.users
  const { error: updateAuthErr } = await adminClient.auth.admin.updateUserById(
    parsed.data.staffId,
    { password: tempPassword }
  );

  if (updateAuthErr) {
    return errorResult('AUTH_ERROR', 'Failed to update temporary password in authentication service.');
  }

  // (b) Owner sets must_change_password = true in profiles
  // If must_change_password was already true, toggle false then true so AFTER UPDATE trigger fires
  if (profile.must_change_password) {
    await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', parsed.data.staffId)
      .eq('shop_id', owner.shopId);
  }

  const { error: profileUpdateErr } = await supabase
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', parsed.data.staffId)
    .eq('shop_id', owner.shopId);

  if (profileUpdateErr) {
    return errorResult('DB_ERROR', 'Failed to mark password reset required on staff profile. Please retry.');
  }

  revalidatePath('/team');

  return successResult({
    tempPassword,
    username: profile.username ?? 'staff',
  });
}

/**
 * Deactivates a staff member:
 * 1. Owner session updates profiles.is_active = false.
 * 2. Admin client bans user in auth.users (ban_duration: '876000h').
 */
export async function deactivateStaffAction(
  rawInput: DeactivateStaffInput
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = deactivateStaffSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Invalid staff ID');
  }

  if (parsed.data.staffId === owner.id) {
    return errorResult('FORBIDDEN', 'You cannot deactivate your own account.');
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Verify target is staff in owner's shop
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', parsed.data.staffId)
    .eq('shop_id', owner.shopId)
    .single();

  if (!profile || profile.role !== 'staff') {
    return errorResult('NOT_FOUND', 'Staff member not found.');
  }

  // 1. Owner session deactivates profile
  const { error: deactErr } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', parsed.data.staffId)
    .eq('shop_id', owner.shopId);

  if (deactErr) {
    return errorResult('DB_ERROR', 'Failed to deactivate staff member.');
  }

  // 2. Admin client bans user in Supabase Auth to invalidate all refresh tokens
  await adminClient.auth.admin.updateUserById(parsed.data.staffId, {
    ban_duration: '876000h',
  });

  revalidatePath('/team');
  revalidatePath('/settings');

  return successResult({ id: parsed.data.staffId });
}

/**
 * Reassigns staff member to another branch in the same shop.
 */
export async function reassignStaffBranchAction(
  rawInput: ReassignStaffBranchInput
): Promise<ActionResult<{ id: string; branchId: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = reassignStaffBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid branch selection');
  }

  const supabase = await createClient();

  // Verify branch is active and belongs to owner's shop
  const { data: branch } = await supabase
    .from('branches')
    .select('id, is_active')
    .eq('id', parsed.data.branchId)
    .eq('shop_id', owner.shopId)
    .single();

  if (!branch || !branch.is_active) {
    return errorResult('VALIDATION_ERROR', 'The selected branch is not active.');
  }

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ branch_id: parsed.data.branchId })
    .eq('id', parsed.data.staffId)
    .eq('shop_id', owner.shopId);

  if (updateErr) {
    return errorResult('DB_ERROR', 'Failed to reassign branch.');
  }

  revalidatePath('/team');
  revalidatePath('/settings');

  return successResult({
    id: parsed.data.staffId,
    branchId: parsed.data.branchId,
  });
}
