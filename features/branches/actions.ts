'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireOwnerAction } from '@/lib/auth';
import { errorResult, successResult, type ActionResult } from '@/lib/errors';
import {
  createBranchSchema,
  updateBranchSchema,
  branchIdSchema,
  type CreateBranchInput,
  type UpdateBranchInput,
  type BranchIdInput,
} from './schemas';
import type { BranchItem } from './types';

export async function createBranchAction(
  rawInput: CreateBranchInput
): Promise<ActionResult<BranchItem>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = createBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid branch name');
  }

  const supabase = await createClient();

  const { data: newBranch, error: insertErr } = await supabase
    .from('branches')
    .insert({
      shop_id: owner.shopId,
      name: parsed.data.name,
      is_active: true,
    })
    .select('id, shop_id, name, is_active, created_at')
    .single();

  if (insertErr || !newBranch) {
    return errorResult('DB_ERROR', 'Failed to create branch. Please try again.');
  }

  revalidatePath('/settings');
  revalidatePath('/team');

  return successResult({
    id: newBranch.id,
    shopId: newBranch.shop_id,
    name: newBranch.name,
    isActive: newBranch.is_active,
    createdAt: newBranch.created_at,
    activeStaffCount: 0,
  });
}

export async function renameBranchAction(
  rawInput: UpdateBranchInput
): Promise<ActionResult<{ id: string; name: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = updateBranchSchema.safeParse(rawInput);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResult('VALIDATION_ERROR', firstIssue?.message ?? 'Invalid branch name');
  }

  const supabase = await createClient();

  const { error: updateErr } = await supabase
    .from('branches')
    .update({ name: parsed.data.name })
    .eq('id', parsed.data.id)
    .eq('shop_id', owner.shopId);

  if (updateErr) {
    return errorResult('DB_ERROR', 'Failed to rename branch. Please try again.');
  }

  revalidatePath('/settings');
  revalidatePath('/team');

  return successResult({
    id: parsed.data.id,
    name: parsed.data.name,
  });
}

export async function deactivateBranchAction(
  rawInput: BranchIdInput
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = branchIdSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Invalid branch ID');
  }

  const supabase = await createClient();

  // Check if active staff are assigned (acceptance criterion 9 & DB trigger invariant)
  const { data: assignedStaff } = await supabase
    .from('profiles')
    .select('id')
    .eq('shop_id', owner.shopId)
    .eq('branch_id', parsed.data.id)
    .eq('is_active', true);

  if (assignedStaff && assignedStaff.length > 0) {
    return errorResult(
      'ACTIVE_STAFF_ASSIGNED',
      `Cannot deactivate this branch because ${assignedStaff.length} active staff member${
        assignedStaff.length > 1 ? 's are' : ' is'
      } currently assigned to it. Please reassign them in the Team page first.`
    );
  }

  // Ensure shop has at least 1 remaining active branch
  const { data: activeBranches } = await supabase
    .from('branches')
    .select('id')
    .eq('shop_id', owner.shopId)
    .eq('is_active', true);

  if (!activeBranches || activeBranches.length <= 1) {
    return errorResult(
      'MINIMUM_BRANCH_REQUIRED',
      'A shop must have at least one active branch.'
    );
  }

  const { error: deactivateErr } = await supabase
    .from('branches')
    .update({ is_active: false })
    .eq('id', parsed.data.id)
    .eq('shop_id', owner.shopId);

  if (deactivateErr) {
    if (deactivateErr.message.includes('Cannot deactivate branch')) {
      return errorResult('ACTIVE_STAFF_ASSIGNED', deactivateErr.message);
    }
    return errorResult('DB_ERROR', 'Failed to deactivate branch. Please try again.');
  }

  revalidatePath('/settings');
  revalidatePath('/team');

  return successResult({ id: parsed.data.id });
}

export async function reactivateBranchAction(
  rawInput: BranchIdInput
): Promise<ActionResult<{ id: string }>> {
  const authCheck = await requireOwnerAction();
  if (!authCheck.ok) return authCheck;
  const owner = authCheck.data;

  const parsed = branchIdSchema.safeParse(rawInput);
  if (!parsed.success) {
    return errorResult('VALIDATION_ERROR', 'Invalid branch ID');
  }

  const supabase = await createClient();

  const { error: reactivateErr } = await supabase
    .from('branches')
    .update({ is_active: true })
    .eq('id', parsed.data.id)
    .eq('shop_id', owner.shopId);

  if (reactivateErr) {
    return errorResult('DB_ERROR', 'Failed to reactivate branch. Please try again.');
  }

  revalidatePath('/settings');
  revalidatePath('/team');

  return successResult({ id: parsed.data.id });
}
